# Worker Orchestrator

A service designed to dynamically manage EC2 instances for a VS Code-like online code editor application, where each user gets their own dedicated EC2 instance.

## Overview

The Worker Orchestrator service automatically manages EC2 instances through AWS Auto Scaling Groups (ASG), ensuring:
- Dynamic scaling based on user demand
- Automatic instance assignment to users
- Efficient resource management
- Minimal wait times for new users

## System Architecture

### Infrastructure Setup
1. Base EC2 Instance Configuration:
   - EC2 instance with Docker installed
   - Running code-server (VS Code in browser) + Node.js image
   - Custom AMI created from this configuration

2. AWS Components:
   - Launch Template using custom AMI
   - Auto Scaling Group using the template
   - IAM user with EC2 and ASG permissions

### Service Features
- Programmatic control of ASG desired capacity
- Dynamic instance allocation per project/user
- Instance health monitoring
- Automatic cleanup of unused instances

## API Endpoints

- `GET /:projectId` - Assign/get instance for a project
- `POST /destroy` - Release and terminate an instance

## Environment Setup

Required environment variables:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```


## Tech Stack
- TypeScript
- Express.js
- AWS SDK (EC2 & Auto Scaling)
- Docker
- code-server (VS Code in browser)

## Video explanation-
https://drive.google.com/file/d/1n3ITOQiLkr2uC7YXLqxsSquLwGXci_4z/view
