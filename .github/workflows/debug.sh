#!/bin/bash
# Get PostgreSQL credentials from Docker environment
echo "=== Docker DB Environment ==="
docker exec smbu-campus-db env 2>/dev/null | grep -i "postgres"
echo ""

echo "=== Try connecting to PostgreSQL as smbu user ==="
docker exec smbu-campus-db psql -U smbu -d smbu_campus -c "SELECT 1 as test;" 2>&1
echo ""

echo "=== Create yogdu_referral database ==="
docker exec smbu-campus-db psql -U smbu -d smbu_campus -c "CREATE DATABASE yogdu_referral;" 2>&1
echo ""

echo "=== List databases ==="
docker exec smbu-campus-db psql -U smbu -d smbu_campus -c "\l" 2>&1
echo ""

echo "=== Check if yogdu_referral was created ==="
docker exec smbu-campus-db psql -U smbu -d yogdu_referral -c "SELECT current_database();" 2>&1
echo ""

echo "=== Get POSTGRES_PASSWORD from Docker ==="
docker exec smbu-campus-db printenv POSTGRES_PASSWORD 2>/dev/null
echo ""

echo "=== Check smbu-campus .env for password ==="
cat /opt/smbu-campus/.env 2>/dev/null
