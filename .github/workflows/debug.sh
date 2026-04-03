#!/bin/bash
set -e

echo "=== Step 1: Check current .env ==="
cat /opt/yogdu-referral/.env
echo ""

echo "=== Step 2: Delete all yogdu-referral PM2 processes ==="
pm2 delete yogdu-referral 2>/dev/null || true
pm2 flush 2>/dev/null || true
echo ""

echo "=== Step 3: Create a startup script that loads .env ==="
cat > /opt/yogdu-referral/start.sh << 'STARTEOF'
#!/bin/bash
# Load environment variables from .env
set -a
source /opt/yogdu-referral/.env
set +a
# Start Next.js
exec npx next start -p 3002
STARTEOF
chmod +x /opt/yogdu-referral/start.sh
echo "start.sh created."

echo "=== Step 4: Start with PM2 ==="
cd /opt/yogdu-referral
pm2 start /opt/yogdu-referral/start.sh --name "yogdu-referral"
pm2 save 2>/dev/null || true
echo ""

echo "=== Step 5: Wait ==="
sleep 15

echo "=== Step 6: PM2 status ==="
pm2 list 2>/dev/null
echo ""

echo "=== Step 7: PM2 logs ==="
pm2 logs yogdu-referral --lines 10 --nostream 2>/dev/null
echo ""

echo "=== Step 8: Test API ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Failed"

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
    print(f'Error: {e}')
" 2>/dev/null || echo "Failed"

echo ""
echo "=== DONE ==="
