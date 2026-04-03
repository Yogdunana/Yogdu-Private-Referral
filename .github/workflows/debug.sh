#!/bin/bash
set -e

echo "=== 1. 重置登录锁定 ==="
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true

npx prisma db execute --stdin << 'SQL'
UPDATE users SET "loginAttempts" = 0, "lockedUntil" = NULL;
SQL
echo "  锁定已重置"

echo "=== 2. 运行 seed ==="
npx prisma db seed 2>&1 | tail -10

echo "=== 3. 查看用户 ==="
npx prisma db execute --stdin << 'SQL'
SELECT email, role, "isActive", "loginAttempts" FROM users;
SQL

echo "=== 4. 测试管理员登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'admin: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
"

echo "=== 5. 测试投稿方登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contributor@test.com","password":"contributor123"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'contributor: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
"

echo "=== 6. 测试用户登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123456"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'user: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
"

echo "=== DONE ==="
