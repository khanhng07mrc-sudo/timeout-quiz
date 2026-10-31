# Báo Cáo Khảo Sát Kỹ Thuật: Nhận Diện Thương Hiệu, Thiết Kế Sân Khấu 3D & Tích Hợp UI Trường Quay Đường Lên Đỉnh Olympia

- **Tác giả**: `teamwork_explorer_survey_3`
- **Dự án**: Timeout Quiz (Quizorra) — Trường quay 3D Đường lên đỉnh Olympia
- **Không gian làm việc**: `d:\Timeout Quiz`
- **Thư mục phân tích**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\`
- **Thời gian lập**: 2026-10-31T01:42:00Z
- **Cột mốc**: Phase 0 (Survey & Blueprint Architecture)

---

## 1. Tóm Tắt Tổng Quan (Executive Summary)

Báo cáo này tập trung vào 4 trọng tâm kỹ thuật cốt lõi theo yêu cầu của dự án:
1. **Kiểm tra và tích hợp tệp nhận diện thương hiệu** `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` (kiểm tra định dạng, kích thước, kênh alpha, vị trí đặt trong thư mục `public` của Next.js và phương thức nạp qua Three.js `TextureLoader` / HTML5 Canvas).
2. **Quy hoạch chi tiết bố cục không gian trường quay 3D (3D Staging Layout)** cho Đường lên đỉnh Olympia:
   - Màn hình LED trung tâm kích thước lớn (tỉ lệ 16:9, khung titanium, đế đa tầng, hiển thị logo 2016 và chữ gradient vàng sáng-tối).
   - 1 bục MC độc lập, phong cách phát thanh truyền hình sang trọng.
   - 4 bục thí sinh xếp theo hình cánh cung chuẩn VTV3 với màn hình điểm LED và hệ thống chuông phản hồi ánh sáng đỏ rực rỡ.
   - Khu vực trưng bày Vòng nguyệt quế danh giá với bệ đá hoa cương mạ vàng, chụp kính pha lê và mô hình vòng nguyệt quế 3D quay chậm dưới spotlight.
3. **Kịch bản chiếu sáng đa phân vùng (Multi-zone Lighting Fading Engine)**:
   - Hệ thống chuyển đổi mượt mà giữa trạng thái Xanh dương (Base state) và Đỏ rực rỡ (Competition state).
   - Phân tầng trễ: Phân vùng 1 (Màn hình LED trung tâm) đổi màu trước; Phân vùng 2 (Hệ thống đèn hậu trường, giàn đèn trần và khán đài khán giả) đổi màu sau.
   - Đồng bộ chính xác theo luật thi đấu 4 vòng: Khởi động, Vượt chướng ngại vật (trễ 2-3s, chỉ thí sinh bấm nhanh nhất sáng đèn), Tăng tốc (trễ 2-3s), Về đích (đỏ từ khi bước lên sân khấu đến khi kết thúc lượt).
4. **Kiến trúc tích hợp giao diện người dùng (UI Integration)**:
   - Tích hợp vào `DisplayScreen.tsx` thông qua cơ chế chuyển đổi chế độ xem (View Toggle: Màn hình 2D truyền thống vs Trường quay 3D tương tác).
   - Hệ thống điều khiển camera 7 góc chuẩn TV (Director Dock) và điều khiển PTZ an toàn.
   - Đồng bộ âm thanh trực tiếp với hệ thống audio Olympia (`public/olympia-audio/`) và sound manager.

---

## 2. Kiểm Tra Tài Sản Thương Hiệu & Quy Trình Tích Hợp (Branding Asset Analysis)

### 2.1. Kết Quả Kiểm Tra File Thực Tế
Thực hiện kiểm tra trực tiếp tệp tin tại `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` với quyền đọc:
- **Đường dẫn tệp gốc**: `C:\Users\khanh\Downloads\Olympia_logo_2016.webp`
- **Dung lượng**: `77,292 bytes` (~75.48 KB)
- **Định dạng container**: RIFF WEBP Container
- **Chunk định dạng WebP**: `VP8X` (Extended WebP Format)
- **Kích thước độ phân giải (Dimensions)**: `512 x 512 pixels` (Tỉ lệ vuông 1:1 chuẩn quốc tế)
- **Kênh trong suốt (Alpha Channel)**: `hasAlpha: true` (Tệp có nền trong suốt hoàn toàn, viền lá nguyệt quế và dải lụa lửa được cắt tỉa chuẩn xác, không bị viền trắng hay nền đen bẩn)
- **Hoạt ảnh (Animation)**: `hasAnimation: false` (Ảnh tĩnh đơn khung hình)
- **Nội dung thị giác**: Đây là biểu trưng chính thức của Đường lên đỉnh Olympia từ năm thứ 16 (2016) đến nay, gồm vòng nguyệt quế vàng hoàng kim cách điệu ôm lấy ngọn lửa / đỉnh núi tri thức, biểu trưng cho vinh quang của các nhà leo núi.

### 2.2. Chiến Lược Lưu Trữ Trong Dự Án Next.js (R4 Compliance)
- **Ràng buộc an toàn R4**: Đội ngũ tuyệt đối **KHÔNG ĐƯỢC XÓA HOẶC DI CHUYỂN** tệp bên ngoài thư mục dự án `d:\Timeout Quiz`.
- **Giải pháp**: Thực hiện **SAO CHÉP (COPY ONLY)** tệp từ `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` vào thư mục tài nguyên tĩnh của Next.js:
  - **Đường dẫn đích khuyến nghị**: `d:\Timeout Quiz\public\olympia\Olympia_logo_2016.webp` (hoặc tạo alias tại `d:\Timeout Quiz\public\brand\olympia\Olympia_logo_2016.webp`).
  - Trong Next.js (App Router), mọi tệp trong thư mục `public/` được máy chủ web phục vụ tĩnh tại gốc URL: `/olympia/Olympia_logo_2016.webp`.

### 2.3. Cơ Chế Nạp Texture Trong Three.js / WebGL
Có 2 phương thức kỹ thuật để nạp và render biểu trưng này trong Three.js:

1. **Phương thức 1: Three.js `TextureLoader` trực tiếp lên Mesh 3D**:
   ```typescript
   const textureLoader = new THREE.TextureLoader();
   const logoTexture = textureLoader.load("/olympia/Olympia_logo_2016.webp", (tex) => {
     tex.colorSpace = THREE.SRGBColorSpace;
     tex.minFilter = THREE.LinearMipmapLinearFilter;
     tex.generateMipmaps = true;
     tex.anisotropy = 8;
     tex.needsUpdate = true;
   });
   ```
   *Vật liệu áp dụng*:
   ```typescript
   <meshStandardMaterial
     map={logoTexture}
     transparent={true}
     alphaTest={0.01}
     roughness={0.15}
     metalness={0.2}
     toneMapped={false}
   />
   ```

2. **Phương thức 2 (Tối ưu nhất cho Màn Hình LED Trung Tâm): Vẽ Kết Hợp Lên Canvas 2D Dynamic Texture**:
   Màn hình LED trung tâm cần kết hợp:
   - Nền không gian số Cyberspace (xanh hoặc đỏ).
   - Biểu trưng logo Olympia (512x512).
   - Dòng chữ gradient vàng sáng sang tối: **"ĐƯỜNG LÊN ĐỈNH OLYMPIA"**.
   - Hiệu ứng quét LED scanlines và bụi sáng kim tuyến.

   Việc vẽ logo và chữ gradient trực tiếp lên cùng một canvas kích thước `1920x1080` (hoặc `1024x576`) rồi bọc vào `THREE.CanvasTexture` mang lại các ưu thế vượt trội:
   - Giảm số lượng draw calls từ nhiều mesh riêng lẻ xuống đúng **1 Draw Call duy nhất**.
   - Chữ và logo được căn chỉnh tỉ lệ typography hoàn hảo, không bị hiện tượng z-fighting hay viền lem.
   - Khi đổi màu đèn (Xanh $\rightarrow$ Đỏ), toàn bộ đồ họa màn hình được chuyển đổi đồng bộ 60 FPS mà không tốn chi phí render phụ.

---

## 3. Bản Thiết Kế Bố Cục Không Gian 3D (3D Staging Layout Architecture)

Hệ tọa độ sân khấu 3D trong không gian Three.js (đơn vị: mét):
- **Trục X**: Trái (`-X`) sang Phải (`+X`) theo góc nhìn của Camera / Khán giả.
- **Trục Y**: Chiều cao thẳng đứng (`Y = 0.0m` là mặt sàn sân khấu chính; `Y = -0.75m` là mặt sàn đáy; `Y = +0.25m` là sàn bục kê cao).
- **Trục Z**: Chiều sâu sân khấu (`+Z` hướng ra phía camera/khán giả; `-Z` hướng vào màn hình LED trung tâm và hậu trường).

```
                            [ MÀN HÌNH LED TRUNG TÂM (12m x 6.75m) ]
                                    (X = 0, Z = -8.5m)
                                           ▲
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
             [ VÒNG NGUYỆT QUẾ ]                              │
             (X = -2.4m, Z = -4.8m)                           │
                        │                                     │
   [ BỤC MC ]           │     [THÍ SINH 1]  [THÍ SINH 2]  [THÍ SINH 3]  [THÍ SINH 4]
