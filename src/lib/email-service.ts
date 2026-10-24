import nodemailer from "nodemailer";

export interface SendOtpResult {
  success: boolean;
  simulated?: boolean;
  devCode?: string;
  error?: string;
}

export async function sendOtpEmail(
  toEmail: string,
  code: string,
  type: "REGISTER" | "EMAIL_2FA" | "PASSWORD_RESET"
): Promise<SendOtpResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Quizorra Security" <no-reply@quizorra.app>`;

  const titles: Record<string, string> = {
    REGISTER: "Xác thực địa chỉ Email - Tạo tài khoản Quizorra",
    EMAIL_2FA: "Mã xác minh 2 bước (2FA) đăng nhập Quizorra",
    PASSWORD_RESET: "Yêu cầu đặt lại mật khẩu Quizorra",
  };

  const subject = titles[type] || "Mã xác thực bảo mật Quizorra";

  // Check if SMTP is configured
  if (!host || !user || !pass) {
    console.info(
      `[EMAIL SERVICE (DEV SIMULATION)] No SMTP configured. To: ${toEmail} | Code: ${code} | Type: ${type}`
    );
    return {
      success: true,
      simulated: true,
      devCode: code,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0e1e; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0e1e; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" style="max-width: 520px; background: #121528; border: 1px solid #2d335c; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #181c38 0%, #0d1022 100%); border-bottom: 1px solid #262c52;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #ffffff;">
                <span style="color: #06b6d4;">QUIZ</span><span style="color: #a855f7;">ORRA</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">HỆ THỐNG TRUYỀN HÌNH TƯƠNG TÁC THẾ HỆ MỚI</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px; text-align: center;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #f8fafc;">
                ${type === "REGISTER" ? "Xác nhận quyền sở hữu Email" : "Xác minh danh tính 2 bước"}
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                Bạn nhận được thư này vì có yêu cầu thực hiện hành động bảo mật cho tài khoản <strong>${toEmail}</strong> trên hệ thống Quizorra.
              </p>

              <!-- OTP Box -->
              <div style="margin: 0 auto 24px; display: inline-block; background: #070914; border: 2px solid #06b6d4; border-radius: 14px; padding: 18px 36px; box-shadow: 0 0 20px rgba(6, 182, 212, 0.25);">
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: monospace;">
                  ${code}
                </div>
              </div>

              <p style="margin: 0 0 10px; font-size: 13px; color: #f59e0b; font-weight: 600;">
                ⏱ Mã xác thực có hiệu lực trong vòng 5 phút (Tối đa 5 lần thử).
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác để bảo vệ tài khoản của bạn.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background: #0a0c18; text-align: center; border-top: 1px solid #1c2242;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                © 2026 Quizorra Studio. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("[sendOtpEmail Error]", error);
    return {
      success: false,
      error: error?.message || "Không thể gửi thư điện tử xác thực",
    };
  }
}
