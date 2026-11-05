#!/bin/bash
set -e

echo "========================================="
echo "   TIMEOUT QUIZ - VPS AUTO DEPLOY SCRIPT "
echo "========================================="

# 1. Pull code mới nhất từ GitHub
echo "[1/5] Pulling latest code from git..."
git pull origin main

# 2. Cài đặt dependencies sạch
echo "[2/5] Installing dependencies..."
npm ci --legacy-peer-deps

# 3. Tạo Prisma Client và chạy migration
echo "[3/5] Syncing database schema with Prisma..."
npx prisma generate
npx prisma migrate deploy

# 4. Biên dịch Next.js và bundled server.js
echo "[4/5] Building Next.js application & server.js..."
npm run build

# 5. Khởi động lại dịch vụ PM2
echo "[5/5] Reloading PM2 service..."
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs
pm2 save

echo "========================================="
echo "   ✅ DEPLOY THÀNH CÔNG LÊN VPS!         "
echo "========================================="
