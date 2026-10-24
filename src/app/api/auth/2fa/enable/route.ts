import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/security";
import { verifyTotpToken, hashBackupCode } from "@/lib/totp";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { secret, code, backupCodes } = body;

    if (!secret || !code || code.length !== 6) {
      return NextResponse.json({ error: "Vui lòng nhập đủ 6 chữ số từ ứng dụng Authenticator" }, { status: 400 });
    }

    const isValid = verifyTotpToken(secret, code.trim());
    if (!isValid) {
      return NextResponse.json({ error: "Mã 6 chữ số không khớp hoặc đã hết hạn. Vui lòng kiểm tra lại đồng hồ thiết bị." }, { status: 400 });
    }

    // Hash backup codes
    const hashedBackupCodes = Array.isArray(backupCodes)
      ? backupCodes.map((c: string) => hashBackupCode(c))
      : [];

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã kích hoạt Xác minh 2 bước (2FA) Google Authenticator thành công!",
    });
  } catch (err) {
    console.error("[POST /api/auth/2fa/enable]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi kích hoạt 2FA" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã tắt Xác minh 2 bước (2FA) cho tài khoản.",
    });
  } catch (err) {
    console.error("[DELETE /api/auth/2fa/enable]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi tắt 2FA" }, { status: 500 });
  }
}
