"use client";

import { useState, useEffect } from "react";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (enabled: boolean) => void;
}

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  onStatusChange,
}: TwoFactorSetupModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"FETCH" | "QR" | "BACKUP" | "ENABLED">("FETCH");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCurrentlyEnabled, setIsCurrentlyEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSetupData();
    } else {
      setError(null);
      setVerificationCode("");
      setStep("FETCH");
    }
  }, [isOpen]);

  const loadSetupData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup");
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCurrentlyEnabled(!!data.twoFactorEnabled);
        setQrCode(data.qrCodeDataUrl);
        setSecret(data.secret);
        setBackupCodes(data.backupCodes || []);
        if (data.twoFactorEnabled) {
          setStep("ENABLED");
        } else {
          setStep("QR");
        }
      } else {
        setError(data.error || "Không thể tải dữ liệu bảo mật 2FA");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Vui lòng nhập mã 6 số từ Google Authenticator");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          code: verificationCode.trim(),
          backupCodes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCurrentlyEnabled(true);
        setStep("BACKUP");
        if (onStatusChange) onStatusChange(true);
      } else {
        setError(data.error || "Mã xác thực không hợp lệ");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Bạn có chắc chắn muốn tắt Xác minh 2 bước (2FA)? Tài khoản của bạn sẽ giảm mức độ bảo vệ.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/enable", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCurrentlyEnabled(false);
        if (onStatusChange) onStatusChange(false);
        onClose();
      } else {
        setError(data.error || "Không thể tắt 2FA");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadBackupCodes = () => {
    const content = `QUIZORRA - MÃ SAO LƯU DỰ PHÒNG KHẨN CẤP (2FA BACKUP CODES)\n` +
      `Thời gian tạo: ${new Date().toLocaleString("vi-VN")}\n\n` +
      `LƯU Ý QUAN TRỌNG: Mỗi mã chỉ có thể sử dụng ĐÚNG 1 LẦN trong trường hợp bạn mất điện thoại hoặc không truy cập được ứng dụng Google Authenticator.\n\n` +
      backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join("\n") +
      `\n\nBảo quản file này ở nơi an toàn, không chia sẻ cho người khác.`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizorra-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg p-6 sm:p-8 bg-[#121424] border border-purple-500/40 rounded-3xl shadow-2xl shadow-purple-950/40 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          ✕
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="inline-block p-2 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-1">
            🛡️
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Xác minh hai bước (2FA) Chuẩn Quốc Tế
          </h3>
          <p className="text-xs text-slate-400">
            Tương thích 100% với Google Authenticator, Microsoft Authenticator & Authy
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm text-center">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Đang tải cấu hình bảo mật...</p>
          </div>
        ) : step === "ENABLED" ? (
          /* Already enabled state */
          <div className="space-y-5 text-center py-4">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 space-y-1">
              <p className="font-bold text-sm">✓ Tài khoản đang được bảo vệ bởi 2FA</p>
              <p className="text-xs text-emerald-400/80">
                Mỗi lần đăng nhập trên thiết bị lạ, hệ thống sẽ yêu cầu mã 6 số từ Google Authenticator hoặc mã dự phòng.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={loadSetupData}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Cấp lại mã QR / Khóa mới
              </button>
              <button
                type="button"
                onClick={handleDisable2FA}
                className="flex-1 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 transition"
              >
                Tắt Xác minh 2 bước
              </button>
            </div>
          </div>
        ) : step === "QR" ? (
          /* Step 1: QR & Secret */
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#090b14] border border-[#23294c] flex flex-col items-center gap-3">
              <p className="text-xs text-slate-300 text-center">
                1. Mở ứng dụng <strong>Google Authenticator</strong> trên điện thoại, bấm dấu <strong>+</strong> và quét mã QR bên dưới:
              </p>
              {qrCode && (
                <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 block" />
                </div>
              )}
              <div className="text-center w-full">
                <span className="text-[11px] text-slate-500 block mb-1">Hoặc nhập khóa bí mật bằng tay:</span>
                <code className="text-xs sm:text-sm font-mono text-cyan-300 bg-slate-900 py-1 px-3 rounded-lg border border-slate-800 select-all block break-all">
                  {secret}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                2. Nhập mã 6 chữ số hiển thị trên ứng dụng:
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center text-2xl font-mono tracking-widest py-2.5 rounded-xl bg-[#090b14] border border-[#2d335c] text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="button"
              disabled={loading || verificationCode.length !== 6}
              onClick={handleVerifyAndEnable}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              {loading ? "Đang xác thực..." : "Kích hoạt Xác minh 2 bước"}
            </button>
          </div>
        ) : (
          /* Step 2: Backup Codes */
          <div className="space-y-5">
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <p className="font-bold">⚠️ LƯU LẠI MÃ SAO LƯU DỰ PHÒNG CỦA BẠN!</p>
              <p className="text-amber-300/80">
                Nếu bạn mất điện thoại hoặc không truy cập được ứng dụng Authenticator, đây là phương thức duy nhất để bạn có thể tự đăng nhập lại vào tài khoản.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-[#090b14] rounded-2xl border border-[#2b315b]">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="py-1.5 px-3 rounded-lg bg-[#14182e] border border-slate-800 text-center font-mono text-xs text-cyan-300 font-bold"
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={copyBackupCodes}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                {copied ? "✓ Đã sao chép!" : "Sao chép tất cả"}
              </button>
              <button
                type="button"
                onClick={downloadBackupCodes}
                className="flex-1 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-300 transition"
              >
                Tải file .txt
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-emerald-500/25"
            >
              Tôi đã lưu mã dự phòng & Hoàn tất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
