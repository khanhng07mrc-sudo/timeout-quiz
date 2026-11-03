const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const mediaDir = path.join(__dirname, "../public/olympia/media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Full 1280x720 clean broadcast canvas without headers, titles, or watermarks
function canvasWrapper(contentSvg) {
  return `
  <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#040816"/>
        <stop offset="40%" stop-color="#0a1936"/>
        <stop offset="80%" stop-color="#0b244d"/>
        <stop offset="100%" stop-color="#035388"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#ca8a04"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="1280" height="720" fill="url(#bgGrad)"/>

    <!-- Subtle Tech Grid Lines -->
    <g opacity="0.05" stroke="#38bdf8" stroke-width="1">
      ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="720"/>`).join("")}
      ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 90}" x2="1280" y2="${i * 90}"/>`).join("")}
    </g>

    <!-- Visual Content Only (Full-bleed stage) -->
    ${contentSvg}
  </svg>
  `;
}

// ── 1. bac_ai_tt_cau1.png (Câu 1: Nhận diện Đấu thầu quốc tế - Chỉ hình ảnh) ──
const tt1Svg = canvasWrapper(`
  <g transform="translate(60, 40)">
    <rect width="1160" height="640" rx="20" fill="#0b172d" stroke="#1e293b" stroke-width="2.5" filter="url(#shadow)"/>

    <!-- Left Pod: Domestic Contractors -->
    <g transform="translate(60, 60)">
      <rect width="360" height="340" rx="20" fill="#064e3b" stroke="#10b981" stroke-width="3" filter="url(#shadow)"/>
      <circle cx="180" cy="110" r="54" fill="#059669"/>
      <text x="180" y="128" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle">🇻🇳</text>
      <text x="180" y="215" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="24" fill="#34d399" text-anchor="middle">NHÀ THẦU TRONG NƯỚC</text>
      <text x="180" y="250" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="16" fill="#a7f3d0" text-anchor="middle">Doanh nghiệp Việt Nam tham dự</text>
      <rect x="50" y="275" width="260" height="36" rx="8" fill="#047857"/>
      <text x="180" y="298" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="14" fill="#ecfdf5" text-anchor="middle">XÂY DỰNG · LẮP ĐẶT · VẬT TƯ</text>
    </g>

    <!-- Center Plus Symbol -->
    <g transform="translate(480, 200)">
      <circle cx="50" cy="50" r="42" fill="#1e293b" stroke="#eab308" stroke-width="4" filter="url(#shadow)"/>
      <text x="50" y="66" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="52" fill="#facc15" text-anchor="middle">+</text>
    </g>

    <!-- Right Pod: Foreign Contractors -->
    <g transform="translate(640, 60)">
      <rect width="360" height="340" rx="20" fill="#1e1b4b" stroke="#818cf8" stroke-width="3" filter="url(#shadow)"/>
      <circle cx="180" cy="110" r="54" fill="#4f46e5"/>
      <text x="180" y="128" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle">🌐</text>
      <text x="180" y="215" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="24" fill="#a5b4fc" text-anchor="middle">NHÀ THẦU NƯỚC NGOÀI</text>
      <text x="180" y="250" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="16" fill="#c7d2fe" text-anchor="middle">CHLB Đức, Áo, Trung Quốc...</text>
      <rect x="50" y="275" width="260" height="36" rx="8" fill="#4338ca"/>
      <text x="180" y="298" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="14" fill="#e0e7ff" text-anchor="middle">CHẾ TẠO TUA-BIN · CƠ ĐIỆN</text>
    </g>

    <!-- Connecting Arrow -->
    <path d="M 530 300 L 530 420" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
    <polygon points="515,415 545,415 530,445" fill="#f59e0b"/>

    <!-- Bottom Result Box -->
    <g transform="translate(280, 455)">
      <rect width="500" height="135" rx="20" fill="#071120" stroke="url(#goldGrad)" stroke-width="3.5" filter="url(#glow)"/>
      <text x="250" y="42" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#fef08a" text-anchor="middle" letter-spacing="2">
        HÌNH THỨC LỰA CHỌN NHÀ THẦU
      </text>
      <text x="250" y="96" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="8">
        ? ? ? ? ? ? ? ?
      </text>
      <text x="250" y="122" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#38bdf8" text-anchor="middle">
        14 CHỮ CÁI · TIÊU CHUẨN FIDIC QUỐC TẾ
      </text>
    </g>
  </g>
