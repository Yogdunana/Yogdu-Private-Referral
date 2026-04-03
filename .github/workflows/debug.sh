#!/bin/bash
echo "=== ALL sites-enabled ==="
for f in /etc/nginx/sites-enabled/*; do
  echo "=== $f ==="
  cat "$f"
  echo ""
done
echo "=== ALL conf.d ==="
for f in /etc/nginx/conf.d/*.conf; do
  echo "=== $f ==="
  cat "$f"
  echo ""
done 2>/dev/null
echo "=== nginx.conf includes ==="
grep -E "include" /etc/nginx/nginx.conf
