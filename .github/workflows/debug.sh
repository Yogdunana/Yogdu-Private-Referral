#!/bin/bash
# Fix DATABASE_URL and restart yogdu-referral on port 3002
echo "=== Step 1: Get PostgreSQL password from Docker ==="
# Get the password without printing it
PG_PASS=$(docker exec smbu-campus-db printenv POSTGRES_PASSWORD 2>/dev/null)
echo "Password length: ${#PG_PASS}"

echo "=== Step 2: Update DATABASE_URL in .env ==="
# Use the Docker container's internal networking - connect via localhost:5432
# The Docker postgres exposes 5432 on the host
cat > /opt/yogdu-referral/.env << EOF
DATABASE_URL="postgresql://smbu:${PG_PASS}@localhost:5432/yogdu_referral?schema=public"
JWT_SECRET="yogdu-referral-prod-jwt-secret-change-me-2024"
ARK_API_KEY="fe737e3b-1789-4d6c-8123-61392466c858"
SMTP_HOST="smtp.feishu.cn"
SMTP_PORT="465"
SMTP_USER="noreply@yogdunana.com"
SMTP_PASS="jBMvnnpHL5ZLfUYj"
EMAIL_FROM="noreply@yogdunana.com"
NEXT_PUBLIC_APP_URL="http://101.237.129.33:3002"
NODE_ENV="production"
PORT=3002
EOF

echo "=== Step 3: Verify database connection ==="
cd /opt/yogdu-referral
npx prisma db push --accept-data-loss 2>&1 | tail -5
echo ""

echo "=== Step 4: Run seed ==="
npx prisma db seed 2>&1 | tail -5 || true
echo ""

echo "=== Step 5: Stop existing yogdu-referral PM2 process ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true

echo "=== Step 6: Build ==="
npm run build 2>&1 | tail -5

echo "=== Step 7: Start on port 3002 ==="
pm2 start npm --name "yogdu-referral" -- start -- -p 3002
pm2 save 2>/dev/null || true

echo "=== Step 8: Verify ==="
sleep 3
pm2 list
echo ""
curl -s http://localhost:3002 2>/dev/null | head -3 || echo "Failed to connect to port 3002"
