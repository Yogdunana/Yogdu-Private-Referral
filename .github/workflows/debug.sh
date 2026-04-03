#!/bin/bash
set -e
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true

echo "=== 1. 数据库中的岗位数 ==="
npx prisma db execute --schema /opt/yogdu-referral/prisma/schema.prisma --stdin << 'SQL'
SELECT count(*) as total, status FROM jobs GROUP BY status;
SQL

echo "=== 2. 数据库中的用户数 ==="
npx prisma db execute --schema /opt/yogdu-referral/prisma/schema.prisma --stdin << 'SQL'
SELECT count(*) FROM users;
SQL

echo "=== 3. 邀请码 ==="
npx prisma db execute --schema /opt/yogdu-referral/prisma/schema.prisma --stdin << 'SQL'
SELECT code, "maxUses", "usedCount", "isActive" FROM invite_codes;
SQL

echo "=== 4. API测试 - 前台岗位列表 ==="
curl -s http://localhost:3002/api/jobs | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'success={d.get(\"success\")}, total={d.get(\"data\",{}).get(\"total\",0)}, jobs_count={len(d.get(\"data\",{}).get(\"data\",[]))}')
for j in d.get('data',{}).get('data',[])[:3]:
    print(f'  - {j.get(\"title\",\"?\")} [{j.get(\"status\",\"?\")}]')
"

echo "=== 5. API测试 - 管理员岗位列表 ==="
TOKEN=$(curl -s -c - -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('data',{}).get('token','') if d.get('success') else '')
" 2>/dev/null)

echo "=== DONE ==="
