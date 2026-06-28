# ScrollUniversity Quick Deployment Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- kubectl configured
- Docker installed
- Access to Kubernetes cluster

### Deploy in 5 Steps

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (replace with your values)
kubectl create secret generic scrolluniversity-secrets \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/db' \
  --from-literal=REDIS_URL='redis://host:6379' \
  --from-literal=JWT_SECRET='your-secret-min-32-chars' \
  --from-literal=OPENAI_API_KEY='sk-...' \
  -n scrolluniversity

# 3. Apply configuration
kubectl apply -f k8s/configmap.yaml

# 4. Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# 5. Verify deployment
kubectl get pods -n scrolluniversity
```

## 📊 Access Monitoring

### Prometheus
```bash
kubectl port-forward svc/prometheus 9090:9090 -n scrolluniversity
# http://localhost:9090
```

### Grafana
```bash
kubectl port-forward svc/grafana 3000:80 -n scrolluniversity
# http://localhost:3000
# User: admin / Password: (from secret)
```

### Kibana (Logs)
```bash
kubectl port-forward svc/kibana 5601:80 -n scrolluniversity
# http://localhost:5601
```

## 🔍 Common Commands

### Check Status
```bash
# All pods
kubectl get pods -n scrolluniversity

# Specific deployment
kubectl get deployment scrolluniversity-backend -n scrolluniversity

# Logs
kubectl logs -f deployment/scrolluniversity-backend -n scrolluniversity

# Events
kubectl get events -n scrolluniversity --sort-by='.lastTimestamp'
```

### Scale Application
```bash
# Manual scaling
kubectl scale deployment scrolluniversity-backend --replicas=5 -n scrolluniversity

# Check HPA
kubectl get hpa -n scrolluniversity
```

### Update Deployment
```bash
# Update image
kubectl set image deployment/scrolluniversity-backend \
  backend=ghcr.io/scrolluniversity/backend:v2.0.0 \
  -n scrolluniversity

# Monitor rollout
kubectl rollout status deployment/scrolluniversity-backend -n scrolluniversity

# Rollback
kubectl rollout undo deployment/scrolluniversity-backend -n scrolluniversity
```

### Debug Issues
```bash
# Describe pod
kubectl describe pod <pod-name> -n scrolluniversity

# Execute command in pod
kubectl exec -it <pod-name> -n scrolluniversity -- /bin/sh

# Port forward to service
kubectl port-forward svc/scrolluniversity-backend 8080:80 -n scrolluniversity

# Check resource usage
kubectl top pods -n scrolluniversity
```

## 🔐 Security Checklist

- [ ] Update all secrets in `scrolluniversity-secrets`
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable RBAC
- [ ] Configure backup S3 bucket
- [ ] Set up monitoring alerts
- [ ] Configure Slack webhooks
- [ ] Test disaster recovery

## 📦 Backup & Restore

### Manual Backup
```bash
# Trigger backup
kubectl create job --from=cronjob/database-backup manual-backup-$(date +%s) -n scrolluniversity

# Check backup status
kubectl get jobs -n scrolluniversity
```

### Restore
```bash
# List backups
aws s3 ls s3://scrolluniversity-backups/database/

# Download and restore
aws s3 cp s3://scrolluniversity-backups/database/backup.sql.gz /tmp/
gunzip < /tmp/backup.sql.gz | psql $DATABASE_URL
```

## 🚨 Emergency Procedures

### Application Down
```bash
# Check pod status
kubectl get pods -n scrolluniversity

# Restart deployment
kubectl rollout restart deployment/scrolluniversity-backend -n scrolluniversity

# Check logs
kubectl logs -f deployment/scrolluniversity-backend -n scrolluniversity
```

### Database Issues
```bash
# Check database connectivity
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -n scrolluniversity -- \
  psql $DATABASE_URL -c "SELECT 1"
```

### High CPU/Memory
```bash
# Check resource usage
kubectl top pods -n scrolluniversity

# Scale up
kubectl scale deployment scrolluniversity-backend --replicas=10 -n scrolluniversity
```

## 📞 Support

- **Slack**: #scrolluniversity-devops
- **Email**: devops@scrolluniversity.com
- **PagerDuty**: On-call rotation
- **Docs**: See `docs/DEPLOYMENT.md` for full guide

## 🔗 Quick Links

- [Full Deployment Guide](docs/DEPLOYMENT.md)
- [Kubernetes README](k8s/README.md)
- [Architecture Docs](docs/ARCHITECTURE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md)

---

**Last Updated**: December 2024
**Version**: 1.0.0
