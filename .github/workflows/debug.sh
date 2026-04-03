#!/bin/bash
set -e

echo "=== Step 1: Verify PostgreSQL is running on port 5433 ==="
pg_isready -p 5433 2>/dev/null && echo "PostgreSQL is ready on port 5433." || {
  echo "Starting PostgreSQL..."
  pg_ctlcluster 14 main start 2>&1 || true
  sleep 2
}
echo ""

echo "=== Step 2: Verify user and database ==="
su - postgres -c "psql -p 5433 -c \"SELECT rolname FROM pg_roles WHERE rolname='yogdu'\"" 2>&1
su - postgres -c "psql -p 5433 -c \"SELECT datname FROM pg_database WHERE datname='yogdu_referral'\"" 2>&1
echo ""

echo "=== Step 3: Grant permissions ==="
su - postgres -c "psql -p 5433 -c \"GRANT ALL PRIVILEGES ON DATABASE yogdu_referral TO yogdu;\"" 2>&1
su - postgres -c "psql -p 5433 -d yogdu_referral -c \"GRANT ALL ON SCHEMA public TO yogdu;\"" 2>&1
echo "Permissions granted."
echo ""

echo "=== Step 4: Test connection ==="
PGPASSWORD='yogdu_referral_2024' psql -h 127.0.0.1 -p 5433 -U yogdu -d yogdu_referral -c "SELECT current_database(), current_user;" 2>&1
echo ""

echo "=== Step 5: Update .env with port 5433 ==="
cat > /opt/yogdu-referral/.env << 'ENVEOF'
DATABASE_URL="postgresql://yogdu:yogdu_referral_2024@127.0.0.1:5433/yogdu_referral?schema=public"
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
echo "  .env written with port 5433."

echo "=== Step 6: Prisma db push ==="
cd /opt/yogdu-referral
npx prisma db push --accept-data-loss 2>&1 | tail -10
echo ""

echo "=== Step 7: Run seed ==="
npx prisma db seed 2>&1 | tail -10 || true
echo ""

echo "=== Step 8: Restart application ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
pm2 start npm --name "yogdu-referral" -- start -- -p 3002
pm2 save 2>/dev/null || true

echo "=== Step 9: Verify ==="
sleep 5
pm2 list 2>/dev/null
echo ""
echo "Testing API..."
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'API error: {e}')
" || echo "API failed"

echo ""
echo "Testing login..."
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Login: success={d.get(\"success\")}, has_token={bool(d.get(\"token\"))}')
except Exception as e:
    print(f'Login error: {e}')
" || echo "Login failed"

echo ""
echo "=== DONE ==="
