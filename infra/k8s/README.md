# ScrollUniversity Kubernetes Infrastructure

This directory contains all Kubernetes manifests for deploying ScrollUniversity to production.

## Directory Structure

```
k8s/
├── namespace.yaml              # Namespace, ResourceQuota, LimitRange
├── configmap.yaml              # Application configuration
├── secrets.yaml                # Secrets template (DO NOT commit actual secrets)
├── backend-deployment.yaml     # Backend API deployment, service, HPA
├── frontend-deployment.yaml    # Frontend web deployment, service, HPA
├── ingress.yaml                # Ingress controller, SSL certificates
├── monitoring/                 # Monitoring stack
│   ├── prometheus.yaml         # Prometheus deployment and configuration
│   ├── grafana.yaml            # Grafana deployment and dashboards
│   └── alertmanager.yaml       # Alertmanager for alerts
├── logging/                    # Logging stack (ELK)
│   ├── elasticsearch.yaml      # Elasticsearch cluster
│   ├── logstash.yaml           # Logstash for log processing
│   ├── kibana.yaml             # Kibana for log visualization
│   └── filebeat.yaml           # Filebeat for log collection
└── backup/                     # Backup system
    └── backup-cronjob.yaml     # Automated backup CronJobs
```

## Quick Start

### 1. Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify kubectl
kubectl version --client

# Configure kubectl to connect to your cluster
kubectl config use-context your-cluster-context
```

### 2. Create Namespace

```bash
kubectl apply -f namespace.yaml
```

### 3. Create Secrets

**IMPORTANT**: Never commit actual secrets to version control!

```bash
# Create secrets from environment file
kubectl create secret generic scrolluniversity-secrets \
  --from-env-file=../.env.production \
  -n scrolluniversity

# Or create secrets manually
kubectl create secret generic scrolluniversity-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=REDIS_URL='redis://...' \
  --from-literal=JWT_SECRET='your-secret' \
  --from-literal=OPENAI_API_KEY='sk-...' \
  -n scrolluniversity
```

### 4. Apply ConfigMaps

```bash
kubectl apply -f configmap.yaml
```

### 5. Deploy Application

```bash
# Deploy backend
kubectl apply -f backend-deployment.yaml

# Deploy frontend
kubectl apply -f frontend-deployment.yaml

# Deploy ingress
kubectl apply -f ingress.yaml
```

### 6. Verify Deployment

```bash
# Check pods
kubectl get pods -n scrolluniversity

# Check services
kubectl get services -n scrolluniversity

# Check ingress
kubectl get ingress -n scrolluniversity

# Check logs
kubectl logs -f deployment/scrolluniversity-backend -n scrolluniversity
```

## Monitoring Setup

### Deploy Prometheus

```bash
kubectl apply -f monitoring/prometheus.yaml

# Access Prometheus UI
kubectl port-forward svc/prometheus 9090:9090 -n scrolluniversity
# Open http://localhost:9090
```

### Deploy Grafana

```bash
kubectl apply -f monitoring/grafana.yaml

# Get admin password
kubectl get secret grafana-secrets -n scrolluniversity -o jsonpath="{.data.admin-password}" | base64 -d

# Access Grafana UI
kubectl port-forward svc/grafana 3000:80 -n scrolluniversity
# Open http://localhost:3000
```

### Deploy Alertmanager

```bash
# Update Slack webhook in alertmanager.yaml first
kubectl apply -f monitoring/alertmanager.yaml
```

## Logging Setup

### Deploy ELK Stack

```bash
# Deploy Elasticsearch
kubectl apply -f logging/elasticsearch.yaml

# Wait for Elasticsearch to be ready
kubectl wait --for=condition=ready pod -l app=elasticsearch -n scrolluniversity --timeout=300s

# Deploy Logstash
kubectl apply -f logging/logstash.yaml

# Deploy Kibana
kubectl apply -f logging/kibana.yaml

# Deploy Filebeat
kubectl apply -f logging/filebeat.yaml

# Access Kibana
kubectl port-forward svc/kibana 5601:80 -n scrolluniversity
# Open http://localhost:5601
```

## Backup Setup

### Configure S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://scrolluniversity-backups

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket scrolluniversity-backups \
  --versioning-configuration Status=Enabled
```

### Deploy Backup CronJobs

```bash
kubectl apply -f backup/backup-cronjob.yaml

# Verify CronJobs
kubectl get cronjobs -n scrolluniversity

# Manually trigger backup
kubectl create job --from=cronjob/database-backup manual-backup-$(date +%s) -n scrolluniversity
```

## Scaling

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment scrolluniversity-backend --replicas=5 -n scrolluniversity

