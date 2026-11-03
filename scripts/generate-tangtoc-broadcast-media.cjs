const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const mediaDir = path.join(__dirname, "../public/olympia/media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

function svgWrapper(title, subtitle, contentSvg) {
  const safeTitle = title.toUpperCase().replace(/&/g, "&amp;");
  const safeSubtitle = subtitle.replace(/&/g, "&amp;");
  const safeContent = contentSvg.replace(/&(?!(amp|lt|gt|quot|apos);)/gi, "&amp;");
  return `
  <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050b1a"/>
        <stop offset="35%" stop-color="#0b1b3a"/>
        <stop offset="75%" stop-color="#0d2b5c"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#ca8a04"/>
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#111827" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#030712" stop-opacity="0.98"/>
      </linearGradient>
      <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00f0ff"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.7"/>
      </filter>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="1280" height="720" fill="url(#bgGrad)"/>

    <!-- Geometric Broadcast Tech Grid -->
    <g opacity="0.08" stroke="#38bdf8" stroke-width="1">
      ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="720"/>`).join("")}
      ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 90}" x2="1280" y2="${i * 90}"/>`).join("")}
    </g>

    <!-- Circular Ambient Glows -->
    <circle cx="200" cy="180" r="160" fill="#0284c7" opacity="0.15" filter="url(#glow)"/>
    <circle cx="1080" cy="540" r="180" fill="#6366f1" opacity="0.15" filter="url(#glow)"/>

    <!-- Top Broadcast Header -->
    <rect x="140" y="22" width="1000" height="68" rx="18" fill="#0b1329" stroke="url(#goldGrad)" stroke-width="3" filter="url(#shadow)"/>
    <text x="640" y="52" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="24" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="3">
      ${safeTitle}
    </text>
    <text x="640" y="74" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#93c5fd" text-anchor="middle" letter-spacing="1.5">
      ${safeSubtitle}
    </text>

    <!-- Main Content Frame -->
    <rect x="70" y="104" width="1140" height="574" rx="22" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="2.5" filter="url(#shadow)"/>

    <!-- Inner Content -->
    ${safeContent}

    <!-- Bottom Olympia Broadcast Watermark -->
    <rect x="90" y="642" width="230" height="24" rx="6" fill="#0369a1" opacity="0.85"/>
    <text x="205" y="658" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle" letter-spacing="1.2">
      ĐƯỜNG LÊN ĐỈNH OLYMPIA 26
    </text>
  </svg>
  `;
}

// ── 1. bac_ai_tt_cau1.png (Đấu thầu quốc tế) ─────────────────────────────────
const tt1Svg = svgWrapper(
  "TĂNG TỐC · CÂU 1 (NHẬN DIỆN HÌNH THỨC)",
  "HÌNH THỨC LỰA CHỌN NHÀ THẦU CÓ SỰ THAM GIA CỦA CẢ NHÀ THẦU TRONG VÀ NGOÀI NƯỚC",
  `
  <g transform="translate(100, 130)">
    <!-- Central Prompt Banner -->
    <rect x="40" y="15" width="1000" height="70" rx="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <text x="540" y="45" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="18" fill="#e0f2fe" text-anchor="middle">
      ĐÂY LÀ HÌNH THỨC LỰA CHỌN NHÀ THẦU NÀO THEO LUẬT ĐẤU THẦU?
    </text>
    <text x="540" y="68" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="14" fill="#38bdf8" text-anchor="middle">
      Áp dụng cho gói thầu công nghệ cao như Gói 01TB-BA Thủy điện Bác Ái
    </text>

    <!-- Flow Diagram: International & Domestic Bidders -->
    <g transform="translate(60, 115)">
      <!-- Left Box: Domestic -->
      <rect x="0" y="20" width="300" height="180" rx="16" fill="#064e3b" stroke="#10b981" stroke-width="3" filter="url(#shadow)"/>
      <circle cx="150" cy="65" r="30" fill="#059669"/>
      <text x="150" y="73" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">🇻🇳</text>
      <text x="150" y="125" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="18" fill="#34d399" text-anchor="middle">NHÀ THẦU TRONG NƯỚC</text>
      <text x="150" y="155" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#a7f3d0" text-anchor="middle">Doanh nghiệp Việt Nam tham dự</text>

      <!-- Center Plus / Combination Symbol -->
      <circle cx="365" cy="110" r="26" fill="#1e293b" stroke="#eab308" stroke-width="2.5"/>
      <text x="365" y="119" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#facc15" text-anchor="middle">+</text>

      <!-- Right Box: Foreign -->
      <rect x="430" y="20" width="300" height="180" rx="16" fill="#1e1b4b" stroke="#818cf8" stroke-width="3" filter="url(#shadow)"/>
      <circle cx="580" cy="65" r="30" fill="#4f46e5"/>
      <text x="580" y="73" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">🌐</text>
      <text x="580" y="125" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="18" fill="#a5b4fc" text-anchor="middle">NHÀ THẦU NƯỚC NGOÀI</text>
      <text x="580" y="155" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#c7d2fe" text-anchor="middle">Đức, Áo, Trung Quốc, Nhật Bản...</text>

      <!-- Arrow Down to Target Box -->
      <path d="M 365 145 L 365 240" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
      <polygon points="350,235 380,235 365,260" fill="#f59e0b"/>

      <!-- Target Box with Question Mark -->
      <rect x="180" y="270" width="370" height="95" rx="18" fill="#0f172a" stroke="#eab308" stroke-width="3.5" filter="url(#glow)"/>
      <text x="365" y="310" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="15" fill="#fef08a" text-anchor="middle" letter-spacing="1">
        HÌNH THỨC ĐẤU THẦU
      </text>
      <text x="365" y="348" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="6">
        ? ? ? ? ? ? ? ?
      </text>
    </g>

    <!-- Side Features Checklist -->
    <g transform="translate(860, 135)">
      <rect width="180" height="270" rx="14" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <text x="90" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#93c5fd" text-anchor="middle">ĐẶC ĐIỂM CỐT LÕI</text>
      <line x1="20" y1="45" x2="160" y2="45" stroke="#334155" stroke-width="1.5"/>
      <text x="15" y="75" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="12" fill="#cbd5e1">• Cạnh tranh rộng rãi</text>
      <text x="15" y="105" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="12" fill="#cbd5e1">• Phát hành HSMT quốc tế</text>
      <text x="15" y="135" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="12" fill="#cbd5e1">• Ngôn ngữ tiếng Anh</text>
      <text x="15" y="165" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="12" fill="#cbd5e1">• Tiêu chuẩn FIDIC</text>
      <text x="15" y="195" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="12" fill="#cbd5e1">• Chuyển giao công nghệ</text>
      <rect x="20" y="225" width="140" height="30" rx="8" fill="#0284c7"/>
      <text x="90" y="245" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle">14 CHỮ CÁI</text>
    </g>
  </g>
  `
);

// ── 2. Helper for Clues in Question 2 (Voith Hydro) ──────────────────────────
function makeTt2Svg(activeClueCount = 4) {
  const c1Active = activeClueCount >= 1;
  const c2Active = activeClueCount >= 2;
  const c3Active = activeClueCount >= 3;
  const c4Active = activeClueCount >= 4;

  return svgWrapper(
    "TĂNG TỐC · CÂU 2 (DỮ KIỆN MỞ DẦN)",
    "ĐÂY LÀ TẬP ĐOÀN CƠ KHÍ NĂNG LƯỢNG NÀO?",
    `
    <g transform="translate(100, 130)">
      <!-- Quadrant 1: Clue 1 (Germany) -->
      <g transform="translate(30, 20)">
        <rect width="480" height="190" rx="16" fill="${c1Active ? "#0f2347" : "#0f172a"}" stroke="${c1Active ? "#38bdf8" : "#334155"}" stroke-width="${c1Active ? 3 : 1.5}" filter="url(#shadow)"/>
        <rect x="20" y="18" width="140" height="32" rx="8" fill="${c1Active ? "#0284c7" : "#334155"}"/>
        <text x="90" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 1 (0s)</text>
        ${c1Active ? `
          <text x="25" y="85" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff">Tập đoàn cơ khí CHLB Đức 🇩🇪</text>
          <text x="25" y="118" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#bae6fd">• Thành lập năm 1867 tại Heidenheim</text>
          <text x="25" y="148" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#bae6fd">• Hơn 150 năm dẫn đầu công nghệ thủy điện toàn cầu</text>
        ` : `
          <text x="240" y="115" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="26" fill="#475569" text-anchor="middle">🔒 ĐANG KHÓA</text>
        `}
      </g>

      <!-- Quadrant 2: Clue 2 (Shanghai) -->
      <g transform="translate(560, 20)">
        <rect width="480" height="190" rx="16" fill="${c2Active ? "#241442" : "#0f172a"}" stroke="${c2Active ? "#a855f7" : "#334155"}" stroke-width="${c2Active ? 3 : 1.5}" filter="url(#shadow)"/>
        <rect x="20" y="18" width="140" height="32" rx="8" fill="${c2Active ? "#7c3aed" : "#334155"}"/>
        <text x="90" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 2 (5s)</text>
        ${c2Active ? `
          <text x="25" y="85" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff">Nhà máy chế tạo Thượng Hải 🏭</text>
          <text x="25" y="118" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#e9d5ff">• Cơ sở sản xuất thiết bị thủy lực hiện đại bậc nhất</text>
          <text x="25" y="148" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#e9d5ff">• Năng lực đúc cánh tua-bin nguyên khối siêu trường</text>
        ` : `
          <text x="240" y="115" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="26" fill="#475569" text-anchor="middle">🔒 ĐANG KHÓA (5s)</text>
        `}
      </g>

      <!-- Quadrant 3: Clue 3 (High Head Pump-Turbine) -->
      <g transform="translate(30, 240)">
        <rect width="480" height="190" rx="16" fill="${c3Active ? "#381128" : "#0f172a"}" stroke="${c3Active ? "#ec4899" : "#334155"}" stroke-width="${c3Active ? 3 : 1.5}" filter="url(#shadow)"/>
        <rect x="20" y="18" width="140" height="32" rx="8" fill="${c3Active ? "#db2777" : "#334155"}"/>
        <text x="90" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 3 (10s)</text>
        ${c3Active ? `
          <text x="25" y="85" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff">Tua-bin Bơm - Cột Áp Cao ⚙️</text>
          <text x="25" y="118" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#fbcfe8">• Chuyên gia chế tạo tua-bin tích năng cột nước > 500m</text>
          <text x="25" y="148" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#fbcfe8">• Cung cấp thiết bị cho các siêu dự án thế giới</text>
        ` : `
          <text x="240" y="115" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="26" fill="#475569" text-anchor="middle">🔒 ĐANG KHÓA (10s)</text>
        `}
      </g>

      <!-- Quadrant 4: Clue 4 (Bac Ai Winner) -->
      <g transform="translate(560, 240)">
        <rect width="480" height="190" rx="16" fill="${c4Active ? "#362208" : "#0f172a"}" stroke="${c4Active ? "#eab308" : "#334155"}" stroke-width="${c4Active ? 3.5 : 1.5}" filter="url(#shadow)"/>
        <rect x="20" y="18" width="140" height="32" rx="8" fill="${c4Active ? "#ca8a04" : "#334155"}"/>
        <text x="90" y="40" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 4 (15s)</text>
        ${c4Active ? `
          <text x="25" y="85" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#fef08a">Trúng thầu Gói 01TB-BA Bác Ái 🏆</text>
          <text x="25" y="118" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#fef9c3">• Đứng đầu Liên danh trúng thầu 4.462,603 tỷ đồng</text>
          <text x="25" y="148" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15" fill="#fef9c3">• Cung cấp toàn bộ 4 tổ máy Tua-bin Bơm 1.200 MW</text>
        ` : `
          <text x="240" y="115" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="26" fill="#475569" text-anchor="middle">🔒 ĐANG KHÓA (15s)</text>
        `}
      </g>

      <!-- Center Logo Silhouette / Question Badge -->
      <g transform="translate(500, 205)">
        <circle cx="50" cy="50" r="42" fill="#0b1329" stroke="url(#goldGrad)" stroke-width="3" filter="url(#glow)"/>
        <text x="50" y="62" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="36" fill="url(#goldGrad)" text-anchor="middle">?</text>
      </g>
    </g>
    `
  );
}

// ── 3. bac_ai_tt_cau3.png (Sắp xếp 2 - 1 - 4 - 3) ───────────────────────────
const tt3Svg = svgWrapper(
  "TĂNG TỐC · CÂU 3 (SẮP XẾP THEO TRÌNH TỰ THỜI GIAN)",
  "SẮP XẾP CÁC MỐC THỜI GIAN ĐẤU THẦU GÓI 01TB-BA THEO TRÌNH TỰ TỪ TRƯỚC ĐẾN SAU",
  `
  <g transform="translate(100, 130)">
    <!-- Subtitle instruction -->
    <rect x="40" y="10" width="1000" height="50" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <text x="540" y="42" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="16" fill="#fde047" text-anchor="middle">
      HÃY SẮP XẾP 4 MỐC THỜI GIAN SAU THEO THỨ TỰ DIỄN RA TỪ TRƯỚC ĐẾN SAU:
    </text>

    <!-- 4 Clear Numbered Cards -->
    <g transform="translate(40, 80)">
      <!-- Box 1 -->
      <g transform="translate(0, 0)">
        <rect width="480" height="180" rx="16" fill="#0f172a" stroke="#38bdf8" stroke-width="3" filter="url(#shadow)"/>
        <circle cx="55" cy="50" r="28" fill="#0284c7"/>
        <text x="55" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">1</text>
        <text x="105" y="55" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#38bdf8">ĐÓNG & MỞ THẦU CÔNG KHAI</text>
        
        <rect x="35" y="90" width="410" height="65" rx="10" fill="#0284c7" opacity="0.2"/>
        <text x="240" y="132" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          23 / 02 / 2026
        </text>
      </g>

      <!-- Box 2 -->
      <g transform="translate(520, 0)">
        <rect width="480" height="180" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="3" filter="url(#shadow)"/>
        <circle cx="55" cy="50" r="28" fill="#d97706"/>
        <text x="55" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">2</text>
        <text x="105" y="55" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#f59e0b">PHÁT HÀNH HỒ SƠ MỜI THẦU</text>
        
        <rect x="35" y="90" width="410" height="65" rx="10" fill="#d97706" opacity="0.2"/>
        <text x="240" y="132" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          15 / 10 / 2025
        </text>
      </g>

      <!-- Box 3 -->
      <g transform="translate(0, 210)">
        <rect width="480" height="180" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="3" filter="url(#shadow)"/>
        <circle cx="55" cy="50" r="28" fill="#059669"/>
        <text x="55" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">3</text>
        <text x="105" y="55" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#10b981">CHÍNH THỨC KÝ HỢP ĐỒNG</text>
        
        <rect x="35" y="90" width="410" height="65" rx="10" fill="#059669" opacity="0.2"/>
        <text x="240" y="132" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          26 / 10 / 2026
        </text>
      </g>

      <!-- Box 4 -->
      <g transform="translate(520, 210)">
        <rect width="480" height="180" rx="16" fill="#0f172a" stroke="#ec4899" stroke-width="3" filter="url(#shadow)"/>
        <circle cx="55" cy="50" r="28" fill="#db2777"/>
        <text x="55" y="60" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">4</text>
        <text x="105" y="55" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="20" fill="#ec4899">PHÊ DUYỆT KẾT QUẢ TRÚNG THẦU</text>
        
        <rect x="35" y="90" width="410" height="65" rx="10" fill="#db2777" opacity="0.2"/>
        <text x="240" y="132" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          21 / 10 / 2026
        </text>
      </g>
    </g>

    <!-- Bottom Instruction Guide -->
    <g transform="translate(260, 485)">
      <rect width="560" height="36" rx="10" fill="#0284c7" opacity="0.3" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="280" y="24" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="14" fill="#38bdf8" text-anchor="middle">
        Nhập đáp án gồm 4 chữ số viết liền (ví dụ: 1234) hoặc ngăn cách bằng gạch nối
      </text>
    </g>
  </g>
  `
);

// ── 4. bac_ai_tt_cau4.png (Tua-bin bơm / Pump-Turbine) ──────────────────────
const tt4Svg = svgWrapper(
  "TĂNG TỐC · CÂU 4 (NHẬN DIỆN THIẾT BỊ / VIDEO)",
  "THIẾT BỊ CƠ ĐIỆN CHÍNH GÓI THẦU 01TB-BA · NHÀ MÁY THỦY ĐIỆN TÍCH NĂNG BÁC ÁI",
  `
  <g transform="translate(90, 120)">
    <!-- Main Left Technical Diagram Card -->
    <rect x="20" y="10" width="680" height="510" rx="18" fill="#0a1226" stroke="#38bdf8" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Schematic Diagram of Reversible Pump-Turbine -->
    <g transform="translate(60, 35)">
      <!-- Outer Spiral Casing (Vỏ xoắn ốc) -->
      <path d="M 120 220 C 120 100, 320 60, 440 120 C 540 170, 560 300, 480 380 C 400 440, 240 440, 170 380 L 70 410 L 70 330 L 140 330" 
            fill="#0f2347" stroke="#38bdf8" stroke-width="6" stroke-linejoin="round"/>
      <text x="500" y="130" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="12" fill="#7dd3fc">VỎ XOẮN ỐC (SPIRAL CASING)</text>

      <!-- Center Shaft (Trục máy) -->
      <rect x="285" y="20" width="30" height="150" fill="#94a3b8" stroke="#ffffff" stroke-width="2"/>
      <text x="300" y="15" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="11" fill="#cbd5e1" text-anchor="middle">TRỤC NỐI MÁY PHÁT</text>

      <!-- Runner Chamber & Rotor Blades (Cánh bánh xe công tác) -->
      <circle cx="300" cy="250" r="110" fill="#0369a1" stroke="#e0f2fe" stroke-width="4"/>
      
      <!-- Impeller Blades -->
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
        <path d="M 300 250 Q ${300 + Math.cos(deg * Math.PI / 180) * 80 + 20} ${250 + Math.sin(deg * Math.PI / 180) * 80} ${300 + Math.cos((deg + 30) * Math.PI / 180) * 105} ${250 + Math.sin((deg + 30) * Math.PI / 180) * 105}" 
              stroke="#facc15" stroke-width="5" fill="none" stroke-linecap="round"/>
      `).join("")}

      <!-- Center Hub -->
      <circle cx="300" cy="250" r="35" fill="#f59e0b" stroke="#ffffff" stroke-width="3"/>
      <circle cx="300" cy="250" r="12" fill="#ffffff"/>

      <!-- Water Flow Direction Arrows (Reversible Dual-Mode) -->
      <g stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M 230 180 A 90 90 0 0 1 370 180" marker-end="url(#arrow)"/>
        <text x="300" y="210" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="12" fill="#4ade80" text-anchor="middle">CHẾ ĐỘ PHÁT ĐIỆN ➔</text>
      </g>
      <g stroke="#f43f5e" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M 370 320 A 90 90 0 0 1 230 320" marker-end="url(#arrow)"/>
        <text x="300" y="310" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="12" fill="#fb7185" text-anchor="middle">⬅ CHẾ ĐỘ BƠM NƯỚC</text>
      </g>

      <!-- Draft Tube (Ống hút xả) -->
      <path d="M 240 360 L 220 440 L 380 440 L 360 360 Z" fill="#0c4a6e" stroke="#38bdf8" stroke-width="3"/>
      <text x="300" y="420" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="13" fill="#bae6fd" text-anchor="middle">ỐNG XẢ / HÚT NƯỚC (DRAFT TUBE)</text>
    </g>

    <!-- Right Side Information & Clue Card -->
    <g transform="translate(720, 10)">
      <rect width="360" height="510" rx="18" fill="#0f172a" stroke="#eab308" stroke-width="2.5" filter="url(#shadow)"/>
      
      <!-- Top Badge -->
      <rect x="25" y="24" width="310" height="42" rx="10" fill="#854d0e"/>
      <text x="180" y="51" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="16" fill="#fef08a" text-anchor="middle">
        CÂU HỎI NHẬN DIỆN THIẾT BỊ
      </text>

      <text x="180" y="100" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">
        ĐÂY LÀ THIẾT BỊ GÌ?
      </text>

      <!-- Key Specifications List -->
      <g transform="translate(25, 125)">
        <rect width="310" height="70" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="28" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="12" fill="#38bdf8">TÍNH NĂNG ĐẶC THÙ</text>
        <text x="20" y="52" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="15" fill="#f8fafc">Thuận nghịch (2 chiều quay)</text>
      </g>

      <g transform="translate(25, 205)">
        <rect width="310" height="70" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="28" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="12" fill="#38bdf8">CÔNG SUẤT ĐỊNH MỨC</text>
        <text x="20" y="52" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="15" fill="#f8fafc">4 tổ máy × 300 MW = 1.200 MW</text>
      </g>

      <g transform="translate(25, 285)">
        <rect width="310" height="70" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="28" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="12" fill="#38bdf8">NGUYÊN LÝ HOẠT ĐỘNG</text>
        <text x="20" y="50" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#cbd5e1">• Giờ thấp điểm: Hoạt động như BƠM</text>
        <text x="20" y="66" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="13" fill="#cbd5e1">• Giờ cao điểm: Quay như TUA-BIN</text>
      </g>

      <!-- Big Mystery Answer Box -->
      <g transform="translate(25, 375)">
        <rect width="310" height="105" rx="16" fill="#111827" stroke="url(#goldGrad)" stroke-width="3" filter="url(#glow)"/>
        <text x="155" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="12" fill="#fef08a" text-anchor="middle" letter-spacing="1">
          TỪ KHÓA ĐÁP ÁN (10 CHỮ CÁI)
        </text>
        <text x="155" y="72" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle" letter-spacing="4">
          TUA-BIN BƠM
        </text>
        <text x="155" y="94" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="11" fill="#93c5fd" text-anchor="middle">
          (Pump-Turbine / Tua-bin Thủy Lực)
        </text>
      </g>
    </g>
  </g>
  `
);

const tasks = [
  { name: "bac_ai_tt_cau1.png", svg: tt1Svg },
  { name: "bac_ai_tt_cau2.png", svg: makeTt2Svg(4) },
  { name: "bac_ai_tt_cau2_clue1.png", svg: makeTt2Svg(1) },
  { name: "bac_ai_tt_cau2_clue2.png", svg: makeTt2Svg(2) },
  { name: "bac_ai_tt_cau2_clue3.png", svg: makeTt2Svg(3) },
  { name: "bac_ai_tt_cau2_clue4.png", svg: makeTt2Svg(4) },
  { name: "bac_ai_tt_cau3.png", svg: tt3Svg },
  { name: "bac_ai_tt_cau4.png", svg: tt4Svg },
];

async function run() {
  console.log("Generating broadcast graphic images for Tang Toc...");
  for (const t of tasks) {
    const outPath = path.join(mediaDir, t.name);
    await sharp(Buffer.from(t.svg)).png().toFile(outPath);
    console.log("Generated:", t.name);
  }
  console.log("All Tang Toc media images successfully generated!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