(X = -4.5m, Z = -2.0m)  │     (-1.8m,-2.8m) (0.0m,-3.1m)  (+1.8m,-2.9m) (+3.6m,-2.5m)
  rotY = +40°           │           \            │             /             /
                        └────────────► BÁN NGUYỆT SÂN KHẤU TRUNG TÂM ◄───────┘
                                                │
                                                ▼
                                    [ HÀNG GHẾ KHÁN GIẢ S14 ]
                                    (Z = +7.0m đến +14.0m)
                                                │
                                                ▼
                                    [ MAIN BROADCAST CAMERAS ]
```

### 3.1. Màn Hình LED Trung Tâm (Central LED Video Wall)

- **Vị trí và Cao độ**:
  - Tọa độ tâm màn hình: `[X = 0.0m, Y = 3.65m, Z = -8.5m]`.
  - Mép dưới màn hình bắt đầu từ cao độ `Y = 0.28m` (đặt trên bệ đỡ kiến trúc), mép trên đạt cao độ `Y = 7.03m`.
- **Kích thước và Tỉ lệ**:
  - Chiều rộng: `12.0m`.
  - Chiều cao: `6.75m`.
  - Tỉ lệ khung hình: **16:9 Widescreen Broadcast** chuẩn quốc tế.
  - Độ cong vật lý (Curvature): Tấm cong parabol nhẹ (bán kính cong $R \approx 24.0m$, độ lùi hai mép khoảng $0.45m$), tạo cảm giác ôm trọn không gian sân khấu và tăng độ sâu chiều nhìn truyền hình.
- **Khung Viền & Bệ Đỡ (Architectural Framing & Pedestal)**:
  - Khung viền Titanium xám nòng súng (Gunmetal) bản rộng 60mm, vát cạnh kim cương tinh xảo.
  - Khe chỉ LED viền trong chạy âm phát quang: Bình thường màu vàng ánh kim (`#fbbf24`), khi vào thi đấu đổi sang đỏ rực rỡ (`#ef4444`).
  - Khối bệ đa tầng (Tiered Base Pedestal):
    - Tầng dưới: Kính đen bóng obsidian `12.6m x 0.20m x 0.85m` phản chiếu ánh sáng sàn.
    - Tầng trên: Kim loại phay xước saphire `12.2m x 0.16m x 0.55m` tích hợp dải đèn LED hắt chân ấm áp.
