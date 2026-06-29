# ScrollUniversity AI Services Operations Runbook

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Troubleshooting Procedures](#troubleshooting-procedures)
5. [Escalation Paths](#escalation-paths)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Emergency Procedures](#emergency-procedures)

---

## Overview

This runbook provides operational procedures for managing ScrollUniversity's AI automation services in production. It covers common issues, troubleshooting steps, and escalation procedures.

### Key Contacts

- **On-Call Engineer**: [PagerDuty rotation]
- **AI Team Lead**: [Contact info]
- **DevOps Team**: [Contact info]
- **Security Team**: [Contact info]

### Service Level Objectives (SLOs)

- **Uptime**: 99.9% (43 minutes downtime/month)
- **Response Time**: <3 seconds average
- **Error Rate**: <1%
- **AI Accuracy**: >90%

---

## System Architecture

### Core Components

1. **AI Gateway Service**: Central orchestration for all AI requests
2. **Vector Store**: Semantic search and RAG functionality
3. **Cache Layer**: Redis-based response caching
4. **15 AI Services**: Specialized services for different functions

### Dependencies

- **External APIs**: OpenAI, Anthropic, Pinecone, Turnitin, GPTZero
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: AWS S3
- **Monitoring**: Sentry, New Relic, Prometheus

---

## Common Issues & Solutions

### Issue 1: High AI API Costs

**Symptoms:**
- Budget alerts triggered
- Cost dashboard showing unusual spikes
- AI_BUDGET_ALERT_THRESHOLD exceeded

**Quick Fix:**
```bash
# Check current spending
curl http://localhost:3000/api/cost-optimization/budget/status

# Enable cost throttling
curl -X POST http://localhost:3000/api/cost-optimization/throttle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "level": "moderate"}'
```

**Root Cause Analysis:**
1. Check for unusual request patterns
2. Review cache hit rates
3. Identify services with high token usage
4. Check for retry loops

**Prevention:**
- Monitor budget alerts daily
- Review cost optimization metrics weekly
- Implement rate limiting per user
- Optimize prompts for token efficiency

---

### Issue 2: Slow AI Response Times

**Symptoms:**
- Response times >5 seconds
- User complaints about slow AI features
- P95 response time alerts

**Quick Fix:**
```bash
# Check service health
curl http://localhost:3000/health

# Check AI Gateway metrics
curl http://localhost:3000/api/ai-monitoring/metrics/AIGatewayService

# Restart slow services
kubectl rollout restart deployment/ai-gateway-service
```

**Root Cause Analysis:**
1. Check OpenAI/Anthropic API status
2. Review cache hit rates
3. Check database query performance
4. Verify network latency

**Prevention:**
- Implement aggressive caching
- Use batch processing where possible
- Monitor API provider status
- Optimize database queries

---

### Issue 3: AI Service Failures

**Symptoms:**
- 500 errors from AI endpoints
- Sentry error alerts
- Service health checks failing

**Quick Fix:**
```bash
# Check service logs
kubectl logs -f deployment/[service-name] --tail=100

# Check error rates
curl http://localhost:3000/api/ai-monitoring/errors

# Restart failing service
kubectl rollout restart deployment/[service-name]
```

**Root Cause Analysis:**
1. Review error logs in Sentry
2. Check API key validity
3. Verify rate limits not exceeded
4. Check for code deployment issues

**Prevention:**
- Implement circuit breakers
- Use fallback models
- Monitor error rates continuously
- Test deployments in staging first

---

### Issue 4: Cache Misses

**Symptoms:**
- Low cache hit rates (<70%)
- Increased API costs
- Slower response times

**Quick Fix:**
```bash
# Check cache status
redis-cli INFO stats

# Check cache hit rate
curl http://localhost:3000/api/cost-optimization/cache/stats

# Clear and rebuild cache
curl -X POST http://localhost:3000/api/cost-optimization/cache/rebuild
```

**Root Cause Analysis:**
1. Review cache TTL settings
2. Check cache key generation logic
3. Verify Redis memory limits
4. Check for cache eviction patterns

**Prevention:**
- Optimize cache TTL values
- Implement semantic caching
- Monitor cache memory usage
- Use cache warming strategies

---

### Issue 5: Theological Alignment Failures

**Symptoms:**
- Content flagged by theological checker
- Low theological alignment scores
- Faculty complaints about AI content

**Quick Fix:**
```bash
# Check theological alignment metrics
curl http://localhost:3000/api/qa/theological-alignment/metrics

# Review flagged content
curl http://localhost:3000/api/qa/theological-alignment/flagged

# Trigger manual review
curl -X POST http://localhost:3000/api/qa/review/create \
  -H "Content-Type: application/json" \
  -d '{"contentId": "xxx", "priority": "high"}'
```

**Root Cause Analysis:**
1. Review AI prompts for theological context
2. Check training data quality
3. Verify theological review process
4. Assess model fine-tuning needs

**Prevention:**
- Include theological context in all prompts
- Regular theological review of AI outputs
- Fine-tune models on approved content
- Implement human-in-the-loop for sensitive content

---

### Issue 6: Database Connection Issues

**Symptoms:**
- Database connection errors
- Timeout errors
- Connection pool exhausted

**Quick Fix:**
```bash
# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool
curl http://localhost:3000/api/monitoring/database/pool

# Restart application to reset connections
kubectl rollout restart deployment/scrolluniversity-backend
```

**Root Cause Analysis:**
1. Check connection pool configuration
2. Review long-running queries
3. Verify database resource limits
4. Check for connection leaks

**Prevention:**
- Optimize connection pool settings
- Implement query timeouts
- Monitor connection usage
- Use connection pooling best practices

---

### Issue 7: Vector Store Issues

**Symptoms:**
- RAG queries failing
- Semantic search not working
- Pinecone/Weaviate errors

**Quick Fix:**
```bash
# Check vector store status
curl http://localhost:3000/api/ai-monitoring/vector-store/status

# Rebuild vector index
curl -X POST http://localhost:3000/api/vector-store/rebuild

# Check index statistics
curl http://localhost:3000/api/vector-store/stats
```

**Root Cause Analysis:**
1. Verify API key validity
2. Check index configuration
3. Review embedding generation
4. Verify data ingestion pipeline

**Prevention:**
- Monitor vector store health
- Regular index maintenance
- Backup vector data
- Test embedding quality

---

## Troubleshooting Procedures

### General Troubleshooting Steps

1. **Check Service Health**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/ready
   ```

2. **Review Logs**
   ```bash
   # Application logs
   kubectl logs -f deployment/scrolluniversity-backend --tail=100
   
   # AI service logs
   kubectl logs -f deployment/ai-gateway-service --tail=100
   
   # Check Sentry for errors
   # Visit: https://sentry.io/organizations/scrolluniversity/issues/
   ```

3. **Check Metrics**
   ```bash
   # Prometheus metrics
   curl http://localhost:3000/metrics
   
   # Performance dashboard
   curl http://localhost:3000/api/monitoring/dashboard
   
   # AI monitoring
   curl http://localhost:3000/api/ai-monitoring/overview
   ```

4. **Verify External Services**
   ```bash
   # OpenAI status
   curl https://status.openai.com/api/v2/status.json
   
   # Anthropic status
   # Check: https://status.anthropic.com/
   
   # Database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Redis connectivity
   redis-cli PING
   ```

5. **Check Recent Deployments**
   ```bash
   # Kubernetes deployment history
   kubectl rollout history deployment/scrolluniversity-backend
   
   # Check recent changes
   git log --oneline -10
   ```

---

## Escalation Paths

### Severity Levels

#### P0 - Critical (Immediate Response)
- **Definition**: Complete service outage, data loss, security breach
- **Response Time**: 15 minutes
- **Escalation**: Immediately page on-call engineer + AI Team Lead
- **Examples**: 
  - All AI services down
  - Data breach detected
  - Complete database failure

#### P1 - High (Urgent Response)
- **Definition**: Major functionality broken, significant user impact
- **Response Time**: 1 hour
- **Escalation**: Page on-call engineer
- **Examples**:
  - Single AI service completely down
  - High error rates (>10%)
  - Budget exceeded by 50%

#### P2 - Medium (Standard Response)
- **Definition**: Degraded performance, partial functionality loss
- **Response Time**: 4 hours
- **Escalation**: Notify on-call engineer via Slack
- **Examples**:
  - Slow response times
  - Elevated error rates (5-10%)
  - Cache failures

#### P3 - Low (Routine Response)
- **Definition**: Minor issues, no immediate user impact
- **Response Time**: Next business day
- **Escalation**: Create ticket, no immediate notification
- **Examples**:
  - Low cache hit rates
  - Minor configuration issues
  - Non-critical warnings

### Escalation Contacts

1. **On-Call Engineer** (24/7)
   - PagerDuty: [rotation]
   - Phone: [number]
   - Slack: @oncall

2. **AI Team Lead**
   - Email: [email]
   - Phone: [number]
   - Slack: @ai-lead

3. **DevOps Team**
   - Email: [email]
   - Slack: #devops

4. **Security Team**
   - Email: [email]
   - Phone: [number]
   - Slack: #security

---

## Monitoring & Alerts

### Key Dashboards

1. **Grafana Main Dashboard**
   - URL: https://grafana.scrolluniversity.com/d/main
   - Metrics: Overall system health, request rates, error rates

2. **AI Services Dashboard**
   - URL: https://grafana.scrolluniversity.com/d/ai-services
   - Metrics: AI request rates, costs, response times, accuracy

3. **Cost Dashboard**
   - URL: https://grafana.scrolluniversity.com/d/costs
   - Metrics: Daily/monthly spending, budget utilization, cost per service

4. **Sentry Error Dashboard**
   - URL: https://sentry.io/organizations/scrolluniversity/
   - Metrics: Error rates, error types, affected users

### Alert Configuration

Alerts are configured in Prometheus and sent via:
- **PagerDuty**: Critical and high-priority alerts
- **Slack**: All alerts to #alerts channel
- **Email**: Critical alerts to on-call rotation

### Alert Response Checklist

When an alert fires:

1. ☐ Acknowledge alert in PagerDuty
2. ☐ Check service health and logs
3. ☐ Identify root cause
4. ☐ Apply quick fix if available
5. ☐ Monitor for resolution
6. ☐ Document incident
7. ☐ Create follow-up tasks
8. ☐ Conduct post-mortem (for P0/P1)

---

## Maintenance Procedures

### Daily Maintenance

- [ ] Review overnight alerts
- [ ] Check cost dashboard for anomalies
- [ ] Verify backup completion
- [ ] Review error rates in Sentry

### Weekly Maintenance

- [ ] Review AI service metrics
- [ ] Analyze cost trends
- [ ] Check cache performance
- [ ] Review theological alignment scores
- [ ] Update documentation as needed

### Monthly Maintenance

- [ ] Review and optimize AI prompts
- [ ] Analyze user feedback
- [ ] Update cost budgets
- [ ] Review and update runbook
- [ ] Conduct disaster recovery drill
- [ ] Review access controls

### Quarterly Maintenance

- [ ] Major version updates
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning
- [ ] Team training updates

---

## Emergency Procedures

### Complete Service Outage

1. **Immediate Actions**
   ```bash
   # Check all services
   kubectl get pods -A
   
   # Check recent deployments
   kubectl rollout history deployment/scrolluniversity-backend
   
   # Rollback if needed
   kubectl rollout undo deployment/scrolluniversity-backend
   ```

2. **Communication**
   - Post status update to status page
   - Notify users via email/Slack
   - Update stakeholders

3. **Recovery**
   - Restore from backup if needed
   - Verify data integrity
   - Gradually restore services
   - Monitor closely

### Data Breach

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team
   - Engage incident response plan

2. **Investigation**
   - Review access logs
   - Identify breach scope
   - Assess data exposure
   - Document findings

3. **Remediation**
   - Patch vulnerabilities
   - Rotate credentials
   - Notify affected users
   - File required reports

### Budget Exceeded

1. **Immediate Actions**
   ```bash
   # Enable emergency throttling
   curl -X POST http://localhost:3000/api/cost-optimization/emergency-throttle
   
   # Check spending breakdown
   curl http://localhost:3000/api/cost-optimization/spending/breakdown
   ```

2. **Analysis**
   - Identify cost drivers
   - Review unusual patterns
   - Check for abuse

3. **Mitigation**
   - Implement stricter rate limits
   - Optimize expensive operations
   - Request budget increase if justified

---

## Appendix

### Useful Commands

```bash
# Check service status
kubectl get pods -n production

# View logs
kubectl logs -f deployment/scrolluniversity-backend -n production

# Restart service
kubectl rollout restart deployment/scrolluniversity-backend -n production

# Scale service
kubectl scale deployment/scrolluniversity-backend --replicas=5 -n production

# Check database
psql $DATABASE_URL -c "SELECT version();"

# Check Redis
redis-cli INFO

# Test AI Gateway
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

### Configuration Files

- Production config: `backend/.env.production`
- Kubernetes manifests: `k8s/`
- Monitoring config: `monitoring/prometheus.yml`
- Alert rules: `monitoring/alerts.yml`

### Related Documentation

- [AI Services API Documentation](./ai-api-documentation.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [Security Procedures](./SECURITY_PROCEDURES.md)
- [Disaster Recovery Plan](./DISASTER_RECOVERY.md)

---

**Last Updated**: [Date]
**Version**: 1.0
**Maintained By**: DevOps Team
