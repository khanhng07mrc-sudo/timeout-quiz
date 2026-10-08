import React from "react";

export type TarotMajorKey = "THE_SUN" | "THE_EMPEROR" | "THE_FOOL" | "DEATH" | "THE_KNIGHT";

export function getTarotCardMeta(tarotName?: string, storyTitle?: string): {
  key: TarotMajorKey;
  roman: string;
  nameEn: string;
  nameVi: string;
  tagline: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
} {
  const text = `${tarotName || ""} ${storyTitle || ""}`.toLowerCase();
  if (text.includes("mặt trời") || text.includes("sun")) {
    return {
      key: "THE_SUN",
      roman: "XIX",
      nameEn: "THE SUN",
      nameVi: "Mặt Trời",
      tagline: "Đại Hồng Ân Vinh Quang",
      bgGradient: "from-amber-950 via-yellow-950 to-stone-950",
      borderColor: "border-amber-400",
      glowColor: "rgba(245, 158, 11, 0.4)",
    };
  }
  if (text.includes("hoàng đế") || text.includes("emperor")) {
    return {
      key: "THE_EMPEROR",
      roman: "IV",
      nameEn: "THE EMPEROR",
      nameVi: "Hoàng Đế",
      tagline: "Vương Quyền Uy Thế",
      bgGradient: "from-purple-950 via-rose-950 to-stone-950",
      borderColor: "border-yellow-400",
      glowColor: "rgba(234, 179, 8, 0.4)",
    };
  }
  if (text.includes("kẻ khờ") || text.includes("fool")) {
    return {
      key: "THE_FOOL",
      roman: "0",
      nameEn: "THE FOOL",
      nameVi: "Kẻ Khờ",
      tagline: "Đột Phá Bất Ngờ",
      bgGradient: "from-indigo-950 via-blue-950 to-stone-950",
      borderColor: "border-sky-400",
      glowColor: "rgba(56, 189, 248, 0.4)",
    };
  }
  if (text.includes("thần chết") || text.includes("death")) {
    return {
      key: "DEATH",
      roman: "XIII",
      nameEn: "DEATH",
      nameVi: "Thần Chết",
      tagline: "Đoạt Mệnh Tái Sinh",
      bgGradient: "from-red-950 via-stone-950 to-black",
      borderColor: "border-rose-500",
      glowColor: "rgba(239, 68, 68, 0.4)",
    };
  }
  // Default Knight
  return {
    key: "THE_KNIGHT",
    roman: "VII",
    nameEn: "THE KNIGHT",
    nameVi: "Hiệp Sĩ",
    tagline: "Thần Tốc Đột Kích",
    bgGradient: "from-emerald-950 via-teal-950 to-stone-950",
    borderColor: "border-emerald-400",
    glowColor: "rgba(16, 185, 129, 0.4)",
  };
}

/**
 * Ornate, mystical Tarot Card Back vector graphic
 */