- **Hiệu Ứng Trình Chiếu Đồ Họa (Content Projection)**:
  - **Biểu trưng Olympia 2016**: Đặt tại nửa trên trung tâm màn hình ($Y \approx 3.9m$), đường kính biểu kiến $3.4m$, có vầng hào quang phát quang (glow pulse) nhẹ theo nhịp thở 2.5s.
  - **Dòng chữ nhận diện "ĐƯỜNG LÊN ĐỈNH OLYMPIA"**:
    - Vị trí: Đặt ngay bên dưới logo Olympia tại cao độ $Y \approx 1.85m$, trải ngang $8.2m$.
    - Phông chữ: Sans-serif hình học nét đậm hiện đại (Montserrat / Plus Jakarta Sans / Oswald 900 Black), giãn cách ký tự (tracking) `0.14em`.
    - **Hiệu ứng Gradient màu vàng sáng sang tối (Yellow Gradient Light-to-Dark)**:
      - Đỉnh chữ: Vàng trắng rực rỡ, phát sáng kim cương (`#fffbeb`).
      - Thân trên chữ: Vàng chanh tươi sáng (`#fde047`).
      - Thân giữa chữ: Vàng hoàng kim hoàng gia (`#eab308`).
      - Đáy chữ: Vàng sẫm hổ phách / đồng thau cổ điển (`#92400e` đến `#78350f`).
      - Đường viền tương phản cao (High-contrast Outline): Viền đen graphite (`#0b0f19`) dày 4px và đổ bóng kép (Drop Shadow `rgba(0,0,0,0.95)`, blur 18px), đảm bảo dòng chữ nổi bật sắc nét trên mọi nền đèn xanh hoặc đỏ.
  - **Nền màn LED**:
    - Nền chuyển màu dạng tỏa tròn từ tâm xanh đậm saphire (`#0a2a66` $\rightarrow$ `#041029` $\rightarrow$ `#01040f`).
    - Lưới tọa độ không gian vi mô và các tia sáng thể tích (Volumetric Light Beams) tỏa nhẹ góc $30^\circ$.
    - Lớp scanline LED tinh tế (pitch 4px) mô phỏng chân thực từng cụm module LED P2.5 trong trường quay thật.

### 3.2. Bục Dẫn Chương Trình (MC Podium — 1 Vị Trí)

- **Vị trí và Góc xoay**:
  - Tọa độ: `[X = -4.50m, Y = 0.0m, Z = -2.00m]`.
  - Góc xoay `rotY = +0.70 rad` (khoảng $+40^\circ$), hướng chếch vào tâm sân khấu, tạo đường nhìn bao quát cả 4 thí sinh và màn hình lớn.
- **Thiết kế hình học & Vật liệu**:
  - Bục đứng dạng cột lăng trụ vát cạnh hiện đại (chiều rộng $0.58m$, chiều sâu $0.42m$, chiều cao mặt bàn $1.15m$).
  - Thân bục: Hợp kim nhôm sơn tĩnh điện xanh navy đậm (`#0c1b33`, `metalness: 0.85`, `roughness: 0.20`), ốp viền nẹp bạc chrome sáng bóng.
  - Mặt trước bục: Gắn biểu trưng "MC" bằng mica tán xạ ánh sáng, viền LED vàng kim hắt sáng sang trọng.
  - Mặt bàn nghiêng $18^\circ$: Trang bị máy tính bảng hiển thị câu hỏi cho người dẫn chương trình, thẻ kịch bản (Cue Card), và micro cổ ngỗng truyền hình mạ chrome sáng.
  - Đèn chiếu sáng chuyên dụng (MC Key Spotlight): Đèn rọi từ trần `[X = -4.5m, Y = 7.5m, Z = -1.2m]` ánh sáng trắng ấm tự nhiên 5600K rọi sáng rõ nét khuôn mặt MC.

### 3.3. Bục Thí Sinh (4 Contestant Podiums — 4 Vị Trí)

- **Bố trí tọa độ hình cánh cung (Broadcast Arc Layout)**:
  4 bục thí sinh được đánh số thứ tự từ 1 đến 4 từ trái sang phải theo góc nhìn của khán giả truyền hình:
  - **Thí sinh 1**: `[X = -1.80m, Y = 0.0m, Z = -2.80m]`, góc xoay `rotY = +0.18 rad` ($+10.3^\circ$).
  - **Thí sinh 2**: `[X =  0.00m, Y = 0.0m, Z = -3.10m]`, góc xoay `rotY =  0.00 rad` ($0^\circ$, chính diện).
  - **Thí sinh 3**: `[X = +1.80m, Y = 0.0m, Z = -2.90m]`, góc xoay `rotY = -0.15 rad` ($-8.6^\circ$).
  - **Thí sinh 4**: `[X = +3.60m, Y = 0.0m, Z = -2.50m]`, góc xoay `rotY = -0.30 rad` ($-17.2^\circ$).
  *Khoảng cách giữa các bàn $1.8m$ vừa vặn đảm bảo khoảng trống thông thoáng chuẩn truyền hình, cho phép lia máy quay cận cảnh từng thí sinh mà không bị che khuất.*
