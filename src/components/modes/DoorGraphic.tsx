import React from "react";

interface DoorGraphicProps {
  doorNumber: number;
  label?: string;
  isSelected?: boolean;
  isStage2?: boolean;
  isPeeked?: boolean;
  peekLabel?: string;
  peekIcon?: string;
  isOpened?: boolean;
  isBomb?: boolean;
  isSteal?: boolean;
  isChosenFinal?: boolean;
  canInteract?: boolean;
  hasBombDetected?: boolean;
}

export function DoorClipPathDefinition() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        {/* ClipPath: Tròn ở trên (arch), nhọn ở dưới (pointed shield base) */}
        <clipPath id="realisticDoorClip" clipPathUnits="objectBoundingBox">
          <path d="M 0,0.22 C 0,0.05 0.18,0 0.5,0 C 0.82,0 1,0.05 1,0.22 L 1,0.82 L 0.5,1 L 0,0.82 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function RealisticDoorArtwork({
  doorNumber,
  isSelected,
  isStage2,
  isPeeked,
  isOpened,
  isBomb,
  isSteal,
  isChosenFinal,
  canInteract,
  hasBombDetected,
}: DoorGraphicProps) {
  // Color palette based on state
  let primaryWoodColor = "#3d2314";
  let darkWoodColor = "#22130b";
  let archBorderColor = "#854d0e";
  let archGlowColor = "rgba(234, 179, 8, 0.2)";
  let accentHinges = "#78350f";

  if (isOpened) {
    if (isBomb) {
      primaryWoodColor = "#3a0e12";
      darkWoodColor = "#1f0507";
      archBorderColor = "#ef4444";
      archGlowColor = "rgba(239, 68, 68, 0.4)";
      accentHinges = "#991b1b";
    } else if (isSteal) {
      primaryWoodColor = "#3b072b";
      darkWoodColor = "#1d0215";
      archBorderColor = "#f43f5e";
      archGlowColor = "rgba(244, 63, 94, 0.4)";
      accentHinges = "#be123c";
    } else {
      primaryWoodColor = "#1a3a22";
      darkWoodColor = "#091f11";
      archBorderColor = "#10b981";
      archGlowColor = "rgba(16, 185, 129, 0.4)";
      accentHinges = "#047857";
    }
  } else if (isStage2 && isSelected) {
    archBorderColor = "#facc15";
    archGlowColor = "rgba(250, 204, 21, 0.6)";
    accentHinges = "#ca8a04";
  } else if (isPeeked) {
    archBorderColor = "#06b6d4";
    archGlowColor = "rgba(6, 182, 212, 0.5)";
    accentHinges = "#0891b2";
  } else if (isSelected) {
    archBorderColor = "#f59e0b";
    archGlowColor = "rgba(245, 158, 11, 0.4)";
    accentHinges = "#d97706";
  }

  return (
    <svg
      viewBox="0 0 100 145"
      className="w-full h-full absolute inset-0 select-none pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Radial glow for arch */}
        <radialGradient id={`doorGlow-${doorNumber}`} cx="50%" cy="25%" r="60%">
          <stop offset="0%" stopColor={archGlowColor} stopOpacity="1" />
          <stop offset="100%" stopColor={archGlowColor} stopOpacity="0" />
        </radialGradient>

        {/* Wood planks gradient */}
        <linearGradient id={`woodGrad-${doorNumber}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryWoodColor} />
          <stop offset="50%" stopColor={darkWoodColor} />
          <stop offset="100%" stopColor={primaryWoodColor} />
        </linearGradient>

        {/* Stone frame gradient */}
        <linearGradient id={`stoneGrad-${doorNumber}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="50%" stopColor="#1c1917" />
          <stop offset="100%" stopColor="#0c0a09" />
        </linearGradient>

        {/* Metallic hinge gradient */}
        <linearGradient id={`ironGrad-${doorNumber}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#57534e" />
          <stop offset="50%" stopColor="#a8a29e" />
          <stop offset="100%" stopColor="#292524" />
        </linearGradient>
      </defs>

      {/* ── 1. OUTER DOORWAY / ARCHED FRAME (TRÒN Ở TRÊN, NHỌN Ở DƯỚI) ── */}
      <path
        d="M 2,32 C 2,8 20,2 50,2 C 80,2 98,8 98,32 L 98,118 L 50,143 L 2,118 Z"
        fill={`url(#stoneGrad-${doorNumber})`}
        stroke={archBorderColor}
        strokeWidth={isStage2 && isSelected ? "3" : isPeeked ? "2.5" : "2"}
        filter="drop-shadow(0 4px 10px rgba(0,0,0,0.8))"
      />

      {/* ── 2. INNER DOOR LEAF (THÂN CÁNH CỬA CHÍNH) ── */}
      <path
        d="M 6,34 C 6,12 23,6 50,6 C 77,6 94,12 94,34 L 94,115 L 50,139 L 6,115 Z"
        fill={`url(#woodGrad-${doorNumber})`}
      />

      {/* ── 3. WOODEN PLANKS (CÁC ĐƯỜNG KẺ VÂN GỖ ĐỨNG) ── */}
      <line x1="28" y1="20" x2="28" y2="125" stroke="#120a06" strokeWidth="1.2" opacity="0.75" />
      <line x1="50" y1="6" x2="50" y2="138" stroke="#000000" strokeWidth="2" opacity="0.9" /> {/* Khe cửa giữa */}
      <line x1="72" y1="20" x2="72" y2="125" stroke="#120a06" strokeWidth="1.2" opacity="0.75" />

      {/* ── 4. ARCH DECORATIVE KEYSTONE (ĐÁ VÒM TRÊN CÙNG) ── */}
      <path
        d="M 44,2 L 56,2 L 54,12 L 46,12 Z"
        fill={accentHinges}
        stroke={archBorderColor}
        strokeWidth="1"
      />

      {/* ── 5. IRON REINFORCEMENT BANDS (CÁC NẸP SẮT ĐÓNG ĐINH TÁN) ── */}
      {/* Nẹp ngang trên */}
      <rect x="8" y="42" width="84" height="6" rx="1.5" fill={`url(#ironGrad-${doorNumber})`} opacity="0.85" />
      <circle cx="16" cy="45" r="1.5" fill="#fef08a" />
      <circle cx="38" cy="45" r="1.5" fill="#fef08a" />
      <circle cx="62" cy="45" r="1.5" fill="#fef08a" />
      <circle cx="84" cy="45" r="1.5" fill="#fef08a" />

      {/* Nẹp ngang dưới */}
      <rect x="8" y="92" width="84" height="6" rx="1.5" fill={`url(#ironGrad-${doorNumber})`} opacity="0.85" />
      <circle cx="16" cy="95" r="1.5" fill="#fef08a" />
      <circle cx="38" cy="95" r="1.5" fill="#fef08a" />
      <circle cx="62" cy="95" r="1.5" fill="#fef08a" />
      <circle cx="84" cy="95" r="1.5" fill="#fef08a" />

      {/* ── 6. VÒM CỔ ĐIỂN CONG TRÒN (INNER GOTHIC ARCH ACCENT) ── */}
      <path
        d="M 14,40 C 14,20 28,14 50,14 C 72,14 86,20 86,40"
        fill="none"
        stroke={archBorderColor}
        strokeWidth="1"
        strokeDasharray="2,2"
        opacity="0.6"
      />

      {/* ── 7. DOOR KNOCKER & HANDLES (TAY NẮM CỬA CỔ ĐIỂN) ── */}
      {/* Đế tay nắm trái */}
      <circle cx="43" cy="68" r="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
      <circle cx="43" cy="73" r="3" fill="none" stroke="#eab308" strokeWidth="1.2" />

      {/* Đế tay nắm phải */}
      <circle cx="57" cy="68" r="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
      <circle cx="57" cy="73" r="3" fill="none" stroke="#eab308" strokeWidth="1.2" />

      {/* ── 8. KEYHOLE ESCUTCHEON (LỖ KHÓA PHÁT SÁNG Ở GIỮA) ── */}
      <g transform="translate(50, 71)">
        <circle cx="0" cy="0" r="1.8" fill={isPeeked ? "#22d3ee" : isSelected ? "#fef08a" : "#0c0a09"} />
        <polygon points="-1,0 1,0 1.5,4 -1.5,4" fill={isPeeked ? "#22d3ee" : isSelected ? "#fef08a" : "#0c0a09"} />
      </g>

      {/* ── 9. GOTHIC POINTED BASE DECORATION (MŨI NHỌN DƯỚI ĐÁY) ── */}
      <path
        d="M 44,130 L 50,140 L 56,130 Z"
        fill={accentHinges}
        stroke={archBorderColor}
        strokeWidth="1"
      />
    </svg>
  );
}
