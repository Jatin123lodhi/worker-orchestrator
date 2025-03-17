import { AutoScalingClient, UpdateAutoScalingGroupCommand, DescribeAutoScalingInstancesCommand, TerminateInstanceInAutoScalingGroupCommand } from "@aws-sdk/client-auto-scaling";
import { EC2Client, DescribeInstancesCommand, TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import express from "express";
import dotenv from "dotenv";

const app = express();
app.use(express.json());

dotenv.config();

const ec2Client = new EC2Client({ 
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
 });

const client = new AutoScalingClient({ 
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
 });


type Machine = {
    instanceId: string;
    ip: string;
    isUsed: boolean;
    assignedProjectId?: string
}

type AutoScalingInstance = {
    InstanceId: string;
    InstanceType: string;
    AutoScalingGroupName: string;
    AvailabilityZone: string;
    LaunchConfigurationName: string;
    LifecycleState: string;
    HealthStatus: string;
    LaunchTemplate: {
        LaunchTemplateId: string;
        LaunchTemplateName: string;
        Version: string;
    },
    ProtectedFromScaleIn: boolean
}

const ALL_AUTO_SCALING_INSTANCES = [];
let ALL_MACHINES: Machine[] = [];


const isNullOrEmpty = (value: string | undefined) => {
    return value === undefined || value === null || value === "";
}

async function refreshInstances() {
    const command = new DescribeAutoScalingInstancesCommand();

    const data = await client.send(command);
    // console.log(data,' -----------------data in refreshInstances')
    if(!data.AutoScalingInstances) return
    ALL_AUTO_SCALING_INSTANCES.push(...data.AutoScalingInstances);
    // Step 1: Get instance ids
    const instanceIds = data.AutoScalingInstances.map((instance) => instance.InstanceId);

    if(instanceIds.length === 0) {
        console.log('No instances found');
        return;
    }

    // Step 2: Get instance details from EC2 API
    const ec2Data = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: instanceIds.filter((id) => id !== undefined) }));

    // Step 3: Extract IP addresses
    const instancesWithIPs = ec2Data.Reservations?.flatMap(reservation =>
        reservation.Instances?.map(instance => ({
            InstanceId: instance.InstanceId,
            PrivateIP: instance.PrivateIpAddress,
            PublicIP: instance.PublicIpAddress || "No Public IP"
        }))
    ) || [];

    // console.log(instancesWithIPs);
    // enrich all machines array with new instances
    for(const instance of instancesWithIPs) {
        // check if we have new instance then add it to the all machines array
        if(!instance) continue;
        if(instance?.PublicIP === "No Public IP" || isNullOrEmpty(instance?.PublicIP) || isNullOrEmpty(instance?.InstanceId)) continue;
        const machine = ALL_MACHINES.find((machine) => machine.ip === instance.PublicIP);
        if(!machine) {
            ALL_MACHINES.push({
                ip: instance.PublicIP,
                isUsed: false,
                instanceId: instance.InstanceId
            })
        }
    }
    
}   

refreshInstances();

// we need to have all the machines state, so we are checking the machines every 10 seconds
setInterval(async () => {
    refreshInstances();
}, 10 * 1000);

app.get("/:projectId", (req, res) => {
    const projectId = req.params.projectId;

    const idleMachine = ALL_MACHINES.find((machine) => machine.isUsed === false);
    if(!idleMachine) {
        // scale up the machines
        setDesiredCapacity(ALL_MACHINES.length + 5 - ALL_MACHINES.filter((machine) => machine.isUsed === false).length)
        res.status(404).send("No machines available, Please wait for some time");
        return;
    }

    idleMachine.isUsed = true;
    idleMachine.assignedProjectId = projectId;
    // scale up the machines
    setDesiredCapacity(ALL_MACHINES.length + 3 - ALL_MACHINES.filter((machine) => machine.isUsed === false).length);
    res.send({
        ip: idleMachine.ip,
        projectId: projectId
    });
});

app.post("/destroy", async (req, res) => {
    const projectId = req.body.projectId;

    // find the machine with the projectId
    const machine = ALL_MACHINES.find((machine) => machine.assignedProjectId === projectId);
    if (!machine) { 
        res.status(404).send("Machine not found");
        return;
    }

    // destroy the machine
    const command = new TerminateInstanceInAutoScalingGroupCommand({
        InstanceId: machine.instanceId,
        ShouldDecrementDesiredCapacity: true
    });
    ALL_MACHINES = ALL_MACHINES.filter((machine) => machine.instanceId !== machine.instanceId);

    const response = await client.send(command);

    res.send("Machine destroyed");  
});

app.listen(9090, () => {
    console.log("Server is running on port 9090");
});


const setDesiredCapacity = async (capacity: number) => {
    const command = new UpdateAutoScalingGroupCommand({
        AutoScalingGroupName: "vscode-asg",
      DesiredCapacity: capacity,
    });
    const response = await client.send(command);
    console.log(response);
}