export function TarotCardBackSvg() {
  return (
    <svg viewBox="0 0 200 320" className="w-full h-full select-none" fill="none">
      <defs>
        <radialGradient id="cardBackGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#431407" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#1e1035" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0515" />
        </radialGradient>
        <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Card Base */}
      <rect x="2" y="2" width="196" height="316" rx="14" fill="url(#cardBackGlow)" />

      {/* Outer Border */}
      <rect
        x="6"
        y="6"
        width="188"
        height="308"
        rx="12"
        stroke="url(#goldFiligree)"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />

      {/* Inner Inset Border with dashed sacred stars */}
      <rect
        x="12"
        y="12"
        width="176"
        height="296"
        rx="9"
        stroke="url(#goldFiligree)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
        strokeOpacity="0.6"
      />

      {/* Corner Ornaments */}
      {/* Top Left */}
      <path
        d="M 12 28 C 22 28 28 22 28 12 M 16 16 L 24 24"
        stroke="url(#goldFiligree)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Top Right */}
      <path
        d="M 188 28 C 178 28 172 22 172 12 M 184 16 L 176 24"
        stroke="url(#goldFiligree)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Bottom Left */}
      <path
        d="M 12 292 C 22 292 28 298 28 308 M 16 304 L 24 296"
        stroke="url(#goldFiligree)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Bottom Right */}
      <path
        d="M 188 292 C 178 292 172 298 172 308 M 184 304 L 176 296"
        stroke="url(#goldFiligree)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Central Mystical Mandala / Octagram Star */}
      <g transform="translate(100, 160)">
        {/* Sacred Rings */}
        <circle r="64" stroke="url(#goldFiligree)" strokeWidth="0.8" strokeOpacity="0.4" />
        <circle r="52" stroke="url(#goldFiligree)" strokeWidth="1" strokeDasharray="4 2" strokeOpacity="0.6" />
        <circle r="40" stroke="url(#goldFiligree)" strokeWidth="1.2" strokeOpacity="0.8" />
        <circle r="22" stroke="url(#goldFiligree)" strokeWidth="0.8" fill="#1e1035" fillOpacity="0.6" />

        {/* 8-pointed Octagram Star */}
        <polygon
          points="0,-48 10,-18 40,-40 18,-10 48,0 18,10 40,40 10,18 0,48 -10,18 -40,40 -18,10 -48,0 -18,-10 -40,-40 -10,-18"
          fill="url(#goldFiligree)"
          fillOpacity="0.25"
          stroke="url(#goldFiligree)"
          strokeWidth="1"
        />

        {/* Diagonal Cross Rays */}
        <line x1="-36" y1="-36" x2="36" y2="36" stroke="url(#goldFiligree)" strokeWidth="1.2" strokeOpacity="0.7" />
        <line x1="36" y1="-36" x2="-36" y2="36" stroke="url(#goldFiligree)" strokeWidth="1.2" strokeOpacity="0.7" />
        <line x1="0" y1="-44" x2="0" y2="44" stroke="url(#goldFiligree)" strokeWidth="1.5" strokeOpacity="0.9" />
        <line x1="-44" y1="0" x2="44" y2="0" stroke="url(#goldFiligree)" strokeWidth="1.5" strokeOpacity="0.9" />

        {/* Center Eye / Mystic Dot */}
        <circle r="7" fill="url(#goldFiligree)" />
        <circle r="3" fill="#0f0728" />

        {/* Crescent Moons Top and Bottom */}
        <path
          d="M -12 -58 A 12 12 0 0 0 12 -58 A 9 9 0 0 1 -12 -58"
          fill="url(#goldFiligree)"
          fillOpacity="0.85"
        />
        <path
          d="M -12 58 A 12 12 0 0 1 12 58 A 9 9 0 0 0 -12 58"
          fill="url(#goldFiligree)"
          fillOpacity="0.85"
        />
      </g>

      {/* Arcane Constellation Dots */}
      <circle cx="100" cy="40" r="2" fill="url(#goldFiligree)" />
      <circle cx="80" cy="50" r="1.5" fill="url(#goldFiligree)" opacity="0.6" />
      <circle cx="120" cy="50" r="1.5" fill="url(#goldFiligree)" opacity="0.6" />
      <circle cx="100" cy="280" r="2" fill="url(#goldFiligree)" />
      <circle cx="80" cy="270" r="1.5" fill="url(#goldFiligree)" opacity="0.6" />
      <circle cx="120" cy="270" r="1.5" fill="url(#goldFiligree)" opacity="0.6" />
    </svg>
  );
}

/**
 * Detailed SVG Emblem for each of the 5 Tarot cards
 */
