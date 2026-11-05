#!/bin/bash
set -e

echo "========================================="
echo "   TIMEOUT QUIZ - SETUP LOCAL POSTGRESQL "
echo "========================================="

# 1. Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo "[1/5] Installing PostgreSQL server..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
else
    echo "[1/5] PostgreSQL is already installed."
fi

# 2. Start PostgreSQL service
echo "[2/5] Starting PostgreSQL service..."
systemctl start postgresql || true
systemctl enable postgresql || true

# 3. Configure Database and User with maximum compatibility
echo "[3/5] Configuring database user 'quizadmin' and DB 'timeout_quiz'..."
sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'quizadmin') THEN CREATE ROLE quizadmin WITH LOGIN PASSWORD 'QuizPass2026!'; END IF; END \$\$;"
sudo -u postgres psql -c "ALTER ROLE quizadmin WITH PASSWORD 'QuizPass2026!'; ALTER ROLE quizadmin CREATEDB;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'timeout_quiz'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE timeout_quiz OWNER quizadmin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE timeout_quiz TO quizadmin;"
sudo -u postgres psql -d timeout_quiz -c "GRANT ALL ON SCHEMA public TO quizadmin;" 2>/dev/null || true

# 4. Update .env file
echo "[4/5] Updating .env configuration..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
fi

# Use 127.0.0.1 loopback to guarantee reliable IPv4 connection
sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://quizadmin:QuizPass2026!@127.0.0.1:5432/timeout_quiz?schema=public"|g' "$ENV_FILE"
sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL="https://quizorra.ddns.net"|g' "$ENV_FILE"
sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL="https://quizorra.ddns.net"|g' "$ENV_FILE"
sed -i 's|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET="Quizorra_super_secret_key_2026_production"|g' "$ENV_FILE"

# 5. Push Prisma schema & seed initial Admin user
echo "[5/5] Generating Prisma client and syncing database tables..."
cd "$SCRIPT_DIR"
npx prisma generate
npx prisma db push --accept-data-loss

echo "Seeding Admin user channelngktv@gmail.com..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('TimeoutQuiz@Admin2026', 10);
  await prisma.user.upsert({
    where: { email: 'channelngktv@gmail.com' },
    update: { password: hash, role: 'ADMIN' },
    create: {
      email: 'channelngktv@gmail.com',
      name: 'Nguyễn Gia Khánh',
      password: hash,
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin user channelngktv@gmail.com initialized in database!');
}
main().then(() => prisma.\$disconnect()).catch(e => { console.warn('[DB User Seed Warning]:', e.message); prisma.\$disconnect(); });
"

echo "Reloading PM2 service..."
pm2 reload ecosystem.config.cjs || pm2 restart all || pm2 start ecosystem.config.cjs
pm2 save

echo "========================================="
echo "   ✅ CÀI ĐẶT DATABASE THÀNH CÔNG 100%!  "
echo "========================================="