`);

// ── 2. bac_ai_tt_cau2.png (Câu 2: Sắp xếp theo trục thời gian chuẩn Ảnh 3) ──
const tt2Svg = canvasWrapper(`
  <g transform="translate(60, 30)">
    <rect width="1160" height="660" rx="20" fill="#1b212c" stroke="#475569" stroke-width="3" filter="url(#shadow)"/>

    <!-- ── TOP HORIZONTAL TIMELINE BAR (1 - 2 - 3 - 4) LIKE IMAGE 3 ── -->
    <g transform="translate(60, 50)">
      <rect x="90" y="40" width="860" height="20" rx="10" fill="#334155"/>

      <!-- Node 1: 15/10/2025 -->
      <g transform="translate(90, 0)">
        <text x="0" y="0" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="32" fill="#cbd5e1" text-anchor="middle">1</text>
        <circle cx="0" cy="50" r="46" fill="#ea580c" stroke="#fed7aa" stroke-width="4.5" filter="url(#shadow)"/>
        <text x="0" y="56" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">15/10/2025</text>
      </g>

      <!-- Connecting Seg 1-2 -->
      <rect x="90" y="43" width="286" height="14" fill="#38bdf8"/>

      <!-- Node 2: 23/02/2026 -->
      <g transform="translate(376, 0)">
        <text x="0" y="0" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="32" fill="#cbd5e1" text-anchor="middle">2</text>
        <circle cx="0" cy="50" r="46" fill="#0284c7" stroke="#bae6fd" stroke-width="4.5" filter="url(#shadow)"/>
        <text x="0" y="56" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">23/02/2026</text>
      </g>

      <!-- Connecting Seg 2-3 -->
      <rect x="376" y="43" width="286" height="14" fill="#22c55e"/>

      <!-- Node 3: 21/10/2026 -->
      <g transform="translate(662, 0)">
        <text x="0" y="0" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="32" fill="#cbd5e1" text-anchor="middle">3</text>
        <circle cx="0" cy="50" r="46" fill="#16a34a" stroke="#bbf7d0" stroke-width="4.5" filter="url(#shadow)"/>
        <text x="0" y="56" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">21/10/2026</text>
      </g>

      <!-- Connecting Seg 3-4 -->
      <rect x="662" y="43" width="286" height="14" fill="#d97706"/>

      <!-- Node 4: 26/10/2026 -->
      <g transform="translate(948, 0)">
        <text x="0" y="0" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="32" fill="#cbd5e1" text-anchor="middle">4</text>
        <circle cx="0" cy="50" r="46" fill="#d97706" stroke="#fef08a" stroke-width="4.5" filter="url(#shadow)"/>
        <text x="0" y="56" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">26/10/2026</text>
      </g>
    </g>

    <!-- ── 4 PINNED EVENT CARDS A, B, C, D (NO DATES ON CARDS) ── -->
    <g transform="translate(45, 195)">
      <!-- Card A -->
      <g transform="translate(0, 0)">
        <rect x="115" y="-14" width="18" height="36" rx="9" fill="none" stroke="#e2e8f0" stroke-width="4.5"/>
        <rect width="248" height="390" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/>
        <rect x="24" y="24" width="200" height="150" rx="8" fill="#e2e8f0"/>
        <text x="124" y="105" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="64" text-anchor="middle">📂</text>
        <text x="124" y="152" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#475569" text-anchor="middle">HỒ SƠ MỜI THẦU</text>
        <text x="124" y="220" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">Đóng &amp; mở thầu</text>
        <text x="124" y="250" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">công khai</text>
        <text x="124" y="288" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#64748b" text-anchor="middle">Mở túi hồ sơ kỹ thuật</text>
        <rect x="89" y="325" width="70" height="42" rx="8" fill="#0f172a"/>
        <text x="124" y="356" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle">A</text>
      </g>

      <!-- Card B -->
      <g transform="translate(274, 0)">
        <rect x="115" y="-14" width="18" height="36" rx="9" fill="none" stroke="#e2e8f0" stroke-width="4.5"/>
        <rect width="248" height="390" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/>
        <rect x="24" y="24" width="200" height="150" rx="8" fill="#e2e8f0"/>
        <text x="124" y="105" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="64" text-anchor="middle">📢</text>
        <text x="124" y="152" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#475569" text-anchor="middle">THÔNG BÁO MỜI THẦU</text>
        <text x="124" y="220" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">Phát hành</text>
        <text x="124" y="250" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">Hồ sơ mời thầu</text>
        <text x="124" y="288" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#64748b" text-anchor="middle">Đăng tải Hệ thống mạng QG</text>
        <rect x="89" y="325" width="70" height="42" rx="8" fill="#0f172a"/>
        <text x="124" y="356" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle">B</text>
      </g>

      <!-- Card C -->
      <g transform="translate(548, 0)">
        <rect x="115" y="-14" width="18" height="36" rx="9" fill="none" stroke="#e2e8f0" stroke-width="4.5"/>
        <rect width="248" height="390" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/>
        <rect x="24" y="24" width="200" height="150" rx="8" fill="#e2e8f0"/>
        <text x="124" y="105" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="64" text-anchor="middle">✒️</text>
        <text x="124" y="152" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#475569" text-anchor="middle">HỢP ĐỒNG GÓI 01TB-BA</text>
        <text x="124" y="220" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">EVN chính thức</text>
        <text x="124" y="250" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">ký hợp đồng</text>
        <text x="124" y="288" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#64748b" text-anchor="middle">Ký kết cùng Liên danh</text>
        <rect x="89" y="325" width="70" height="42" rx="8" fill="#0f172a"/>
        <text x="124" y="356" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle">C</text>
      </g>

      <!-- Card D -->
      <g transform="translate(822, 0)">
        <rect x="115" y="-14" width="18" height="36" rx="9" fill="none" stroke="#e2e8f0" stroke-width="4.5"/>
        <rect width="248" height="390" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/>
        <rect x="24" y="24" width="200" height="150" rx="8" fill="#e2e8f0"/>
        <text x="124" y="105" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="64" text-anchor="middle">🏆</text>
        <text x="124" y="152" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#475569" text-anchor="middle">QUYẾT ĐỊNH TRÚNG THẦU</text>
        <text x="124" y="220" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">Phê duyệt kết quả</text>
        <text x="124" y="250" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle">trúng thầu</text>
        <text x="124" y="288" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#64748b" text-anchor="middle">Quyết định của HĐTV EVN</text>
        <rect x="89" y="325" width="70" height="42" rx="8" fill="#0f172a"/>
        <text x="124" y="356" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle">D</text>
      </g>
    </g>
  </g>
