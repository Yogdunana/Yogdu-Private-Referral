#!/bin/bash
set -e

# ============================================================
# Yogdu Private Referral - Server Deployment Script
# This script runs ON the server via SSH from GitHub Actions.
# All secrets are passed as environment variables.
# ============================================================

echo "========================================"
echo "  Yogdu Referral - Deployment Started"
echo "========================================"

# --- Configuration ---
APP_DIR="/opt/yogdu-referral"
APP_NAME="yogdu-referral"
APP_PORT=3000
NODE_VERSION="20.x"
DB_NAME="yogdu_referral"
DB_USER="postgres"
REPO_URL="https://github.com/Yogdu-Private-Referral/yogdu-referral.git"
REPO_BRANCH="main"

# --- Validate required environment variables ---
REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "ARK_API_KEY"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASS"
  "EMAIL_FROM"
  "NEXT_PUBLIC_APP_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: Required environment variable $var is not set."
    exit 1
  fi
done

echo "[1/10] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# --- Install Node.js 20.x ---
echo "[2/10] Checking Node.js..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo "  Installing Node.js ${NODE_VERSION}..."
  if ! command -v curl &> /dev/null; then
    apt-get install -y -qq curl > /dev/null 2>&1
  fi
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  echo "  Node.js $(node -v) installed."
else
  echo "  Node.js $(node -v) already installed."
fi

# --- Install PostgreSQL 14 ---
echo "[3/10] Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "  Installing PostgreSQL 14..."
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - > /dev/null 2>&1
  apt-get update -qq
  apt-get install -y -qq postgresql-14 postgresql-client-14 > /dev/null 2>&1
  echo "  PostgreSQL 14 installed."
else
  echo "  PostgreSQL already installed."
fi

# --- Start PostgreSQL ---
echo "[4/10] Ensuring PostgreSQL is running..."
if ! pg_isready -q 2>/dev/null; then
  echo "  Starting PostgreSQL..."
  service postgresql start 2>/dev/null || pg_ctlcluster 14 main start 2>/dev/null || true
  sleep 2
fi

if pg_isready -q; then
  echo "  PostgreSQL is running."
else
  echo "  WARNING: PostgreSQL may not be fully ready, continuing anyway..."
fi

# --- Create database ---
echo "[5/10] Creating database if not exists..."
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" | grep -q 1 || \
  su - postgres -c "createdb ${DB_NAME}" && echo "  Database '${DB_NAME}' is ready."

# --- Setup app directory and code ---
echo "[6/10] Setting up application directory..."
mkdir -p "${APP_DIR}"

if [ -d "${APP_DIR}/.git" ]; then
  echo "  Pulling latest code..."
  cd "${APP_DIR}"
  git fetch origin "${REPO_BRANCH}"
  git reset --hard "origin/${REPO_BRANCH}"
else
  echo "  Cloning repository..."
  git clone -b "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

# --- Install npm dependencies ---
echo "[7/10] Installing npm dependencies..."
cd "${APP_DIR}"
npm install --production=false 2>&1 | tail -5

# --- Generate .env file from environment variables ---
echo "[8/10] Generating .env file..."
cat > "${APP_DIR}/.env" << EOF
# Auto-generated .env - DO NOT commit to version control
# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="${JWT_SECRET}"
ARK_API_KEY="${ARK_API_KEY}"
SMTP_HOST="${SMTP_HOST}"
SMTP_PORT="${SMTP_PORT}"
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
EMAIL_FROM="${EMAIL_FROM}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}"
NODE_ENV="production"
PORT=${APP_PORT}
EOF

echo "  .env file created."

# --- Run Prisma migrations and seed ---
echo "[9/10] Running database migrations..."
cd "${APP_DIR}"
npx prisma migrate deploy 2>&1 || echo "  WARNING: Prisma migrate had issues, continuing..."

echo "  Seeding database (ignoring errors if data exists)..."
npx prisma db seed 2>&1 || echo "  NOTE: Seed skipped or data already exists (this is normal)."

# --- Build the Next.js application ---
echo "  Building Next.js application..."
npm run build 2>&1 | tail -10

# --- Install PM2 and restart the app ---
echo "[10/10] Restarting application with PM2..."
if ! command -v pm2 &> /dev/null; then
  echo "  Installing PM2 globally..."
  npm install -g pm2 > /dev/null 2>&1
fi

# Stop existing process if running
pm2 describe "${APP_NAME}" > /dev/null 2>&1 && pm2 stop "${APP_NAME}" 2>/dev/null || true
pm2 delete "${APP_NAME}" > /dev/null 2>&1 || true

# Start the application
cd "${APP_DIR}"
pm2 start npm --name "${APP_NAME}" -- start -- -p ${APP_PORT}

# Save PM2 process list for auto-restart on reboot
pm2 save 2>/dev/null || true
pm2 startup 2>/dev/null > /dev/null || true

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "  App: ${APP_NAME}"
echo "  Port: ${APP_PORT}"
echo "  PM2 Status:"
pm2 status "${APP_NAME}"
echo "========================================"
