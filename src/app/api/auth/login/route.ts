import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createUserToken,
  createAdminToken,
  getAdminMasterPassword,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isMasterKey } = body;

    const masterPasscode = getAdminMasterPassword();

    // 1. Emergency Master Passcode bypass
    if (isMasterKey || (!email && password) || password === masterPasscode) {
      if (password === masterPasscode) {
        const token = createAdminToken();
        const response = NextResponse.json({
          success: true,
          message: "Xác thực Quản trị viên tối cao (Master Key) thành công",
          token,
          user: {
            id: "master-admin",
            name: "Super Admin",
            email: "admin@brainclash.io",
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