`);

// ── 3. bac_ai_tt_cau3.png (Câu 3: Logic ma trận giải mật mã Telex chuẩn Ảnh 2) ──
// Target Word: THỦY ĐIỆN (Telex: T - H - U - Y - S - D - D - I - E - N) = 10 characters
const matrixData = [
  // Row 0
  [
    { char: "A", bg: "#86efac" }, // Green
    { char: "F", bg: "#f472b6" }, // Pink
    { char: "C", bg: "#fde047" }, // Yellow
    { char: "7", bg: "#cbd5e1" }, // Grey
    { char: "D", bg: "#86efac" }, // [Slot 6: D] Green
    { char: "I", bg: "#fdba74" }, // [Slot 8: I] Orange
  ],
  // Row 1
  [
    { char: "K", bg: "#cbd5e1" },
    { char: "B", bg: "#fde047" },
    { char: "H", bg: "#f472b6" }, // [Slot 2: H] Pink
    { char: "3", bg: "#86efac" },
    { char: "N", bg: "#38bdf8" }, // [Slot 10: N] Sky
    { char: "E", bg: "#f472b6" }, // [Slot 9: E] Pink
  ],
  // Row 2
  [
    { char: "G", bg: "#38bdf8" },
    { char: "D", bg: "#fde047" }, // [Slot 7: D] Yellow
    { char: "0", bg: "#fdba74" },
    { char: "M", bg: "#38bdf8" },
    { char: "J", bg: "#38bdf8" },
    { char: "O", bg: "#fdba74" },
  ],
  // Row 3
  [
    { char: "9", bg: "#fdba74" },
    { char: "U", bg: "#38bdf8" }, // [Slot 3: U] Sky
    { char: "Q", bg: "#fde047" },
    { char: "1", bg: "#cbd5e1" },
    { char: "S", bg: "#86efac" }, // [Slot 5: S] Green
    { char: "X", bg: "#fdba74" },
  ],
  // Row 4
  [
    { char: "Z", bg: "#cbd5e1" },
    { char: "P", bg: "#f472b6" },
    { char: "2", bg: "#fdba74" },
    { char: "R", bg: "#86efac" },
    { char: "8", bg: "#fde047" },
    { char: "T", bg: "#38bdf8" }, // [Slot 1: T] Sky
  ],
  // Row 5
  [
    { char: "V", bg: "#fde047" },
    { char: "5", bg: "#86efac" },
    { char: "W", bg: "#f472b6" },
    { char: "4", bg: "#38bdf8" },
    { char: "Y", bg: "#f472b6" }, // [Slot 4: Y] Pink
    { char: "6", bg: "#f472b6" },
  ],
];

// 10 bottom slots corresponding to T H U Y S D D I E N
const bottomSlots = [
  { bg: "#38bdf8", border: "#ef4444" }, // 1: T (Sky, Red border)
  { bg: "#f472b6", border: "#ef4444" }, // 2: H (Pink, Red border)
  { bg: "#38bdf8", border: "#ef4444" }, // 3: U (Sky, Red border)
  { bg: "#f472b6", border: "#ef4444" }, // 4: Y (Pink, Red border)
  { bg: "#86efac", border: "#ef4444" }, // 5: S (Green, Red border)
  { bg: "#86efac", border: "#ef4444" }, // 6: D (Green, Red border)
  { bg: "#fde047", border: "#ef4444" }, // 7: D (Yellow, Red border)
  { bg: "#fdba74", border: "#ef4444" }, // 8: I (Orange, Red border)
  { bg: "#f472b6", border: "#ef4444" }, // 9: E (Pink, Red border)
  { bg: "#38bdf8", border: "#ef4444" }, // 10: N (Sky, Red border)
];

const cellSize = 68;
const gridStartX = 436;
const gridStartY = 45;

const tt3Svg = canvasWrapper(`
  <g transform="translate(0, 0)">
    <!-- ── 6x6 COLORED PUZZLE MATRIX (EXACT STYLING OF IMAGE 2) ── -->
    <g transform="translate(${gridStartX}, ${gridStartY})">
      <!-- Matrix Cells -->
      ${matrixData
        .map((row, r) =>
          row
            .map((cell, c) => {
              const x = c * cellSize;
              const y = r * cellSize;
              return `
              <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" 
                    fill="${cell.bg}" stroke="#ffffff" stroke-width="1.5"/>
              <text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 10}" 
                    font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" 
                    fill="#0f172a" text-anchor="middle">${cell.char}</text>
            `;
            })
            .join("")
        )
        .join("")}

      <!-- Red Crosshair Partition Axes (Like Image 2) -->
      <line x1="${3 * cellSize}" y1="0" x2="${3 * cellSize}" y2="${6 * cellSize}" 
            stroke="#ef4444" stroke-width="6"/>
      <line x1="0" y1="${3 * cellSize}" x2="${6 * cellSize}" y2="${3 * cellSize}" 
            stroke="#ef4444" stroke-width="6"/>

      <!-- Matrix Outer Border -->
      <rect x="0" y="0" width="${6 * cellSize}" height="${6 * cellSize}" 
            fill="none" stroke="#ef4444" stroke-width="5"/>
    </g>

    <!-- Note: Sử dụng kiểu gõ Telex -->
    <text x="640" y="495" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#facc15" text-anchor="middle">
      <tspan fill="#facc15" text-decoration="underline">Lưu ý:</tspan> Sử dụng kiểu gõ Telex
    </text>

    <!-- ── 10 DECODING SLOTS AT BOTTOM (LIKE IMAGE 2) ── -->
    <g transform="translate(195, 530)">
      <!-- Black Panel Tray -->
      <rect x="-20" y="0" width="930" height="115" rx="18" fill="#091122" stroke="#334155" stroke-width="2.5" filter="url(#shadow)"/>
      
      <!-- 10 Colored Boxes -->
      ${bottomSlots
        .map((slot, i) => {
          const x = i * 88 + 15;
          return `
          <g transform="translate(${x}, 18)">
            <!-- Outer Slot Frame with Red Border -->
            <rect width="68" height="66" rx="10" fill="${slot.bg}" stroke="${slot.border}" stroke-width="4.5" filter="url(#shadow)"/>
            <!-- Slot Index -->
            <text x="34" y="86" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="13" fill="#94a3b8" text-anchor="middle">${i + 1}</text>
          </g>
        `;
        })
        .join("")}
    </g>
  </g>
