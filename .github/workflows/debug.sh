#!/bin/bash
set -e

echo "=== Step 1: Rebuild application ==="
cd /opt/yogdu-referral
echo "Running prisma generate..."
npx prisma generate 2>&1 | tail -3
echo "Building Next.js..."
npm run build 2>&1 | tail -5
echo ""

echo "=== Step 2: Restart on port 3002 ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
pm2 start "npx next start -p 3002" --name "yogdu-referral"
pm2 save 2>/dev/null || true
echo ""

echo "=== Step 3: Wait for startup ==="
sleep 15

echo "=== Step 4: Check PM2 ==="
pm2 list 2>/dev/null
echo ""

echo "=== Step 5: Test API ==="
echo "Testing /api/jobs..."
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Parse error: {e}')
" || echo "API failed"
echo ""

echo "Testing login..."
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Login: success={d.get(\"success\")}, has_token={bool(d.get(\"token\"))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Parse error: {e}')
" || echo "Login failed"

echo ""

echo "Testing external access..."
curl -s http://localhost:3002/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "No title found"

echo ""
echo "=== DONE ==="
