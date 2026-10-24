import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserToken } from "@/lib/security";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      renderErrorHtml("Đăng nhập Google bị hủy hoặc gặp lỗi: " + (error || "Không nhận được mã xác thực")),
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 400 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      renderErrorHtml("Máy chủ chưa cấu hình Google Client ID hoặc Secret."),
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 500 }
    );
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`;

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange error:", errBody);
      return new NextResponse(
        renderErrorHtml("Không thể xác thực mã từ Google. Vui lòng thử lại."),
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 400 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return new NextResponse(
        renderErrorHtml("Không thể lấy thông tin tài khoản Google."),
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 400 }
      );
    }

    const profile = await profileRes.json();
    const email = profile.email?.toLowerCase()?.trim();
    const name = profile.name || email?.split("@")[0] || "Người dùng Google";
    const picture = profile.picture || null;
    const googleId = profile.sub;

    if (!email) {
      return new NextResponse(
        renderErrorHtml("Tài khoản Google không cung cấp địa chỉ Email hợp lệ."),
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 400 }
      );
    }

    // 3. Find or create user in Database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          image: picture,
          role: "USER",
        },
      });
    } else if (picture && !user.image) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { image: picture },
      });
    }

    // 4. Link or update Account
    if (googleId) {
      try {
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: googleId,
            },
          },
          update: {
            access_token: tokenData.access_token,
            id_token: tokenData.id_token,
            expires_at: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : undefined,
            token_type: tokenData.token_type,
            scope: tokenData.scope,
          },
          create: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: googleId,
            access_token: tokenData.access_token,
            id_token: tokenData.id_token,
            expires_at: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : undefined,
            token_type: tokenData.token_type,
            scope: tokenData.scope,
          },
        });
      } catch (accErr) {
        console.warn("Could not upsert account relation, continuing:", accErr);
      }
    }

    // 5. Generate session token
    const token = createUserToken(user);

    // 6. Return auto-login HTML with cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && protocol === "https",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    };

    const response = new NextResponse(renderSuccessHtml(token, user.name), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });

    response.cookies.set("auth_token", token, cookieOptions);
    response.cookies.set("admin_token", token, cookieOptions);

    return response;
  } catch (err) {
    console.error("Google OAuth callback exception:", err);
    return new NextResponse(
      renderErrorHtml("Đã xảy ra lỗi máy chủ trong quá trình xử lý đăng nhập Google."),
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 500 }
    );
  }
}

function renderSuccessHtml(token: string, userName: string) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Quizorra - Đăng nhập Google thành công</title>
  <style>
    body {
      margin: 0;
      background: #0b0c16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(6, 182, 212, 0.2);
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #fff; }
    p { margin: 0; font-size: 14px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Xin chào, ${escapeHtml(userName)}!</h2>
  <p>Đang hoàn tất đăng nhập vào Quizorra...</p>
  <script>
    try {
      localStorage.setItem('admin_token', ${JSON.stringify(token)});
      sessionStorage.setItem('admin_token', ${JSON.stringify(token)});
    } catch (e) {
      console.error(e);
    }
    setTimeout(function() {
      window.location.href = '/admin';
    }, 600);
  </script>
</body>
</html>`;
}

function renderErrorHtml(message: string) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Lỗi đăng nhập - Quizorra</title>
  <style>
    body {
      margin: 0;
      background: #0b0c16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 20px;
    }
    .card {
      max-width: 420px;
      background: #15182e;
      border: 1px solid rgba(239, 68, 68, 0.4);
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    h2 { color: #f87171; margin-top: 0; }
    p { color: #cbd5e1; font-size: 14px; line-height: 1.5; }
    a {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background: #6366f1;
      color: #fff;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Đăng nhập không thành công</h2>
    <p>${escapeHtml(message)}</p>
    <a href="/admin">Quay lại trang Đăng nhập</a>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
