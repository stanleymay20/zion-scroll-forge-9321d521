# ScrollUniversity Admissions System Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    redis \
    curl \
    bash

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S admissions && \
    adduser -S admissions -u 1001

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R admissions:admissions /app

# Switch to non-root user
USER admissions

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start command
CMD ["npm", "run", "start:admissions"]