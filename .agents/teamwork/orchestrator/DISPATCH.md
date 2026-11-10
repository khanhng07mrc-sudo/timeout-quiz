# Dispatch Log

## 2026-10-31T01:35:00Z
Build an interactive 3D Đường lên đỉnh Olympia studio set environment integrated into Timeout Quiz (Quizorra) based on the Magic Wheel (CNKD) studio architecture, featuring dynamic round-based lighting transitions, realistic central LED display, contestant and MC podiums with buzzer lighting reactions, and a laurel wreath display area.

Working directory: d:\Timeout Quiz
Integrity mode: development
The team must NOT: delete files outside the designated project folder

Reference material: Existing 3D studio architecture and implementation in `d:\Timeout Quiz\src\components\modes\WheelStudio3DScene.tsx` (Magic Wheel / CNKD studio).

## Requirements

### R1. Bố cục không gian 3D trường quay và Nhận diện thương hiệu
Xây dựng không gian trường quay 3D tương tác (Three.js / WebGL) tích hợp vào Timeout Quiz, kế thừa phong cách và kiến trúc từ trường quay CNKD / Magic Wheel (`WheelStudio3DScene.tsx`):
- Màn hình LED trung tâm: rộng rãi, chân thực, phong cách hiện đại, phối hợp sáng tối chuẩn quốc tế.
- Nhận diện thương hiệu: Logo Olympia sử dụng file tại đường dẫn `C:\Users\khanh\Downloads\Olympia_logo_2016.webp`, bên dưới có dòng chữ hiệu ứng gradient màu vàng (chuyển từ sáng sang tối).
- Bục và khu vực chức năng: Đầy đủ 1 bục MC, 4 bục thí sinh, và khu vực trưng bày vòng nguyệt quế.

### R2. Hệ thống chiếu sáng và Kịch bản đổi màu đèn
Hệ thống đèn và màn LED sân khấu đổi màu linh hoạt giữa màu xanh dương (bối cảnh chung ngoài thi đấu) và màu đỏ (trong thi đấu):
- Phần Khởi động: Chuyển sang màu đỏ từ khi nhấn Bắt đầu cho đến khi kết thúc lượt thi; khi nhấn kết thúc lượt tự động quay về màu xanh.
- Phần Vượt chướng ngại vật và Tăng tốc: Chuyển sang màu đỏ sau khi bắt đầu một khoảng thời gian (khoảng 2 - 3 giây).
- Phần Về đích: Chuyển sang màu đỏ từ khi thí sinh bước lên sân khấu cho đến khi hoàn thành lượt chơi; khi nhấn kết thúc lượt tự động quay về màu xanh.
- Hiệu ứng chuyển đèn: Chuyển từ từ (fade mượt mà), trong đó cụm màn hình bên trong fade trước, sau đó cụm đèn sau sân khấu và khu vực khán giả fade sau.

### R3. Hệ thống đèn tín hiệu chuông (Buzzer Reactions)
Đèn bục thí sinh phản hồi theo tín hiệu bấm chuông của từng vòng thi:
- Trong phần Khởi động, Về đích và Câu hỏi phụ: Bục của bất kỳ thí sinh nào bấm chuông sẽ phát sáng màu đỏ.
- Trong phần Vượt chướng ngại vật: Chỉ bục của thí sinh bấm nhanh nhất (đầu tiên) mới phát sáng màu đỏ.

### R4. Ràng buộc an toàn dự án
Đội ngũ triển khai không được phép xóa bất kỳ tệp tin nào bên ngoài thư mục dự án `d:\Timeout Quiz`.


## 2026-11-01T06:28:44Z
Refactor and refine the 3D broadcast studio backdrop, mountain landscape, portal arches, and stage fixtures for the Đường lên đỉnh Olympia S14 studio in Timeout Quiz to match the official broadcast reference for production use.

Working directory: d:\Timeout Quiz
Integrity mode: development
The team must NOT: delete files outside the project directory, delete existing files in the project directory unnecessarily

