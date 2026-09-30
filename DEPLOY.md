# Timeout Quiz - Render Deployment Guide

## Setup trên Render

### 1. PostgreSQL Database
1. Vào **Render Dashboard** → **New** → **PostgreSQL**
2. Đặt tên: `timeout-quiz-db`
3. Plan: Free (90 ngày) hoặc Starter
4. Copy **Internal Database URL** → dùng làm `DATABASE_URL`

### 2. Web Service
1. Vào **New** → **Web Service**
2. Connect GitHub repository
3. Cấu hình:
   - **Root Directory**: `timeout-quiz`
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `node server.js`
   - **Node Version**: 20

### 3. Environment Variables trên Render
Thêm các biến sau vào **Environment Variables**:

```
DATABASE_URL=postgresql://...  (từ Render PostgreSQL)
NEXTAUTH_URL=https://your-app.onrender.com
NEXTAUTH_SECRET=<random 32+ chars>
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
PORT=3000
```

### 4. GitHub Actions Secret
Trong repo GitHub → **Settings** → **Secrets** → **Actions**:
- `RENDER_DEPLOY_HOOK_URL`: URL từ Render → Service → Deploy Hook

---

## Lưu ý Render Free Tier

⚠️ **Free tier ngủ sau 15 phút không có request**. Để giải quyết:

### Option A: Keepalive (miễn phí)
Thêm một cron job ping mỗi 14 phút:
```bash
# Dùng UptimeRobot (miễn phí) monitor URL
# https://uptimerobot.com/
```

### Option B: Nâng cấp lên Starter plan ($7/tháng)
- Không bị sleep
- WebSocket ổn định hơn

---

## Chạy local (development)

```bash
cd timeout-quiz

# Copy env
cp .env.example .env
# Điền DATABASE_URL và NEXTAUTH_SECRET

# Generate Prisma client
npx prisma generate

# Migrate database
npx prisma db push

# Start dev server
npm run dev
# Hoặc custom server với Socket.IO:
npx ts-node server.ts
```

---

## Database migration

```bash
# Tạo migration mới (sau khi thay đổi schema)
npx prisma migrate dev --name <migration-name>

# Deploy migration lên production
npx prisma migrate deploy
```
