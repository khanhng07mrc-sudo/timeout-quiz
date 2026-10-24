import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, sanitizeInput } from "@/lib/security";
import { sendOtpEmail } from "@/lib/email-service";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, termsAccepted } = body;

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "Bạn phải đọc và đồng ý với Điều khoản dịch vụ và Chính sách bảo mật trước khi tiếp tục" },
        { status: 400 }
      );
    }

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc sử dụng tài khoản khác." },
        { status: 409 }
      );
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await hashPassword(password);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete old register codes for this email
    await prisma.verificationCode.deleteMany({
      where: { email: cleanEmail, type: "REGISTER" },
    });

    // Save verification code
    await prisma.verificationCode.create({
      data: {
        email: cleanEmail,
        code,
        type: "REGISTER",
        payload: JSON.stringify({ name: cleanName, hashedPassword }),
        expiresAt,
        attempts: 0,
      },
    });

    // Send OTP email
    const emailResult = await sendOtpEmail(cleanEmail, code, "REGISTER");

    return NextResponse.json({
      success: true,
      message: "Mã OTP xác thực 6 số đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư!",
      email: cleanEmail,
      devCode: emailResult.devCode, // populated if dev simulation without SMTP
    });
  } catch (err) {
    console.error("[POST /api/auth/register-request]", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi gửi mã xác thực. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
