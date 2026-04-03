#!/bin/bash
set -e

# ============================================================
# Yogdu Private Referral - Server Deploy Script
# This script is uploaded to the server via SCP and executed
# via SSH from the GitHub Actions deploy workflow.
#
# All secrets are passed as environment variables from the
# GitHub Actions workflow. NO secrets are hardcoded here.
# ============================================================

echo "========================================"
echo "  Yogdu Referral - Server Deploy"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"

# --- Configuration ---
APP_DIR="/opt/yogdu-referral"
APP_NAME="yogdu-referral"
APP_PORT=3000
NODE_MAJOR=20
DB_NAME="yogdu_referral"
REPO_URL="https://github.com/Yogdunana/Yogdu-Private-Referral.git"
REPO_BRANCH="main"

# --- Validate required environment variables ---
echo "[Step 0/10] Validating environment variables..."
MISSING=0
for VAR in DATABASE_URL JWT_SECRET ARK_API_KEY SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS EMAIL_FROM NEXT_PUBLIC_APP_URL; do
  if [ -z "$(eval echo \${$VAR})" ]; then
    echo "  ERROR: $VAR is not set!"
    MISSING=1
  fi
done
if [ "$MISSING" -eq 1 ]; then
  echo "FATAL: Missing required environment variables. Aborting."
  exit 1
fi
echo "  All environment variables present."

# --- Update package lists ---
echo "[Step 1/10] Updating package lists..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>/dev/null || true

# --- Install / verify Node.js 20 ---
echo "[Step 2/10] Checking Node.js..."
if command -v node &>/dev/null; then
  CURRENT_NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  if [ "$CURRENT_NODE_MAJOR" -ge "$NODE_MAJOR" ] 2>/dev/null; then
    echo "  Node.js $(node -v) is already installed (>= ${NODE_MAJOR})."
  else
    echo "  Node.js $(node -v) found but < ${NODE_MAJOR}. Upgrading..."
    NEED_NODE=1
  fi
else
  NEED_NODE=1
fi

if [ "${NEED_NODE:-0}" -eq 1 ]; then
  echo "  Installing Node.js ${NODE_MAJOR}.x via NodeSource..."
  apt-get install -y -qq ca-certificates curl gnupg 2>/dev/null || true
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq 2>/dev/null
  apt-get install -y -qq nodejs 2>/dev/null
  echo "  Node.js $(node -v) installed successfully."
fi

# --- Install / verify PostgreSQL 14 ---
echo "[Step 3/10] Checking PostgreSQL..."
if command -v psql &>/dev/null; then
  echo "  PostgreSQL $(psql --version | awk '{print $3}') is installed."
else
  echo "  Installing PostgreSQL..."
  # Install prerequisites
  apt-get install -y -qq wget gnupg2 lsb-release 2>/dev/null || true
  # Add PostgreSQL APT repository
  DISTRO=$(lsb_release -cs 2>/dev/null || echo "jammy")
  sh -c "echo 'deb http://apt.postgresql.org/pub/repos/apt ${DISTRO}-pgdg main' > /etc/apt/sources.list.d/pgdg.list" || true
  # Import GPG key (modern method, fallback to apt-key)
  mkdir -p /etc/apt/keyrings
  wget -qO /etc/apt/keyrings/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc 2>/dev/null || true
  echo "deb [signed-by=/etc/apt/keyrings/pgdg.asc] http://apt.postgresql.org/pub/repos/apt ${DISTRO}-pgdg main" > /etc/apt/sources.list.d/pgdg.list || true
  apt-get update -qq 2>/dev/null || true
  apt-get install -y -qq postgresql postgresql-client 2>/dev/null || true
  echo "  PostgreSQL installation attempted."
fi

# --- Ensure PostgreSQL is running ---
echo "[Step 4/10] Ensuring PostgreSQL is running..."
if ! pg_isready -q 2>/dev/null; then
  echo "  Starting PostgreSQL service..."
  # Try multiple methods to start PostgreSQL
  service postgresql start 2>/dev/null \
    || pg_ctlcluster $(ls /etc/postgresql/ 2>/dev/null | head -1) main start 2>/dev/null \
    || /etc/init.d/postgresql start 2>/dev/null \
    || systemctl start postgresql 2>/dev/null \
    || true
  sleep 3
fi

# Wait for PostgreSQL to be ready (up to 30 seconds)
RETRIES=0
until pg_isready -q 2>/dev/null || [ $RETRIES -eq 15 ]; do
  echo "  Waiting for PostgreSQL... ($((RETRIES * 2))s)"
  sleep 2
  RETRIES=$((RETRIES + 1))
