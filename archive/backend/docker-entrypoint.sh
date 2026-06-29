#!/bin/sh
set -e

# Wait for database if DATABASE_URL is provided
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for database to be ready..."
  # Simple wait loop
  ATTEMPTS=0
  until npx prisma migrate status >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ $ATTEMPTS -gt 30 ]; then
      echo "❌ Database not ready after waiting"
      exit 1
    fi
    sleep 2
  done

  echo "✅ Database reachable. Applying migrations..."
  npx prisma migrate deploy
fi

# Generate Prisma client (idempotent)
if [ -d ./prisma ]; then
  npx prisma generate
fi

exec "$@"

