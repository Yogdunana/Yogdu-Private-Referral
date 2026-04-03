#!/bin/bash
echo "=== Docker ps ==="
docker ps -a 2>/dev/null
echo ""

echo "=== Docker images ==="
docker images 2>/dev/null
echo ""

echo "=== Check if smbu-campus is running ==="
curl -s http://localhost:3000 2>/dev/null | head -1 || echo "Nothing on 3000"
echo ""

echo "=== Check if PostgreSQL is running on 5432 ==="
ss -tlnp | grep 5432 || echo "Nothing on 5432"
echo ""

echo "=== Check PM2 ==="
pm2 list 2>/dev/null
echo ""

echo "=== Check port 3002 ==="
curl -s http://localhost:3002 2>/dev/null | head -1 || echo "Nothing on 3002"
echo ""

echo "=== Check if psql is installed on host ==="
which psql 2>/dev/null && psql --version || echo "psql not installed"
echo ""

echo "=== Check PostgreSQL service ==="
service postgresql status 2>/dev/null || systemctl status postgresql 2>/dev/null || echo "No postgresql service found"
echo ""

echo "=== Check /etc/postgresql ==="
ls /etc/postgresql/ 2>/dev/null || echo "No postgresql directory"
