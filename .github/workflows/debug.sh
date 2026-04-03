#!/bin/bash

echo "=== PostgreSQL process ==="
ps aux | grep postgres | grep -v grep
echo ""

echo "=== PostgreSQL config - listen_addresses ==="
grep "listen_addresses" /etc/postgresql/14/main/postgresql.conf 2>/dev/null
echo ""

echo "=== PostgreSQL config - port ==="
grep "^port" /etc/postgresql/14/main/postgresql.conf 2>/dev/null
echo ""

echo "=== PostgreSQL logs ==="
tail -20 /var/log/postgresql/postgresql-14-main.log 2>/dev/null || echo "No log file"
echo ""

echo "=== Try starting PostgreSQL manually ==="
pg_ctlcluster 14 main start 2>&1
sleep 2
echo ""

echo "=== Check status ==="
pg_ctlcluster 14 main status 2>&1
echo ""

echo "=== Check port again ==="
ss -tlnp | grep 5432 || echo "Still not on TCP 5432"
echo ""

echo "=== PostgreSQL data directory ==="
ls -la /var/lib/postgresql/14/main/ 2>/dev/null | head -5
echo ""

echo "=== postmaster.pid ==="
cat /var/lib/postgresql/14/main/postmaster.pid 2>/dev/null || echo "No pid file"
