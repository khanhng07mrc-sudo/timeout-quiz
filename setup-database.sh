#!/bin/bash
set -e

echo "========================================="
echo "   TIMEOUT QUIZ - SETUP LOCAL POSTGRESQL "
echo "========================================="

# 1. Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo "[1/4] Installing PostgreSQL server..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
fi

# 2. Start PostgreSQL service
echo "[2/4] Starting PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# 3. Configure Database and User
echo "[3/4] Creating database and user..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'Quizorra2026!';"
sudo -u postgres psql -c "CREATE DATABASE timeout_quiz;" 2>/dev/null || echo "Database already exists"

# 4. Update .env file
echo "[4/4] Updating .env and syncing Prisma schema..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:Quizorra2026!@localhost:5432/timeout_quiz"|g' "$ENV_FILE"
else
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:Quizorra2026!@localhost:5432/timeout_quiz"|g' "$ENV_FILE"
fi

# Ensure URLs point to domain
sed -i 's|http://localhost:3000|https://quizorra.ddns.net|g' "$ENV_FILE"

cd "$SCRIPT_DIR"
npx prisma generate
npx prisma db push

echo "Reloading PM2..."
pm2 reload ecosystem.config.cjs || pm2 restart all || pm2 start ecosystem.config.cjs
pm2 save

echo "========================================="
echo "   ✅ CÀI ĐẶT DATABASE THÀNH CÔNG 100%!  "
echo "========================================="
