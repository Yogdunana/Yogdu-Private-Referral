#!/bin/bash

echo "=== PM2 Error Logs ==="
pm2 logs yogdu-referral --err --lines 50 --nostream 2>/dev/null
echo ""

echo "=== PM2 Out Logs ==="
pm2 logs yogdu-referral --out --lines 20 --nostream 2>/dev/null
echo ""

echo "=== Test DB connection directly ==="
cd /opt/yogdu-referral
source .env 2>/dev/null || true
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => {
  console.log('DB connected!');
  return prisma.job.count();
}).then(count => {
  console.log('Job count:', count);
  return prisma.\$disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  process.exit(1);
});
" 2>&1
