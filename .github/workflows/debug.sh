#!/bin/bash
set -e

echo "=== Step 1: Stop and delete existing process ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
echo ""

echo "=== Step 2: Clear PM2 logs ==="
pm2 flush 2>/dev/null || true

echo "=== Step 3: Start with ecosystem config ==="
cd /opt/yogdu-referral
# Export all vars from .env and start with PORT=3002
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
export PORT=3002
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"
echo "PORT=$PORT"
pm2 start npm --name "yogdu-referral" -- start 2>&1
pm2 save 2>/dev/null || true
echo ""

echo "=== Step 4: Wait for startup ==="
sleep 15

echo "=== Step 5: Check PM2 ==="
pm2 list 2>/dev/null
echo ""

echo "=== Step 6: Check logs ==="
pm2 logs yogdu-referral --lines 15 --nostream 2>/dev/null
echo ""

echo "=== Step 7: Test API ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Parse error: {e}')
" 2>/dev/null || echo "Port 3002 not responding"

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
" 2>/dev/null || echo "Login failed"

echo ""
echo "=== DONE ==="
