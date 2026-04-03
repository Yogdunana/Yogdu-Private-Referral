#!/bin/bash
set -e

echo "=== Step 1: Ensure .env exists ==="
cat > /opt/yogdu-referral/.env << 'ENVEOF'
DATABASE_URL="postgresql://yogdu:yogdu_referral_2024@127.0.0.1:5433/yogdu_referral?schema=public"
JWT_SECRET="yogdu-referral-prod-jwt-secret-change-me-2024"
ARK_API_KEY="fe737e3b-1789-4d6c-8123-61392466c858"
SMTP_HOST="smtp.feishu.cn"
SMTP_PORT="465"
SMTP_USER="noreply@yogdunana.com"
SMTP_PASS="jBMvnnpHL5ZLfUYj"
EMAIL_FROM="noreply@yogdunana.com"
NEXT_PUBLIC_APP_URL="http://101.237.129.33"
NODE_ENV="production"
PORT=3002
ENVEOF
chmod 600 /opt/yogdu-referral/.env
echo "  .env created."
echo ""

echo "=== Step 2: Ensure PostgreSQL is running ==="
pg_ctlcluster 14 main start 2>/dev/null || true
sleep 1
pg_isready -p 5433 2>/dev/null && echo "PostgreSQL ready." || echo "PostgreSQL NOT ready!"
echo ""

echo "=== Step 3: Build application ==="
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
echo "Running prisma generate..."
npx prisma generate 2>&1 | tail -3
echo "Running prisma db push..."
npx prisma db push 2>&1 | tail -5
echo "Running npm run build (this takes a few minutes)..."
npm run build 2>&1 | tail -10
echo ""

echo "=== Step 4: Seed ==="
npx prisma db seed 2>&1 | tail -5 || true
echo ""

echo "=== Step 5: Stop all existing processes ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
# Kill anything on port 3002
fuser -k 3002/tcp 2>/dev/null || true
echo ""

echo "=== Step 6: Start on port 3002 ==="
cd /opt/yogdu-referral
# Use PORT env var directly with next start
cat > start.sh << 'STARTEOF'
#!/bin/bash
cd /opt/yogdu-referral
set -a
source /opt/yogdu-referral/.env
set +a
exec node_modules/.bin/next start -p 3002
STARTEOF
chmod +x start.sh
pm2 start /opt/yogdu-referral/start.sh --name "yogdu-referral"
pm2 save 2>/dev/null || true
echo ""

echo "=== Step 7: Wait and verify ==="
sleep 15
pm2 list 2>/dev/null
echo ""
echo "Port check:"
ss -tlnp | grep 3002 || echo "3002 not listening!"
echo ""
echo "Testing API on 3002..."
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "API failed"
echo ""
echo "Testing login on 3002..."
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Login: success={d.get(\"success\")}, has_token={bool(d.get(\"token\"))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Login failed"
echo ""
echo "Testing via Nginx (port 80)..."
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Nginx: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Nginx failed"

echo ""
echo "=== DONE ==="
