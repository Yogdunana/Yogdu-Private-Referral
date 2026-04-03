#!/bin/bash
# Debug script to check PostgreSQL Docker config
echo "=== Docker Containers ==="
docker ps 2>/dev/null || echo "Docker not available"
echo ""

echo "=== Docker Compose Files ==="
find /opt -name "docker-compose*" -o -name ".env" 2>/dev/null | while read f; do
  echo "--- $f ---"
  cat "$f" 2>/dev/null | grep -v "^#" | grep -v "^$"
  echo ""
done

echo "=== PM2 Processes ==="
pm2 list 2>/dev/null
pm2 env 0 2>/dev/null | head -20
echo ""

echo "=== yogdu-referral .env ==="
cat /opt/yogdu-referral/.env 2>/dev/null | grep -i "database\|db_\|postgres" || echo "No DATABASE_URL found"
echo ""

echo "=== smbu-campus .env (for DB reference) ==="
cat /opt/smbu-campus/.env 2>/dev/null | grep -i "database\|db_\|postgres" || echo "No DB config found"
echo ""

echo "=== smbu-campus docker-compose ==="
cat /opt/smbu-campus/docker-compose.yml 2>/dev/null || echo "No docker-compose.yml"
echo ""

echo "=== Check if yogdu-referral PM2 process exists ==="
pm2 describe yogdu-referral 2>/dev/null || echo "Process not found"
echo ""

echo "=== Check port 3002 ==="
curl -s http://localhost:3002 2>/dev/null | head -3 || echo "Nothing on port 3002"