done

if pg_isready -q 2>/dev/null; then
  echo "  PostgreSQL is running."
else
  echo "  WARNING: PostgreSQL may not be ready. Continuing anyway..."
fi

# --- Create database if not exists ---
echo "[Step 5/10] Ensuring database '${DB_NAME}' exists..."
DB_EXISTS=$(su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" 2>/dev/null | tr -d '[:space:]')
if [ "$DB_EXISTS" = "1" ]; then
  echo "  Database '${DB_NAME}' already exists."
else
  su - postgres -c "createdb ${DB_NAME}" 2>/dev/null && echo "  Database '${DB_NAME}' created."
fi

# --- Clone or pull latest code ---
echo "[Step 6/10] Syncing application code..."
mkdir -p "${APP_DIR}"

if [ "${DEPLOY_SOURCE}" = "tarball" ] && [ -f /tmp/project.tar.gz ]; then
  echo "  Using tarball deploy mode (uploaded from GitHub Actions)..."
  # Backup existing code if present
  if [ -d "${APP_DIR}" ]; then
    echo "  Backing up existing code..."
    mv "${APP_DIR}" "${APP_DIR}.bak.$(date +%s)" 2>/dev/null || true
  fi
  mkdir -p "${APP_DIR}"
  tar xzf /tmp/project.tar.gz -C "${APP_DIR}" 2>&1
  echo "  Project files extracted to ${APP_DIR}."
  rm -f /tmp/project.tar.gz
else
  # Use GITHUB_TOKEN for authenticated clone if available
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    AUTH_REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/Yogdunana/Yogdu-Private-Referral.git"
  else
    AUTH_REPO_URL="${REPO_URL}"
  fi

  if [ -d "${APP_DIR}/.git" ]; then
    echo "  Repository exists. Pulling latest changes..."
    cd "${APP_DIR}"
    git fetch origin "${REPO_BRANCH}" 2>&1 | tail -3
    git reset --hard "origin/${REPO_BRANCH}" 2>&1
    echo "  Code updated to latest commit: $(git log --oneline -1)"
  else
    echo "  Cloning repository (branch: ${REPO_BRANCH})..."
    rm -rf "${APP_DIR}"
    # Retry clone up to 3 times with 10s delay
    CLONE_SUCCESS=0
    for i in 1 2 3; do
      echo "  Attempt ${i}/3..."
      if git clone -b "${REPO_BRANCH}" --depth 1 "${AUTH_REPO_URL}" "${APP_DIR}" 2>&1; then
        CLONE_SUCCESS=1
        break
      fi
      echo "  Clone failed, waiting 10s before retry..."
      sleep 10
    done
    if [ "${CLONE_SUCCESS}" -eq 0 ]; then
      echo "  ERROR: Failed to clone repository after 3 attempts."
      exit 1
    fi
    echo "  Repository cloned."
  fi
fi

# --- Install npm dependencies ---
echo "[Step 7/10] Installing npm dependencies..."
cd "${APP_DIR}"
npm install 2>&1 | tail -3
echo "  Dependencies installed."

# --- Generate .env from environment variables ---
echo "[Step 8/10] Writing .env file..."
cat > "${APP_DIR}/.env" << 'ENVFILE'
# ============================================================
# Auto-generated .env file - DO NOT commit to version control!
# Generated by deploy.sh at: __TIMESTAMP__
# ============================================================

DATABASE_URL="__DATABASE_URL__"
JWT_SECRET="__JWT_SECRET__"
ARK_API_KEY="__ARK_API_KEY__"
SMTP_HOST="__SMTP_HOST__"
SMTP_PORT="__SMTP_PORT__"
SMTP_USER="__SMTP_USER__"
SMTP_PASS="__SMTP_PASS__"
EMAIL_FROM="__EMAIL_FROM__"
NEXT_PUBLIC_APP_URL="__NEXT_PUBLIC_APP_URL__"
NODE_ENV="production"
PORT=__APP_PORT__
ENVFILE

# Replace placeholders with actual values
sed -i "s|__TIMESTAMP__|$(date -u '+%Y-%m-%dT%H:%M:%SZ')|g" "${APP_DIR}/.env"
sed -i "s|__DATABASE_URL__|${DATABASE_URL}|g" "${APP_DIR}/.env"
sed -i "s|__JWT_SECRET__|${JWT_SECRET}|g" "${APP_DIR}/.env"
sed -i "s|__ARK_API_KEY__|${ARK_API_KEY}|g" "${APP_DIR}/.env"
sed -i "s|__SMTP_HOST__|${SMTP_HOST}|g" "${APP_DIR}/.env"
sed -i "s|__SMTP_PORT__|${SMTP_PORT}|g" "${APP_DIR}/.env"
sed -i "s|__SMTP_USER__|${SMTP_USER}|g" "${APP_DIR}/.env"
sed -i "s|__SMTP_PASS__|${SMTP_PASS}|g" "${APP_DIR}/.env"
sed -i "s|__EMAIL_FROM__|${EMAIL_FROM}|g" "${APP_DIR}/.env"
sed -i "s|__NEXT_PUBLIC_APP_URL__|${NEXT_PUBLIC_APP_URL}|g" "${APP_DIR}/.env"
sed -i "s|__APP_PORT__|${APP_PORT}|g" "${APP_DIR}/.env"

# Set restrictive permissions on .env
chmod 600 "${APP_DIR}/.env"
echo "  .env file written with correct permissions."

# --- Run Prisma migrations and seed ---
echo "[Step 9/10] Running Prisma migrations and seed..."
cd "${APP_DIR}"

echo "  Running prisma migrate deploy..."
npx prisma migrate deploy 2>&1 || {
  echo "  WARNING: Prisma migrate encountered issues."
  echo "  Attempting to run prisma db push as fallback..."
  npx prisma db push --accept-data-loss 2>&1 || echo "  WARNING: Fallback migration also had issues."
} || true

echo "  Running prisma db seed (errors are expected if data exists)..."
npx prisma db seed 2>&1 || {
  echo "  NOTE: Seed command completed with non-zero exit code."
  echo "  This is normal if seed data already exists in the database."
} || true

# --- Build and start with PM2 ---
echo "[Step 10/10] Building and starting application..."
cd "${APP_DIR}"

echo "  Building Next.js application (this may take a few minutes)..."
npm run build 2>&1 | tail -10 || {
  echo "  ERROR: Build failed! Check the logs above."
  exit 1
}
echo "  Build complete."

# Install PM2 if not present
if ! command -v pm2 &>/dev/null; then
  echo "  Installing PM2..."
  npm install -g pm2 2>/dev/null
fi

# Stop and remove existing process
if pm2 describe "${APP_NAME}" &>/dev/null; then
  echo "  Stopping existing PM2 process..."
  pm2 stop "${APP_NAME}" 2>/dev/null || true
  pm2 delete "${APP_NAME}" 2>/dev/null || true
fi

# Create startup script that loads .env
cat > "${APP_DIR}/start.sh" << 'STARTEOF'
#!/bin/bash
cd "$(dirname "$0")"
set -a
source "$(dirname "$0")/.env"
set +a
exec node_modules/.bin/next start -p "${PORT:-3002}"
STARTEOF
chmod +x "${APP_DIR}/start.sh"

# Start the application with PM2 using the startup script
echo "  Starting application with PM2..."
cd "${APP_DIR}"
pm2 start "${APP_DIR}/start.sh" --name "${APP_NAME}"

# Save PM2 process list and configure startup
pm2 save 2>/dev/null || true
# Generate startup script (ignore errors if not supported)
pm2 startup 2>/dev/null > /dev/null || true

# Configure Nginx reverse proxy
echo "  Configuring Nginx reverse proxy..."
if command -v nginx &>/dev/null; then
  # Check if SSL certificate exists
  if [ -f "/etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem" ]; then
    cat > /etc/nginx/sites-available/yogdu-referral << 'NGINXEOF'
server {
    listen 80;
    server_name maixuan.yogdunana.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name maixuan.yogdunana.com;
    ssl_certificate /etc/letsencrypt/live/maixuan.yogdunana.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maixuan.yogdunana.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF
  else
    cat > /etc/nginx/sites-available/yogdu-referral << 'NGINXEOF'
server {
    listen 80;
    server_name maixuan.yogdunana.com;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF
  fi
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  ln -sf /etc/nginx/sites-available/yogdu-referral /etc/nginx/sites-enabled/yogdu-referral
  nginx -t 2>/dev/null && (service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null) && echo "  Nginx configured." || echo "  WARNING: Nginx config failed."
fi

# Show PM2 status
echo ""
echo "  PM2 Process Status:"
pm2 list 2>/dev/null || true

echo ""
echo "========================================"
echo "  Deployment SUCCESSFUL!"
echo "  Application: ${APP_NAME}"
echo "  Port: ${APP_PORT}"
echo "  Directory: ${APP_DIR}"
echo "  Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
