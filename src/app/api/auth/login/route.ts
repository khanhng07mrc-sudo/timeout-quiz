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

    const cleanEmail = email?.trim().toLowerCase();

    // 1. If email is provided, authenticate strictly as that specific user
    if (cleanEmail) {
      if (!password) {
        return NextResponse.json(
          { error: "Vui lòng nhập đầy đủ Email và Mật khẩu" },
          { status: 400 }
        );
      }

      let user = null;
      try {
        user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });
      } catch (dbErr) {
        console.warn("[POST /api/auth/login] Database query error:", dbErr);
      }

      // If user provided Master Admin Password, ALWAYS grant ADMIN login immediately!
      // This ensures the system administrator is NEVER locked out, even if the DB is offline or initializing.
      if (isMaster) {
        const displayName =
          user?.name ||
          (cleanEmail === "channelngktv@gmail.com"
            ? "Nguyễn Gia Khánh"
            : cleanEmail.split("@")[0] || "Quản trị viên");

        // Try to persist user in DB in background if not exists
        if (!user) {
          try {
            user = await prisma.user.create({
              data: {
                email: cleanEmail,
                name: displayName,
                role: "ADMIN",
              },
            });
          } catch (createErr) {
            console.warn("[POST /api/auth/login] Background user create warning:", createErr);
          }
        }

        const token = createAdminToken();
        const response = NextResponse.json({
          success: true,
          message: "Đăng nhập Quản trị viên thành công",
          token,
          user: {
            id: user?.id || "master-admin",
            name: displayName,
            email: cleanEmail,
            role: "ADMIN",
            image: user?.image || null,
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
      }

      if (!user) {
        return NextResponse.json(
          { error: "Email hoặc mật khẩu không chính xác" },
          { status: 401 }
        );
      }

      let isMatch = false;
      if (user.password) {
        isMatch = await comparePassword(password, user.password);
      }
      if (!isMatch && isMaster) {
        isMatch = true;
      }

      if (!isMatch) {
        return NextResponse.json(
          { error: "Email hoặc mật khẩu không chính xác" },
          { status: 401 }
        );
      }

      // Proceed with 2FA or Login as this user
      if (user.twoFactorEnabled) {
        const deviceToken = req.cookies.get("quizorra_trust_device")?.value;
        const trusted = isDeviceTrusted(user.trustedDevices, deviceToken);

        if (!trusted) {
          const emailOtp = crypto.randomInt(100000, 999999).toString();
          await prisma.verificationCode.deleteMany({
            where: { email: user.email, type: "EMAIL_2FA" },
          });
          await prisma.verificationCode.create({
            data: {
              email: user.email,
              code: emailOtp,
              type: "EMAIL_2FA",
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
          });

          await sendOtpEmail(user.email, emailOtp, "EMAIL_2FA");

          return NextResponse.json({
            success: true,
            require2FA: true,
            email: user.email,
            devCode: process.env.NODE_ENV !== "production" ? emailOtp : undefined,
          });
        }
      }

      const token = createUserToken(user);
      const response = NextResponse.json({
        success: true,
        message: "Đăng nhập thành công",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
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
    }

    // 2. Anonymous Master Passcode mode (when NO email is provided)
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
      } else {
        return NextResponse.json(
          { error: "Mật khẩu Quản trị (Master Key) không chính xác" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Vui lòng nhập email hoặc sử dụng Master Key" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi đăng nhập. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
