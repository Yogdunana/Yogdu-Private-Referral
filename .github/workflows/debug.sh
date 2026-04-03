#!/bin/bash
echo "=== Nginx status ==="
service nginx status 2>&1 || systemctl status nginx 2>&1 || echo "Unknown"
echo ""
echo "=== Nginx process ==="
ps aux | grep nginx | grep -v grep
echo ""
echo "=== Listening ports ==="
ss -tlnp | grep -E "(:80 |:443 |:3002)"
echo ""
echo "=== Nginx test ==="
nginx -t 2>&1
echo ""
echo "=== PM2 ==="
pm2 list 2>/dev/null
echo ""
echo "=== Local test ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'3002: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except:
    print('3002: failed')
" 2>/dev/null
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'80: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except:
    print('80: failed')
" 2>/dev/null
