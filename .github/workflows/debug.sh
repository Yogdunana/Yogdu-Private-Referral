#!/bin/bash
set -e

echo "=== Server package.json start script ==="
grep -A2 '"start"' /opt/yogdu-referral/package.json
echo ""

echo "=== Server .env ==="
cat /opt/yogdu-referral/.env
echo ""

echo "=== Kill anything on port 3000 and 3002 ==="
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
echo "Ports cleared."

echo "=== Start with explicit port ==="
cd /opt/yogdu-referral
# Use envsubst to load .env and pass to pm2
set -a
source /opt/yogdu-referral/.env 2>/dev/null || true
set +a
export PORT=3002
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "PORT: $PORT"

# Modify start script to use PORT env var
sed -i 's/"start": "next start"/"start": "next start -p 3002"/' /opt/yogdu-referral/package.json
echo "Updated start script:"
grep '"start"' /opt/yogdu-referral/package.json

pm2 start npm --name "yogdu-referral" -- start
pm2 save 2>/dev/null || true
echo ""

echo "=== Wait ==="
sleep 15

echo "=== PM2 status ==="
pm2 list 2>/dev/null
echo ""

echo "=== PM2 logs ==="
pm2 logs yogdu-referral --lines 10 --nostream 2>/dev/null
echo ""

echo "=== Test ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Failed"

echo ""
echo "=== DONE ==="
