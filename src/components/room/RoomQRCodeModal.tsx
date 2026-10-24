"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface RoomQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle?: string;
}

export default function RoomQRCodeModal({
  isOpen,
  onClose,
  roomCode,
  roomTitle,
}: RoomQRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    if (!isOpen || !roomCode) return;

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://quizorra.app";
      const url = `${origin}/play?pin=${roomCode}`;
      setJoinUrl(url);

      QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        color: {
          dark: "#080a16",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error("Could not generate room QR code", err));
    } catch (e) {
      console.error(e);
    }
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  const copyLink = () => {
    if (!joinUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(joinUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }).catch(() => {
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }
    } catch (_) {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = joinUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none">
      <div
        className={`relative w-full ${
          isFullscreen ? "max-w-3xl" : "max-w-md"
        } p-6 sm:p-8 bg-[#101222] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/60 text-white space-y-6 text-center transition-all animate-scale-up`}
      >
        {/* Close & Fullscreen buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-semibold"
          >
            {isFullscreen ? "↙ Thu nhỏ" : "⛶ Toàn màn hình"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex justify-center mb-1">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-cyan-500/30">
              Q
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Quét mã QR để Tham Gia Phòng
          </h3>
          {roomTitle && (
            <p className="text-xs sm:text-sm text-slate-400 font-medium truncate max-w-sm mx-auto">
              {roomTitle}
            </p>
          )}
        </div>

        {/* QR Code Container */}
        <div className="p-4 sm:p-6 bg-white rounded-3xl shadow-2xl mx-auto inline-block">
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt={`QR Code phòng ${roomCode}`}
              className={`${
                isFullscreen ? "w-80 h-80 sm:w-96 sm:h-96" : "w-56 h-56 sm:w-64 sm:h-64"
              } block mx-auto transition-all`}
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
              Đang tạo mã QR...
            </div>
          )}
        </div>

        {/* PIN Code Box */}
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
            Hoặc nhập trực tiếp mã PIN:
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-cyan-300 tabular-nums">
            {roomCode}
          </div>
        </div>

        {/* Copy Link & Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 py-3 px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <span>{copied ? "✓ Đã sao chép link!" : "🔗 Sao chép đường dẫn tham gia"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
