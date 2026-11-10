# Original User Request

## Initial Request — 2026-11-10T13:18:58Z

Fix 3D stage layout, camera framing, contestant walk trajectories, MC stage lighting, CAM 11 transition timing, and intro audio looping for 6-8 contestants in Timeout Quiz for production use, with visual screenshot proof.

Working directory: d:\Timeout Quiz
Integrity mode: development

## Requirements

### R1. Khoảng cách bục & góc CAM cho 6 - 8 thí sinh
- Khi `seatCount` là 6, 7 hoặc 8: Mở rộng bán kính cung hoặc khoảng cách góc (angular span / radius) của các bục thí sinh trong `Podiums.tsx` để các bục có khoảng cách thoáng đãng, đồng đều, không bị dính sát vào nhau.
- Cân chỉnh góc quay CAM 10 (toàn cảnh bục thí sinh) và các camera cá nhân thí sinh (CAM 5..8, CAM 25..28) trong `CameraController.tsx` và `useOlympiaCamera.ts` để bao quát toàn bộ 6-8 bục, không bị cắt mép hoặc lệch góc.
- Tuyệt đối không sửa đổi, tạo mới hay xóa bỏ bất kỳ file nào ngoài thư mục `d:\Timeout Quiz` (đặc biệt thư mục `d:\Olympia 26` phải giữ nguyên vẹn 100%).
- Giữ nguyên vẹn nội dung file `d:\Timeout Quiz\AGENTS.md`.

### R2. Quỹ đạo di chuyển thí sinh từ cầu thang về bục
- Thí sinh khi bước khỏi cầu thang và tiến về bục không bị chậm lại đột ngột hay xoay vuông góc 90 độ thô cứng.
- Làm mượt đường đi (curve / Bézier spline / s-curve) và làm mượt góc xoay `rotY` theo hướng vector vận tốc di chuyển tự nhiên, nhịp bước chân đều đặn.

