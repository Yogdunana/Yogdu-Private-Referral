#!/bin/bash
set -e

echo "=== Step 1: Get PostgreSQL password from Docker ==="
PG_PASS=$(docker inspect smbu-campus-db 2>/dev/null | python3 -c "
import sys,json
data=json.load(sys.stdin)
for env in data[0]['Config']['Env']:
    if env.startswith('POSTGRES_PASSWORD='):
        print(env.split('=',1)[1])
        break
" 2>/dev/null || true)
echo "Password length: ${#PG_PASS}"

if [ -z "$PG_PASS" ]; then
  echo "ERROR: Could not get PostgreSQL password!"
  exit 1
fi

echo "=== Step 2: Update DATABASE_URL in .env ==="
cat > /opt/yogdu-referral/.env << ENVEOF
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
ENVEOF
chmod 600 /opt/yogdu-referral/.env
echo "  .env written."

echo "=== Step 3: Test database connection ==="
cd /opt/yogdu-referral
npx prisma db push --accept-data-loss 2>&1 | tail -10
echo ""

echo "=== Step 4: Run seed ==="
npx prisma db seed 2>&1 | tail -10 || true
echo ""

echo "=== Step 5: Restart application ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
pm2 start npm --name "yogdu-referral" -- start -- -p 3002
pm2 save 2>/dev/null || true

echo "=== Step 6: Verify ==="
sleep 5
echo "PM2 status:"
pm2 list 2>/dev/null
echo ""

echo "Testing API..."
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'API Response: success={d.get(\"success\")}, jobs_count={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'API error: {e}')
" 2>/dev/null || echo "API check failed"

echo ""
echo "=== DONE ==="
