#!/bin/bash
echo "=== PM2 logs ==="
pm2 logs yogdu-referral --lines 20 --nostream 2>/dev/null
echo ""

echo "=== Port check ==="
ss -tlnp | grep -E "(3000|3001|3002|80)"
echo ""

echo "=== Direct test on 3002 ==="
curl -s http://localhost:3002/ 2>/dev/null | head -5 || echo "3002 not responding"
echo ""

echo "=== .env file ==="
cat /opt/yogdu-referral/.env
echo ""

echo "=== start.sh ==="
cat /opt/yogdu-referral/start.sh
echo ""

echo "=== pm2 env ==="
pm2 env 40 2>/dev/null | grep -E "(DATABASE|PORT|NODE)" || pm2 env yogdu-referral 2>/dev/null | grep -E "(DATABASE|PORT|NODE)" || echo "Cannot get pm2 env"
