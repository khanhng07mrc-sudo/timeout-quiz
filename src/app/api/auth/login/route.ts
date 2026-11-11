import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createUserToken,
  isValidMasterPassword,
  getAuthCookieOptions,
  DEMO_HOST_IDS,
  DEMO_HOST_EMAILS,
} from "@/lib/security";
import { isDeviceTrusted } from "@/lib/device-trust";
import { sendOtpEmail } from "@/lib/email-service";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isMasterKey } = body;

    const isMaster = isValidMasterPassword(password);
    const cookieOptions = getAuthCookieOptions(req);
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

      // If user provided Master Admin Password alongside their email, bind the ADMIN session
      // strictly to THAT email (never an anonymous token or demo account).
      if (isMaster) {
        const displayName =
          user?.name ||
          (cleanEmail === "channelngktv@gmail.com"
            ? "Nguyễn Gia Khánh"
            : cleanEmail.split("@")[0] || "Quản trị viên");

        try {
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: cleanEmail,
                name: displayName,
                role: "ADMIN",
                emailVerified: new Date(),
              },
            });
          } else if (user.role !== "ADMIN") {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            });
          }
        } catch (persistErr) {
          console.warn("[POST /api/auth/login] Background admin user persist warning:", persistErr);
        }

        const sessionUser = {
          id: user?.id || `master:${cleanEmail}`,
          name: user?.name || displayName,
          email: cleanEmail,
          role: "ADMIN" as const,
          image: user?.image || null,
        };

        const token = createUserToken(sessionUser);
        const response = NextResponse.json({
          success: true,
          message: "Đăng nhập Quản trị viên thành công",
          token,
          user: sessionUser,
        });

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

      response.cookies.set("auth_token", token, cookieOptions);
      response.cookies.set("admin_token", token, cookieOptions);

      return response;
    }

    // 2. Anonymous Master Passcode mode (when NO email is provided)
    if (isMasterKey || (!email && password) || isMaster) {
      if (isMaster) {
        let primaryAdmin = null;
        try {
          primaryAdmin = await prisma.user.findFirst({
            where: {
              role: "ADMIN",
              id: { notIn: DEMO_HOST_IDS },
              email: { notIn: DEMO_HOST_EMAILS },
            },
            orderBy: { createdAt: "asc" },
          });
        } catch (dbErr) {
          console.warn("[POST /api/auth/login] Primary admin lookup warning:", dbErr);
        }

        const resolvedAdmin = primaryAdmin
          ? {
              id: primaryAdmin.id,
              name: primaryAdmin.name,
              email: primaryAdmin.email,
              role: "ADMIN" as const,
              image: primaryAdmin.image || null,
            }
          : {
              id: "master-admin",
              name: "Nguyễn Gia Khánh",
              email: "channelngktv@gmail.com",
              role: "ADMIN" as const,
              image: null,
            };

        const token = createUserToken(resolvedAdmin);
        const response = NextResponse.json({
          success: true,
          message: "Xác thực Quản trị viên tối cao (Master Key) thành công",
          token,
          user: resolvedAdmin,
        });

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
