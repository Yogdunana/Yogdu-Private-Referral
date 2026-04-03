#!/bin/bash
set -e

echo "=== 1. 检查数据库用户 ==="
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true
npx prisma db execute --stdin << 'SQL'
SELECT email, name, role, "isActive", "loginAttempts", "lockedUntil" FROM users;
SQL
echo ""

echo "=== 2. 重置登录锁定 ==="
npx prisma db execute --stdin << 'SQL'
UPDATE users SET "loginAttempts" = 0, "lockedUntil" = NULL WHERE "loginAttempts" > 0 OR "lockedUntil" IS NOT NULL;
SQL
echo "  登录锁定已重置"
echo ""

echo "=== 3. 重新运行 seed ==="
npx prisma db seed 2>&1 | tail -10 || echo "Seed 可能已存在（upsert）"
echo ""

echo "=== 4. 验证用户 ==="
npx prisma db execute --stdin << 'SQL'
SELECT email, name, role, "isActive" FROM users;
SQL
echo ""

echo "=== 5. 测试登录 ==="
TOKEN=$(curl -s -c - -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'success={d.get(\"success\")}, token={bool(d.get(\"token\"))}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null)
echo ""

echo "=== 6. 测试投稿方登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contributor@test.com","password":"contributor123"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'contributor: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null
echo ""

echo "=== 7. 测试普通用户登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123456"}' 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(f'user: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null
echo ""

echo "=== DONE ==="
