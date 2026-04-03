#!/bin/bash
echo "=== start.sh content ==="
cat /opt/yogdu-referral/start.sh
echo ""
echo "=== PM2 logs ==="
pm2 logs yogdu-referral --lines 15 --nostream 2>/dev/null
echo ""
echo "=== Try running next directly ==="
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
echo "PORT=$PORT"
ls -la node_modules/.bin/next 2>/dev/null
# Test what port next actually uses
timeout 15 node_modules/.bin/next start -p 3002 2>&1 &
NEXT_PID=$!
sleep 10
echo "=== Port check after 10s ==="
ss -tlnp | grep -E "(3000|3002)" || echo "No next ports"
echo ""
echo "=== Test ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | head -50 || echo "3002 failed"
curl -s http://localhost:3000/api/jobs 2>/dev/null | head -50 || echo "3000 failed"
kill $NEXT_PID 2>/dev/null || true
