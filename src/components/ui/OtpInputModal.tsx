"use client";

import { useState, useEffect, useRef } from "react";
import BrandLogo from "@/components/ui/BrandLogo";

interface OtpInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  type: "REGISTER" | "EMAIL_2FA" | "LOGIN_2FA";
  devCode?: string | null;
  onSuccess: (userData: any, token: string) => void;
  onResendOtp?: () => Promise<string | null | void>; // returns new devCode if any
}

export default function OtpInputModal({
  isOpen,
  onClose,
  email,
  type,
  devCode: initialDevCode,
  onSuccess,
  onResendOtp,
}: OtpInputModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [devCode, setDevCode] = useState<string | null | undefined>(initialDevCode);

  // 2FA Specific states
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDevCode(initialDevCode);
  }, [initialDevCode]);

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen) return;
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Auto focus first input on open
  useEffect(() => {
    if (isOpen && !isBackupMode) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen, isBackupMode]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits are filled
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.some((d) => d === "")) {
      submitCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);
    setError(null);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      submitCode(pasted);
    }
  };

  const fillDevCode = () => {
    if (!devCode) return;
    const clean = devCode.replace(/\D/g, "").slice(0, 6);
    const newDigits = clean.split("");
    while (newDigits.length < 6) newDigits.push("");
    setDigits(newDigits);
    if (clean.length === 6) {
      submitCode(clean);
    }
  };

  const submitCode = async (codeToSubmit: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (type === "LOGIN_2FA" || isBackupMode) {
        const res = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            code: codeToSubmit,
            trustThisDevice: trustDevice,
            isBackupCode: isBackupMode,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onSuccess(data.user, data.token);
          onClose();
        } else {
          setError(data.error || "Mã xác thực không hợp lệ");
        }
      } else {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            code: codeToSubmit,
            type: type === "REGISTER" ? "REGISTER" : "EMAIL_2FA",
            trustThisDevice: trustDevice,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onSuccess(data.user, data.token);
          onClose();
        } else {
          setError(data.error || "Mã OTP không chính xác");
        }
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi xác thực OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !onResendOtp) return;
    setError(null);
    try {
      const newDev = await onResendOtp();
      if (typeof newDev === "string") {
        setDevCode(newDev);
      }
      setCooldown(60);
    } catch {
      setError("Không thể gửi lại mã lúc này. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#121424] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/40 text-white space-y-6 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <BrandLogo size="sm" variant="icon" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {type === "REGISTER"
              ? "Xác thực Quyền sở hữu Email"
              : isBackupMode
              ? "Sử dụng Mã sao lưu dự phòng"
              : "Xác minh 2 bước (2FA)"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            {isBackupMode ? (
              "Nhập 1 trong 8 mã dự phòng khẩn cấp được cấp khi bật 2FA (định dạng XXXX-XXXX)"
            ) : type === "LOGIN_2FA" ? (
              <>
                Mở ứng dụng <strong className="text-cyan-300">Google Authenticator</strong> hoặc kiểm tra hòm thư{" "}
                <span className="text-purple-300 font-semibold">{email}</span> để lấy mã 6 số.
              </>
            ) : (
              <>
                Mã OTP 6 số đã được gửi đến: <strong className="text-cyan-300">{email}</strong>
              </>
            )}
          </p>
        </div>

        {/* Dev simulation banner if applicable */}
        {devCode && !isBackupMode && (
          <div
            onClick={fillDevCode}
            className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 text-xs text-center cursor-pointer hover:bg-cyan-900/60 transition group shadow-sm"
          >
            <span className="font-bold text-cyan-400">[DEV/TEST SIMULATION]</span> Mã OTP của bạn là:{" "}
            <span className="font-mono font-extrabold text-sm text-yellow-300 underline underline-offset-2">
              {devCode}
            </span>{" "}
            <span className="text-[11px] text-slate-400 block group-hover:text-cyan-300">
              (Bấm vào đây để tự động điền ngay)
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm text-center font-medium animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* Backup Code Mode */}
        {isBackupMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mã dự phòng (8 ký tự)
              </label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => {
                  setBackupCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="VD: 8A4F-29BC"
                className="w-full text-center tracking-widest text-lg font-mono py-3 px-4 rounded-xl bg-[#090b14] border border-[#2d335c] text-white focus:outline-none focus:border-cyan-400"
                maxLength={9}
              />
            </div>
            <button
              type="button"
              disabled={submitting || !backupCode.trim()}
              onClick={() => submitCode(backupCode)}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? "Đang xác thực..." : "Xác nhận mã dự phòng"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBackupMode(false);
                setError(null);
              }}
              className="w-full text-xs text-slate-400 hover:text-cyan-300 transition text-center"
            >
              ← Quay lại nhập mã 6 số từ Google Authenticator / Email
            </button>
          </div>
        ) : (
          /* 6-box OTP digits */
          <div className="space-y-5">
            <div className="flex justify-between items-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={submitting}
                  className={`w-11 sm:w-13 h-13 sm:h-15 text-center text-xl sm:text-2xl font-mono font-extrabold rounded-2xl bg-[#090b14] border transition-all shadow-inner focus:outline-none ${
                    digit
                      ? "border-cyan-400 text-cyan-300 shadow-cyan-500/20 bg-cyan-950/20"
                      : "border-[#2b315b] text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  }`}
                />
              ))}
            </div>

            {/* Trust Device Checkbox for 2FA */}
            {type === "LOGIN_2FA" && (
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 accent-cyan-500 cursor-pointer"
                />
                <span>Tin cậy thiết bị này trong 30 ngày (không hỏi lại 2FA trên máy này)</span>
              </label>
            )}

            {/* Action buttons */}
            <button
              type="button"
              disabled={submitting || digits.some((d) => d === "")}
              onClick={() => submitCode(digits.join(""))}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              {submitting ? "Đang xác thực..." : "Xác nhận mã kích hoạt"}
            </button>

            {/* Footer controls: Resend & Backup options */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 text-xs text-slate-400">
              {onResendOtp && (
                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={handleResend}
                  className={`transition ${
                    cooldown > 0 ? "text-slate-600 cursor-not-allowed" : "text-cyan-400 hover:underline"
                  }`}
                >
                  {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
                </button>
              )}

              {type === "LOGIN_2FA" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupMode(true);
                    setError(null);
                  }}
                  className="text-purple-400 hover:text-purple-300 hover:underline"
                >
                  Dùng mã dự phòng khẩn cấp
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
