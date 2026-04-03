#!/bin/bash
set -e

echo "=== Step 1: Start PostgreSQL 14 ==="
service postgresql start 2>/dev/null || systemctl start postgresql 2>/dev/null || true
sleep 2
pg_isready 2>/dev/null && echo "PostgreSQL is ready." || echo "PostgreSQL failed to start!"
echo ""

echo "=== Step 2: Create database and user ==="
# Create user and database using postgres superuser
su - postgres -c "psql -c \"SELECT 1 FROM pg_roles WHERE rolname='yogdu'\"" 2>/dev/null | grep -q 1 || \
  su - postgres -c "psql -c \"CREATE USER yogdu WITH PASSWORD 'yogdu_referral_2024';\"" 2>&1
echo "User 'yogdu' ready."

su - postgres -c "psql -c \"SELECT 1 FROM pg_database WHERE datname='yogdu_referral'\"" 2>/dev/null | grep -q 1 || \
  su - postgres -c "psql -c \"CREATE DATABASE yogdu_referral OWNER yogdu;\"" 2>&1
echo "Database 'yogdu_referral' ready."

echo "=== Step 3: Grant permissions ==="
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE yogdu_referral TO yogdu;\"" 2>&1
su - postgres -c "psql -d yogdu_referral -c \"GRANT ALL ON SCHEMA public TO yogdu;\"" 2>&1
echo "Permissions granted."

echo "=== Step 4: Test connection ==="
PGPASSWORD='yogdu_referral_2024' psql -h localhost -U yogdu -d yogdu_referral -c "SELECT current_database(), current_user;" 2>&1
echo ""

echo "=== Step 5: Update .env ==="
cat > /opt/yogdu-referral/.env << 'ENVEOF'
DATABASE_URL="postgresql://yogdu:yogdu_referral_2024@localhost:5432/yogdu_referral?schema=public"
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
echo "=== DONE ==="
