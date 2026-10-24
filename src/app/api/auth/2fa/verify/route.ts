import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserToken } from "@/lib/security";
import { verifyTotpToken, hashBackupCode } from "@/lib/totp";
import { addTrustedDevice, generateDeviceToken } from "@/lib/device-trust";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, trustThisDevice, isBackupCode } = body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanCode = code?.trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json({ error: "Vui lòng nhập mã xác thực" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    let isVerified = false;

    // 1. Check Backup Code
    if (isBackupCode) {
      if (!user.backupCodes) {
        return NextResponse.json({ error: "Tài khoản chưa thiết lập mã sao lưu dự phòng" }, { status: 400 });
      }
      try {
        const storedHashes: string[] = JSON.parse(user.backupCodes);
        const codeHash = hashBackupCode(cleanCode);
        const index = storedHashes.indexOf(codeHash);

        if (index !== -1) {
          isVerified = true;
          // Consume the backup code (single-use)
          storedHashes.splice(index, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: JSON.stringify(storedHashes) },
          });
        } else {
          return NextResponse.json({ error: "Mã dự phòng không chính xác hoặc đã được sử dụng" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Lỗi định dạng mã dự phòng" }, { status: 500 });
      }
    } else {
      // 2. Check TOTP Authenticator code
      if (user.twoFactorSecret && cleanCode.length === 6) {
        if (verifyTotpToken(user.twoFactorSecret, cleanCode)) {
          isVerified = true;
        }
      }

      // 3. Check Email OTP fallback
      if (!isVerified && cleanCode.length === 6) {
        const emailRecord = await prisma.verificationCode.findFirst({
          where: { email: cleanEmail, type: "EMAIL_2FA" },
          orderBy: { createdAt: "desc" },
        });

        if (emailRecord && new Date() <= emailRecord.expiresAt && emailRecord.code === cleanCode) {
          isVerified = true;
          await prisma.verificationCode.delete({ where: { id: emailRecord.id } });
        }
      }
    }

    if (!isVerified) {
      return NextResponse.json({ error: "Mã xác thực 2 bước không hợp lệ hoặc đã hết hạn" }, { status: 400 });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = createUserToken(safeUser);
    const response = NextResponse.json({
      success: true,
      message: "Xác thực 2 bước thành công! Đang đăng nhập...",
      user: safeUser,
      token,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    };
    response.cookies.set("auth_token", token, cookieOptions);
    response.cookies.set("admin_token", token, cookieOptions);

    if (trustThisDevice) {
      const deviceToken = generateDeviceToken();
      const userAgent = req.headers.get("user-agent") || undefined;
      const updatedDevices = addTrustedDevice(user.trustedDevices, deviceToken, userAgent, 30);
      await prisma.user.update({
        where: { id: user.id },
        data: { trustedDevices: updatedDevices },
      });
      response.cookies.set("quizorra_trust_device", deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (err) {
    console.error("[POST /api/auth/2fa/verify]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi xác thực 2FA" }, { status: 500 });
  }
}