# Scale frontend
kubectl scale deployment scrolluniversity-frontend --replicas=3 -n scrolluniversity
```

### Auto-scaling

HorizontalPodAutoscaler is configured automatically:
- Backend: 3-20 replicas (CPU: 70%, Memory: 80%)
- Frontend: 3-10 replicas (CPU: 70%, Memory: 80%)

```bash
# Check HPA status
kubectl get hpa -n scrolluniversity

# Describe HPA
kubectl describe hpa scrolluniversity-backend-hpa -n scrolluniversity
```

## Updating Deployments

### Update Image

```bash
# Update backend image
kubectl set image deployment/scrolluniversity-backend \
  backend=ghcr.io/scrolluniversity/backend:v2.0.0 \
  -n scrolluniversity

# Monitor rollout
kubectl rollout status deployment/scrolluniversity-backend -n scrolluniversity

# Check rollout history
kubectl rollout history deployment/scrolluniversity-backend -n scrolluniversity
```

### Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/scrolluniversity-backend -n scrolluniversity

# Rollback to specific revision
kubectl rollout undo deployment/scrolluniversity-backend --to-revision=2 -n scrolluniversity
```

## Troubleshooting

### Check Pod Status

```bash
# Get pod status
kubectl get pods -n scrolluniversity

# Describe pod
kubectl describe pod <pod-name> -n scrolluniversity

# Get pod logs
kubectl logs <pod-name> -n scrolluniversity

# Get previous pod logs (if crashed)
kubectl logs <pod-name> -n scrolluniversity --previous

# Execute command in pod
kubectl exec -it <pod-name> -n scrolluniversity -- /bin/sh
```

### Check Events

```bash
# Get recent events
kubectl get events -n scrolluniversity --sort-by='.lastTimestamp'

# Watch events
kubectl get events -n scrolluniversity --watch
```

### Check Resource Usage

```bash
# Check pod resource usage
kubectl top pods -n scrolluniversity

# Check node resource usage
kubectl top nodes

# Check resource limits
kubectl describe pod <pod-name> -n scrolluniversity | grep -A 5 "Limits"
```

### Debug Network Issues

```bash
# Test service connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n scrolluniversity -- \
  wget -O- http://scrolluniversity-backend

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n scrolluniversity -- \
  nslookup scrolluniversity-backend
```

### Check Ingress

```bash
# Get ingress details
kubectl describe ingress scrolluniversity-ingress -n scrolluniversity

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Security Best Practices

1. **Never commit secrets**: Use external secrets management
2. **Use RBAC**: Implement Role-Based Access Control
3. **Network Policies**: Restrict pod-to-pod communication
4. **Pod Security**: Use Pod Security Standards
5. **Image Scanning**: Scan images for vulnerabilities
6. **Regular Updates**: Keep Kubernetes and images updated
7. **Audit Logging**: Enable Kubernetes audit logs

## Resource Limits

### Backend Pods

- Requests: 500m CPU, 1Gi Memory
- Limits: 2000m CPU, 4Gi Memory

### Frontend Pods

- Requests: 100m CPU, 128Mi Memory
- Limits: 500m CPU, 512Mi Memory

### Monitoring Pods

- Prometheus: 500m-2000m CPU, 2-4Gi Memory
- Grafana: 250m-1000m CPU, 512Mi-2Gi Memory
- Elasticsearch: 1000m-2000m CPU, 4-8Gi Memory

## Maintenance

### Database Migrations

```bash
# Run migrations
kubectl exec -it deployment/scrolluniversity-backend -n scrolluniversity -- \
  npm run migrate:production
```

### Clear Cache

```bash
# Clear Redis cache
kubectl exec -it deployment/redis -n scrolluniversity -- \
  redis-cli FLUSHALL
```

### Restart Deployment

```bash
# Restart backend
kubectl rollout restart deployment/scrolluniversity-backend -n scrolluniversity

# Restart frontend
kubectl rollout restart deployment/scrolluniversity-frontend -n scrolluniversity
```

## Monitoring Dashboards

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Pod CPU usage
rate(container_cpu_usage_seconds_total{namespace="scrolluniversity"}[5m])

# Pod memory usage
container_memory_usage_bytes{namespace="scrolluniversity"}
```

### Grafana Dashboards

Import these dashboard IDs:
- 7249: Kubernetes Cluster Monitoring
- 1860: Node Exporter Full
- 9628: PostgreSQL Database
- 11835: Redis Dashboard

## Support

For infrastructure issues:
- Slack: #scrolluniversity-devops
- Email: devops@scrolluniversity.com
- On-call: PagerDuty rotation

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Documentation](https://www.elastic.co/guide/)