- **Thiết kế kiến trúc bục thí sinh**:
  - Kích thước: Rộng $0.86m$, sâu $0.65m$, cao $1.18m$.
  - Khối đế kim loại nguyên khối chịu lực cao, ốp chân phát quang LED.
  - **Màn hình LED hiển thị trước bục (Front Contestant Screen)**:
    - Kích thước hiển thị: $0.56m \times 0.35m$ (tỉ lệ 16:10).
    - Hiển thị trực quan: Số báo danh nổi bật (1, 2, 3, 4) ở góc trên, Tên thí sinh in hoa rõ nét, và Điểm số hiện tại bằng chữ số LED điện tử to bản phát sáng.
  - **Mặt bàn thao tác (Interactive Countertop)**:
    - Mặt bàn vát cạnh hợp kim nhôm sang trọng.
    - Màn hình cảm ứng trả lời câu hỏi và bút cảm ứng số hóa (mô phỏng bàn thi đấu thật của Olympia).
    - Micro thu âm cổ ngỗng thu phát giọng nói thí sinh.
- **Hệ thống Chuông Bấm & Tín Hiệu Đèn Phản Hồi (Buzzer Reaction Lighting Fixtures)**:
  - Trên mặt bàn mỗi bục bố trí quả chuông bấm cơ điện tử hình vòm nổi (đường kính $12cm$, chiều cao $7cm$).
  - Dải LED tròn hào quang bao quanh chân chuông (Halo Ring) và dải LED viền gờ mép bàn.
  - **Cơ chế phản hồi ánh sáng**:
    - Trạng thái chờ/nghỉ: Đèn chuông màu vàng kim dịu hoặc xanh nhạt (`#38bdf8`, `emissiveIntensity: 0.6`).
    - Trạng thái kích hoạt (Buzzed): Đèn chuông và dải viền bàn bừng sáng **MÀU ĐỎ RỰC RỠ** (`#ff0000`, `emissiveIntensity: 10.5`), đồng thời kích hoạt 2 nguồn sáng điểm (PointLight) đỏ công suất cao tỏa sáng bao trùm bục thi đấu và khuôn mặt thí sinh, tạo hiệu ứng truyền hình kịch tính đỉnh cao.

### 3.4. Khu Vực Trưng Bày Vòng Nguyệt Quế (Laurel Wreath Showcase Area)

- **Ý nghĩa & Vị trí danh dự**:
  - Vòng nguyệt quế là biểu tượng tối thượng của vinh quang Đường lên đỉnh Olympia.
  - Vị trí bố trí: Đặt tại vị trí trang trọng bên cánh trái sân khấu, nằm giữa khu vực của MC và Thí sinh 1, hơi lùi về phía sau: `[X = -2.40m, Y = 0.0m, Z = -4.80m]`.
  - Vị trí này giúp Vòng nguyệt quế luôn hiện diện uy nghi trong các góc quay đại cảnh (Master Wide) và có góc máy hero shot riêng biệt (CAM 6) để lia cận cảnh trước các vòng thi quyết định.
- **Thiết kế Trụ Bệ Trưng Bày (Pedestal Design)**:
  - Đế trụ hình bát giác 3 tầng giật cấp bằng đá cẩm thạch trắng Carrara kết hợp chỉ vàng đồng hoàng gia (đường kính đáy $0.90m$, chiều cao $0.35m$).
  - Cột trụ hình trụ có các đường rãnh xẻ dọc cổ điển (Fluted Column), chiều cao $0.85m$.
  - Đỉnh bục: Đệm nhung dạ màu xanh hoàng gia viền chỉ vàng thêu tay làm đế đỡ cho Vòng nguyệt quế.
  - Lồng kính pha lê bảo vệ (Crystal Vitrine Cloche): Chụp thủy tinh hình vòm trong suốt có độ bóng phản xạ cao (Fresnel transmission 0.92, roughness 0.05).
- **Mô Hình Vòng Nguyệt Quế 3D (Laurel Wreath 3D Asset)**:
  - Được cấu tạo từ các cành lá nguyệt quế đan xen đối xứng, uốn cong thành vòng cung tròn hở phía trên chuẩn Hy Lạp cổ đại.
  - Chất liệu: Vàng 24K óng ánh (`color: "#fbbf24"`, `metalness: 0.96`, `roughness: 0.12`).
  - Hoạt ảnh tinh tế: Vòng nguyệt quế tự xoay tròn với vận tốc cực êm ($0.004 \text{ rad/s}$) lơ lửng trên đệm nhung, bắt sáng lấp lánh từ đèn spotlight phía trên.
- **Hệ thống ánh sáng chuyên biệt**:
  - Đèn rọi góc hẹp (Pinpoint Spotlight) trực tiếp từ giàn trần `[X = -2.4m, Y = 6.2m, Z = -4.8m]`, góc chùm hẹp $0.22 \text{ rad}$, cường độ cao ($9.0$), màu vàng nắng tinh khiết (`#fffbeb`).
  - Vòng đèn LED hắt sáng ngược từ dưới chân bệ tỏa hào quang huyền ảo.
  - Các hạt bụi vàng lấp lánh (Golden Sparkle Particles) bay lơ lửng xung quanh bệ trưng bày.

---

## 4. Kịch Bản Chiếu Sáng & Động Cơ Fade Đa Phân Vùng (Lighting Staging & Multi-Zone Fading Engine)

### 4.1. Hai Trạng Thái Ánh Sáng Cốt Lõi
1. **Trạng thái Xanh dương (Base State — Ngoài thi đấu / Giới thiệu / Tổng kết)**:
   - Màu sắc chủ đạo: **Royal Sapphire Blue & Electric Cyan** (`#0066cc`, `#00d4ff`, `#0a2463`).
   - Tạo không khí trường quay trang nhã, công nghệ cao, tự tin và tập trung.
   - Toàn bộ đèn sàn, màn hình LED trung tâm, đèn trần và khán đài đều sáng tông xanh êm ái.
2. **Trạng thái Đỏ (Competition State — Trong thi đấu / Căng thẳng / Đếm ngược)**:
   - Màu sắc chủ đạo: **Intense Crimson Red & Fiery Ruby** (`#cc0000`, `#ff1111`, `#7f0000`).
   - Đẩy cao nhịp tim, tạo cảm giác áp lực thời gian dồn dập, bùng nổ năng lượng thi đấu đối kháng.

