#!/bin/bash
echo "=== SSL证书检查 ==="
ls -la /etc/letsencrypt/live/maixuan.yogdunana.com/ 2>/dev/null || echo "证书目录不存在!"
echo ""
echo "=== Nginx配置 ==="
cat /etc/nginx/sites-enabled/yogdu-referral 2>/dev/null || echo "配置不存在!"
echo ""
echo "=== Nginx测试 ==="
nginx -t 2>&1
echo ""
echo "=== 443端口 ==="
ss -tlnp | grep 443 || echo "443未监听!"
echo ""
echo "=== SSL握手测试 ==="
echo | openssl s_client -connect localhost:443 -servername maixuan.yogdunana.com 2>&1 | head -20
echo ""
echo "=== 3002端口 ==="
ss -tlnp | grep 3002 || echo "3002未监听!"
echo ""
echo "=== 修复: 如果证书不存在则用HTTP ==="
if [ ! -f "/etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem" ]; then
  echo "证书不存在，切换到HTTP配置..."
  cat > /etc/nginx/sites-available/yogdu-referral << 'NGINXEOF'
server {
    listen 80;
    server_name maixuan.yogdunana.com;
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
  nginx -t 2>&1 && service nginx reload 2>/dev/null && echo "已切换到HTTP" || echo "切换失败"
else
  echo "证书存在，尝试重新申请..."
  certbot --nginx -d maixuan.yogdunana.com --non-interactive --agree-tos --email noreply@yogdunana.com 2>&1 | tail -5
  nginx -t 2>&1 && service nginx reload 2>/dev/null
fi
echo ""
echo "=== 最终测试 ==="
curl -s -H "Host: maixuan.yogdunana.com" http://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "HTTP无标题"
curl -sk https://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "HTTPS无标题"
echo "=== DONE ==="
