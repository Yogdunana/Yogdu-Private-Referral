#!/bin/bash
echo "=== All listen directives ==="
grep -r "listen" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /etc/nginx/nginx.conf 2>/dev/null
echo ""
echo "=== All return/redirect directives ==="
grep -r "return 301\|return 302\|rewrite.*redirect" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
echo ""
echo "=== Full calorie-battle config ==="
cat /etc/nginx/sites-enabled/calorie-battle 2>/dev/null
echo ""
echo "=== Full yogdu-referral config ==="
cat /etc/nginx/sites-enabled/yogdu-referral 2>/dev/null
echo ""
echo "=== Test with Host header ==="
curl -s -H "Host: 101.237.129.33" http://localhost/ 2>/dev/null | head -5
echo ""
echo "=== Test HTTPS with IP ==="
curl -sk https://127.0.0.1/ 2>/dev/null | head -5 || echo "No HTTPS on localhost"
