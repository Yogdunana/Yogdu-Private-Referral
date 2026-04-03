#!/bin/bash
set -e

echo "=== Step 1: Configure Nginx ==="
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

rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/calorie-battle 2>/dev/null || true
ln -sf /etc/nginx/sites-available/yogdu-referral /etc/nginx/sites-enabled/yogdu-referral
nginx -t 2>&1
service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null
echo "Nginx configured."
echo ""

echo "=== Step 2: Ensure app is running ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
cd /opt/yogdu-referral
# Recreate start.sh
cat > start.sh << 'STARTEOF'
#!/bin/bash
set -a
source /opt/yogdu-referral/.env
set +a
exec npx next start -p 3002
STARTEOF
chmod +x start.sh
pm2 start /opt/yogdu-referral/start.sh --name "yogdu-referral"
pm2 save 2>/dev/null || true
echo ""

echo "=== Step 3: Wait ==="
sleep 15

echo "=== Step 4: Verify ==="
pm2 list 2>/dev/null
echo ""
echo "Local test:"
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "API failed"
echo ""
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Login: success={d.get(\"success\")}, has_token={bool(d.get(\"token\"))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Login failed"

echo ""
echo "=== DONE ==="
