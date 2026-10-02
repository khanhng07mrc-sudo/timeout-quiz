import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createUserToken, sanitizeInput } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    const cleanName = sanitizeInput(name?.trim(), 50);
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { error: "Tên hiển thị phải có ít nhất 2 ký tự" },
        { status: 400 }
      );
    }

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { error: "Địa chỉ email không đúng định dạng" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có độ dài tối thiểu 6 ký tự" },
        { status: 400 }
      );
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const token = createUserToken(user);

    const response = NextResponse.json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      user,
      token,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    };

    response.cookies.set("auth_token", token, cookieOptions);
    response.cookies.set("admin_token", token, cookieOptions);

    return response;
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi tạo tài khoản. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