### 4.2. Hiệu Ứng Chuyển Đèn Đa Phân Vùng (Multi-Zone Staggered Fading)
Yêu cầu R2 nêu rõ:
> *"Quá trình chuyển đổi đèn diễn ra từ từ (fade mượt mà), trong đó cụm màn hình bên trong fade trước, sau đó cụm đèn sau sân khấu và khu vực khán giả fade sau."*

Hệ thống được thiết kế thành 2 phân vùng điều khiển độc lập với hàm chuyển trạng thái trễ thời gian (Staggered Lerp):

```
Thời gian (giây)  t = 0.0s        t = 0.6s        t = 1.2s        t = 1.8s        t = 2.4s
                  ├───────────────┼───────────────┼───────────────┼───────────────┤
PHÂN VÙNG 1:      [ BẮT ĐẦU FADE ]════════════════►[ HOÀN TẤT ĐỎ ]
(Màn LED + Gờ màn) (t=0.0s -> t=1.2s, Blue -> Red)
                  │               ▲
                  │   ĐỘ TRỄ 0.6s │
                  │               ▼
PHÂN VÙNG 2:      [ CHỜ TRỄ ]────►[ BẮT ĐẦU FADE ]════════════════►[ HOÀN TẤT ĐỎ ]
(Đèn hậu, Trần, Khán đài)          (t=0.6s -> t=2.0s, Blue -> Red)
```

- **Phân Vùng 1 (Zone 1 — Inner Screen & Core Stage Ring)**:
  - Thành phần: Video canvas màn hình LED trung tâm, dải chỉ LED viền khung titanium, vòng LED tròn trung tâm sàn đấu.
  - Phản ứng: Kích hoạt fade ngay lập tức khi tín hiệu thi đấu bắt đầu ($t = 0s$).
  - Thời gian fade: $1.2 \text{ giây}$.
- **Phân Vùng 2 (Zone 2 — Stage Perimeter, Rig Beams & Audience Amphitheater)**:
  - Thành phần: Đèn hắt tường hậu trường (Wall Battens), hệ thống đèn chùm xoay trần (Moving Heads), đèn rọi sàn bao quanh (Wash Lights) và khu vực khán đài 6 tầng.
  - Phản ứng: Chờ một khoảng trễ tự nhiên $\Delta t = 0.5 \text{s} - 0.7 \text{s}$ sau khi Phân vùng 1 bắt đầu chuyển màu.
  - Thời gian fade: $1.4 \text{ giây}$.
  - Tổng thời gian hoàn tất toàn bộ trường quay: Khoảng $2.0 \text{s} - 2.2 \text{s}$, tạo cảm giác làn sóng ánh sáng đỏ tràn từ lõi màn hình ra khắp khán phòng cực kỳ điện ảnh.

- **Thuật Toán Easing Toán Học**:
  Sử dụng hàm Hermite Smoothstep bậc ba kết hợp hàm giảm xóc động học (Damped Lerp) trong `useFrame`:
  $$\text{smoothstep}(e_0, e_1, x) = 3x^2 - 2x^3 \quad (\text{với } x \in [0, 1])$$
  Trong mỗi khung hình 60 FPS:
  ```typescript
  // Cập nhật giá trị tiến trình mượt mà không phụ thuộc FPS
  const targetT = isRedCompetition ? 1.0 : 0.0;
  
  // Zone 1: phản ứng tức thì với tốc độ đáp ứng cao
  zone1Factor.current = THREE.MathUtils.damp(zone1Factor.current, targetT, 3.8, delta);
  
  // Zone 2: trễ và có quán tính lớn hơn
  zone2Factor.current = THREE.MathUtils.damp(zone2Factor.current, targetT, 2.1, delta);
  
  // Tính màu nội suy cho từng nhóm vật liệu và đèn
  const colZone1 = new THREE.Color().lerpColors(COLOR_BLUE_BASE, COLOR_RED_COMPETITION, zone1Factor.current);
  const colZone2 = new THREE.Color().lerpColors(COLOR_BLUE_BASE, COLOR_RED_COMPETITION, zone2Factor.current);
  ```

### 4.3. Kịch Bản Chiếu Sáng Chi Tiết Từng Vòng Thi (Round-by-Round Rules)

| Vòng Thi | Thời Điểm Kích Hoạt Đỏ | Thời Điểm Quay Lại Xanh | Quy Tắc Chuông Thí Sinh (Buzzer Reactions) |
|---|---|---|---|
| **Khởi Động** (`khoiDong`) | Ngay khi MC bấm "Bắt đầu" lượt thi ($t = 0s$). | Tự động chuyển về Xanh ngay khi kết thúc lượt thi (hết giờ hoặc MC bấm kết thúc lượt). | Bất kỳ thí sinh nào bấm chuông hợp lệ, bục của thí sinh đó phát sáng **ĐỎ**. |
| **Vượt Chướng Ngại Vật** (`vcnv`) | Chuyển sang Đỏ sau **2 đến 3 giây** kể từ khi bắt đầu mở câu hỏi hàng ngang / câu hỏi trung tâm. | Quay về Xanh khi kết thúc câu hỏi và quay lại giao diện lưới hình ảnh bí mật. | **Khóa tốc độ cao (Fastest Lockout)**: Khi nhiều thí sinh cùng bấm chuông CNV, **CHỈ DUY NHẤT** bục của thí sinh bấm nhanh nhất (`bells[0].seat`) mới phát sáng **ĐỎ**. |
| **Tăng Tốc** (`tangToc`) | Chuyển sang Đỏ sau **2 đến 3 giây** kể từ khi mở nội dung câu hỏi và đồng hồ đếm ngược chạy. | Quay về Xanh khi hết thời gian trả lời (10s, 20s, 30s, 40s) và chuyển sang bảng xếp hạng câu trả lời. | Thí sinh nhập đáp án từ máy tính bảng, hệ thống ghi nhận thời gian mili-giây. |
| **Về Đích** (`veDich`) | Chuyển sang Đỏ ngay từ thời điểm thí sinh bước lên sân khấu (`on_stage.mp3`) cho đến suốt lượt thi gói câu hỏi. | Tự động quay về Xanh khi hoàn thành toàn bộ lượt chơi của thí sinh đó (`finish_turn.mp3`). | Khi đội chính trả lời sai, chuông giành quyền trả lời mở ra (5s steal): Thí sinh nào bấm chuông cướp lượt nhanh nhất sẽ phát sáng **ĐỎ** rực rỡ tại bục của mình. |
| **Câu Hỏi Phụ** (`cauHoiPhu`) | Chuyển sang Đỏ khi câu hỏi phân định thắng thua được kích hoạt. | Quay về Xanh khi có người bấm chuông trả lời đúng và kết thúc trận đấu. | Bục của thí sinh bấm chuông phát sáng **ĐỎ**. |

