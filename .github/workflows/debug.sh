#!/bin/bash
echo "=== Nginx ==="
which nginx 2>/dev/null && nginx -v 2>&1 || echo "Nginx not installed"
echo ""

echo "=== Check if nginx is running ==="
service nginx status 2>/dev/null || systemctl status nginx 2>/dev/null || echo "Nginx not running"
echo ""

echo "=== Check port 80/443 ==="
ss -tlnp | grep -E "(:80 |:443 )" || echo "No web server on 80/443"
echo ""

echo "=== Check if anything serves on port 80 ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "Nothing on port 80"
