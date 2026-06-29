# ScrollUniversity Backend API - Production Dockerfile
# Multi-stage build for small, secure runtime image

FROM node:20-alpine AS builder

WORKDIR /app

# System deps required by Prisma and some native addons
RUN apk add --no-cache openssl libc6-compat python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

# System deps required by Prisma
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Copy only what we need to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]


