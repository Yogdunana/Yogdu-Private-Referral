#!/bin/bash
# Debug script to check server environment
echo "=== System Info ==="
uname -a
echo ""

echo "=== Node.js ==="
node -v
echo ""

echo "=== PostgreSQL ==="
if command -v psql &>/dev/null; then
  psql --version
  pg_isready
  echo "PostgreSQL clusters:"
  ls /etc/postgresql/ 2>/dev/null
  echo ""
  echo "pg_hba.conf (auth config):"
  cat /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | grep -v "^#" | grep -v "^$"
  echo ""
  echo "Trying to connect as postgres user:"
  su - postgres -c "psql -c 'SELECT version();'" 2>&1
  echo ""
  echo "List of databases:"
  su - postgres -c "psql -l" 2>&1
else
  echo "PostgreSQL not installed"
fi
echo ""

echo "=== PM2 Processes ==="
pm2 list 2>/dev/null || echo "PM2 not available"
echo ""

echo "=== Listening Ports ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null
echo ""

echo "=== /opt contents ==="
ls -la /opt/ 2>/dev/null
echo ""

echo "=== Running on port 3000 ==="
curl -s http://localhost:3000 2>/dev/null | head -5 || echo "Nothing on port 3000"
