#!/bin/bash
echo "=== 测试外部访问 ==="
curl -s --connect-timeout 5 "http://maixuan.yogdunana.com/api/jobs" 2>&1 | head -100
echo ""
echo "=== 测试 IP 直连 ==="
curl -s --connect-timeout 5 "http://101.237.129.33/api/jobs" -H "Host: maixuan.yogdunana.com" 2>&1 | head -100
echo ""
echo "=== 本地测试 ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Local: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except:
    print('Local: failed')
"
echo ""
echo "=== Nginx + Host header ==="
curl -s http://localhost/api/jobs -H "Host: maixuan.yogdunana.com" 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Nginx: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except:
    print('Nginx: failed')
"
echo ""
echo "=== 防火墙 ==="
ufw status 2>/dev/null || echo "ufw not active"
echo ""
echo "=== iptables ==="
iptables -L INPUT -n 2>/dev/null | head -10