`);

// ── 4. bac_ai_tt_cau4.png (Câu 4: MÁY PHÁT ĐIỆN - Sơ đồ Stator / Rotor / Máy phát 300 MW) ──
const tt4Svg = canvasWrapper(`
  <g transform="translate(60, 40)">
    <!-- Main Left Technical Diagram Card -->
    <rect x="0" y="0" width="740" height="640" rx="20" fill="#091124" stroke="#38bdf8" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Schematic Diagram of Motor-Generator (Máy phát điện 300 MW) -->
    <g transform="translate(80, 50)">
      <!-- Outer Stator Frame & Core (Khung & Lõi Stator) -->
      <circle cx="290" cy="270" r="230" fill="#0f172a" stroke="#475569" stroke-width="8"/>
      <circle cx="290" cy="270" r="215" fill="#1e293b" stroke="#38bdf8" stroke-width="5"/>

      <!-- Stator Windings (Cuộn dây Stator 18 kV - 24 cuộn dây màu cam đồng) -->
      ${Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const x = 290 + Math.cos(angle) * 195;
        const y = 270 + Math.sin(angle) * 195;
        return `
        <rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="4" fill="#ea580c" stroke="#fed7aa" stroke-width="1.5"/>
      `;
      }).join("")}

      <!-- Air Gap (Khe hở không khí từ thông) -->
      <circle cx="290" cy="270" r="172" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6,4"/>

      <!-- Rotor Poles (Cực từ Rotor - 12 cực từ Nam & Bắc luân phiên) -->
      ${Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 290 + Math.cos(angle) * 135;
        const y = 270 + Math.sin(angle) * 135;
        const isNorth = i % 2 === 0;
        return `
        <g transform="translate(${x}, ${y}) rotate(${i * 30 + 90})">
          <rect x="-16" y="-22" width="32" height="44" rx="6" 
                fill="${isNorth ? "#ef4444" : "#3b82f6"}" stroke="#ffffff" stroke-width="1.5"/>
          <text x="0" y="7" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="18" 
                fill="#ffffff" text-anchor="middle">${isNorth ? "N" : "S"}</text>
        </g>
      `;
      }).join("")}

      <!-- Center Shaft & Spider (Trục rotor và nan hoa) -->
      <circle cx="290" cy="270" r="85" fill="#1e293b" stroke="#94a3b8" stroke-width="4"/>
      <circle cx="290" cy="270" r="42" fill="#64748b" stroke="#ffffff" stroke-width="3"/>
      <circle cx="290" cy="270" r="18" fill="#0f172a"/>

      <!-- Magnetic Flux Rotation Arrows (Từ trường quay 50 Hz) -->
      <g stroke="#facc15" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M 230 140 A 150 150 0 0 1 350 140"/>
        <polygon points="340,130 365,140 345,155" fill="#facc15"/>
        <text x="290" y="115" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="14" fill="#facc15" text-anchor="middle">
          TỪ TRƯỜNG QUAY (ROTATING FIELD)
        </text>
      </g>

      <!-- Labels -->
      <text x="290" y="275" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle">
        TRỤC MÁY
      </text>
      <text x="290" y="525" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="15" fill="#38bdf8" text-anchor="middle">
        STATOR &amp; ROTOR MÁY PHÁT 300 MW (18 kV)
      </text>
    </g>

    <!-- Right Side Information Card -->
    <g transform="translate(770, 0)">
      <rect width="390" height="640" rx="20" fill="#0f172a" stroke="#eab308" stroke-width="2.5" filter="url(#shadow)"/>
      
      <!-- Top Badge -->
      <rect x="30" y="35" width="330" height="48" rx="12" fill="#854d0e"/>
      <text x="195" y="66" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#fef08a" text-anchor="middle">
        THÔNG SỐ CƠ ĐIỆN GÓI 01TB-BA
      </text>

      <!-- Key Specifications List -->
      <g transform="translate(30, 110)">
        <rect width="330" height="85" rx="14" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#38bdf8">LOẠI THIẾT BỊ</text>
        <text x="20" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#f8fafc">Máy phát - Động cơ đồng bộ</text>
      </g>

      <g transform="translate(30, 215)">
        <rect width="330" height="85" rx="14" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#38bdf8">CÔNG SUẤT ĐỊNH MỨC</text>
        <text x="20" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="17" fill="#f8fafc">4 tổ máy × 300 MW = 1.200 MW</text>
      </g>

      <g transform="translate(30, 320)">
        <rect width="330" height="95" rx="14" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#38bdf8">NGUYÊN LÝ HOẠT ĐỘNG</text>
        <text x="20" y="58" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13.5" fill="#cbd5e1">• Cảm ứng điện từ (Michael Faraday)</text>
        <text x="20" y="80" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13.5" fill="#cbd5e1">• Biến đổi Cơ năng ➔ Điện năng</text>
      </g>

      <g transform="translate(30, 435)">
        <rect width="330" height="85" rx="14" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#38bdf8">ĐIỆN ÁP &amp; TẦN SỐ</text>
        <text x="20" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="17" fill="#f8fafc">18 kV · 3 Pha · 50 Hz</text>
      </g>

      <rect x="30" y="545" width="330" height="55" rx="14" fill="#0284c7"/>
      <text x="195" y="579" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">
        GỒM 3 TỪ (12 CHỮ CÁI)
      </text>
    </g>
  </g>
`);

const tasks = [
  { name: "bac_ai_tt_cau1.png", svg: tt1Svg },
  { name: "bac_ai_tt_cau2.png", svg: tt2Svg },
  { name: "bac_ai_tt_cau3.png", svg: tt3Svg },
  { name: "bac_ai_tt_cau4.png", svg: tt4Svg },
];

async function run() {
  console.log("Generating 4 clean broadcast images without headers or watermarks...");
  for (const t of tasks) {
    const outPath = path.join(mediaDir, t.name);
    await sharp(Buffer.from(t.svg)).png().toFile(outPath);
    console.log("Generated clean image:", t.name);
  }
  console.log("All 4 clean Tang Toc images successfully generated!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
