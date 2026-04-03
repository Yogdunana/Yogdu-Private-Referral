#!/bin/bash
set -e

echo "=== Step 1: Run seed ==="
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
npx prisma db seed 2>&1 | tail -10
echo ""

echo "=== Step 2: Reload Nginx ==="
nginx -t 2>&1
service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null
echo "Nginx reloaded."
echo ""

echo "=== Step 3: Test login ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Login: success={d.get(\"success\")}, has_token={bool(d.get(\"token\"))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
"
echo ""

echo "=== Step 4: Test Nginx ==="
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Nginx->Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'Error: {e}')
"
echo ""
curl -s http://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "No title"
echo ""

echo "=== DONE ==="
