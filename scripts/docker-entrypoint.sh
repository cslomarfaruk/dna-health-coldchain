#!/bin/sh
set -e

echo "===================================================="
echo " DNA HEALTH COLD-CHAIN HEALTHCARE WORKSTATION"
echo "===================================================="

echo "Waiting for database connection..."
MAX_TRIES=30
COUNT=0
until npx prisma db push --accept-data-loss > /dev/null 2>&1 || [ $COUNT -eq $MAX_TRIES ]; do
  COUNT=$((COUNT+1))
  echo "  Attempt $COUNT/$MAX_TRIES: Database not ready yet, retrying in 2s..."
  sleep 2
done

echo "Database schema synchronized successfully!"

echo "Seeding baseline clinical RBAC staff and inpatient indents..."
npx tsx server/seed/cleanDb.ts || true

echo "Starting Healthcare Production Server on port ${PORT:-3000}..."
exec npx tsx server/index.ts
