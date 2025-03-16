import { AutoScalingClient, UpdateAutoScalingGroupCommand, DescribeAutoScalingInstancesCommand } from "@aws-sdk/client-auto-scaling";
import { EC2Client, DescribeInstancesCommand, TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import express from "express";
import dotenv from "dotenv";

const app = express();

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
    id: string;
    isUsed: boolean;
    assignedProjectId?: string
}

// storing in memory, we can store in db or redis
const ALL_MACHINES: Machine[] = [];

async function refreshInstances() {
    const command = new DescribeAutoScalingInstancesCommand();

    const data = await client.send(command);
    
    // need to complete this
}   

refreshInstances();

// we need to have all the machines state, so we are checking the machines every 10 seconds
setInterval(async () => {
    refreshInstances();
}, 10 * 1000);

app.get("/:projectId", (req, res) => {
    const projectId = req.params.projectId;


    res.send(`Hello World ${projectId}`);
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
    const command = new TerminateInstancesCommand({
        InstanceIds: [machine.id]
    });

    await ec2Client.send(command);

    res.send("Machine destroyed");  
});

app.listen(9090, () => {
    console.log("Server is running on port 9090");
});


// const command = new UpdateAutoScalingGroupCommand({
//     AutoScalingGroupName: "vscode-asg",
//   DesiredCapacity: 3,
// });

// const main = async () => {
//     const response = await client.send(command);
//     console.log(response);
// }

// main();

