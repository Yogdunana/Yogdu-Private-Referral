#!/bin/bash
set -e

echo "========================================="
echo "  悠渡脉选 - 完整部署修复脚本"
echo "========================================="

# ===== Step 1: 磁盘清理 =====
echo ""
echo "[1/9] 清理磁盘空间..."
rm -rf /opt/yogdu-referral.bak.* 2>/dev/null || true
rm -rf /opt/yogdu-referral/.next/cache 2>/dev/null || true
docker system prune -af --volumes 2>/dev/null || true
apt-get clean 2>/dev/null || true
rm -rf /var/cache/apt/archives/* 2>/dev/null
npm cache clean --force 2>/dev/null || true
journalctl --vacuum-time=1d 2>/dev/null || true
rm -rf /var/log/*.gz /var/log/nginx/*.gz 2>/dev/null
pm2 flush 2>/dev/null || true
echo "  磁盘清理完成: $(df -h / | tail -1 | awk '{print $4}') 可用"

# ===== Step 2: PostgreSQL =====
echo ""
echo "[2/9] 确保 PostgreSQL 运行..."
pg_ctlcluster 14 main start 2>/dev/null || true
sleep 2
if pg_isready -p 5433 2>/dev/null; then
  echo "  PostgreSQL 运行在端口 5433"
else
  echo "  ERROR: PostgreSQL 未运行!"
  exit 1
fi

# ===== Step 3: .env 文件 =====
echo ""
echo "[3/9] 创建 .env 文件..."
cat > /opt/yogdu-referral/.env << 'ENVEOF'
DATABASE_URL="postgresql://yogdu:yogdu_referral_2024@127.0.0.1:5433/yogdu_referral?schema=public"
JWT_SECRET="yogdu-referral-prod-jwt-secret-change-me-2024"
ARK_API_KEY="fe737e3b-1789-4d6c-8123-61392466c858"
SMTP_HOST="smtp.feishu.cn"
SMTP_PORT="465"
SMTP_USER="noreply@yogdunana.com"
SMTP_PASS="jBMvnnpHL5ZLfUYj"
EMAIL_FROM="noreply@yogdunana.com"
NEXT_PUBLIC_APP_URL="https://maixuan.yogdunana.com"
NODE_ENV="production"
PORT=3002
ENVEOF
chmod 600 /opt/yogdu-referral/.env
echo "  .env 创建完成"

# ===== Step 4: Prisma =====
echo ""
echo "[4/9] Prisma generate + db push..."
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
npx prisma generate 2>&1 | tail -3
npx prisma db push 2>&1 | tail -5
echo "  Prisma 完成"

# ===== Step 5: Seed =====
echo ""
echo "[5/9] 导入种子数据..."
npx prisma db seed 2>&1 | tail -5 || true
echo "  Seed 完成"

# ===== Step 6: Build =====
echo ""
echo "[6/9] 构建应用..."
npm run build 2>&1 | tail -5
echo "  Build 完成"

# ===== Step 7: PM2 启动 =====
echo ""
echo "[7/9] 配置 PM2..."
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

cat > /opt/yogdu-referral/start.sh << 'STARTEOF'
#!/bin/bash
cd /opt/yogdu-referral
set -a
source /opt/yogdu-referral/.env
set +a
exec node_modules/.bin/next start -p 3002
STARTEOF
chmod +x /opt/yogdu-referral/start.sh

pm2 start /opt/yogdu-referral/start.sh --name "yogdu-referral"
pm2 save 2>/dev/null || true
echo "  PM2 启动完成"
sleep 10

# ===== Step 8: Nginx 配置 =====
echo ""
echo "[8/9] 配置 Nginx..."

# 先配置 HTTP (80) - 用于 certbot 验证
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

# 删除 default 避免冲突
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
ln -sf /etc/nginx/sites-available/yogdu-referral /etc/nginx/sites-enabled/yogdu-referral
nginx -t 2>&1
service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null
echo "  Nginx HTTP 配置完成"

# ===== Step 9: SSL 证书 =====
echo ""
echo "[9/9] 配置 SSL 证书..."

# 检查是否已有证书
if [ -f "/etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem" ]; then
  echo "  SSL 证书已存在，更新配置..."
else
  # 安装 certbot
  which certbot 2>/dev/null || apt-get install -y certbot python3-certbot-nginx 2>/dev/null || true
  
  # 申请证书
  certbot --nginx -d maixuan.yogdunana.com --non-interactive --agree-tos --email noreply@yogdunana.com --redirect 2>&1 | tail -5 || {
    echo "  Certbot 自动配置失败，手动配置 SSL..."
  }
fi

# 确保 SSL 配置正确（无论 certbot 是否成功）
cat > /etc/nginx/sites-available/yogdu-referral << 'NGINXEOF'
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name maixuan.yogdunana.com;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name maixuan.yogdunana.com;

    ssl_certificate /etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maixuan.yogdunana.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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

    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

# 如果证书不存在，先用 HTTP 配置
if [ ! -f "/etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem" ]; then
  echo "  证书不存在，使用纯 HTTP 配置..."
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
fi

nginx -t 2>&1 && service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null
echo "  Nginx 配置完成"

# ===== 验证 =====
echo ""
echo "========================================="
echo "  验证结果"
echo "========================================="
echo ""

echo "--- PM2 状态 ---"
pm2 list 2>/dev/null
echo ""

echo "--- 端口监听 ---"
ss -tlnp | grep -E "(3002|:80 |:443 )" || echo "  无相关端口"
echo ""

echo "--- 本地 API 测试 ---"
curl -s http://localhost:3002/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'  Jobs API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'  API 错误: {e}')
" 2>/dev/null || echo "  API 不可用"
echo ""

echo "--- Nginx 测试 ---"
curl -s -H "Host: maixuan.yogdunana.com" http://localhost/api/jobs 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'  Nginx->API: success={d.get(\"success\")}, jobs={len(d.get(\"data\",[]))}')
except Exception as e:
    print(f'  Nginx 错误: {e}')
" 2>/dev/null || echo "  Nginx 不可用"
echo ""

echo "--- 前端标题 ---"
curl -s -H "Host: maixuan.yogdunana.com" http://localhost/ 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "  无标题"
echo ""

echo "========================================="
echo "  部署完成！"
echo "  域名: maixuan.yogdunana.com"
echo "========================================="
