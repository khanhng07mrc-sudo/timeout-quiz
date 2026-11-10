# Original User Request

## Initial Request — 2026-11-10T02:57:26Z

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
