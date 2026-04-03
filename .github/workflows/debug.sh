#!/bin/bash
set -e

echo "=== Step 1: Check PM2 status ==="
pm2 list 2>/dev/null
echo ""

echo "=== Step 2: Check PM2 logs ==="
pm2 logs yogdu-referral --lines 30 --nostream 2>/dev/null
echo ""

echo "=== Step 3: Wait more and test ==="
echo "Waiting 15 seconds for app to fully start..."
sleep 15

echo "Testing API..."
RESP=$(curl -s http://localhost:3002/api/jobs 2>/dev/null)
echo "Raw response (first 200 chars): ${RESP:0:200}"
echo ""

echo "Testing login..."
LOGIN_RESP=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' 2>/dev/null)
echo "Raw response (first 200 chars): ${LOGIN_RESP:0:200}"
echo ""

echo "=== DONE ==="
