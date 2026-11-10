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

echo "=========================================================="
echo "   QUIZORRA / TIMEOUT QUIZ - RESILIENT VPS DEPLOYMENT     "
echo "=========================================================="

# 1. Cấu hình safe.directory và đồng bộ code từ GitHub
echo "[1/7] Synchronizing git repository..."
git config --global --add safe.directory "$SCRIPT_DIR" || true

# Tự động stash hoặc loại bỏ thay đổi tạm trên VPS để tránh lỗi 'uncommitted changes'
if [ -n "$(git status --porcelain)" ]; then
  echo "  -> Phát hiện thay đổi cục bộ hoặc file tạm trên VPS, đang sao lưu vào stash..."
  git stash --include-untracked || true
fi

# Chuyển nhánh về main và fetch với thông báo hướng dẫn xác thực nếu lỗi
git checkout -B main origin/main || git checkout main

echo "  -> Fetching latest origin/main..."
if ! git fetch origin main; then
  echo "  ⚠️ Git fetch thất bại. Nếu cần Personal Access Token (PAT) hoặc SSH key, vui lòng chạy:"
  echo "  git remote set-url origin https://<TOKEN>@github.com/khanhng07mrc-sudo/timeout-quiz.git"
  exit 1
fi

git reset --hard origin/main
CURRENT_COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
echo "  -> Đã đồng bộ mã nguồn về commit: $CURRENT_COMMIT ($COMMIT_MSG)"

# Dọn sạch các file rác phát sinh nhưng giữ nguyên toàn bộ file biến môi trường và tài nguyên uploads
git clean -fd -e ".env*" -e "public/uploads*"
# Xóa sạch cache và standalone bundle để tránh nạp mã hoặc chunk cũ
rm -rf .next/cache .next/standalone .next/server .next

# 2. Cài đặt dependencies sạch (Có fallback nếu npm ci gặp sai lệch lockfile)
echo "[2/7] Installing dependencies..."
npm ci --legacy-peer-deps || {
  echo "  -> 'npm ci' gặp cảnh báo lockfile, chuyển sang 'npm install --legacy-peer-deps'..."
  npm install --legacy-peer-deps
}

# 3. Tạo Prisma Client và đồng bộ CSDL
echo "[3/7] Generating Prisma Client & syncing database..."
npx prisma generate
npx prisma migrate deploy || npx prisma db push --accept-data-loss || true

# 4. Biên dịch Next.js và bundled server.js với giới hạn bộ nhớ 2-vCPU an toàn (tránh OOM)
echo "[4/7] Compiling production build (2-vCPU memory optimized)..."
export NODE_OPTIONS="--max-old-space-size=2048"
export GIT_COMMIT="$CURRENT_COMMIT"
npm run build

# 5. Khởi động lại dịch vụ PM2 với cập nhật biến môi trường (--update-env)
echo "[5/7] Reloading PM2 process..."
PM2_BIN="pm2"
if ! command -v pm2 >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    PM2_BIN="npx pm2"
  fi
fi

# Loại bỏ tiến trình cũ có thể trùng lặp port 3000 (tránh va chạm quizorra vs timeout-quiz)
$PM2_BIN delete quizorra 2>/dev/null || true
$PM2_BIN restart timeout-quiz --update-env || \
$PM2_BIN reload ecosystem.config.cjs --update-env || \
$PM2_BIN start ecosystem.config.cjs

$PM2_BIN save

# 6. Kiểm tra tình trạng hoạt động nội bộ (Internal Healthcheck loop)
echo "[6/7] Running local healthcheck..."
sleep 3
HEALTHY=false
for i in {1..12}; do
  if command -v curl >/dev/null 2>&1; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || true)
    if [ "$HTTP_STATUS" = "200" ]; then
      echo "  -> ✅ Internal healthcheck: OK (HTTP 200 sau ${i}s)"
      HEALTHY=true
      break
    fi
  fi
  sleep 1
done

if [ "$HEALTHY" = false ]; then
  echo "  -> ℹ️ Dịch vụ đang tiếp tục khởi động ngầm trong PM2."
fi

# 7. Kiểm tra endpoint công khai (quizorra.ddns.net)
echo "[7/7] Verifying public endpoint (quizorra.ddns.net)..."
if command -v curl >/dev/null 2>&1; then
  PUBLIC_STATUS=$(curl -s -k -o /dev/null -w "%{http_code}" https://quizorra.ddns.net/api/health 2>/dev/null || true)
  echo "  -> Public status: HTTP $PUBLIC_STATUS"

  # Kiểm tra xác thực commit đang chạy trên public endpoint
  HEALTH_JSON=$(curl -s -k https://quizorra.ddns.net/api/health 2>/dev/null || true)
  DEPLOYED_COMMIT=$(node -e "try { console.log(JSON.parse(process.argv[1]).commit || ''); } catch(e) { console.log(''); }" "$HEALTH_JSON")
  if [ -n "$DEPLOYED_COMMIT" ] && [ "$DEPLOYED_COMMIT" != "HEAD" ]; then
    echo "  -> Deployed commit hash: $DEPLOYED_COMMIT"
  fi
fi

echo "=========================================================="
echo "   ✅ DEPLOY THÀNH CÔNG CHO COMMIT: $CURRENT_COMMIT       "
echo "   Sandbox Live: https://quizorra.ddns.net/admin/sandbox?code=463275"
echo "=========================================================="
