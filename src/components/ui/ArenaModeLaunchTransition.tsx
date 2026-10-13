"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { GameMode } from "@/types";

interface Props {
  isOpen: boolean;
  isReady?: boolean; // Bật true khi bàn đấu Arena ngầm đã được mount và sẵn sàng 100%
  mode: GameMode | string;
  modeName?: string;
  sourceRect?: { top: number; left: number; width: number; height: number } | null;
  onComplete?: () => void;
}

export default function ArenaModeLaunchTransition({
  isOpen,
  isReady = false,
  mode,
  modeName,
  sourceRect,
  onComplete,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "outro">("idle");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const openTimestampRef = useRef<number>(0);
  const timerOutroRef = useRef<NodeJS.Timeout | null>(null);
  const timerDoneRef = useRef<NodeJS.Timeout | null>(null);
  const timerFallbackRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quản lý khi mở transition (bắt đầu từ trạng thái loading)
  useEffect(() => {
    if (!isOpen) {
      if (timerOutroRef.current) clearTimeout(timerOutroRef.current);
      if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
      setPhase("idle");
      return;
    }

    openTimestampRef.current = Date.now();
    setPhase("loading");

    // Fallback an toàn: Nếu sau 8 giây mạng lỗi, tự động giải phóng
    timerFallbackRef.current = setTimeout(() => {
      setPhase("outro");
      setTimeout(() => {
        setPhase("idle");
        if (onCompleteRef.current) onCompleteRef.current();
      }, 550);
    }, 8000);

    return () => {
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
    };
  }, [isOpen]);

  // Quản lý khi bàn đấu bên dưới đã nạp ngầm hoàn tất (isReady = true)
  useEffect(() => {
    if (!isOpen || !isReady || phase === "outro") return;

    // Đảm bảo pha loading hiển thị tối thiểu 350ms để người dùng kịp chiêm ngưỡng vật thể 3D nạp năng lượng
    const elapsed = Date.now() - openTimestampRef.current;
    const waitBeforeOutro = Math.max(0, 350 - elapsed);

    timerOutroRef.current = setTimeout(() => {
      // Pha Outro: Kích hoạt hoạt cảnh bung mở đặc trưng theo từng mode (550ms)
      setPhase("outro");

      timerDoneRef.current = setTimeout(() => {
        // Kết thúc chuyển cảnh sau đúng nhịp 900ms tổng thể
        setPhase("idle");
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }, 550);
    }, waitBeforeOutro);

    return () => {
      if (timerOutroRef.current) clearTimeout(timerOutroRef.current);
      if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
    };
  }, [isOpen, isReady, phase]);

  if (!isOpen && phase === "idle") return null;
  if (!mounted || typeof document === "undefined") return null;

  const currentMode = String(mode || "CLASSIC").toUpperCase();
  const isOutro = phase === "outro";

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
        willChange: "opacity, clip-path",
      }}
      className={`pointer-events-none overflow-hidden flex items-center justify-center select-none transition-opacity duration-300 ${
        isOutro ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* ── 1. MÀN CHE LƯỢNG TỬ KHÔNG GIAN (Tối ưu 100% GPU, không dùng Blur nặng) ── */}
      <div
        className={`absolute inset-0 bg-[#070814]/96 transition-transform duration-500 ease-out will-change-transform ${
          isOutro ? "scale-110 opacity-0" : "scale-100 opacity-100"
        }`}
      />

      {/* ── 2. HIỆU ỨNG OUTRO IRIS / SHOCKWAVE MỞ BUNG CỰC ĐẠI (300% SCREEN REVEAL) ── */}
      {/* Vòng tròn năng lượng bùng nổ từ tâm ra ngoài bao trọn 100% màn hình, không tắt đột ngột */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-550 ease-out will-change-transform ${
          isOutro
            ? "w-[240vmax] h-[240vmax] opacity-0 scale-100 border-[16px] border-cyan-400/80 shadow-[0_0_120px_#22d3ee]"
            : "w-0 h-0 opacity-100 scale-0 border-[0px] border-transparent"
        }`}
        style={{
          background: isOutro
            ? "radial-gradient(circle, transparent 40%, rgba(6,182,212,0.15) 60%, rgba(168,85,247,0.3) 85%, transparent 100%)"
            : "none",
        }}
      />

      {/* ── 3. VẬT THỂ SIGNATURE 3D RIÊNG BIỆT CHO TỪNG MODE & HOẠT CẢNH ĐỘC BẢN ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center transition-all duration-500 ease-out will-change-transform"
        style={{
          transform: isOutro ? "scale(1.4) translateY(-12px)" : "scale(1) translateY(0)",
          opacity: isOutro ? 0 : 1,
        }}
      >
        {/* Khối Hoạt Cảnh Signature 3D tương ứng cho từng Mode */}
        <div className="relative flex items-center justify-center w-56 h-56">
          <Signature3DModeVisual mode={currentMode} isOutro={isOutro} />
        </div>

        {/* Tiêu đề & Thông báo Chuyển cảnh */}
        <div className="mt-6 space-y-2 max-w-md mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {isOutro ? "MỞ CỔNG ĐẤU TRƯỜNG" : "KHỞI ĐỘNG ĐẤU TRƯỜNG ARENA"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300 tracking-tight drop-shadow-md">
            {modeName || currentMode}
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            {isOutro
              ? "Bàn đấu đã sẵn sàng · Đang mở màn hé lộ giao diện thi đấu..."
              : "Đang kết nối hệ thống · Chuẩn bị màn chiếu & thiết bị thí sinh..."}
          </p>
        </div>

        {/* Thanh tiến trình lượng tử */}
        <div className="mt-5 w-52 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/20 p-0.5 relative shadow-inner">
          <div
            className={`h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 rounded-full transition-all ${
              isOutro ? "w-full duration-200" : "w-3/4 animate-pulse duration-500"
            }`}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SIGNATURE 3D OBJECTS CHO TỪNG GAME MODE