### R3. Ánh sáng khu vực MC
- Khắc phục tình trạng hai MC (Khánh Vy & Ngọc Huy) tại bục MC bị thiếu sáng, tối đen như bóng ma khi nhìn từ xa hoặc từ góc CAM 10.
- Chiếu sáng rõ ràng MC desk & figures (sử dụng SpotLight / PointLight / Directional key light warm white #fff5e6 hoặc cân chỉnh hệ số phản xạ/ambient của vật liệu MC) để nổi bật khuôn mặt và trang phục rõ ràng, chuyên nghiệp.

### R4. Thời điểm chuyển cảnh CAM 11 giới thiệu thí sinh
- Cắt góc sang CAM 11 sớm hơn khoảng 0.6s trước khi thí sinh dừng ở bục giữa (khi thí sinh đang bước nốt 2 bậc cuối xuống bục giữa, khoảng t ≈ 1.2s thay vì chờ đến 1.8s) để khung hình đón trước bước chân thí sinh bước vào bục giữa chào sân.

### R5. Cơ chế ghép nối / lặp âm thanh chào sân khi thời lượng dài
- Với 6-8 thí sinh, tổng thời gian chào sân kéo dài (khoảng 26.8s cho 6 người, 34.8s cho 8 người).
- Nếu bản nhạc intro thí sinh ngắn hơn tổng thời gian giới thiệu thí sinh, áp dụng cơ chế ghép nối crossfade nối tiếp tự động (seamless crossfade looping / concatenation) trong audio engine để nhạc nền phát liên tục không bị ngắt quãng giữa chừng.

### R6. Chụp ảnh màn hình (screenshot) minh chứng thực tế
- Chụp ảnh màn hình (screenshot) trực tiếp từ giao diện trường quay 3D khi chạy ứng dụng trên trình duyệt:
  + Hiển thị trường quay khi có 6, 7 và 8 thí sinh với bục đã được giãn khoảng cách thoáng đãng, không bị dính sát vào nhau.
  + Góc CAM 10 và các góc CAM liên quan bao quát toàn cảnh không bị cắt lẹm.
  + Bục MC và hai MC được chiếu sáng rõ ràng khuôn mặt và trang phục.
- Đính kèm/cung cấp đường dẫn các file ảnh screenshot trong báo cáo nghiệm thu cho người dùng xem trực quan.

## Verification Resources
- Kiểm tra build thành công của dự án (`npm run build`).
- Khởi chạy dev server (`npm run dev`), mở trình duyệt để kiểm tra trực quan và chụp ảnh màn hình (screenshot) thực tế kết quả hiển thị 3D.

## Acceptance Criteria

### Stage Layout & Cameras
- [ ] Khi seatCount = 6, 7, 8, các bục thí sinh có khoảng cách giãn đều, không chạm hoặc chồng đè lên nhau.
- [ ] CAM 10 và các camera cá nhân (CAM 5..8, CAM 25..28) bao quát trọn vẹn bục tương ứng mà không bị che khuất hoặc cắt lẹm khỏi khung hình.

### Movement & Animation
- [ ] Thí sinh di chuyển từ cầu thang về bục theo quỹ đạo cong mượt mà, tốc độ ổn định, không bị giảm tốc đột ngột và xoay mượt mà theo hướng di chuyển.
- [ ] Chuyển cảnh sang CAM 11 diễn ra sớm hơn ~0.6s khi thí sinh bước nốt các bậc cuối vào bục giữa chào sân.

### Lighting & MC Visibility
- [ ] Hai MC hiển thị sáng rõ, nhận diện được khuôn mặt và trang phục từ góc CAM 10 và toàn cảnh, không còn bị tối đen/bóng ma.

### Audio Playback
- [ ] Nhạc intro thí sinh phát liên tục bằng cơ chế crossfade nối tiếp liền mạch khi tổng thời gian giới thiệu 6-8 thí sinh vượt quá độ dài file âm thanh gốc.

### Visual Proof & Screenshots
- [ ] Có ảnh màn hình (screenshot) thực tế chụp từ trình duyệt cho các trường hợp 6, 7, 8 thí sinh, thể hiện rõ bục giãn cách thoáng, MC sáng rõ, camera bao quát trọn vẹn.

### Workspace Safety
- [ ] Không có file nào ngoài `d:\Timeout Quiz` bị thay đổi, tạo mới hay xóa bỏ (thư mục `d:\Olympia 26` giữ nguyên 100%).
- [ ] File `d:\Timeout Quiz\AGENTS.md` giữ nguyên vẹn.
- [ ] Lệnh kiểm tra build dự án (`npm run build`) hoàn thành không có lỗi.


## Follow-up — 2026-11-10T16:37:23Z

THÔNG BÁO KHẨN CẤP TỪ NGƯỜI DÙNG VỀ BỐ CỤC BỤC (YÊU CẦU SỬA NGAY TRƯỚC 01:15):

Người dùng vừa kiểm tra ảnh screenshot R6.3 và phát hiện lỗi nghiêm trọng:
"chưa được rồi, nếu không đủ không gian bên phải thì bục phải dồn về bên trái, không dồn sang gần MC, nó sẽ bị lỗi ngu học này"

1. Nguyên nhân:
Trong cấu hình 8 thí sinh (và 6-7 thí sinh), thuật toán cũ đẩy `endPhi` lên tới 1.710 rad (vượt sang X = +0.94m sang mạn phải), khiến Thí sinh số 8 đứng sát rạt, dính vào ngay cạnh bục MC (CenterMcDesk tại X = +3.0m). Bục MC bị lọt vào mép phải của CAM 10.

2. Quyết định kiến trúc bắt buộc (Người dùng đã xác nhận 100% qua phỏng vấn):
- KHÓA CỐ ĐỊNH MỐC BÊN PHẢI: Khóa `endPhi <= 1.20 rad` (hoặc tối đa 1.22 rad) để bục thí sinh cuối cùng bên phải luôn cách bục MC tối thiểu 3.5m - 4.0m (vùng X <= -2.2m), TUYỆT ĐỐI KHÔNG xâm lấn sang khu vực MC bên phải!
- DỒN TOÀN BỘ CUNG MỞ RỘNG SANG CÁNH TRÁI (STAGE LEFT): Mở rộng `startPhi` về phía cánh trái dọc theo Vách Ký hiệu Khoa học (Stage Left, X âm) từ 0.05 rad - 0.35 rad hoặc tăng bán kính cung/dịch tâm cung sang trái để toàn bộ 6, 7, 8 bục dàn đều, rộng rãi bên cánh trái.
- CÂN CHỈNH LẠI CAM 10: Dịch trục ngắm `pos` và `target` của CAM 10 lệch sang trái (hướng về trung tâm dồn trái của dàn bục) để toàn bộ 6 - 8 bục nằm cân đối chính giữa khung hình CAM 10, loại bỏ hoàn toàn bục MC khỏi rìa phải của CAM 10!
- Cập nhật lại các camera cá nhân thí sinh (CAM 5..8, CAM 25..28) tương ứng theo vị trí mới.
- Cập nhật lại đường di chuyển bước chân thí sinh (từ cầu thang về bục) để ăn khớp với tọa độ bục mới.
- CHỤP LẠI BỘ ẢNH SCREENSHOT THỰC TẾ (đặc biệt là ảnh 6, 7, 8 thí sinh và CAM 10) thể hiện rõ ràng bục dồn sang trái, bục MC bên phải hoàn toàn thông thoáng độc lập!

Cam kết hoàn thành trước 01:15 sáng mai. Vui lòng lập tức điều động worker thực hiện ngay!
