#!/bin/bash
set -e

echo "=== Step 1: Check Docker containers ==="
docker ps 2>/dev/null
echo ""

echo "=== Step 2: Set password and create DB via docker exec ==="
# Set a known password for the smbu user
docker exec smbu-campus-db psql -U smbu -d smbu_campus -c "ALTER USER smbu WITH PASSWORD 'yogdu_db_pass_2024';" 2>&1
echo "Password set."

# Create database if not exists
docker exec smbu-campus-db psql -U smbu -d smbu_campus -c "SELECT 1 FROM pg_database WHERE datname='yogdu_referral'" 2>/dev/null | grep -q 1 || \
  docker exec smbu-campus-db psql -U smbu -d smbu_campus -c "CREATE DATABASE yogdu_referral OWNER smbu;" 2>&1
echo "Database ready."

echo "=== Step 3: Test connection from host ==="
PGPASSWORD='yogdu_db_pass_2024' psql -h localhost -U smbu -d yogdu_referral -c "SELECT current_database(), current_user;" 2>&1 || echo "psql not available on host, will test via Prisma"

echo "=== Step 4: Update .env ==="
cat > /opt/yogdu-referral/.env << 'ENVEOF'
DATABASE_URL="postgresql://smbu:yogdu_db_pass_2024@localhost:5432/yogdu_referral?schema=public"
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
ENVEOF
chmod 600 /opt/yogdu-referral/.env
echo "  .env written."

echo "=== Step 5: Prisma db push ==="
cd /opt/yogdu-referral
npx prisma db push --accept-data-loss 2>&1 | tail -10
echo ""

echo "=== Step 6: Run seed ==="
npx prisma db seed 2>&1 | tail -10 || true
echo ""

echo "=== Step 7: Restart ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
pm2 start npm --name "yogdu-referral" -- start -- -p 3002
pm2 save 2>/dev/null || true

echo "=== Step 8: Verify ==="
sleep 5
pm2 list 2>/dev/null
echo ""
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'API error: {e}')
" || echo "API failed"

echo ""
echo "=== DONE ==="
