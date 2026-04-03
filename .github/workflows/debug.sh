#!/bin/bash
echo "=== Nginx config ==="
cat /etc/nginx/sites-enabled/yogdu-referral 2>/dev/null || echo "No yogdu-referral config!"
ls /etc/nginx/sites-enabled/ 2>/dev/null
echo ""
echo "=== Test nginx ==="
nginx -t 2>&1
echo ""
echo "=== PM2 ==="
pm2 list 2>/dev/null
echo ""
echo "=== Port 3002 ==="
ss -tlnp | grep 3002 || echo "Not on 3002"
echo ""
echo "=== Port 80 ==="
ss -tlnp | grep ":80 " || echo "Not on 80"
echo ""
echo "=== Local test ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'3002: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "3002 failed"
echo ""
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'80: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "80 failed"