export function TarotCardEmblem({ cardKey }: { cardKey: TarotMajorKey }) {
  switch (cardKey) {
    case "THE_SUN":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="sunGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          {/* Radiant Sun Flames */}
          <g transform="translate(50, 50)">
            {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
              (angle, idx) => (
                <path
                  key={idx}
                  d={idx % 2 === 0 ? "M 0 -22 L 4 -38 L 0 -44 L -4 -38 Z" : "M 0 -22 Q 6 -32 0 -40 Q -6 -32 0 -22"}
                  fill="url(#sunGold)"
                  transform={`rotate(${angle})`}
                />
              )
            )}
            {/* Sun Disc */}
            <circle r="22" fill="url(#sunGold)" stroke="#fef08a" strokeWidth="1.5" />
            <circle r="19" fill="#78350f" fillOpacity="0.4" />
            {/* Serene Sun Eyes & Smile */}
            <path d="M -8 -4 Q -5 -8 -2 -4" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 2 -4 Q 5 -8 8 -4" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M -5 6 Q 0 11 5 6" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="-5" cy="-2" r="1.5" fill="#fef08a" />
            <circle cx="5" cy="-2" r="1.5" fill="#fef08a" />
          </g>
          {/* Twin Sunflowers base */}
          <circle cx="28" cy="84" r="7" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="28" cy="84" r="3.5" fill="#451a03" />
          <circle cx="72" cy="84" r="7" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="72" cy="84" r="3.5" fill="#451a03" />
        </svg>
      );

    case "THE_EMPEROR":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="emperorCrown" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Stone Throne Back */}
          <rect x="22" y="14" width="56" height="74" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
          <rect x="26" y="18" width="48" height="66" rx="4" fill="#292524" />

          {/* Ram Heads on throne corners */}
          <path d="M 18 20 Q 22 14 26 22 Q 22 26 18 20 Z" fill="#a8a29e" />
          <path d="M 82 20 Q 78 14 74 22 Q 78 26 82 20 Z" fill="#a8a29e" />

          {/* Majestic 5-peak Imperial Crown */}
          <path
            d="M 32 46 L 35 32 L 42 39 L 50 26 L 58 39 L 65 32 L 68 46 Z"
            fill="url(#emperorCrown)"
            stroke="#fef08a"
            strokeWidth="1.2"
          />
          {/* Crown Jewels */}
          <circle cx="50" cy="33" r="2.5" fill="#dc2626" />
          <circle cx="41" cy="40" r="1.8" fill="#2563eb" />
          <circle cx="59" cy="40" r="1.8" fill="#16a34a" />

          {/* Royal Cape & Ankh Scepter */}
          <path d="M 34 50 L 50 82 L 66 50 Z" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1" />
          <path d="M 44 56 L 56 56 M 50 50 L 50 78" stroke="url(#emperorCrown)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="48" r="4" stroke="url(#emperorCrown)" strokeWidth="2" fill="none" />
        </svg>
      );

    case "THE_FOOL":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="foolAura" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Cliff Edge */}
          <path d="M 10 90 L 44 68 L 52 90 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

          {/* Cosmic Galaxy Vortex */}
          <circle cx="68" cy="32" r="20" stroke="url(#foolAura)" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
          <circle cx="68" cy="32" r="12" stroke="url(#foolAura)" strokeWidth="1.2" opacity="0.8" />
          <circle cx="68" cy="32" r="4" fill="#fef08a" />

          {/* Traveler Figure Silhouette */}
          <circle cx="42" cy="42" r="6" fill="#f8fafc" />
          {/* Wand with Rose Pack */}
          <line x1="30" y1="58" x2="56" y2="34" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
          <circle cx="56" cy="34" r="5" fill="#f43f5e" />
          <path d="M 38 48 L 48 66 L 36 68 Z" fill="#38bdf8" />

          {/* White Rose of Innocence */}
          <path
            d="M 24 52 C 20 46 28 42 28 50 C 32 46 34 52 28 56 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />

          {/* Golden Butterfly */}
          <path
            d="M 72 56 C 76 52 82 54 78 58 C 82 62 76 64 74 60 Z"
            fill="#facc15"
            stroke="#eab308"
            strokeWidth="0.8"
          />
        </svg>
      );

    case "DEATH":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="scytheBlade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          {/* Twin Pillars of Rebirth in background */}
          <rect x="22" y="32" width="6" height="52" fill="#27272a" stroke="#52525b" strokeWidth="1" />
          <rect x="72" y="32" width="6" height="52" fill="#27272a" stroke="#52525b" strokeWidth="1" />
          {/* Rising Rebirth Sun between pillars */}
          <path d="M 40 84 A 10 10 0 0 1 60 84" fill="#fbbf24" opacity="0.6" />

          {/* Black Banner with Mystic 5-petal White Rose */}
          <rect x="36" y="24" width="28" height="38" rx="2" fill="#09090b" stroke="#3f3f46" strokeWidth="1" />
          <circle cx="50" cy="42" r="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="50" cy="42" r="2.5" fill="#facc15" />

          {/* Grim Reaper's Curved Scythe */}
          <path
            d="M 28 78 L 68 22"
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Gleaming Crescent Blade */}
          <path
            d="M 68 22 Q 86 16 88 34 Q 80 26 68 26 Z"
            fill="url(#scytheBlade)"
            stroke="#f1f5f9"
            strokeWidth="1.2"
          />
          {/* Skull / Hood hint */}
          <circle cx="48" cy="62" r="8" fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
          <circle cx="45" cy="60" r="1.5" fill="#ef4444" />
          <circle cx="51" cy="60" r="1.5" fill="#ef4444" />
        </svg>
      );

    case "THE_KNIGHT":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="shieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* Speed Wind Arcs */}
          <path d="M 12 36 Q 30 30 50 34" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <path d="M 16 66 Q 40 60 70 64" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

          {/* Knight Crest Shield */}
          <path
            d="M 30 38 Q 50 30 70 38 Q 70 66 50 82 Q 30 66 30 38 Z"
            fill="#0f172a"
            stroke="url(#shieldGold)"
            strokeWidth="2"
          />
          {/* Shield Emblem Cross */}
          <path d="M 50 38 L 50 74 M 38 52 L 62 52" stroke="url(#shieldGold)" strokeWidth="1.8" />

          {/* Swift Knight's Broadsword */}
          <line x1="22" y1="20" x2="50" y2="52" stroke="url(#swordBlade)" strokeWidth="3" strokeLinecap="round" />
          <line x1="16" y1="28" x2="28" y2="16" stroke="url(#shieldGold)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2.5" fill="url(#shieldGold)" />

          {/* Winged Helmet Plume */}
          <path d="M 44 24 Q 60 16 68 28 Q 56 26 44 24 Z" fill="#38bdf8" />
        </svg>
      );
  }
}
