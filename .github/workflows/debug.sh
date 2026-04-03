#!/bin/bash
echo "=== PM2 ==="
pm2 list 2>/dev/null
echo ""
echo "=== PM2 Error Logs ==="
pm2 logs yogdu-referral --err --lines 20 --nostream 2>/dev/null
echo ""
echo "=== PM2 Out Logs ==="
pm2 logs yogdu-referral --out --lines 10 --nostream 2>/dev/null
echo ""
echo "=== Port 3002 ==="
ss -tlnp | grep 3002 || echo "NOT LISTENING ON 3002"
echo ""
echo "=== .env ==="
cat /opt/yogdu-referral/.env 2>/dev/null | head -5
echo ""
echo "=== start.sh ==="
cat /opt/yogdu-referral/start.sh 2>/dev/null
echo ""
echo "=== .next exists? ==="
ls -la /opt/yogdu-referral/.next/BUILD_ID 2>/dev/null || echo "NO .next BUILD_ID"
echo ""
echo "=== Direct test ==="
curl -s http://localhost:3002/ 2>/dev/null | head -5 || echo "3002 no response"
