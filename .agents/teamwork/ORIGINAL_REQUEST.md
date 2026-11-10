# Original User Request

## Initial Request — 2026-11-10T10:48:58Z

Audit, resolve, and verify persistent entrance timing, arm animation stiffness, podium collision, stage flow transition, and production VPS deployment issues for Timeout Quiz.

Working directory: d:\Timeout Quiz
Integrity mode: development

STRICT CONSTRAINT: Tuyệt đối không xóa hoặc sửa file ngoài thư mục d:\Timeout Quiz (đặc biệt không đụng chạm vào d:\Olympia 26).

## Requirements

### R1. Pipelined Concurrent Entrance
Cần giải quyết triệt để luồng ra sân gối đầu đồng thời (Pipelined Concurrent Entrance): thí sinh trước vừa bước xuống cầu thang tới sàn (4.0s) thì thí sinh kế tiếp lập tức mở cửa xuất hiện bước xuống, không phải đợi thí sinh trước về tận bục (6.8s) mới cho thí sinh sau ra.

### R2. Arm Animation Naturalness and Fluidity
Khắc phục triệt để lỗi đơ tay: cả động tác tay của thí sinh lúc pose chào lẫn cánh tay MC (khớp vai, khuỷu, cổ tay) phải cử động mượt mà, không bị cứng, giật nhảy frame hoặc bị đơ như tượng sáp.

### R3. Podium Collision Avoidance via Rear Corridor
Đường đi của thí sinh từ cầu thang về bục thi đấu không được cắt xuyên qua các bục của thí sinh khác hoặc bục chính giữa; phải đi vòng qua hành lang sau (rear corridor arc) rộng rãi, tuyệt đối không xuyên qua bất kỳ bục nào.

### R4. Stage Flow Intro Standby
Khi giới thiệu xong thí sinh, hệ thống không tự động nhảy ngay sang vòng Khởi động mà phải dừng lại ở màn Chờ mở màn trang trọng (introStandby) để MC dẫn và chờ Host bấm nút bắt đầu.

### R5. Production Build and VPS Deployment Verification
Đảm bảo bản build production và triển khai VPS (quizorra.ddns.net / process name PM2: quizorra / timeout-quiz) thực sự nạp mã mới nhất, không bị cache hay chạy mã nguồn cũ.

## Verification Resources
- Use existing test suites in `d:\Timeout Quiz`: `npm run test:olympia`, `npm run test:olympia-3d`, `npm test`, and typecheck `npx tsc --noEmit`.
- Inspect repository deployment scripts (e.g. `deploy-vps.sh`) and PM2 configuration for process `quizorra` / `timeout-quiz` at `quizorra.ddns.net`.
- Design and execute automated and regression verification checks to ensure all 5 issues are resolved without regressions.

## Acceptance Criteria

### Entrance Timing & Animation
- [ ] Thí sinh tiếp theo xuất hiện và bước xuống cầu thang tại thời điểm t = 4.0s khi thí sinh trước chạm sàn, thay vì chờ đến 6.8s.
- [ ] Cử động tay của thí sinh khi pose chào và cánh tay MC (khớp vai, khuỷu, cổ tay) chuyển động mượt mà liên tục, không bị đơ hoặc nhảy frame.
- [ ] Quỹ đạo di chuyển của tất cả thí sinh từ cầu thang về bục thi đấu đi qua hành lang sau (rear corridor arc) và không cắt xuyên qua bất kỳ bục nào.

### Stage Flow & Deployment
- [ ] Sau khi kết thúc phần giới thiệu thí sinh, hệ thống dừng lại ở màn Chờ mở màn (introStandby), không tự động chuyển sang vòng Khởi động cho đến khi Host bấm nút bắt đầu.
- [ ] Toàn bộ test suites (`npm run test:olympia`, `npm run test:olympia-3d`, `npm test`, `npx tsc --noEmit`) vượt qua thành công (100% pass rate).
- [ ] Bản build production trên VPS quizorra.ddns.net (PM2 process `quizorra` / `timeout-quiz`) chạy đúng mã nguồn mới nhất, không bị cache hay chạy mã nguồn cũ.
- [ ] Không có file nào ngoài thư mục `d:\Timeout Quiz` (đặc biệt thư mục `d:\Olympia 26`) bị sửa hoặc xóa.
