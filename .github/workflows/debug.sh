#!/bin/bash
echo "=== All nginx configs ==="
ls /etc/nginx/sites-enabled/ 2>/dev/null
echo ""
echo "=== sites-enabled content ==="
for f in /etc/nginx/sites-enabled/*; do
  echo "--- $f ---"
  cat "$f" 2>/dev/null
  echo ""
done
echo "=== conf.d ==="
ls /etc/nginx/conf.d/ 2>/dev/null
for f in /etc/nginx/conf.d/*.conf; do
  echo "--- $f ---"
  cat "$f" 2>/dev/null
  echo ""
done
echo "=== main nginx.conf ==="
cat /etc/nginx/nginx.conf 2>/dev/null | grep -v "^#" | grep -v "^$"
