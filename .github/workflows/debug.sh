#!/bin/bash
echo "=== Nginx sites ==="
ls /etc/nginx/sites-enabled/ 2>/dev/null
echo ""
cat /etc/nginx/sites-enabled/* 2>/dev/null
echo ""
echo "=== Nginx conf.d ==="
ls /etc/nginx/conf.d/ 2>/dev/null
cat /etc/nginx/conf.d/*.conf 2>/dev/null
echo ""
echo "=== Main nginx.conf (last 20 lines) ==="
tail -20 /etc/nginx/nginx.conf 2>/dev/null
