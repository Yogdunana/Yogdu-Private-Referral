#!/bin/bash
set -e

echo "=== Step 1: Stop and delete existing PM2 process ==="
pm2 stop yogdu-referral 2>/dev/null || true
pm2 delete yogdu-referral 2>/dev/null || true
echo ""

echo "=== Step 2: Start on port 3002 directly ==="
cd /opt/yogdu-referral
pm2 start "npx next start -p 3002" --name "yogdu-referral"
pm2 save 2>/dev/null || true
echo ""

echo "=== Step 3: Wait for startup ==="
echo "Waiting 15 seconds..."
sleep 15

echo "=== Step 4: Check PM2 status ==="
pm2 list 2>/dev/null
echo ""

echo "=== Step 5: Check PM2 logs ==="
pm2 logs yogdu-referral --lines 10 --nostream 2>/dev/null
echo ""

echo "=== Step 6: Test API ==="
echo "Testing /api/jobs..."
RESP=$(curl -s http://localhost:3002/api/jobs 2>/dev/null)
echo "Response (first 300 chars): ${RESP:0:300}"
echo ""

echo "Testing login..."
LOGIN_RESP=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null)
echo "Response (first 300 chars): ${LOGIN_RESP:0:300}"
echo ""

echo "=== DONE ==="