---

## 5. Kiến Trúc Tích Hợp Giao Diện Timeout Quiz (UI & Audio Integration)

### 5.1. Mô Hình Tích Hợp Component
Component 3D được đóng gói độc lập tại đường dẫn:
`d:\Timeout Quiz\src\components\modes\OlympiaStudio3DScene.tsx` (hoặc `src/components/olympia/OlympiaStudio3DScene.tsx`).

Tương tự cơ chế của `MagicWheelBoard.tsx`, component này được nạp động thông qua Next.js Dynamic Import để đảm bảo không bị lỗi Server-Side Rendering (SSR) trong môi trường Node.js:
```tsx
import dynamic from "next/dynamic";

const OlympiaStudio3DScene = dynamic(
  () => import("@/components/modes/OlympiaStudio3DScene"),
  { ssr: false, loading: () => <Olympia3DLoadingFallback /> }
);
```

### 5.2. Chế Độ Hiển Thị Linh Hoạt Trong `DisplayScreen.tsx`
Trong màn hình hiển thị trực tiếp (`src/components/olympia/DisplayScreen.tsx`), bổ sung nút chuyển đổi linh hoạt:
- **Chế độ 1: 3D Studio Broadcast Mode (Mặc định hoặc chọn qua Toggle)**:
  - Canvas Three.js hiển thị toàn cảnh trường quay 3D ở tầng nền.
  - Các bảng thông tin tỷ số (ScoreStrip), câu hỏi lớn (Lower-Third Question Card) và bảng điểm tổng kết nổi mờ (overlay) phía trên bằng Tailwind CSS backdrop-blur, tạo phong cách đồ họa truyền hình trực tiếp (Augmented Reality Broadcast Graphics).
- **Chế độ 2: 2D Screen Flat Mode**:
  - Dành cho các thiết bị cấu hình rất thấp hoặc người dùng muốn màn hình phẳng truyền thống.

### 5.3. Bảng Điều Khiển Góc Máy Quay Truyền Hình (7-Camera Director System)
Tích hợp thanh công cụ Camera Director Dock thanh lịch ở góc dưới màn hình, hỗ trợ chuyển đổi giữa 7 góc máy truyền hình thực tế:

| Phím Tắt / Mã CAM | Tên Góc Máy | Tọa Độ Camera `pos` | Điểm Nhìn `target` | Mục Đích Truyền Hình |
|---|---|---|---|---|
| **CAM 1** | **Master Wide (Toàn cảnh sân khấu)** | `[0.0, 3.4, 7.8]` | `[0.0, 1.8, -2.5]` | Đại cảnh mở màn, bao quát toàn bộ MC, 4 thí sinh, vòng nguyệt quế và màn LED. |
| **CAM 2** | **Central LED Hero (Màn hình trung tâm)** | `[0.0, 3.2, 1.5]` | `[0.0, 3.8, -8.5]` | Cận cảnh đồ họa logo Olympia và nội dung hiển thị trên màn LED lớn. |
| **CAM 3** | **Contestants 4-Shot (Toàn cảnh 4 thí sinh)** | `[0.9, 2.3, 1.6]` | `[0.9, 1.4, -2.8]` | Góc máy trực diện ghi hình cả 4 thí sinh đang tập trung trước các vòng thi. |
| **CAM 4** | **Active Player Close-Up (Cận cảnh thí sinh)** | Tự động lia vào tọa độ của thí sinh đang đến lượt hoặc vừa bấm chuông | Mặt thí sinh | Bắt trọn khoảnh khắc căng thẳng, biểu cảm của thí sinh. |
| **CAM 5** | **MC Station (Cận cảnh người dẫn chương trình)** | `[-3.1, 2.1, 0.6]` | `[-4.5, 1.6, -2.0]` | Ghi hình MC khi đọc câu hỏi hoặc giao lưu cùng các thí sinh. |
| **CAM 6** | **Laurel Wreath Hero (Cận cảnh Vòng nguyệt quế)** | `[-1.7, 1.9, -3.2]` | `[-2.4, 1.35, -4.8]` | Góc máy tôn vinh vương miện chiến thắng trước các câu hỏi bước ngoặt. |
| **CAM 7** | **Audience POV (Góc nhìn khán đài)** | `[0.0, 4.5, 12.5]` | `[0.0, 1.6, -3.0]` | Góc nhìn từ đỉnh khán đài nhìn xuống sân khấu ngập tràn ánh sáng. |

- Hỗ trợ chuyển máy quay theo 2 phong cách:
  - **CUT (Cắt nhanh 0ms)**: Chuẩn phòng điều khiển đạo diễn truyền hình VTV3.
  - **MORPH (Lướt máy mượt mà)**: Sử dụng nội suy Hermite mượt mà cho các cảnh quay toàn cảnh.
