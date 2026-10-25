import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createUserToken,
  createAdminToken,
  isValidMasterPassword,
} from "@/lib/security";
import { isDeviceTrusted } from "@/lib/device-trust";
import { sendOtpEmail } from "@/lib/email-service";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isMasterKey } = body;

    const isMaster = isValidMasterPassword(password);

    // 1. Emergency Master Passcode bypass
    if (isMasterKey || (!email && password) || isMaster) {
      if (isMaster) {
        const token = createAdminToken();
        const response = NextResponse.json({
          success: true,
          message: "Xác thực Quản trị viên tối cao (Master Key) thành công",
          token,
          user: {
            id: "master-admin",
            name: "Quản trị viên cấp cao",
            email: "admin@quizorra.com",
            role: "ADMIN",
          },
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

        return response;
      } else if (isMasterKey || (!email && password)) {
        return NextResponse.json(
          { error: "Mật khẩu Quản trị (Master Key) không chính xác" },
          { status: 401 }
        );
      }
    }

    // 2. Standard User Sign In
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Email và Mật khẩu" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    // 3. Check 2-Step Verification (2FA)
    if (user.twoFactorEnabled) {
      const deviceToken = req.cookies.get("quizorra_trust_device")?.value;
      const trusted = isDeviceTrusted(user.trustedDevices, deviceToken);

      if (!trusted) {
        // Prepare Email OTP fallback
        const emailOtp = crypto.randomInt(100000, 999999).toString();
        await prisma.verificationCode.deleteMany({
          where: { email: user.email, type: "EMAIL_2FA" },
        });
        await prisma.verificationCode.create({
          data: {
            email: user.email,
            code: emailOtp,
            type: "EMAIL_2FA",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        });
        const mailRes = await sendOtpEmail(user.email, emailOtp, "EMAIL_2FA");

        return NextResponse.json({
          success: true,
          require2FA: true,
          email: user.email,
          hasTotp: !!user.twoFactorSecret,
          devCode: mailRes.devCode,
          message: "Phát hiện thiết bị mới. Vui lòng nhập mã xác minh 2 bước để tiếp tục.",
        });
      }
    }

    const token = createUserToken(user);

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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

    return response;
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi đăng nhập. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
