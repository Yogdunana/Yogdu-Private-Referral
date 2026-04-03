#!/bin/bash
set -e

echo "=== 1. 检查证书 ==="
ls -la /etc/letsencrypt/live/maixuan.yogdunana.com/ 2>/dev/null
openssl x509 -in /etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem -noout -subject -dates 2>/dev/null || echo "证书无效"
echo ""

echo "=== 2. 重启Nginx ==="
service nginx stop 2>/dev/null || true
sleep 1
service nginx start 2>/dev/null || true
sleep 2
echo "Nginx restarted"
echo ""

echo "=== 3. 检查端口 ==="
ss -tlnp | grep -E "(:80 |:443 |:3002)"
echo ""

echo "=== 4. SSL测试(带Host) ==="
echo | openssl s_client -connect localhost:443 -servername maixuan.yogdunana.com 2>&1 | grep -E "(Verify|subject|issuer|error|errno|alert)" | head -5
echo ""

echo "=== 5. HTTP测试(带Host) ==="
curl -s -H "Host: maixuan.yogdunana.com" http://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "HTTP无标题"
echo ""

echo "=== 6. HTTPS测试(带Host) ==="
curl -sk -H "Host: maixuan.yogdunana.com" https://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "HTTPS无标题"
echo ""

echo "=== 7. API测试 ==="
curl -sk -H "Host: maixuan.yogdunana.com" https://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except:
    print('API failed')
" 2>/dev/null
echo ""

echo "=== DONE ==="
