#!/bin/bash
set -e

echo "=== Step 1: Configure Nginx for yogdu-referral ==="
cat > /etc/nginx/sites-available/yogdu-referral << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Remove calorie-battle config (it's on port 3001, user can re-add later)
rm -f /etc/nginx/sites-enabled/calorie-battle 2>/dev/null || true

# Enable yogdu-referral site
ln -sf /etc/nginx/sites-available/yogdu-referral /etc/nginx/sites-enabled/yogdu-referral

# Test nginx config
nginx -t 2>&1
echo ""

echo "=== Step 2: Reload Nginx ==="
service nginx reload 2>/dev/null || systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null
echo "Nginx reloaded."

echo "=== Step 3: Verify ==="
sleep 2
echo "Testing via Nginx (port 80)..."
curl -s http://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "No title"
echo ""
echo "Testing API via Nginx..."
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" || echo "API failed"

echo ""
echo "Testing login via Nginx..."
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Login: success={d.get(\"success\")}, has_token={bool(d.get(\"token\"))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" || echo "Login failed"

echo ""
echo "=== DONE ==="
