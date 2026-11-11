import { NextRequest, NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/lib/security";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Đã đăng xuất thành công",
  });

  const expiredOpts = { ...getAuthCookieOptions(req), maxAge: 0 };
  response.cookies.set("auth_token", "", expiredOpts);
  response.cookies.set("admin_token", "", expiredOpts);
  response.cookies.delete("auth_token");
  response.cookies.delete("admin_token");

  return response;
}
