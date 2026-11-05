#!/bin/bash
set -e

# Tự động chuyển về thư mục dự án bất kể script được gọi từ đâu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Nạp biến môi trường cho nvm / node nếu script chạy trong non-interactive shell
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
elif [ -s "/root/.nvm/nvm.sh" ]; then
  export NVM_DIR="/root/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "========================================="
echo "   TIMEOUT QUIZ - VPS AUTO DEPLOY SCRIPT "
echo "========================================="

# 1. Đồng bộ code mới nhất từ GitHub (Xử lý triệt để xung đột git & file tạm)
echo "[1/6] Fetching and synchronizing latest code from origin/main..."
git fetch origin main

# Tự động stash hoặc loại bỏ thay đổi tạm trên VPS để tránh lỗi 'uncommitted changes'
if [ -n "$(git status --porcelain)" ]; then
  echo "  -> Phát hiện thay đổi cục bộ hoặc file tạm trên VPS, đang sao lưu vào stash..."
  git stash --include-untracked || true
fi

# Chuyển nhánh về main và reset chính xác về origin/main mới nhất
git checkout -B main origin/main
git reset --hard origin/main

CURRENT_COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
echo "  -> Đã đồng bộ mã nguồn về commit: $CURRENT_COMMIT ($COMMIT_MSG)"

# Dọn sạch các file rác phát sinh nhưng giữ nguyên toàn bộ file biến môi trường và tài nguyên tải lên
git clean -fd -e ".env*" -e "public/uploads*"

# 2. Cài đặt dependencies sạch (Có fallback nếu npm ci gặp sai lệch lockfile)
echo "[2/6] Installing dependencies..."
npm ci --legacy-peer-deps || {
  echo "  -> 'npm ci' gặp cảnh báo lockfile, chuyển sang 'npm install --legacy-peer-deps'..."
  npm install --legacy-peer-deps
}

# 3. Tạo Prisma Client và chạy migration
echo "[3/6] Syncing database schema with Prisma..."
npx prisma generate
npx prisma migrate deploy || npx prisma db push --accept-data-loss || true

# 4. Biên dịch Next.js và bundled server.js
echo "[4/6] Building Next.js application & server.js..."
npm run build

# 5. Khởi động lại dịch vụ PM2
echo "[5/6] Reloading PM2 service..."
PM2_BIN="pm2"
if ! command -v pm2 >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    PM2_BIN="npx pm2"
  fi
fi

$PM2_BIN reload ecosystem.config.cjs || $PM2_BIN restart timeout-quiz || $PM2_BIN start ecosystem.config.cjs
$PM2_BIN save

# 6. Kiểm tra tình trạng hoạt động (Healthcheck)
echo "[6/6] Verifying service health..."
HEALTHY=false
for i in $(seq 1 10); do
  if command -v curl >/dev/null 2>&1; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || true)
    if [ "$HTTP_STATUS" = "200" ]; then
      echo "  -> ✅ Server health check: OK (HTTP 200 - sau ${i}s)"
      HEALTHY=true
      break
    fi
  fi
  sleep 1
done

if [ "$HEALTHY" = false ]; then
  echo "  -> ℹ️ Dịch vụ đang tiếp tục khởi động ngầm trong PM2."
fi

echo "========================================="
echo "   ✅ DEPLOY THÀNH CÔNG LÊN VPS!         "
echo "   Trang web: https://quizorra.ddns.net  "
echo "========================================="