// ─────────────────────────────────────────────────────────────────────────────
function Signature3DModeVisual({ mode, isOutro }: { mode: string; isOutro: boolean }) {
  switch (mode) {
    // ── 1. GRID CARO: Bảng Cờ Caro 3D Isometric & Ô Cửa Zoom-Through ─────────
    case "GRID_CARO":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.5] opacity-0 rotate-12" : "scale-100 opacity-100 rotate-0"
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Bảng Caro 3x3 Isometric 3D */}
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(6,182,212,0.7)]">
            <defs>
              <linearGradient id="caro-board-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="caro-grid-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>

            {/* Khung Bảng 3D Isometric */}
            <rect x="15" y="15" width="90" height="90" rx="16" fill="url(#caro-board-grad)" stroke="#38bdf8" strokeWidth="2.5" />
            <rect x="18" y="18" width="84" height="84" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />

            {/* Các Đường Lưới Caro 3D */}
            <line x1="45" y1="18" x2="45" y2="102" stroke="url(#caro-grid-line)" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="75" y1="18" x2="75" y2="102" stroke="url(#caro-grid-line)" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="18" y1="45" x2="102" y2="45" stroke="url(#caro-grid-line)" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="18" y1="75" x2="102" y2="75" stroke="url(#caro-grid-line)" strokeWidth="2" strokeDasharray="3 3" />

            {/* Ô Góc Trên Trái: Dấu X 3D Cyan */}
            <path d="M25 25L37 37M37 25L25 37" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />

            {/* Ô Góc Dưới Phải: Dấu O 3D Rose */}
            <circle cx="89" cy="89" r="7" stroke="#f43f5e" strokeWidth="3" fill="none" />

            {/* Ô Trung Tâm: Ô Cửa Ánh Sáng Phóng To Lọt Màn Hình */}
            <rect
              x="47"
              y="47"
              width="26"
              height="26"
              rx="6"
              fill={isOutro ? "#facc15" : "#38bdf8"}
              fillOpacity={isOutro ? 0.9 : 0.35}
              stroke="#fef08a"
              strokeWidth="2.5"
              className={isOutro ? "animate-ping" : "animate-pulse"}
            />
            {/* Tâm ô cửa */}
            <circle cx="60" cy="60" r={isOutro ? 8 : 4} fill="#ffffff" />
          </svg>
        </div>
      );

    // ── 2. MYSTERY QUEST: Chìa Khóa Hoàng Kim 3D & Lỗ Khóa Iris Wipe ─────────
    case "MYSTERY_QUEST":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[3.8] opacity-0 rotate-45" : "scale-100 opacity-100 rotate-0"
          }`}
        >
          {/* Ổ Khóa Hào Quang Vòng Tròn 3D Ở Nền */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-36 rounded-full border-2 border-cyan-400/40 border-dashed animate-spin-slow opacity-60" />
            <div className="w-24 h-24 rounded-full bg-cyan-500/15 border border-cyan-400/60 animate-pulse" />
          </div>

          {/* Chiếc Chìa Khóa Vàng 3D Isometric */}
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_40px_rgba(234,179,8,0.8)]">
            <defs>
              <linearGradient id="gold-key-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#facc15" />
                <stop offset="70%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a16207" />
              </linearGradient>
              <linearGradient id="gold-key-rim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>

            {/* Vòng Tay Cầm Chìa Khóa 3D (Key Head Ring) */}
            <circle cx="42" cy="42" r="24" fill="url(#gold-key-grad)" stroke="url(#gold-key-rim)" strokeWidth="3" />
            {/* Lỗ Tròn Bên Trong Tay Cầm */}
            <circle cx="42" cy="42" r="12" fill="#0f172a" stroke="#ca8a04" strokeWidth="2" />
            {/* Điểm Sáng Kim Cương Phản Quang Trên Đầu Chìa */}
            <circle cx="34" cy="34" r="3" fill="#ffffff" />

            {/* Thân Cây Chìa Khóa 3D Vươn Dài Xuyên Tâm (Key Shaft) */}
            <path d="M58 58L94 94" stroke="url(#gold-key-grad)" strokeWidth="9" strokeLinecap="round" />
            <path d="M58 58L94 94" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />

            {/* Các Răng Chìa Khóa 3D (Key Teeth) */}
            <path d="M84 84L94 74M91 91L101 81" stroke="url(#gold-key-grad)" strokeWidth="6" strokeLinecap="round" />
            <path d="M84 84L94 74M91 91L101 81" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />

            {/* Ánh Sao Lấp Lánh 3D (Sparkle Star) */}
            <path d="M42 22L44 28L50 30L44 32L42 38L40 32L34 30L40 28Z" fill="#ffffff" />
            <path d="M88 48L89.5 52.5L94 54L89.5 55.5L88 60L86.5 55.5L82 54L86.5 52.5Z" fill="#fde047" />
          </svg>
        </div>
      );

    // ── 3. BUZZ (FAST BUZZ): Nút Chuông Bấm 3D Cơ Khí & Sóng Âm Tròn ────────
    case "BUZZ":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.0] opacity-0" : "scale-100 opacity-100"
          }`}
        >
          {/* Sóng Âm Thanh Tròn Bung Mở (Sonic Shockwave) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`rounded-full border-2 border-rose-500 transition-all duration-500 ${
              isOutro ? "w-48 h-48 opacity-0 scale-150" : "w-28 h-28 opacity-40 scale-100"
            }`} />
          </div>

          {/* Chiếc Chuông Bấm Đỏ 3D Cơ Khí */}
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(244,63,94,0.8)]">
            <defs>
              <linearGradient id="buzz-cap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="40%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
              <linearGradient id="buzz-base" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>

            {/* Đế Đĩa Chuông Kim Loại 3D (Base Ring) */}
            <ellipse cx="60" cy="85" rx="42" ry="14" fill="url(#buzz-base)" stroke="#cbd5e1" strokeWidth="2.5" />
            <ellipse cx="60" cy="82" rx="36" ry="11" fill="#1e293b" />

            {/* Núm Chuông Nhấn 3D Dập Xuống Khi Outro */}
            <g transform={isOutro ? "translate(0, 10)" : "translate(0, 0)"} className="transition-transform duration-200">
              {/* Nút Chuông Đỏ Bán Cầu 3D */}
              <ellipse cx="60" cy="62" rx="30" ry="18" fill="url(#buzz-cap)" stroke="#fda4af" strokeWidth="2" />
              <path d="M30 62C30 46 43 36 60 36C77 36 90 46 90 62Z" fill="url(#buzz-cap)" />

              {/* Đỉnh Chuông Nhấn Cơ Khí */}
              <rect x="56" y="24" width="8" height="14" rx="3" fill="#cbd5e1" stroke="#ffffff" strokeWidth="1" />
              <ellipse cx="60" cy="24" rx="6" ry="2.5" fill="#ffffff" />

              {/* Vệt Highlight Kính Phản Quang Trên Mặt Chuông */}
              <ellipse cx="48" cy="48" rx="8" ry="4" fill="#ffffff" fillOpacity="0.65" transform="rotate(-25 48 48)" />
            </g>

            {/* Tia Sét Tốc Độ Vàng Neon */}
            <path d="M60 48L54 58H62L58 70L68 56H60Z" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
          </svg>
        </div>
      );

    // ── 4. DICE RACE: Khối Xúc Xắc 3D Lập Thể & Vòng Tròn Hexa ──────────────
    case "DICE_RACE":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.2] opacity-0 rotate-45" : "scale-100 opacity-100 rotate-0"
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(168,85,247,0.8)]">
            <defs>
              <linearGradient id="dice-top" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="dice-left" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>
              <linearGradient id="dice-right" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#3b0764" />
              </linearGradient>
            </defs>

            {/* Khối Xúc Xắc Isometric 3D */}
            {/* Mặt Trên (Top Face - 3 Nốt) */}
            <path d="M60 22L92 40L60 58L28 40Z" fill="url(#dice-top)" stroke="#f3e8ff" strokeWidth="2" />
            <circle cx="60" cy="40" r="3.5" fill="#facc15" />
            <circle cx="46" cy="32" r="3" fill="#6b21a8" />
            <circle cx="74" cy="48" r="3" fill="#6b21a8" />

            {/* Mặt Trước Trái (Front Left Face - 5 Nốt) */}
            <path d="M28 40L60 58V96L28 78Z" fill="url(#dice-left)" stroke="#c084fc" strokeWidth="2" />
            <circle cx="44" cy="68" r="3.5" fill="#facc15" />
            <circle cx="36" cy="54" r="3" fill="#ffffff" />
            <circle cx="52" cy="82" r="3" fill="#ffffff" />
            <circle cx="36" cy="74" r="3" fill="#ffffff" />
            <circle cx="52" cy="62" r="3" fill="#ffffff" />

            {/* Mặt Trước Phải (Front Right Face - 6 Nốt May Mắn) */}
            <path d="M60 58L92 40V78L60 96Z" fill="url(#dice-right)" stroke="#c084fc" strokeWidth="2" />
            <circle cx="72" cy="54" r="3" fill="#ffffff" />
            <circle cx="72" cy="68" r="3" fill="#ffffff" />
            <circle cx="72" cy="82" r="3" fill="#ffffff" />
            <circle cx="82" cy="48" r="3" fill="#ffffff" />
            <circle cx="82" cy="62" r="3" fill="#ffffff" />
            <circle cx="82" cy="76" r="3" fill="#ffffff" />
          </svg>
        </div>
      );

    // ── 5. ELIMINATION: Khiên Sọ Sinh Tồn Cyber 3D ───────────────────────────
    case "ELIMINATION":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.2] opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(217,70,239,0.8)]">
            <defs>
              <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#c026d3" />
                <stop offset="100%" stopColor="#701a75" />
              </linearGradient>
            </defs>
            <path d="M60 20L92 34V64C92 84 60 102 60 102C60 102 28 84 28 64V34Z" fill="url(#shield-grad)" stroke="#fbcfe8" strokeWidth="3" />
            <path d="M60 28L84 40V62C84 76 60 92 60 92C60 92 36 76 36 62V40Z" fill="#18182f" stroke="#e879f9" strokeWidth="1.5" />
            {/* Biểu Tượng Sọ Sinh Tồn Cyber */}
            <circle cx="53" cy="56" r="5" fill="#f43f5e" />
            <circle cx="67" cy="56" r="5" fill="#f43f5e" />
            <path d="M54 70H66V76H54Z" fill="#ffffff" />
            <line x1="57" y1="70" x2="57" y2="76" stroke="#000000" strokeWidth="1.5" />
            <line x1="63" y1="70" x2="63" y2="76" stroke="#000000" strokeWidth="1.5" />
          </svg>
        </div>
      );

    // ── 6. TOURNAMENT: Cúp Vàng Vô Địch 1v1 3D ──────────────────────────────
    case "TOURNAMENT":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.2] opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(234,179,8,0.9)]">
            <defs>
              <linearGradient id="cup-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a16207" />
              </linearGradient>
            </defs>
            <path d="M38 24H82V52C82 66 72 74 60 74C48 74 38 66 38 52Z" fill="url(#cup-grad)" stroke="#fef08a" strokeWidth="2.5" />
            <path d="M38 32H24C18 32 18 42 24 48C30 52 38 52 38 52" stroke="#facc15" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M82 32H96C102 32 102 42 96 48C90 52 82 52 82 52" stroke="#facc15" strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="54" y="74" width="12" height="14" fill="url(#cup-grad)" />
            <rect x="40" y="88" width="40" height="12" rx="4" fill="#78350f" stroke="#facc15" strokeWidth="2" />
            <circle cx="60" cy="46" r="6" fill="#ffffff" />
          </svg>
        </div>
      );

    // ── 7. BOUNCEBACK: Tinh Thể Đảo Chiều & Tia Sét Lượng Tử ─────────────────
    case "BOUNCEBACK":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.2] opacity-0 rotate-180" : "scale-100 opacity-100 rotate-0"
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(6,182,212,0.8)]">
            <defs>
              <linearGradient id="bounce-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="42" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
            {/* Mũi tên đảo chiều đôi 3D */}
            <path d="M34 60C34 44 48 34 64 34L56 26M64 34L56 42" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M86 60C86 76 72 86 56 86L64 94M56 86L64 78" stroke="#a855f7" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="60" cy="60" r="8" fill="#facc15" />
          </svg>
        </div>
      );

    // ── 8. WAGER (SECRET WAGER): Đồng Xu Chip Cược Hoàng Kim 3D ─────────────
    case "WAGER":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.2] opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(245,158,11,0.8)]">
            <defs>
              <linearGradient id="wager-coin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="40" fill="url(#wager-coin)" stroke="#fde047" strokeWidth="3" />
            <circle cx="60" cy="60" r="32" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
            <text x="60" y="70" textAnchor="middle" fill="#facc15" fontSize="28" fontWeight="bold" fontFamily="monospace">$</text>
          </svg>
        </div>
      );

    // ── 9. CLASSIC: Pha Lê Tia Sét & Ngôi Sao Tri Thức 3D ────────────────────
    default:
    case "CLASSIC":
      return (
        <div
          className={`relative transition-all duration-550 ease-out will-change-transform ${
            isOutro ? "scale-[4.2] opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(129,140,248,0.8)]">
            <defs>
              <linearGradient id="classic-star" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e0e7ff" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
            </defs>
            {/* Ngôi sao tri thức 4 cánh 3D Isometric */}
            <path d="M60 16L72 48L104 60L72 72L60 104L48 72L16 60L48 48Z" fill="url(#classic-star)" stroke="#a5b4fc" strokeWidth="2.5" />
            <circle cx="60" cy="60" r="10" fill="#22d3ee" />
            <path d="M60 48L62 58L72 60L62 62L60 72L58 62L48 60L58 58Z" fill="#ffffff" />
          </svg>
        </div>
      );
  }
}
