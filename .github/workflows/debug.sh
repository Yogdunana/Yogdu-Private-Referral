#!/bin/bash
set -e

echo "=== 1. Stop PM2 ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
sleep 2

echo "=== 2. Clean .next cache ==="
rm -rf /opt/yogdu-referral/.next
echo "  .next deleted"

echo "=== 3. Rebuild ==="
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
npm run build 2>&1 | tail -5
echo "  Build done"

echo "=== 4. Start PM2 ==="
pm2 start /opt/yogdu-referral/start.sh --name "yogdu-referral"
pm2 save 2>/dev/null || true
sleep 10

echo "=== 5. Verify ==="
ss -tlnp | grep 3002 || echo "NOT ON 3002!"
echo ""
curl -s http://localhost:3002/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "No title on 3002"
echo ""
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except:
    print('API failed')
"
echo ""
echo "=== DONE ==="
