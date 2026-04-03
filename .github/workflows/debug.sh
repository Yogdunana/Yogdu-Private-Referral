#!/bin/bash
echo "=== PM2 describe ==="
pm2 describe yogdu-referral 2>/dev/null | grep -E "(script|exec|cwd|pm_exec|node_args|args)" -i
echo ""
echo "=== PM2 logs (last 5) ==="
pm2 logs yogdu-referral --lines 5 --nostream 2>/dev/null
echo ""
echo "=== start.sh ==="
cat /opt/yogdu-referral/start.sh
echo ""
echo "=== .env PORT ==="
grep PORT /opt/yogdu-referral/.env
echo ""
echo "=== Test next directly ==="
cd /opt/yogdu-referral
set -a
source /opt/yogdu-referral/.env
set +a
echo "PORT=$PORT"
node -e "console.log('node works')"
ls node_modules/.bin/next 2>/dev/null && echo "next binary exists" || echo "next binary missing"
echo ""
echo "=== Kill and restart manually ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
cd /opt/yogdu-referral
PORT=3002 node_modules/.bin/next start -p 3002 &
sleep 10
echo "=== Check port ==="
ss -tlnp | grep -E "(3000|3002)" || echo "No next on 3000/3002"
echo ""
echo "=== Test ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | head -100
