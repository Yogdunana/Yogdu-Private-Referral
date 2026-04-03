#!/bin/bash
set -e

echo "=== Step 1: Check current state ==="
pm2 list 2>/dev/null
echo ""
ss -tlnp | grep -E "(3002|80)" || echo "No relevant ports"
echo ""

echo "=== Step 2: Ensure app is running on 3002 ==="
if ! ss -tlnp | grep -q 3002; then
  echo "App not on 3002, restarting..."
  cd /opt/yogdu-referral
  cat > start.sh << 'STARTEOF'
#!/bin/bash
cd /opt/yogdu-referral
set -a
source /opt/yogdu-referral/.env
set +a
exec node_modules/.bin/next start -p 3002
STARTEOF
  chmod +x start.sh
  pm2 stop yogdu-referral 2>/dev/null || true
  pm2 delete yogdu-referral 2>/dev/null || true
  pm2 start /opt/yogdu-referral/start.sh --name "yogdu-referral"
  pm2 save 2>/dev/null || true
  sleep 10
fi
echo ""

echo "=== Step 3: Configure Nginx ==="
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
ln -sf /etc/nginx/sites-available/yogdu-referral /etc/nginx/sites-enabled/yogdu-referral
nginx -t 2>&1
service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null
echo "Nginx configured."
echo ""

echo "=== Step 4: Verify ==="
sleep 2
echo "Port 3002:"
ss -tlnp | grep 3002 || echo "Not on 3002!"
echo ""
echo "Local test (3002):"
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Jobs: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Failed"
echo ""
echo "Local test (Nginx 80):"
curl -s http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'Nginx: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null || echo "Failed"
echo ""
echo "Title via Nginx:"
curl -s http://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "No title"

echo ""
echo "=== DONE ==="
