import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/security";
import { generateTotpSecret, generateOtpAuthUrl, generateQrCodeDataUrl, generateBackupCodes } from "@/lib/totp";

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get("auth_token")?.value ||
      req.cookies.get("admin_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    const secret = generateTotpSecret();
    const otpAuthUrl = generateOtpAuthUrl(user.email, secret, "Quizorra");
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);
    const backupCodes = generateBackupCodes(8);

    return NextResponse.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
      backupCodes,
    });
  } catch (err) {
    console.error("[GET /api/auth/2fa/setup]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi thiết lập 2FA" }, { status: 500 });
  }
}