Reference material:
- Official VTV3 broadcast reference photo: file:///C:/Users/khanh/.gemini/antigravity/brain/3d0360d1-4046-41c8-97dd-26b885fc39df/.user_uploaded/media_1793509491924_ff35bde5.jpg
- Current camera 11 screenshot: file:///C:/Users/khanh/.gemini/antigravity/brain/3d0360d1-4046-41c8-97dd-26b885fc39df/screenshots/38_stage3_cam11_khan_dai_khan_gia.png
- Existing scene implementation: `d:\Timeout Quiz\src\components\olympia\studio\StudioLighting.tsx` and `CentralLedWall.tsx`

## Requirements

### R1. Khán đài vòm trụ cong Panorama (Curved Cylindrical Cyclorama)
Thay thế bức tường backdrop phẳng ở vị trí Z = 5.05m bằng cyclorama vòm cong hình trụ thực thụ (curved cylindrical panoramic cyclorama) uốn cong liền mạch bao bọc toàn bộ khán đài khán giả, hiển thị nền vũ trụ hoàng hôn sapphire và 8 biểu tượng học vấn chìm tinh tế.

### R2. Đường lên đỉnh núi dạng hẻm núi phát sáng (Luminous Canyon Pass)
Đường lên đỉnh núi phải là một thung lũng / hẻm núi mượt mà, phát sáng tự nhiên được tạo nên giữa các triền núi gồ ghề, dẫn lối mượt mà lên chân tháp đỉnh núi. Tuyệt đối không vẽ đường line thô cứng và không tạo lỗ hổng như thác nước đổ ra từ lều băng rỗng.

### R3. Địa hình núi kỹ thuật số gồ ghề (Rugged Digital Wireframe Mountain Landscape)
Địa hình núi phải có nhiều đỉnh nhọn, sườn núi hiểm trở, nhiều chông gai lộn xộn đúng như ảnh phát sóng thực tế; cấu trúc lưới wireframe đa giác 3D với các điểm nút (vertex nodes) phát sáng tại đỉnh và các mảng đa giác đổ bóng màu xanh lam tương phản sáng tối.

### R4. Đỉnh núi, Tháp đèn hải đăng và Lá cờ chiến thắng chìm (Summit Beacon & Translucent Flag)
Đỉnh núi có tháp đèn hải đăng phát sáng rực rỡ (radiant beacon) toả vầng hào quang dịu nhẹ và cột cờ thanh mảnh với lá cờ đuôi nheo màu lam nhạt / trắng mờ bán trong suốt ("lá cờ chìm") tung bay sang phải.

### R5. Hệ thống 4 tầng cổng vòm đồng tâm (4-Layer Portal Arches)
Hệ thống cổng vòm trung tâm gồm đúng 4 tầng chuẩn xác theo thiết kế sân khấu:
- Cung 1 ngoài cùng: Cổng lớn thứ 3, màu ngà ấm (warm ivory).
- Cung 2: Cổng bé nhất, vách đệm tối màu (dark spacer).
- Cung 3: CỔNG ĐEN LỚN NHẤT, trụ màu sơn mài đen bóng (glossy black lacquer pylon).
- Cung 4 trong cùng: Lớn thứ 2 nhưng CAO HƠN vươn tới 5.2m, màu ngà ấm ôm trọn khung hình đỉnh núi.

### R6. Chân trụ biển logo và huy hiệu (Anchored Logo Board Stanchion Legs)
Hộp đèn tài trợ Quizorra và huy hiệu Olympia phải có hai chân trụ thép thẳng đứng cắm cố định xuống bục plinth, không lơ lửng giữa không trung.

### R7. Ràng buộc an toàn tệp tin (File Safety Constraints)
Tuyệt đối không xoá bất kỳ tệp tin nào bên ngoài thư mục dự án `d:\Timeout Quiz`. Cố gắng bảo lưu và giữ nguyên vẹn các tệp tin sẵn có trong dự án, chỉ chỉnh sửa bổ sung các thành phần cần thiết.

## 2026-11-10T02:58:21Z
Fix three critical Olympia broadcast and gameplay issues in `Timeout Quiz` — contestant podium path clipping, pipelined contestant entrance, and host wrong button lock — and ensure verified deployment to the live VPS.

Working directory: d:\Timeout Quiz
Integrity mode: development
The team must NOT: delete or modify any files outside the directory d:\Timeout Quiz.