- Tích hợp tính năng **PTZ an toàn (Pan $\pm 25^\circ$, Tilt $\pm 15^\circ$, Zoom $1.0\times - 2.5\times$)** cho phép người dùng dùng chuột kéo xoay và lăn bánh xe để khám phá mọi ngóc ngách trường quay mà không lo bị văng máy quay ra ngoài sân khấu.

### 5.4. Đồng Bộ Âm Thanh Sân Khấu (Audio Synchronization)
Kho tài nguyên âm thanh có sẵn tại `d:\Timeout Quiz\public\olympia-audio/` được tích hợp chặt chẽ với các hiệu ứng 3D:
1. **Khi đèn chuyển sang ĐỎ**:
   - Vòng Khởi động: Phát nhạc nền tăng nhịp tim `kd_bgm_1.mp3` / `kd_bgm_2.mp3`.
   - Vòng Vượt chướng ngại vật: Phát tiếng tích tắc đếm ngược `15s_tick.mp3`.
   - Vòng Tăng tốc: Phát tiếng đếm ngược dồn dập tương ứng thời gian câu hỏi.
   - Vòng Về đích: Phát nhạc chào đón thí sinh bước lên sân khấu `on_stage.mp3`, sau đó chuyển sang tiếng đếm ngược `15s_tick.mp3` hoặc `20s_tick.mp3`.
2. **Khi thí sinh bấm chuông**:
   - Ngay lập tức phát tiếng chuông cơ đanh thép `bell_ring.mp3`.
   - Đồng thời kích hoạt đèn bục chuyển sang đỏ rực rỡ và bùng nổ điểm sáng xung quanh quả chuông.
3. **Khi kết thúc lượt thi**:
   - Phát âm thanh kết thúc lượt `finish_turn.mp3`, trường quay 3D mượt mà quay trở về tông màu Xanh dương rực rỡ.

### 5.5. Tối Ưu Hóa Hiệu Năng 60 FPS
Để trường quay 3D hoạt động mượt mà trên cả laptop học sinh cấu hình khiêm tốn:
- Toàn bộ kiến trúc hình học được tạo dựng từ Three.js Procedural Primitives (`BoxGeometry`, `CylinderGeometry`, `RingGeometry`), hoàn toàn không tốn thời gian tải các file 3D `.gltf` hàng chục Megabytes.
- Loại bỏ các pass phản xạ gương nặng nề (`MeshReflectorMaterial`), thay thế bằng vật liệu PBR chất lượng cao với Specular Roughness/Metalness và ánh sáng điểm có suy giảm khoảng cách (`decay: 1.5 - 2.0`).
- Giới hạn đổ bóng (Cast Shadows) duy nhất cho 1 nguồn sáng Key Spotlight trung tâm với bản đồ bóng `512x512` (hoặc tắt bóng ở mức cấu hình Low).
- Cung cấp nút chuyển đổi cấu hình đồ họa (Quality Preset: HIGH / MEDIUM / LOW).

---

## 6. Sơ Đồ Thiết Kế & Bản Thao Diễn Mã Nguồn (Code Blueprint)

Dưới đây là bản phác thảo cấu trúc thành phần chính của component `OlympiaStudio3DScene.tsx`:

```tsx
"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OlympiaState, RoundId } from "@/lib/olympia/types";

// ── Color Constants ──
const COLOR_BLUE_BASE = new THREE.Color("#0066cc");
const COLOR_BLUE_CYAN = new THREE.Color("#00d4ff");
const COLOR_RED_COMPETITION = new THREE.Color("#cc0000");
const COLOR_RED_BRIGHT = new THREE.Color("#ff1111");

// ── Props Interface ──
export interface OlympiaStudio3DSceneProps {
  state: OlympiaState;
  className?: string;
  camAngle?: number;
  quality?: "HIGH" | "MEDIUM" | "LOW";
  allowPTZ?: boolean;
  onCamAngleChange?: (cam: number) => void;
}

// ── Main Scene Component ──
export default function OlympiaStudio3DScene({
  state,
  className = "",
  camAngle = 1,
  quality = "HIGH",
  allowPTZ = true,
  onCamAngleChange,
}: OlympiaStudio3DSceneProps) {
  // Logic tính toán trạng thái Đỏ (Competition State) theo R2
  const isRedTarget = useMemo(() => {
    const round = state.currentRound;
    if (round === "khoiDong") {
      return Boolean(state.khoiDong?.started && state.khoiDong.phase !== "idle" && state.khoiDong.phase !== "segmentDone");
    }
    if (round === "vcnv") {
      // Đỏ sau 2.5s kể từ khi bắt đầu đếm giờ
      const startedAt = state.vcnv?.timer?.startedAt;
      return Boolean(state.vcnv?.phase === "question" && startedAt && (Date.now() - startedAt >= 2500));
    }
    if (round === "tangToc") {
      const startedAt = state.tangToc?.timer?.startedAt;
      return Boolean(state.tangToc?.phase === "question" && startedAt && (Date.now() - startedAt >= 2500));
    }
    if (round === "veDich") {
      // Đỏ từ khi bước lên sân khấu tới khi kết thúc lượt
      return Boolean(state.veDich && state.veDich.phase !== "idle" && state.veDich.phase !== "seatDone");
    }
    if (round === "cauHoiPhu") {
      return Boolean(state.cauHoiPhu?.phase === "question");
    }
    return false;
  }, [state]);

  // Logic xác định thí sinh bấm chuông theo R3
  const buzzedSeatMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    const round = state.currentRound;
    
    if (round === "khoiDong" && state.khoiDong?.buzzedSeat !== null && state.khoiDong?.buzzedSeat !== undefined) {
      map[state.khoiDong.buzzedSeat] = true;
    } else if (round === "vcnv") {
      // CHỈ DUY NHẤT thí sinh bấm nhanh nhất (bells[0]) mới phát sáng đỏ
      if (state.vcnv?.bells && state.vcnv.bells.length > 0) {
        map[state.vcnv.bells[0].seat] = true;
      }
    } else if (round === "veDich") {
      if (state.veDich?.steal?.buzzedSeat !== null && state.veDich?.steal?.buzzedSeat !== undefined) {
        map[state.veDich.steal.buzzedSeat] = true;
      }
    } else if (round === "cauHoiPhu" && state.cauHoiPhu?.buzzedSeat !== null && state.cauHoiPhu?.buzzedSeat !== undefined) {
      map[state.cauHoiPhu.buzzedSeat] = true;
    }
    return map;
  }, [state]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      <Canvas
        shadows={quality === "HIGH"}
        camera={{ position: [0, 3.4, 7.8], fov: 48 }}
        style={{ width: "100%", height: "100%", background: "#020617" }}
      >
        <CameraController camAngle={camAngle} />
        <StudioLightingRig isRedTarget={isRedTarget} quality={quality} />
        <StudioCeilingTruss />
        <StudioStageFloor quality={quality} />
        <CentralLedWallDisplay isRedTarget={isRedTarget} />
        <DedicatedMcPodium />
        <ContestantPodiumsRow seats={state.seats} buzzedSeatMap={buzzedSeatMap} isRedTarget={isRedTarget} />
        <LaurelWreathShowcaseArea />
        <AudienceAmphitheater isRedTarget={isRedTarget} />
      </Canvas>
      <BroadcastDirectorDock currentCam={camAngle} onSelectCam={onCamAngleChange} />
    </div>
  );
}
```

