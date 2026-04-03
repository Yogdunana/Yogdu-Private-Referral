#!/bin/bash
echo "=== PM2 Status ==="
pm2 list 2>/dev/null
echo ""

echo "=== PM2 Logs (last 5) ==="
pm2 logs yogdu-referral --lines 5 --nostream 2>/dev/null
echo ""

echo "=== Local test ==="
curl -s http://localhost:3002/api/jobs 2>/dev/null | head -100
echo ""

echo "=== Firewall ==="
ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -20
echo ""

echo "=== Listening ports ==="
ss -tlnp | grep -E "(3000|3001|3002)"
