const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const mediaDir = path.join(__dirname, "../public/olympia/media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Helper to create an SVG card with VTV3 broadcast style
function svgWrapper(title, subtitle, contentSvg) {
    const safeTitle = title.toUpperCase().replace(/&/g, "&amp;");
    const safeSubtitle = subtitle.replace(/&/g, "&amp;");
    const safeContent = contentSvg.replace(/&(?!(amp|lt|gt|quot|apos);)/gi, "&amp;");
  return `
  <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a1128"/>
        <stop offset="40%" stop-color="#001f54"/>
        <stop offset="80%" stop-color="#034078"/>
        <stop offset="100%" stop-color="#1282a2"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#ca8a04"/>
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0.98"/>
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="50%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="1280" height="720" fill="url(#bgGrad)"/>

    <!-- Subtle Tech Grid Lines -->
    <g opacity="0.08" stroke="#ffffff" stroke-width="1">
      ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="720"/>`).join("")}
      ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 90}" x2="1280" y2="${i * 90}"/>`).join("")}
    </g>

    <!-- Top Gold Brass Bar Header -->
    <rect x="140" y="24" width="1000" height="64" rx="16" fill="#0f172a" stroke="url(#goldGrad)" stroke-width="3" filter="url(#shadow)"/>
    <text x="640" y="54" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="2">
      ${safeTitle}
    </text>
    <text x="640" y="74" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="13" fill="#94a3b8" text-anchor="middle" letter-spacing="1">
      ${safeSubtitle}
    </text>

    <!-- Main Content Stage Area -->
    <rect x="80" y="106" width="1120" height="570" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="2" filter="url(#shadow)"/>

    <!-- Inner Content -->
    ${safeContent}

    <!-- Bottom Left Tag -->
    <rect x="100" y="636" width="220" height="26" rx="6" fill="#0284c7" opacity="0.9"/>
    <text x="210" y="654" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      OLYMPIA 26 · NHÓM 9
    </text>
  </svg>
  `;
}

// 1. bac_ai_cnv_mystery.png
const cnvSvg = svgWrapper(
  "VƯỢT CHƯỚNG NGẠI VẬT — NGUYÊN LÝ NẠP XẢ",
  "DỰ ÁN NHÀ MÁY THỦY ĐIỆN TÍCH NĂNG BÁC ÁI · CÔNG SUẤT 1.200 MW",
  `
  <!-- Diagram: Upper Reservoir -->
  <g transform="translate(120, 140)">
    <rect width="280" height="150" rx="16" fill="#0369a1" stroke="#38bdf8" stroke-width="3"/>
    <text x="140" y="40" font-family="Arial" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle">HỒ TRÊN (HỒ SÔNG SẮT)</text>
    <text x="140" y="70" font-family="Arial" font-weight="700" font-size="14" fill="#bae6fd" text-anchor="middle">Cao trình tích nước: +700m</text>
    <text x="140" y="100" font-family="Arial" font-weight="700" font-size="13" fill="#e0f2fe" text-anchor="middle">Dung tích hữu ích: ~10 triệu m³</text>
    <rect x="20" y="115" width="240" height="20" rx="6" fill="#0284c7"/>
    <text x="140" y="129" font-family="Arial" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle">NGUỒN NĂNG LƯỢNG TÍCH LŨY</text>
  </g>

  <!-- Pipe / Pressure Shaft Tunnel -->
  <g transform="translate(420, 210)">
    <path d="M 0 0 L 240 70" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/>
    <path d="M 0 0 L 240 70" stroke="#fbbf24" stroke-width="6" stroke-dasharray="12,8"/>
    <rect x="50" y="10" width="160" height="30" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="130" y="30" font-family="Arial" font-weight="800" font-size="12" fill="#fbbf24" text-anchor="middle">ĐƯỜNG HẦM ÁP LỰC</text>
  </g>

  <!-- Diagram: Underground Powerhouse -->
  <g transform="translate(680, 240)">
    <rect width="320" height="180" rx="16" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/>
    <text x="160" y="35" font-family="Arial" font-weight="900" font-size="18" fill="#a5b4fc" text-anchor="middle">NHÀ MÁY NGẦM (4 TỔ MÁY)</text>
    <text x="160" y="65" font-family="Arial" font-weight="700" font-size="14" fill="#ffffff" text-anchor="middle">Tua-bin Thuận Nghịch (Voith Hydro)</text>
    <text x="160" y="90" font-family="Arial" font-weight="700" font-size="13" fill="#c7d2fe" text-anchor="middle">4 x 300 MW = 1.200 MW</text>
    
    <!-- Mode 1: Phát điện / Xả -->
    <rect x="15" y="110" width="138" height="50" rx="10" fill="#065f46" stroke="#34d399" stroke-width="2"/>
    <text x="84" y="130" font-family="Arial" font-weight="900" font-size="12" fill="#a7f3d0" text-anchor="middle">GIỜ CAO ĐIỂM</text>
    <text x="84" y="148" font-family="Arial" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle">XẢ PHÁT ĐIỆN</text>

    <!-- Mode 2: Nạp / Bơm -->
    <rect x="167" y="110" width="138" height="50" rx="10" fill="#991b1b" stroke="#f87171" stroke-width="2"/>
    <text x="236" y="130" font-family="Arial" font-weight="900" font-size="12" fill="#fecaca" text-anchor="middle">GIỜ THẤP ĐIỂM</text>
    <text x="236" y="148" font-family="Arial" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle">BƠM (NẠP ĐIỆN)</text>
  </g>

  <!-- Pipe from Powerhouse to Lower Reservoir -->
  <g transform="translate(680, 440)">
    <path d="M 0 0 L -220 50" stroke="#38bdf8" stroke-width="14" stroke-linecap="round"/>
    <path d="M 0 0 L -220 50" stroke="#7dd3fc" stroke-width="6" stroke-dasharray="12,8"/>
  </g>

  <!-- Diagram: Lower Reservoir -->
  <g transform="translate(180, 440)">
    <rect width="280" height="140" rx="16" fill="#075985" stroke="#38bdf8" stroke-width="3"/>
    <text x="140" y="40" font-family="Arial" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle">HỒ DƯỚI (HỒ CÁI)</text>
    <text x="140" y="70" font-family="Arial" font-weight="700" font-size="14" fill="#bae6fd" text-anchor="middle">Cao trình: +170m</text>
    <text x="140" y="100" font-family="Arial" font-weight="700" font-size="13" fill="#e0f2fe" text-anchor="middle">Dung tích: ~219 triệu m³ nước</text>
  </g>

  <!-- Bottom Core Keyword Banner -->
  <g transform="translate(520, 500)">
    <rect width="520" height="80" rx="18" fill="#1e293b" stroke="#eab308" stroke-width="3" filter="url(#glow)"/>
    <text x="260" y="34" font-family="Arial" font-weight="800" font-size="13" fill="#fef08a" text-anchor="middle" letter-spacing="1">TỪ KHÓA CHƯỚNG NGẠI VẬT (5 CHỮ CÁI)</text>
    <text x="260" y="66" font-family="Arial" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle" letter-spacing="8">N Ạ P   X Ả</text>
  </g>
  `
);

// 2. bac_ai_tt_cau1.png (Đấu thầu quốc tế)
const tt1Svg = svgWrapper(
  "TĂNG TỐC · CÂU 1 (IQ & NHẬN DIỆN)",
  "HÌNH THỨC LỰA CHỌN NHÀ THẦU CÓ SỰ THAM GIA CỦA NHÀ THẦU NƯỚC NGOÀI",
  `
  <g transform="translate(140, 150)">
    <!-- Option A -->
    <rect x="0" y="0" width="460" height="190" rx="16" fill="#064e3b" stroke="#10b981" stroke-width="3"/>
    <circle cx="50" cy="50" r="26" fill="#10b981"/>
    <text x="50" y="58" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">A</text>
    <text x="96" y="56" font-family="Arial" font-weight="900" font-size="22" fill="#34d399">ĐẤU THẦU QUỐC TẾ</text>
    <text x="30" y="110" font-family="Arial" font-weight="700" font-size="14" fill="#ffffff">• Nhà thầu nước ngoài và trong nước cùng tham dự</text>
    <text x="30" y="140" font-family="Arial" font-weight="700" font-size="14" fill="#a7f3d0">• Áp dụng cho các gói thầu công nghệ cao phức tạp</text>
    <rect x="28" y="154" width="220" height="22" rx="6" fill="#047857"/>
    <text x="138" y="169" font-family="Arial" font-weight="800" font-size="11" fill="#ecfdf5" text-anchor="middle">GÓI THẦU 01TB-BA</text>

    <!-- Option B -->
    <rect x="540" y="0" width="460" height="190" rx="16" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <circle cx="590" cy="50" r="26" fill="#475569"/>
    <text x="590" y="58" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">B</text>
    <text x="636" y="56" font-family="Arial" font-weight="900" font-size="22" fill="#cbd5e1">ĐẤU THẦU HẠN CHẾ</text>
    <text x="570" y="110" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Chỉ các nhà thầu đáp ứng kỹ thuật được mời</text>
    <text x="570" y="140" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Tối thiểu 03 nhà thầu có năng lực</text>

    <!-- Option C -->
    <rect x="0" y="230" width="460" height="190" rx="16" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <circle cx="50" cy="280" r="26" fill="#475569"/>
    <text x="50" y="288" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">C</text>
    <text x="96" y="286" font-family="Arial" font-weight="900" font-size="22" fill="#cbd5e1">CHỈ ĐỊNH THẦU</text>
    <text x="30" y="340" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Cấp bách: thiên tai, dịch bệnh, quốc phòng</text>
    <text x="30" y="370" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Phải có quyết định phê duyệt nghiêm ngặt</text>

    <!-- Option D -->
    <rect x="540" y="230" width="460" height="190" rx="16" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <circle cx="590" cy="280" r="26" fill="#475569"/>
    <text x="590" y="288" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">D</text>
    <text x="636" y="286" font-family="Arial" font-weight="900" font-size="22" fill="#cbd5e1">CHÀO HÀNG CẠNH TRANH</text>
    <text x="570" y="340" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Hàng hóa thông dụng, sẵn có trên thị trường</text>
    <text x="570" y="370" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Tiêu chuẩn kỹ thuật đã được chuẩn hóa</text>
  </g>
  `
);

// 3. bac_ai_tt_cau2.png (Voith Hydro)
const tt2Svg = svgWrapper(
  "TĂNG TỐC · CÂU 2 (DỮ KIỆN TỔNG HỢP)",
  "HÃY XÁC ĐỊNH ĐÂY LÀ TÊN TẬP ĐOÀN CƠ KHÍ NĂNG LƯỢNG NÀO?",
  `
  <g transform="translate(130, 140)">
    <!-- Clue 1 -->
    <rect x="0" y="0" width="480" height="180" rx="16" fill="#1e293b" stroke="#3b82f6" stroke-width="2.5"/>
    <rect x="20" y="20" width="120" height="32" rx="8" fill="#1d4ed8"/>
    <text x="80" y="42" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 1</text>
    <text x="20" y="85" font-family="Arial" font-weight="800" font-size="18" fill="#ffffff">Tập đoàn cơ khí CHLB Đức</text>
    <text x="20" y="115" font-family="Arial" font-weight="700" font-size="14" fill="#93c5fd">• Thành lập năm 1867 tại Heidenheim</text>
    <text x="20" y="145" font-family="Arial" font-weight="700" font-size="14" fill="#93c5fd">• Hơn 150 năm kinh nghiệm thủy điện</text>

    <!-- Clue 2 -->
    <rect x="530" y="0" width="480" height="180" rx="16" fill="#1e293b" stroke="#8b5cf6" stroke-width="2.5"/>
    <rect x="550" y="20" width="120" height="32" rx="8" fill="#6d28d9"/>
    <text x="610" y="42" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 2</text>
    <text x="550" y="85" font-family="Arial" font-weight="800" font-size="18" fill="#ffffff">Nhà máy chế tạo Thượng Hải</text>
    <text x="550" y="115" font-family="Arial" font-weight="700" font-size="14" fill="#c4b5fd">• Trung tâm thiết bị thủy điện lớn nhất Châu Á</text>
    <text x="550" y="145" font-family="Arial" font-weight="700" font-size="14" fill="#c4b5fd">• Năng lực đúc cánh tua-bin nguyên khối</text>

    <!-- Clue 3 -->
    <rect x="0" y="210" width="480" height="180" rx="16" fill="#1e293b" stroke="#ec4899" stroke-width="2.5"/>
    <rect x="20" y="230" width="120" height="32" rx="8" fill="#be185d"/>
    <text x="80" y="252" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 3</text>
    <text x="20" y="295" font-family="Arial" font-weight="800" font-size="18" fill="#ffffff">Tua-bin Bơm - Phát Cột Áp Cao</text>
    <text x="20" y="325" font-family="Arial" font-weight="700" font-size="14" fill="#f472b6">• Thiết kế cánh bơm đảo chiều kép tiên tiến</text>
    <text x="20" y="355" font-family="Arial" font-weight="700" font-size="14" fill="#f472b6">• Cột nước tính toán cực hạn > 500 mét</text>

    <!-- Clue 4 -->
    <rect x="530" y="210" width="480" height="180" rx="16" fill="#1e293b" stroke="#eab308" stroke-width="2.5"/>
    <rect x="550" y="230" width="120" height="32" rx="8" fill="#b45309"/>
    <text x="610" y="252" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 4</text>
    <text x="550" y="295" font-family="Arial" font-weight="800" font-size="18" fill="#fef08a">Đứng đầu Liên danh trúng thầu</text>
    <text x="550" y="325" font-family="Arial" font-weight="700" font-size="14" fill="#fde047">• Gói thầu số 01TB-BA Thủy điện Bác Ái</text>
    <text x="550" y="355" font-family="Arial" font-weight="700" font-size="14" fill="#fde047">• Giá trị trúng thầu: 4.462,603 tỷ đồng</text>
  </g>
  `
);

// 4. bac_ai_tt_cau3.png (Sắp xếp mốc thời gian 2-1-4-3)
const tt3Svg = svgWrapper(
  "TĂNG TỐC · CÂU 3 (SẮP XẾP QUY TRÌNH THỜI GIAN)",
  "HÃY SẮP XẾP CÁC MỐC THỜI GIAN ĐẤU THẦU GÓI 01TB-BA THEO TRÌNH TỰ THỰC TẾ",
  `
  <g transform="translate(140, 150)">
    <!-- Box 1 -->
    <rect x="0" y="0" width="470" height="190" rx="16" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="50" cy="50" r="26" fill="#0284c7"/>
    <text x="50" y="58" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">1</text>
    <text x="96" y="56" font-family="Arial" font-weight="900" font-size="20" fill="#38bdf8">ĐÓNG & MỞ THẦU CÔNG KHAI</text>
    <text x="30" y="115" font-family="Arial" font-weight="800" font-size="24" fill="#ffffff">23 / 02 / 2026</text>
    <text x="30" y="150" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Mở túi hồ sơ đề xuất kỹ thuật quốc tế</text>

    <!-- Box 2 -->
    <rect x="520" y="0" width="470" height="190" rx="16" fill="#1e293b" stroke="#f59e0b" stroke-width="3"/>
    <circle cx="570" cy="50" r="26" fill="#d97706"/>
    <text x="570" y="58" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">2</text>
    <text x="616" y="56" font-family="Arial" font-weight="900" font-size="20" fill="#f59e0b">PHÁT HÀNH HỒ SƠ MỜI THẦU</text>
    <text x="550" y="115" font-family="Arial" font-weight="800" font-size="24" fill="#ffffff">15 / 10 / 2025</text>
    <text x="550" y="150" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Đăng tải công khai Hệ thống mạng đấu thầu</text>

    <!-- Box 3 -->
    <rect x="0" y="230" width="470" height="190" rx="16" fill="#1e293b" stroke="#10b981" stroke-width="3"/>
    <circle cx="50" cy="280" r="26" fill="#059669"/>
    <text x="50" y="288" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">3</text>
    <text x="96" y="286" font-family="Arial" font-weight="900" font-size="20" fill="#10b981">CHÍNH THỨC KÝ HỢP ĐỒNG</text>
    <text x="30" y="345" font-family="Arial" font-weight="800" font-size="24" fill="#ffffff">26 / 10 / 2026</text>
    <text x="30" y="380" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• EVN & Liên danh Voith Hydro ký kết FIDIC</text>

    <!-- Box 4 -->
    <rect x="520" y="230" width="470" height="190" rx="16" fill="#1e293b" stroke="#ec4899" stroke-width="3"/>
    <circle cx="570" cy="280" r="26" fill="#db2777"/>
    <text x="570" y="288" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">4</text>
    <text x="616" y="286" font-family="Arial" font-weight="900" font-size="20" fill="#ec4899">PHÊ DUYỆT KẾT QUẢ TRÚNG THẦU</text>
    <text x="550" y="345" font-family="Arial" font-weight="800" font-size="24" fill="#ffffff">21 / 10 / 2026</text>
    <text x="550" y="380" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Quyết định số 1289/QĐ-EVN của HĐTV</text>
  </g>
  `
);

// 5. bac_ai_tt_cau4.png (Tiết kiệm thầu 85,478 tỷ)
const tt4Svg = svgWrapper(
  "TĂNG TỐC · CÂU 4 (BÀI TOÁN TÍNH TOÁN KINH TẾ)",
  "GÓI THẦU 01TB-BA · CUNG CẤP THIẾT BỊ CƠ ĐIỆN VÀ DỊCH VỤ KỸ THUẬT",
  `
  <g transform="translate(140, 150)">
    <!-- Column 1: Dự toán gói thầu -->
    <rect x="40" y="40" width="380" height="380" rx="18" fill="#1e293b" stroke="#60a5fa" stroke-width="3"/>
    <rect x="70" y="65" width="320" height="40" rx="10" fill="#1e3a8a"/>
    <text x="230" y="92" font-family="Arial" font-weight="900" font-size="16" fill="#93c5fd" text-anchor="middle">GIÁ DỰ TOÁN GÓI THẦU</text>
    <text x="230" y="210" font-family="Arial" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">4.548,081</text>
    <text x="230" y="260" font-family="Arial" font-weight="800" font-size="20" fill="#60a5fa" text-anchor="middle">TỶ ĐỒNG</text>
    <text x="230" y="350" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8" text-anchor="middle">Căn cứ Quyết định duyệt dự toán của EVN</text>

    <!-- Subtract Sign -->
    <circle cx="500" cy="230" r="32" fill="#ef4444"/>
    <text x="500" y="244" font-family="Arial" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">−</text>

    <!-- Column 2: Giá trúng thầu -->
    <rect x="580" y="40" width="380" height="380" rx="18" fill="#1e293b" stroke="#34d399" stroke-width="3"/>
    <rect x="610" y="65" width="320" height="40" rx="10" fill="#064e3b"/>
    <text x="770" y="92" font-family="Arial" font-weight="900" font-size="16" fill="#6ee7b7" text-anchor="middle">GIÁ TRÚNG THẦU LIÊN DANH</text>
    <text x="770" y="210" font-family="Arial" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">4.462,603</text>
    <text x="770" y="260" font-family="Arial" font-weight="800" font-size="20" fill="#34d399" text-anchor="middle">TỶ ĐỒNG</text>
    <text x="770" y="350" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8" text-anchor="middle">Liên danh Voith Hydro - Powerchina</text>
  </g>
  `
);

// 6. bac_ai_tt_dp_cau1.png (Quy trình 7 bước)
const ttDp1Svg = svgWrapper(
  "TĂNG TỐC (DỰ PHÒNG 1) · QUY TRÌNH 7 BƯỚC CHUẨN",
  "THEO LUẬT ĐẤU THẦU SỐ 90/2025/QH15 — QUY TRÌNH CHUẨN GỒM BAO NHIÊU BƯỚC?",
  `
  <g transform="translate(100, 160)">
    <rect width="1080" height="440" rx="18" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
    ${[
      "BƯỚC 1: Chuẩn bị lựa chọn nhà thầu (Lập, thẩm định, phê duyệt HSMT)",
      "BƯỚC 2: Tổ chức lựa chọn nhà thầu (Phát hành, sửa đổi, làm rõ HSMT)",
      "BƯỚC 3: Đóng thầu & Mở thầu công khai trên Hệ thống mạng",
      "BƯỚC 4: Đánh giá HSDT (Đánh giá tính hợp lệ, năng lực, kỹ thuật, giá)",
      "BƯỚC 5: Thương thảo hợp đồng (Đối với gói thầu áp dụng theo luật)",
      "BƯỚC 6: Trình, thẩm định, phê duyệt và công khai KQLNT",
      "BƯỚC 7: Hoàn thiện, ký kết và quản lý thực hiện hợp đồng",
    ]
      .map(
        (step, i) => `
        <rect x="30" y="${20 + i * 58}" width="1020" height="46" rx="10" fill="${i % 2 === 0 ? "#0f172a" : "#1e293b"}" stroke="#334155" stroke-width="1.5"/>
        <circle cx="65" cy="${43 + i * 58}" r="16" fill="#3b82f6"/>
        <text x="65" y="${48 + i * 58}" font-family="Arial" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle">${i + 1}</text>
        <text x="96" y="${49 + i * 58}" font-family="Arial" font-weight="700" font-size="15" fill="#f8fafc">${step}</text>
      `
      )
      .join("")}
  </g>
  `
);

// 7. bac_ai_tt_dp_cau2.png (Thủy điện Bác Ái)
const ttDp2Svg = svgWrapper(
  "TĂNG TỐC (DỰ PHÒNG 2) · NHẬN DIỆN CÔNG TRÌNH",
  "ĐÂY LÀ DỰ ÁN THỦY ĐIỆN TÍCH NĂNG ĐẦU TIÊN CỦA VIỆT NAM?",
  `
  <g transform="translate(130, 140)">
    <rect x="0" y="0" width="480" height="180" rx="16" fill="#1e293b" stroke="#3b82f6" stroke-width="2.5"/>
    <rect x="20" y="20" width="120" height="32" rx="8" fill="#1d4ed8"/>
    <text x="80" y="42" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 1</text>
    <text x="20" y="85" font-family="Arial" font-weight="800" font-size="18" fill="#ffffff">Địa bàn tỉnh Khánh Hòa</text>
    <text x="20" y="115" font-family="Arial" font-weight="700" font-size="14" fill="#93c5fd">• Huyện Bác Ái (giáp ranh Ninh Thuận & Lâm Đồng)</text>
    <text x="20" y="145" font-family="Arial" font-weight="700" font-size="14" fill="#93c5fd">• Địa hình núi cao lý tưởng cho thủy điện tích năng</text>

    <rect x="530" y="0" width="480" height="180" rx="16" fill="#1e293b" stroke="#8b5cf6" stroke-width="2.5"/>
    <rect x="550" y="20" width="120" height="32" rx="8" fill="#6d28d9"/>
    <text x="610" y="42" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 2</text>
    <text x="550" y="85" font-family="Arial" font-weight="800" font-size="18" fill="#ffffff">Tổng mức đầu tư 21.101 tỷ đồng</text>
    <text x="550" y="115" font-family="Arial" font-weight="700" font-size="14" fill="#c4b5fd">• Công trình năng lượng cấp đặc biệt quốc gia</text>
    <text x="550" y="145" font-family="Arial" font-weight="700" font-size="14" fill="#c4b5fd">• Do Tập đoàn Điện lực Việt Nam (EVN) làm chủ đầu tư</text>

    <rect x="0" y="210" width="480" height="180" rx="16" fill="#1e293b" stroke="#ec4899" stroke-width="2.5"/>
    <rect x="20" y="230" width="120" height="32" rx="8" fill="#be185d"/>
    <text x="80" y="252" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 3</text>
    <text x="20" y="295" font-family="Arial" font-weight="800" font-size="18" fill="#ffffff">Tổng công suất 1.200 MW</text>
    <text x="20" y="325" font-family="Arial" font-weight="700" font-size="14" fill="#f472b6">• Gồm 4 tổ máy tua-bin thuận nghịch x 300 MW</text>
    <text x="20" y="355" font-family="Arial" font-weight="700" font-size="14" fill="#f472b6">• Đóng vai trò pin tích năng khổng lồ cho hệ thống</text>

    <rect x="530" y="210" width="480" height="180" rx="16" fill="#1e293b" stroke="#10b981" stroke-width="2.5"/>
    <rect x="550" y="230" width="120" height="32" rx="8" fill="#047857"/>
    <text x="610" y="252" font-family="Arial" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">DỮ KIỆN 4</text>
    <text x="550" y="295" font-family="Arial" font-weight="800" font-size="18" fill="#a7f3d0">Thủy điện tích năng đầu tiên VN</text>
    <text x="550" y="325" font-family="Arial" font-weight="700" font-size="14" fill="#6ee7b7">• Cung cấp nguồn phủ đỉnh công suất cao</text>
    <text x="550" y="355" font-family="Arial" font-weight="700" font-size="14" fill="#6ee7b7">• Hấp thụ nguồn năng lượng tái tạo gió & mặt trời</text>
  </g>
  `
);

// 8. bac_ai_tt_dp_cau3.png (Phương thức 1G2T: 3 - 2 - 1 - 4)
const ttDp3Svg = svgWrapper(
  "TĂNG TỐC (DỰ PHÒNG 3) · PHƯƠNG THỨC 1 GIAI ĐOẠN 2 TÚI HỒ SƠ",
  "SẮP XẾP THỨ TỰ CÁC BƯỚC ĐÁNH GIÁ TRONG PHƯƠNG THỨC 1G2T",
  `
  <g transform="translate(140, 150)">
    <rect x="0" y="0" width="470" height="190" rx="16" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="50" cy="50" r="26" fill="#0284c7"/>
    <text x="50" y="58" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">1</text>
    <text x="96" y="56" font-family="Arial" font-weight="900" font-size="20" fill="#38bdf8">MỞ TÚI ĐỀ XUẤT TÀI CHÍNH</text>
    <text x="30" y="115" font-family="Arial" font-weight="700" font-size="16" fill="#ffffff">Chỉ mở đối với nhà thầu đạt yêu cầu kỹ thuật</text>
    <text x="30" y="150" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Hồ sơ tài chính trước đó được niêm phong tuyệt đối</text>

    <rect x="520" y="0" width="470" height="190" rx="16" fill="#1e293b" stroke="#f59e0b" stroke-width="3"/>
    <circle cx="570" cy="50" r="26" fill="#d97706"/>
    <text x="570" y="58" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">2</text>
    <text x="616" y="56" font-family="Arial" font-weight="900" font-size="20" fill="#f59e0b">ĐÁNH GIÁ ĐỀ XUẤT KỸ THUẬT</text>
    <text x="550" y="115" font-family="Arial" font-weight="700" font-size="16" fill="#ffffff">Chấm điểm theo thang điểm 100 quy định</text>
    <text x="550" y="150" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Phải đạt tối thiểu điểm sàn kỹ thuật (≥ 80 điểm)</text>

    <rect x="0" y="230" width="470" height="190" rx="16" fill="#1e293b" stroke="#10b981" stroke-width="3"/>
    <circle cx="50" cy="280" r="26" fill="#059669"/>
    <text x="50" y="288" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">3</text>
    <text x="96" y="286" font-family="Arial" font-weight="900" font-size="20" fill="#10b981">MỞ TÚI ĐỀ XUẤT KỸ THUẬT</text>
    <text x="30" y="345" font-family="Arial" font-weight="700" font-size="16" fill="#ffffff">Mở công khai ngay tại thời điểm đóng thầu</text>
    <text x="30" y="380" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Lập và ký biên bản mở thầu kỹ thuật</text>

    <rect x="520" y="230" width="470" height="190" rx="16" fill="#1e293b" stroke="#ec4899" stroke-width="3"/>
    <circle cx="570" cy="280" r="26" fill="#db2777"/>
    <text x="570" y="288" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">4</text>
    <text x="616" y="286" font-family="Arial" font-weight="900" font-size="20" fill="#ec4899">PHÊ DUYỆT KẾT QUẢ TRÚNG THẦU</text>
    <text x="550" y="345" font-family="Arial" font-weight="700" font-size="16" fill="#ffffff">Tổng hợp điểm kỹ thuật và điểm tài chính</text>
    <text x="550" y="380" font-family="Arial" font-weight="700" font-size="14" fill="#94a3b8">• Xếp hạng thứ nhất và phê duyệt nhà thầu trúng thầu</text>
  </g>
  `
);

// 9. bac_ai_tt_dp_cau4.png (Tỷ lệ tiết kiệm 1,88%)
const ttDp4Svg = svgWrapper(
  "TĂNG TỐC (DỰ PHÒNG 4) · TỶ LỆ TIẾT KIỆM ĐẤU THẦU",
  "TÍNH TOÁN HIỆU QUẢ KINH TẾ GÓI THẦU 01TB-BA THỦY ĐIỆN BÁC ÁI",
  `
  <g transform="translate(140, 160)">
    <rect x="0" y="0" width="1000" height="400" rx="20" fill="#1e293b" stroke="#f59e0b" stroke-width="3"/>
    
    <text x="500" y="60" font-family="Arial" font-weight="900" font-size="24" fill="#fef08a" text-anchor="middle">CÔNG THỨC XÁC ĐỊNH TỶ LỆ TIẾT KIỆM QUA ĐẤU THẦU</text>

    <g transform="translate(150, 100)">
      <rect width="700" height="160" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <text x="140" y="65" font-family="Arial" font-weight="900" font-size="20" fill="#94a3b8">Tỷ lệ tiết kiệm (%) =</text>
      
      <!-- Fraction -->
      <g transform="translate(340, 30)">
        <text x="140" y="30" font-family="Arial" font-weight="900" font-size="22" fill="#34d399" text-anchor="middle">85,478 tỷ VNĐ (Tiết kiệm tuyệt đối)</text>
        <line x1="0" y1="50" x2="280" y2="50" stroke="#ffffff" stroke-width="3"/>
        <text x="140" y="80" font-family="Arial" font-weight="900" font-size="22" fill="#60a5fa" text-anchor="middle">4.548,081 tỷ VNĐ (Giá dự toán)</text>
      </g>

      <text x="640" y="70" font-family="Arial" font-weight="900" font-size="24" fill="#fef08a">× 100%</text>
    </g>

    <g transform="translate(250, 300)">
      <rect width="500" height="60" rx="14" fill="#065f46" stroke="#10b981" stroke-width="2"/>
      <text x="250" y="40" font-family="Arial" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">KẾT QUẢ: 1,88%</text>
    </g>
  </g>
  `
);

const tasks = [
  // bac_ai_cnv_mystery.png is preserved from user document Acquynuoc.png (14MB)
  // bac_ai_tt_cau1..4 are generated by generate-tangtoc-broadcast-media.cjs (clean broadcast without headers)
  { name: "bac_ai_tt_dp_cau1.png", svg: ttDp1Svg },
  { name: "bac_ai_tt_dp_cau2.png", svg: ttDp2Svg },
  { name: "bac_ai_tt_dp_cau3.png", svg: ttDp3Svg },
  { name: "bac_ai_tt_dp_cau4.png", svg: ttDp4Svg },
];

async function run() {
  console.log("Generating 9 broadcast graphic images...");
  for (const t of tasks) {
    const outPath = path.join(mediaDir, t.name);
    await sharp(Buffer.from(t.svg)).png().toFile(outPath);
    console.log("Generated:", t.name);
  }
  console.log("All media images successfully generated!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
