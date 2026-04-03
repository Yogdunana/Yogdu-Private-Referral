#!/bin/bash
set -e

cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true

echo "=== 1. 查看当前用户 ==="
npx prisma db execute --schema /opt/yogdu-referral/prisma/schema.prisma --stdin << 'SQL'
SELECT email, name, role, "isActive", "loginAttempts", substring(password, 1, 20) as pwd_prefix FROM users;
SQL

echo "=== 2. 用 Node.js 重置密码 ==="
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function reset() {
  const adminPwd = await bcrypt.hash('admin123456', 10);
  const contributorPwd = await bcrypt.hash('contributor123', 10);
  const userPwd = await bcrypt.hash('user123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@youdoo.com' },
    update: { password: adminPwd, role: 'ADMIN', isActive: true, loginAttempts: 0, lockedUntil: null },
    create: { email: 'admin@youdoo.com', password: adminPwd, name: '系统管理员', role: 'ADMIN' }
  });
  console.log('admin@youdoo.com 密码已重置');

  await prisma.user.upsert({
    where: { email: 'contributor@test.com' },
    update: { password: contributorPwd, role: 'CONTRIBUTOR', isActive: true, loginAttempts: 0, lockedUntil: null },
    create: { email: 'contributor@test.com', password: contributorPwd, name: '测试投稿方', role: 'CONTRIBUTOR' }
  });
  console.log('contributor@test.com 密码已重置');

  await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: { password: userPwd, role: 'USER', isActive: true, loginAttempts: 0, lockedUntil: null },
    create: { email: 'user@test.com', password: userPwd, name: '测试用户', role: 'USER' }
  });
  console.log('user@test.com 密码已重置');

  await prisma.\$disconnect();
}
reset().catch(e => { console.error(e); process.exit(1); });
"

echo "=== 3. 测试管理员登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'admin: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
"

echo "=== 4. 测试投稿方登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contributor@test.com","password":"contributor123"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'contributor: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
"

echo "=== 5. 测试用户登录 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123456"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'user: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')
"

echo "=== DONE ==="
