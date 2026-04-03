#!/bin/bash
echo "=== PM2 Error Logs ==="
pm2 logs yogdu-referral --err --lines 30 --nostream 2>/dev/null
echo ""
echo "=== PM2 Out Logs ==="
pm2 logs yogdu-referral --out --lines 10 --nostream 2>/dev/null
echo ""
echo "=== Direct curl on 3002 ==="
curl -sv http://localhost:3002/api/jobs 2>&1 | tail -20
echo ""
echo "=== Port 3002 ==="
ss -tlnp | grep 3002 || echo "Not listening on 3002"