---

## 7. Bảng Đối Chiếu Tiêu Chí Nghiệm Thu (Acceptance Criteria Traceability)

| Yêu Cầu / Tiêu Chí | Hiện Trạng Khảo Sát | Giải Pháp Đã Xác Lập Trong Báo Cáo | Mức Độ Tương Thích |
|---|---|---|---|
| **R1: Màn hình LED trung tâm chân thực, tương phản cao** | Màn hình phẳng 12m x 6.75m (16:9), khung viền Titanium 60mm vát cạnh, bệ đỡ đa tầng obsidian. | Bản vẽ chi tiết mục 3.1, kết hợp scanlines và ánh sáng hắt viền chân thực. | **ĐẠT (100%)** |
| **R1: Nhận diện logo Olympia 2016 & chữ gradient vàng** | Đã xác minh file `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` (512x512, VP8X, trong suốt). | Quy trình sao chép an toàn vào `public/olympia/` và thuật toán render gradient vàng từ sáng sang tối tại mục 2 & 3.1. | **ĐẠT (100%)** |
| **R1: Đầy đủ 1 bục MC, 4 bục thí sinh, khu vực vòng nguyệt quế** | Có đầy đủ tọa độ, hướng xoay, kích thước và thẩm mỹ chi tiết cho từng khu vực. | Bảng tọa độ và mô tả kiến trúc mục 3.2, 3.3, 3.4. | **ĐẠT (100%)** |
| **R2: Đổi màu Xanh $\leftrightarrow$ Đỏ theo vòng thi** | Có quy tắc logic chi tiết cho Khởi động, VCNV, Tăng tốc, Về đích. | Bảng logic ánh sáng mục 4.3 kết nối trực tiếp với `OlympiaState`. | **ĐẠT (100%)** |
| **R2: Fade từ từ, màn hình trong fade trước, hậu trường & khán giả fade sau** | Phân chia 2 phân vùng (Zone 1: Screen lõi; Zone 2: Đèn sau & khán đài) với độ trễ $\Delta t = 0.6s$. | Thuật toán damped smoothstep mục 4.2. | **ĐẠT (100%)** |
| **R3: Chuông bục phát sáng đỏ theo vòng** | Khởi động, Về đích, Câu hỏi phụ phát sáng đỏ cho bất kỳ ai bấm chuông. | Logic ma trận `buzzedSeatMap` mục 4.3 & 6. | **ĐẠT (100%)** |
| **R3: VCNV chỉ bục thí sinh bấm nhanh nhất sáng đỏ** | Trích xuất chính xác `state.vcnv.bells[0].seat`. | Đã định vị logic loại trừ tại mục 4.3. | **ĐẠT (100%)** |
| **R4: Không xóa tệp ngoài thư mục `d:\Timeout Quiz`** | Tệp logo tại `Downloads` chỉ được sao chép (copy), không xóa hay di chuyển. | Cam kết quy trình an toàn mục 2.2. | **ĐẠT (100%)** |

---

## 8. Kết Luận & Khuyến Nghị Giai Đoạn Triển Khai (Next Steps)

1. **Về Tài nguyên**: Sao chép tệp `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` vào `d:\Timeout Quiz\public\olympia\Olympia_logo_2016.webp` để hệ thống Next.js sẵn sàng phục vụ.
2. **Về Mã nguồn**: Xây dựng component `d:\Timeout Quiz\src\components\modes\OlympiaStudio3DScene.tsx` dựa trên bộ khung đã chuẩn hóa từ `WheelStudio3DScene.tsx`, lược bỏ các phần không cần thiết (như nón quay, bảng ô chữ nón) và thay thế bằng Màn LED trung tâm 16:9, Bục MC, 4 Bục thí sinh cánh cung và Khu vực Vòng nguyệt quế.
3. **Về Giao diện người dùng**: Bổ sung bộ điều khiển chuyển đổi hiển thị trường quay 3D vào `DisplayScreen.tsx`, liên kết trực tiếp các sự kiện âm thanh và chuông bấm theo thời gian thực.
