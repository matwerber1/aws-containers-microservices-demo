# Overview

This is a work in process, far from complete. 

The rough goals are to:

1. Provide a single Docker image that displays basic container metadata, regardless of whether underlying platform is AWS ECS (EC2 or Fargate), or Kubernetes (K8 or EKS)

2. Demonstrate each of the AWS ECS compute & networking modes: 
    
    * AWS EC2, host mode
    * AWS EC2, bridge mode
    * AWS EC2, aws-vpc mode
    * AWS Fargate, aws-vpc mode

3. Demonstrate inter-service communication via AWS load balancers

4. Demonstrate inter-service communication via service discovery (AWS Cloud Map)

5. Demonstrate a service mesh via AWS AppMesh

6. Demonstrate distributed tracing via AWS Xray