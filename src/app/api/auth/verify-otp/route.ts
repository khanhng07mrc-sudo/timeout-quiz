import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserToken } from "@/lib/security";
import { addTrustedDevice, generateDeviceToken } from "@/lib/device-trust";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, type, trustThisDevice } = body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanCode = code?.trim().replace(/\D/g, "");

    if (!cleanEmail || !cleanCode || cleanCode.length !== 6) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ mã OTP 6 chữ số" },
        { status: 400 }
      );
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        email: cleanEmail,
        type: type || "REGISTER",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Mã OTP không tồn tại hoặc đã được sử dụng. Vui lòng nhấn gửi lại mã." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      await prisma.verificationCode.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới." },
        { status: 400 }
      );
    }

    if (record.attempts >= 5) {
      await prisma.verificationCode.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hóa để bảo vệ an toàn." },
        { status: 400 }
      );
    }

    if (record.code !== cleanCode) {
      const remaining = 5 - (record.attempts + 1);
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` },
        { status: 400 }
      );
    }

    // Code is correct! Clean up
    await prisma.verificationCode.delete({ where: { id: record.id } });

    if (type === "REGISTER") {
      let payloadData: { name?: string; hashedPassword?: string } = {};
      try {
        payloadData = record.payload ? JSON.parse(record.payload) : {};
      } catch {
        payloadData = {};
      }

      const existing = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      let user = existing;
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: payloadData.name || cleanEmail.split("@")[0],
            password: payloadData.hashedPassword || null,
            role: "USER",
            emailVerified: new Date(),
          },
        });
      } else {
        // Upgrade emailVerified
        user = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
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
        message: "Xác thực email thành công! Tài khoản chính thức được kích hoạt.",
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

      return response;
    }

    if (type === "EMAIL_2FA") {
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Tài khoản không tồn tại trên hệ thống" },
          { status: 404 }
        );
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
        message: "Xác minh 2 bước thành công!",
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
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/auth/verify-otp]", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi xác thực mã OTP. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
