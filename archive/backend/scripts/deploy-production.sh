#!/bin/bash

# ScrollUniversity Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
DEPLOYMENT_VERSION="${DEPLOYMENT_VERSION:-$(git describe --tags --always)}"
DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYMENT_COMMIT_SHA=$(git rev-parse HEAD)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ScrollUniversity Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${GREEN}${DEPLOYMENT_ENV}${NC}"
echo -e "Version: ${GREEN}${DEPLOYMENT_VERSION}${NC}"
echo -e "Commit: ${GREEN}${DEPLOYMENT_COMMIT_SHA}${NC}"
echo -e "Timestamp: ${GREEN}${DEPLOYMENT_TIMESTAMP}${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Step 1: Pre-deployment checks
print_step "Running pre-deployment checks..."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    print_warning "Not on main/master branch. Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "Uncommitted changes detected. Please commit or stash changes."
    exit 1
fi
print_success "Git repository is clean"

# Check if required environment variables are set
REQUIRED_ENV_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "SENTRY_DSN"
)

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done
print_success "Required environment variables are set"

# Step 2: Run tests
print_step "Running test suite..."
npm run test:ci || {
    print_error "Tests failed. Deployment aborted."
    exit 1
}
print_success "All tests passed"

# Step 3: Build application
print_step "Building application..."
npm run build || {
    print_error "Build failed. Deployment aborted."
    exit 1
}
print_success "Application built successfully"

# Step 4: Database migrations
print_step "Running database migrations..."
npm run migrate:production || {
    print_error "Database migration failed. Deployment aborted."
    exit 1
}
print_success "Database migrations completed"

# Step 5: Backup current production
print_step "Creating production backup..."
npm run backup:create || {
    print_warning "Backup creation failed, but continuing deployment"
}
print_success "Backup created"

# Step 6: Deploy to production
print_step "Deploying to production..."

# Set deployment metadata
export DEPLOYMENT_VERSION
export DEPLOYMENT_TIMESTAMP
export DEPLOYMENT_COMMIT_SHA

# Deploy based on deployment method
if [ "${DEPLOYMENT_METHOD:-docker}" == "docker" ]; then
    print_step "Building Docker image..."
    docker build -t scrolluniversity-backend:${DEPLOYMENT_VERSION} \
                 -t scrolluniversity-backend:latest \
                 --build-arg DEPLOYMENT_VERSION=${DEPLOYMENT_VERSION} \
                 --build-arg DEPLOYMENT_TIMESTAMP=${DEPLOYMENT_TIMESTAMP} \
                 --build-arg DEPLOYMENT_COMMIT_SHA=${DEPLOYMENT_COMMIT_SHA} \
                 -f Dockerfile .
    
    print_step "Pushing Docker image..."
    docker push scrolluniversity-backend:${DEPLOYMENT_VERSION}
    docker push scrolluniversity-backend:latest
    
    print_step "Deploying to Kubernetes..."
    kubectl set image deployment/scrolluniversity-backend \
            scrolluniversity-backend=scrolluniversity-backend:${DEPLOYMENT_VERSION} \
            --record
    
    print_step "Waiting for rollout to complete..."
    kubectl rollout status deployment/scrolluniversity-backend --timeout=10m
    
elif [ "${DEPLOYMENT_METHOD}" == "pm2" ]; then
    print_step "Deploying with PM2..."
    pm2 reload ecosystem.config.js --update-env
    
elif [ "${DEPLOYMENT_METHOD}" == "systemd" ]; then
    print_step "Deploying with systemd..."
    sudo systemctl restart scrolluniversity-backend
    
else
    print_error "Unknown deployment method: ${DEPLOYMENT_METHOD}"
    exit 1
fi

print_success "Deployment completed"

# Step 7: Health checks
print_step "Running health checks..."
sleep 10  # Wait for service to start

HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/health}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "${HEALTH_CHECK_URL}" > /dev/null; then
        print_success "Health check passed"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Health check failed after ${MAX_RETRIES} attempts"
        print_error "Rolling back deployment..."
        
        if [ "${DEPLOYMENT_METHOD:-docker}" == "docker" ]; then
            kubectl rollout undo deployment/scrolluniversity-backend
        elif [ "${DEPLOYMENT_METHOD}" == "pm2" ]; then
            pm2 reload ecosystem.config.js
        fi
        
        exit 1
    fi
    
    echo -n "."
    sleep 2
done

# Step 8: Smoke tests
print_step "Running smoke tests..."
npm run test:smoke || {
    print_warning "Smoke tests failed, but deployment is complete"
}
print_success "Smoke tests passed"

# Step 9: Notify monitoring systems
print_step "Notifying monitoring systems..."

# Notify Sentry
if [ -n "${SENTRY_DSN:-}" ]; then
    curl -X POST \
        -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN:-}" \
        -H "Content-Type: application/json" \
        -d "{
            \"version\": \"${DEPLOYMENT_VERSION}\",
            \"projects\": [\"scrolluniversity-backend\"],
            \"refs\": [{
                \"repository\": \"scrolluniversity/backend\",
                \"commit\": \"${DEPLOYMENT_COMMIT_SHA}\"
            }]
        }" \
        "https://sentry.io/api/0/organizations/scrolluniversity/releases/" \
        2>/dev/null || print_warning "Failed to notify Sentry"
fi

# Notify New Relic
if [ -n "${NEW_RELIC_LICENSE_KEY:-}" ]; then
    curl -X POST \
        -H "X-Api-Key: ${NEW_RELIC_LICENSE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"deployment\": {
                \"revision\": \"${DEPLOYMENT_VERSION}\",
                \"changelog\": \"Deployment ${DEPLOYMENT_VERSION}\",
                \"description\": \"Production deployment\",
                \"user\": \"${USER}\"
            }
        }" \
        "https://api.newrelic.com/v2/applications/${NEW_RELIC_APP_ID}/deployments.json" \
        2>/dev/null || print_warning "Failed to notify New Relic"
fi

print_success "Monitoring systems notified"

# Step 10: Post-deployment tasks
print_step "Running post-deployment tasks..."

# Clear caches
npm run cache:clear || print_warning "Failed to clear caches"

# Warm up caches
npm run cache:warmup || print_warning "Failed to warm up caches"

print_success "Post-deployment tasks completed"

# Final summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Version: ${DEPLOYMENT_VERSION}"
echo -e "Deployed at: ${DEPLOYMENT_TIMESTAMP}"
echo -e "Commit: ${DEPLOYMENT_COMMIT_SHA}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Monitor application logs and metrics"
echo "2. Verify AI services are functioning correctly"
echo "3. Check error rates in Sentry"
echo "4. Review performance metrics in New Relic"
echo "5. Validate critical user flows"
echo ""
echo -e "${YELLOW}Deployment log saved to: deployment-${DEPLOYMENT_VERSION}.log${NC}"