## Requirements

### R1. Anti-Clipping Contestant Podium Walkway
- Thí sinh di chuyển chào sân về bục không được đi xuyên qua bàn hoặc màn hình bục.
- Thí sinh phải đi vòng theo hành lang phía sau và bước vào bục từ đằng sau ở cả Sandbox mode và Online mode.
- Khắc phục triệt để mọi edge-case khiến thí sinh bị render theo đường đi cũ đâm xuyên qua bục.

### R2. Pipelined Contestant Entrance (Chào sân gối đầu)
- Không bắt buộc thí sinh trước phải về hẳn bục thì thí sinh tiếp theo mới bước ra từ sau cửa.
- Khi thí sinh trước đi gần hết bậc thang, thí sinh tiếp theo lập tức bước ra luôn.
- Đảm bảo logic `seatStartTimes` và staggered entrance hoạt động chính xác, mượt mà và đồng bộ ở cả Sandbox mode và Online mode.

### R3. Host "Wrong" Button Lock (Khóa nút Sai của MC)
- Ở các lượt thi chung hoặc các lượt có bấm chuông, khi câu hỏi hiện ra và chưa có ai bấm chuông, hệ thống khóa nút chấm "X Sai" của MC trong vòng 3 giây đầu (với luật O22) và 5 giây đầu (với luật O23+).
- Khi có thí sinh bấm chuông, MC có quyền bấm chấm Sai bất kỳ lúc nào mà không bị khóa.
- Đảm bảo Host Console không bị bypass hay mất đồng bộ `noBuzzWrongUnlockAt` từ state.

### R4. Workspace Boundary Constraint
- The team must NOT modify or delete any files outside `d:\Timeout Quiz`. Reading and checking files outside `d:\Timeout Quiz` for context is permitted.

### R5. Build and VPS Deployment
- Build và kiểm tra toàn diện codebase local trong `d:\Timeout Quiz`.
- Kiểm tra quyền truy cập môi trường và triển khai bản build mới nhất lên VPS `https://quizorra.ddns.net` tại thư mục `/var/www/quizorra`, đảm bảo VPS phục vụ đúng bundle mới và không còn phục vụ chunk HTML cũ (`page-7aba8b85ceac9a89.js`). Nếu không có quyền truy cập trực tiếp từ xa vào VPS, chuẩn bị commit/push sạch và cung cấp hướng dẫn lệnh chính xác để chạy trên VPS.

## Verification Resources
- Test suites sẵn có của project (`npm test` / build verification trong `d:\Timeout Quiz`).
- Kiểm tra trực quan và chức năng trong Sandbox mode (`/admin/sandbox`) và Host Console.
- Kiểm tra live VPS endpoint `https://quizorra.ddns.net` (HTML chunk verification).

## Acceptance Criteria

### Contestant Movement & Podium Entrance
- [ ] Ở cả Sandbox mode và Online mode, thí sinh chào sân đi vòng theo hành lang phía sau và bước vào bục từ phía sau, tuyệt đối không đi xuyên qua bàn hay màn hình bục.
- [ ] Chào sân gối đầu hoạt động mượt mà: thí sinh tiếp theo bước ra ngay khi thí sinh trước đi gần hết bậc thang, không chờ thí sinh trước về hẳn bục.

### Host Console Wrong Button
- [ ] Ở các lượt thi có bấm chuông khi chưa có ai bấm, nút chấm "X Sai" của Host bị khóa không bấm được trong 3 giây đầu (luật O22) hoặc 5 giây đầu (luật O23+).
- [ ] Ngay khi có thí sinh bấm chuông, nút chấm "X Sai" của Host lập tức được mở khóa.

### Safety & Workspace Integrity
- [ ] Tuyệt đối không có file nào ngoài thư mục `d:\Timeout Quiz` bị sửa đổi hoặc xóa bỏ.

### Build & Deployment
- [ ] Toàn bộ test suite và build production hoàn thành thành công không có lỗi.
- [ ] Live VPS `https://quizorra.ddns.net` được cập nhật bản build mới nhất, không còn chạy mã nguồn hay chunk cũ.
