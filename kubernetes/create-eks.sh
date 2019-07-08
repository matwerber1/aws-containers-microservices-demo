#eksctl create cluster -f specs/eksctl-cluster.yaml

aws eks --region us-east-1 update-kubeconfig --name microservices-demo-eks-cluster

kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | grep eks-admin | awk '{print $1}')

kubectl proxy