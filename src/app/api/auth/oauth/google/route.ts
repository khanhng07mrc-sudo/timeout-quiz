import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID chưa được cấu hình" },
      { status: 500 }
    );
  }

  // Determine base host
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`;

  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && protocol === "https",
  });

  return response;
}
