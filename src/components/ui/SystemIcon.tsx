"use client";

import React from "react";

export type SystemIconName =
  | "dashboard"
  | "quiz_bank"
  | "create_room"
  | "rooms"
  | "sandbox"
  | "display"
  | "home"
  | "logout"
  | "device"
  | "mc"
  | "individual"
  | "team"
  | "trophy"
  | "play"
  | "pause"
  | "next"
  | "trash"
  | "sound_on"
  | "sound_off"
  | "settings";

interface Props {
  name: SystemIconName;
  className?: string;
  size?: number;
}

export default function SystemIcon({ name, className = "w-6 h-6", size }: Props) {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  switch (name) {
    // ── 1. DASHBOARD: 4 Khối Lập Phương Isometric 3D Đa Tầng Lơ Lửng ──────────
    case "dashboard":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="dsh-top-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e0e7ff" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
            <linearGradient id="dsh-front-1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="dsh-side-1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>

            <linearGradient id="dsh-top-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#cffafe" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
            <linearGradient id="dsh-front-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="dsh-side-2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#155e75" />
            </linearGradient>
          </defs>

          {/* Bóng đổ khối 3D dưới nền */}
          <ellipse cx="10" cy="16" rx="5" ry="1.8" fill="#000000" fillOpacity="0.35" />
          <ellipse cx="22" cy="12" rx="4.5" ry="1.5" fill="#000000" fillOpacity="0.3" />
          <ellipse cx="10" cy="27" rx="4.5" ry="1.5" fill="#000000" fillOpacity="0.3" />
          <ellipse cx="22" cy="27" rx="5" ry="1.8" fill="#000000" fillOpacity="0.35" />

          {/* Khối 1: Trên Trái (Khối Lập Phương Isometric Tím - Cao) */}
          <g transform="translate(0, -1)">
            {/* Mặt Trên (Top Face) */}
            <path d="M10 4L15 6.8L10 9.6L5 6.8Z" fill="url(#dsh-top-1)" />
            {/* Mặt Trước Trái (Front Left Face) */}
            <path d="M5 6.8L10 9.6V15.2L5 12.4Z" fill="url(#dsh-front-1)" />
            {/* Mặt Trước Phải (Front Right Face) */}
            <path d="M10 9.6L15 6.8V12.4L10 15.2Z" fill="url(#dsh-side-1)" />
            {/* Ngôi sao phản quang 3D */}
            <path d="M10 6L10.6 7.4L12 8L10.6 8.6L10 10L9.4 8.6L8 8L9.4 7.4Z" fill="#ffffff" />
          </g>

          {/* Khối 2: Trên Phải (Khối Lập Phương Isometric Cyan - Vừa) */}
          <g transform="translate(12, -2)">
            <path d="M10 6L14 8.2L10 10.4L6 8.2Z" fill="url(#dsh-top-2)" />
            <path d="M6 8.2L10 10.4V14.4L6 12.2Z" fill="url(#dsh-front-2)" />
            <path d="M10 10.4L14 8.2V12.2L10 14.4Z" fill="url(#dsh-side-2)" />
          </g>

          {/* Khối 3: Dưới Trái (Khối Lập Phương Isometric Cyan - Vừa) */}
          <g transform="translate(0, 13)">
            <path d="M10 6L14 8.2L10 10.4L6 8.2Z" fill="url(#dsh-top-2)" />
            <path d="M6 8.2L10 10.4V14.4L6 12.2Z" fill="url(#dsh-front-2)" />
            <path d="M10 10.4L14 8.2V12.2L10 14.4Z" fill="url(#dsh-side-2)" />
          </g>

          {/* Khối 4: Dưới Phải (Khối Lập Phương Isometric Tím - Cao) */}
          <g transform="translate(12, 10)">
            <path d="M10 4L15 6.8L10 9.6L5 6.8Z" fill="url(#dsh-top-1)" />
            <path d="M5 6.8L10 9.6V15.2L5 12.4Z" fill="url(#dsh-front-1)" />
            <path d="M10 9.6L15 6.8V12.4L10 15.2Z" fill="url(#dsh-side-1)" />
            <path d="M10 6L10.6 7.4L12 8L10.6 8.6L10 10L9.4 8.6L8 8L9.4 7.4Z" fill="#ffffff" />
          </g>
        </svg>
      );

    // ── 2. QUIZ BANK: Cuốn Sách Tri Thức Viễn Tưởng 3D Isometric Mở Nghiêng ────
    case "quiz_bank":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="qb-cover-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="qb-pages-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="qb-pages-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="qb-bookmark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* Bóng đổ 3D dưới sách */}
          <ellipse cx="16" cy="27" rx="10" ry="2.8" fill="#000000" fillOpacity="0.4" />

          {/* Bìa Sau Dưới (Bottom Cover 3D) */}
          <path d="M5 21L18 26L28 21.5V23.5L18 28L5 23Z" fill="#075985" />

          {/* Khối Trang Sách Dày Xếp Lớp (Pages Block Extrusion) */}
          <path d="M6 18L18 23L27 18.5V21.5L18 26L6 21Z" fill="url(#qb-pages-side)" />

          {/* Bề Mặt Trang Sách Mở (Top Page Surface) */}
          <path d="M6 14L18 19L27 14.5L15 9.5Z" fill="url(#qb-pages-top)" />

          {/* Bìa Trước Trên (Upper Hardcover Edge) */}
          <path d="M4.5 13L18 18.2L28 13.5L15 8.5Z" fill="url(#qb-cover-grad)" fillOpacity="0.35" stroke="#38bdf8" strokeWidth="1.2" />

          {/* Gáy Sách 3D Bo Tròn Nổi Bật (Book Spine) */}
          <path d="M4.5 13C4 14.5 4 21.5 5 23L6.5 21.5V11.5L4.5 13Z" fill="#0284c7" stroke="#7dd3fc" strokeWidth="0.8" />

          {/* Dòng Chữ Hologram 3D Nổi Tròn Trang Sách */}
          <line x1="10" y1="14.5" x2="15" y2="16.5" stroke="#0284c7" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="9" y1="17" x2="14" y2="19" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="18.5" y1="17" x2="23.5" y2="15" stroke="#0ea5e9" strokeWidth="1.2" strokeLinecap="round" />

          {/* Dải Ruy-Băng / Bookmark Vàng 3D Thả Xuống */}
          <path d="M21 12.5L23 11.5V22L21 20.5L19 22V13.5Z" fill="url(#qb-bookmark)" stroke="#ca8a04" strokeWidth="0.5" />

          {/* Viên Tinh Thể Vàng Hoàng Kim 3D Lơ Lửng Phát Sáng */}
          <ellipse cx="21" cy="8" rx="2.5" ry="3" fill="#facc15" />
          <path d="M21 5.5L22 7.5L23.5 8L22 8.5L21 10.5L20 8.5L18.5 8L20 7.5Z" fill="#ffffff" />
        </svg>
      );

    // ── 3. CREATE ROOM: Viên Ngọc Nút Bấm 3D Bevel Nổi Dấu Cộng Thể Tích ───────
    case "create_room":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="cr-base-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>
            <linearGradient id="cr-base-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b21a8" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
            <linearGradient id="cr-plus-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="cr-plus-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id="cr-pearl" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </radialGradient>
          </defs>

          {/* Bóng Đổ Thể Tích Dưới Nền */}
          <ellipse cx="16" cy="27" rx="10" ry="3.5" fill="#000000" fillOpacity="0.45" />

          {/* Mặt Bên Đổ Khối 3D Của Khối Đế (Base Extrusion 3D) */}
          <path d="M5 14C5 8 9 5 16 5C23 5 27 8 27 14V19C27 25 23 28 16 28C9 28 5 25 5 19Z" fill="url(#cr-base-side)" />

          {/* Mặt Trên Đĩa Ngọc 3D Vát Cạnh (Top Bevel Face) */}
          <path d="M5 13C5 7 9 4.5 16 4.5C23 4.5 27 7 27 13C27 19 23 21.5 16 21.5C9 21.5 5 19 5 13Z" fill="url(#cr-base-top)" stroke="#e9d5ff" strokeWidth="1" />

          {/* Viền Ánh Sáng Phản Quang Kính (Inner Glossy Ring) */}
          <path d="M7 12.5C7 8 10.5 6 16 6C21.5 6 25 8 25 12.5C25 17 21.5 19 16 19C10.5 19 7 17 7 12.5Z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.8" />

          {/* Dấu Cộng 3D Đúc Nổi Trung Tâm (Raised 3D Plus) */}
          {/* Cạnh bóng đổ 3D dấu cộng */}
          <g transform="translate(0, 1)">
            <path d="M14 9H18V13H22V17H18V21H14V17H10V13H14Z" fill="url(#cr-plus-side)" />
          </g>
          {/* Mặt trên sáng bóng dấu cộng */}
          <path d="M14 8H18V12H22V16H18V20H14V16H10V12H14Z" fill="url(#cr-plus-top)" />
          {/* Vạch specular highlight */}
          <line x1="14.5" y1="8.5" x2="17.5" y2="8.5" stroke="#ffffff" strokeWidth="0.8" />
          <line x1="10.5" y1="12.5" x2="10.5" y2="15.5" stroke="#ffffff" strokeWidth="0.8" />

          {/* Viên Ngọc Tinh Thể Hoàng Kim 3D (Floating Pearl Sphere) */}
          <circle cx="24.5" cy="7.5" r="3" fill="url(#cr-pearl)" stroke="#fef08a" strokeWidth="0.8" />
          <circle cx="23.5" cy="6.5" r="0.8" fill="#ffffff" />
        </svg>
      );

    // ── 4. ROOMS: Cánh Cổng Không Gian 3D Mở Ra Đấu Trường (Portal Gateway) ──
    case "rooms":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="rm-arch-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="rm-arch-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <linearGradient id="rm-door-glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <radialGradient id="rm-portal-void" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Bóng đổ 3D dưới cổng */}
          <ellipse cx="16" cy="27" rx="10" ry="3" fill="#000000" fillOpacity="0.45" />

          {/* Khung Vòm Khối 3D Ngoài Cùng (Outer Arch Extrusion) */}
          <path d="M5 12C5 6 9 3 16 3C23 3 27 6 27 12V24H5Z" fill="url(#rm-arch-side)" />
          <path d="M6 11C6 5.5 9.5 4 16 4C22.5 4 26 5.5 26 11V23H6Z" fill="url(#rm-arch-top)" stroke="#a7f3d0" strokeWidth="1" />

          {/* Lòng Cổng: Hư Không Lượng Tử Phát Sáng (Quantum Portal Void) */}
          <path d="M8 12C8 7.5 11 6 16 6C21 6 24 7.5 24 12V22.5H8Z" fill="url(#rm-portal-void)" />

          {/* Cánh Cửa Kính 3D Mở Nghiêng (Perspective Opened Door) */}
          {/* Cạnh dày của cánh cửa 3D */}
          <path d="M8 7.5L16 9.5V23L8 22Z" fill="#0369a1" />
          {/* Mặt cánh cửa kính 3D mở hé */}
          <path d="M8 7.5L15 9.5V22.5L8 21.5Z" fill="url(#rm-door-glass)" fillOpacity="0.85" stroke="#a5f3fc" strokeWidth="1" />
          {/* Vân kính phản quang trên cửa */}
          <line x1="10" y1="10" x2="13" y2="11" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7" />
          <line x1="10" y1="13" x2="13" y2="14" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7" />

          {/* Tay Nắm Cửa 3D Vàng Kim */}
          <circle cx="13.5" cy="15.5" r="1.3" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />

          {/* Mũi Tên Dịch Chuyển Không Gian 3D (3D Warp Arrow) */}
          <path d="M17 14L21.5 16L17 18V16.8H15V15.2H17Z" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      );

    // ── 5. SANDBOX: Bình Thí Nghiệm Thủy Tinh Thể Tích 3D (Quantum Flask) ──────
    case "sandbox":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="sb-glass-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="sb-liquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id="sb-liquid-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>

          {/* Bóng đổ bình 3D */}
          <ellipse cx="16" cy="27" rx="9" ry="2.8" fill="#000000" fillOpacity="0.45" />

          {/* Chất Lỏng Lượng Tử 3D Bên Trong Bình */}
          {/* Đáy chất lỏng cong theo đáy bình */}
          <path d="M9.5 21L7.5 24C6.8 25.5 7.8 26.5 9.5 26.5H22.5C24.2 26.5 25.2 25.5 24.5 24L22.5 21Z" fill="url(#sb-liquid)" />
          {/* Mặt chất lỏng elip 3D phản quang (Meniscus Surface) */}
          <ellipse cx="16" cy="21" rx="6.5" ry="2" fill="url(#sb-liquid-top)" stroke="#86efac" strokeWidth="0.8" />

          {/* Bong Bóng Khí 3D & Hạt Lượng Tử Nổi Lơ Lửng */}
          <circle cx="13" cy="24" r="1.2" fill="#ffffff" fillOpacity="0.8" />
          <circle cx="18" cy="23.5" r="1.6" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
          <circle cx="16" cy="17" r="1" fill="#4ade80" />

          {/* Thân Bình Thủy Tinh 3D Thể Tích (3D Glass Flask Body) */}
          <path
            d="M13 5H19V11.5L25.2 23.5C26.2 25.5 24.8 27 22.8 27H9.2C7.2 27 5.8 25.5 6.8 23.5L13 11.5V5Z"
            fill="#10b981"
            fillOpacity="0.12"
            stroke="url(#sb-glass-edge)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* Vành Miệng Cổ Bình 3D Bo Tròn (Collar Rim) */}
          <ellipse cx="16" cy="5" rx="3.5" ry="1.2" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.2" />

          {/* Vệt Highlight Cong Khúc Xạ Thủy Tinh 3D (Specular Sheen) */}
          <path d="M9.5 22.5L14 13.5V8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.75" />
          <line x1="10" y1="25" x2="12" y2="25" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        </svg>
      );

    // ── 6. DISPLAY: Màn Hình Màn Chiếu Hologram 3D (Cyber Terminal Monitor) ───
    case "display":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="dp-bezel-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="dp-bezel-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#075985" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
            <linearGradient id="dp-screen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#090d1f" />
            </linearGradient>
            <linearGradient id="dp-stand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          {/* Bóng đổ chân đế 3D */}
          <ellipse cx="16" cy="28" rx="8" ry="2.2" fill="#000000" fillOpacity="0.45" />

          {/* Chân Đế Elip 3D & Trụ Nâng (Monitor Stand & Base) */}
          <ellipse cx="16" cy="26" rx="6" ry="2" fill="url(#dp-stand)" stroke="#cbd5e1" strokeWidth="0.8" />
          <path d="M14.5 21H17.5V26H14.5Z" fill="url(#dp-stand)" />

          {/* Cạnh Dày 3D Của Vỏ Màn Hình (Bezel Extrusion) */}
          <rect x="4" y="5" width="24" height="17" rx="3.5" fill="url(#dp-bezel-side)" />

          {/* Mặt Trước Khung Viền Vát Cạnh 3D (Front Bezel) */}
          <rect x="4" y="4" width="24" height="17" rx="3.5" fill="url(#dp-bezel-top)" stroke="#7dd3fc" strokeWidth="1" />

          {/* Kính Màn Hình Đen Sâu (Glass Screen Inset) */}
          <rect x="6" y="6" width="20" height="13" rx="2" fill="url(#dp-screen)" stroke="#0284c7" strokeWidth="0.8" />

          {/* Vệt Kính Phản Quang Chéo 3D (Screen Glare) */}
          <path d="M6 7L18 7L12 18L6 18Z" fill="#ffffff" fillOpacity="0.08" />

          {/* Ký Tự Dấu Nhắc Terminal Prompt 3D '> _' */}
          <path d="M9.5 9.5L13.5 12.5L9.5 15.5" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="15.5" y1="15.5" x2="19.5" y2="15.5" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />

          {/* Đèn LED Báo Tín Hiệu Hoàng Kim 3D */}
          <circle cx="23.5" cy="8.5" r="1.2" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
          <circle cx="23" cy="8" r="0.4" fill="#ffffff" />
        </svg>
      );

    // ── 7. HOME: Ngôi Nhà Công Nghệ 3D Isometric ─────────────────────────────
    case "home":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="hm-roof-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <linearGradient id="hm-wall-front" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="hm-wall-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3730a3" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="27" rx="10" ry="3" fill="#000000" fillOpacity="0.4" />
          {/* Tường trước */}
          <path d="M7 15L16 11V25L7 22Z" fill="url(#hm-wall-front)" />
          {/* Tường bên */}
          <path d="M16 11L25 15V22L16 25Z" fill="url(#hm-wall-side)" />
          {/* Mái nhà 3D */}
          <path d="M16 4L27 12L16 17L5 12Z" fill="url(#hm-roof-top)" stroke="#e9d5ff" strokeWidth="1" />
          {/* Cửa chính phát sáng cyan */}
          <path d="M10 18L14 16.5V23.5L10 22Z" fill="#38bdf8" stroke="#7dd3fc" strokeWidth="0.8" />
          <circle cx="16" cy="9.5" r="1.5" fill="#facc15" />
        </svg>
      );

    // ── 8. LOGOUT: Cửa Thoát Hiểm 3D & Mũi Tên Đỏ Ruby Thể Tích ──────────────
    case "logout":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="lo-frame" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="lo-arrow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#fca5a5" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="27" rx="8" ry="2.5" fill="#000000" fillOpacity="0.4" />
          {/* Khung cửa thoát 3D */}
          <path d="M13 25H7C5.9 25 5 24.1 5 23V9C5 7.9 5.9 7 7 7H13" stroke="url(#lo-frame)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Mũi tên 3D vút ra */}
          <path d="M19 10L27 16L19 22V18H10V14H19Z" fill="url(#lo-frame)" stroke="#fee2e2" strokeWidth="1" strokeLinejoin="round" />
          <line x1="12" y1="16" x2="24" y2="16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // ── 9. DEVICE: Điện Thoại Thông Minh 3D Nghiêng Phối Cảnh ─────────────────
    case "device":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="dv-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="28" rx="8" ry="2.5" fill="#000000" fillOpacity="0.4" />
          {/* Thân điện thoại vát khối 3D */}
          <rect x="7" y="3" width="18" height="26" rx="5" fill="#0f172a" stroke="url(#dv-body)" strokeWidth="2" />
          {/* Màn hình hiển thị */}
          <rect x="9.5" y="7" width="13" height="16" rx="2.5" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="0.8" />
          <path d="M13 15L15 17L19 13" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="25.5" r="1.5" fill="#38bdf8" />
          <circle cx="23" cy="5.5" r="1.5" fill="#facc15" />
        </svg>
      );

    // ── 10. MC: Micro Studio Kim Loại 3D ─────────────────────────────────────
    case "mc":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <ellipse cx="16" cy="28" rx="6" ry="2" fill="#000000" fillOpacity="0.4" />
          {/* Đầu Mic 3D */}
          <rect x="11" y="4" width="10" height="14" rx="5" fill="#0284c7" stroke="#7dd3fc" strokeWidth="2" />
          <line x1="11" y1="9" x2="21" y2="9" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
          <line x1="11" y1="13" x2="21" y2="13" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
          {/* Khung đỡ Mic 3D */}
          <path d="M7 13C7 18 11 22 16 22C21 22 25 18 25 13" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="16" y1="22" x2="16" y2="27" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="11" y1="27" x2="21" y2="27" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    // ── 11. INDIVIDUAL: Nhân Vật Đấu Thủ 3D ──────────────────────────────────
    case "individual":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <circle cx="16" cy="9" r="5" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1.8" />
          <path d="M7 26C7 20 11 17 16 17C21 17 25 20 25 26" fill="#6366f1" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="21" r="1.5" fill="#facc15" />
        </svg>
      );

    // ── 12. TEAM: Đội Đấu Liên Quân 3D ──────────────────────────────────────
    case "team":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <circle cx="10" cy="11" r="4" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" />
          <path d="M4 25C4 20 7 18 10 18C12 18 13.5 19 14.5 20.5" stroke="#818cf8" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="22" cy="11" r="4" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" />
          <path d="M17.5 20.5C18.5 19 20 18 22 18C25 18 28 20 28 25" stroke="#818cf8" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="8" r="5" fill="#0284c7" stroke="#7dd3fc" strokeWidth="2" />
          <path d="M8 27C8 22 11.5 19 16 19C20.5 19 24 22 24 27" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // ── 13. TROPHY: Cúp Vàng Vô Địch 3D ──────────────────────────────────────
    case "trophy":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <defs>
            <linearGradient id="tp-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="28" rx="7" ry="2" fill="#000000" fillOpacity="0.4" />
          <path d="M9 5H23V14C23 18.5 19.5 21 16 21C12.5 21 9 18.5 9 14V5Z" fill="url(#tp-gold)" stroke="#ca8a04" strokeWidth="1.4" />
          <path d="M9 8H5C3.5 8 3 9.5 3 11C3 14 7 15 9 15" stroke="#facc15" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M23 8H27C28.5 8 29 9.5 29 11C29 14 25 15 23 15" stroke="#facc15" strokeWidth="2" strokeLinecap="round" fill="none" />
          <rect x="14" y="21" width="4" height="4" fill="url(#tp-gold)" />
          <rect x="9" y="25" width="14" height="3" rx="1.5" fill="#78350f" stroke="#facc15" strokeWidth="1.2" />
          <circle cx="16" cy="11" r="2" fill="#ffffff" />
        </svg>
      );

    // ── 14. PLAY: Nút Bấm Khối 3D Tam Giác Xanh Lá ────────────────────────────
    case "play":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <polygon points="6,3 21,12 6,21" fill="#22c55e" stroke="#86efac" strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points="8,7 17,12 8,17" fill="#4ade80" />
        </svg>
      );

    // ── 15. PAUSE: Hai Trụ Khối 3D Tạm Dừng Vàng ──────────────────────────────
    case "pause":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <rect x="5" y="4" width="5" height="16" rx="2" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
          <rect x="14" y="4" width="5" height="16" rx="2" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
        </svg>
      );

    // ── 16. NEXT: Mũi Tên Đôi 3D Xanh / Tím ──────────────────────────────────
    case "next":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M5 4L13 12L5 20" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 4L20 12L12 20" stroke="#a855f7" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // ── 17. TRASH: Thùng Rác Công Nghệ 3D ────────────────────────────────────
    case "trash":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M3 6H21M9 10V16M15 10V16M5 6L6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19L19 6M8 6V4C8 3.45 8.45 3 9 3H15C15.55 3 16 3.45 16 4V6" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // ── 18. SOUND ON / SOUND OFF / SETTINGS ──────────────────────────────────
    case "sound_on":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M11 4L6 8H2V16H6L11 20V4Z" fill="#38bdf8" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15.5 8C17 9.5 17.8 11.2 17.8 12.8C17.8 14.4 17 16.1 15.5 17.6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 5C21.5 7.5 22.8 10.1 22.8 12.8C22.8 15.5 21.5 18.1 19 20.6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "sound_off":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M11 4L6 8H2V16H6L11 20V4Z" fill="#f87171" fillOpacity="0.3" stroke="#f87171" strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="21" y1="8" x2="15" y2="16" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="15" y1="8" x2="21" y2="16" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <circle cx="12" cy="12" r="3.5" fill="#312e81" stroke="#a5b4fc" strokeWidth="1.8" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#818cf8" strokeWidth="1.6" />
        </svg>
      );

    default:
      return null;
  }
}
