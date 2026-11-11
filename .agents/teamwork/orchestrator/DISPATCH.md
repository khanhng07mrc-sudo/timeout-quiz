# Dispatch History

## 2026-11-10T13:18:58Z

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

## 2026-11-10T16:37:51Z

[URGENT INSTRUCTION FROM USER & CALLER - MANDATORY RE-WORK]:
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
File authoritative request đã được cập nhật tại: d:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md

## 2026-11-11T09:04:36Z

Đội ngũ đầy đủ (Full team): Khắc phục triệt để lỗi luồng chuyển cảnh khi nhấn tên phần thi Về đích, hoàn thiện hiệu ứng cặp mũi tên đi vào (twin arrows), sửa lỗi lộ câu hỏi đầu tiên sau khi chọn gói câu hỏi, chụp screenshot WebGL/DOM xác minh, và triển khai bản build lên production VPS cho Timeout Quiz. Bắt buộc thực hiện bước duyệt kế hoạch chi tiết (/plan) trước khi chỉnh sửa mã nguồn.

Working directory: d:\Timeout Quiz
Integrity mode: development

STRICT CONSTRAINT: Tuyệt đối không xóa hoặc sửa file ngoài thư mục d:\Timeout Quiz (các file và thư mục bên ngoài như d:\Olympia 26 chỉ được phép đọc nhằm mục đích phân tích, tham chiếu logic). Không ghi mã khóa bí mật hoặc thông tin SSH trực tiếp vào git.

## Requirements

### R1. Chuẩn hóa luồng chuyển cảnh và kích hoạt bảng chọn gói phần thi Về đích
- Khi nhấn vào tên phần thi Về đích: hệ thống chỉ phát intro vòng thi, tuyệt đối không nhảy ngay vào giao diện lựa chọn gói câu hỏi.
- Khi nhấn nút "Lên sân khấu": hệ thống tiếp tục phát nhạc, không chuyển sang giao diện lựa chọn gói câu hỏi.
- Chỉ khi Host/MC nhấn nút "Mở bảng chọn gói" (hoặc trigger tương ứng): hệ thống mới kích hoạt hiệu ứng chuyển cảnh cặp mũi tên và mở giao diện lựa chọn gói câu hỏi cho thí sinh.

### R2. Hoàn thiện hiệu ứng cặp mũi tên đi vào (Twin Arrows Animation)
- Tái sử dụng animation/đồ họa cặp mũi tên sẵn có trong dự án.
- Khắc phục lỗi căn chỉnh: đảm bảo cặp mũi tên được căn giữa (center alignment) chuẩn xác trên màn hình thi đấu và các giao diện hiển thị.
- Bổ sung hiệu ứng zoom cho các lớp mũi tên khi bắt đầu xuất hiện hoạt ảnh.

### R3. Khắc phục lỗi hiển thị sớm câu hỏi đầu tiên sau khi chọn gói
- Sau khi thí sinh hoàn tất việc chọn gói câu hỏi (ví dụ: gói 40, 60, 80 điểm...) và xác nhận, giao diện chỉ hiển thị thông tin gói câu hỏi đã chọn.
- Tuyệt đối không làm lộ hoặc hiển thị nội dung câu hỏi đầu tiên ngay lúc chọn xong gói.
- Nội dung câu hỏi đầu tiên chỉ được phép hiển thị khi Host/MC bấm nút hoặc phím kích hoạt bắt đầu câu hỏi.

### R4. Kế hoạch kỹ thuật và cổng phê duyệt (/plan)
- Trước khi chỉnh sửa bất kỳ file mã nguồn ứng dụng nào, nhóm phải phân tích codebase và đệ trình bản kế hoạch kỹ thuật chi tiết (phân tích nguyên nhân gốc rễ, phác thảo thay đổi state machine / UI / CSS/3D, và kế hoạch kiểm thử) để người dùng xem xét và phê duyệt trước khi tiến hành viết code.

### R5. Xác minh hiển thị trực quan qua Screenshot WebGL / DOM
- Sau khi hoàn thành code và vượt qua các bài kiểm thử tự động, sử dụng trình duyệt chụp ảnh màn hình (screenshots) thực tế ghi nhận 5 trạng thái luồng thi Về đích:
  1. Nhấn tên phần thi Về đích (chỉ phát intro, không mở bảng chọn gói).
  2. Nhấn nút "Lên sân khấu" (chỉ phát nhạc, không mở bảng chọn gói).
  3. Nhấn nút "Mở bảng chọn gói" (hiển thị hiệu ứng cặp mũi tên căn giữa + zoom các lớp, sau đó mở bảng chọn gói).
  4. Trạng thái sau khi xác nhận chọn gói (chỉ hiển thị thông tin gói, câu hỏi 1 chưa hiển thị).
  5. Host kích hoạt hiển thị câu hỏi 1 (nội dung câu hỏi 1 xuất hiện).
- Cung cấp đường dẫn các file ảnh chụp màn hình trong báo cáo nghiệm thu.

### R6. Git Push và Triển khai Production VPS
- Sau khi toàn bộ kiểm thử tự động, typecheck (`npx tsc --noEmit`), build (`npm run build`) và kiểm tra visual screenshot thành công: commit sạch sẽ và push lên nhánh `origin/main` của repository `d:\Timeout Quiz`.
- Tiến hành deploy lên VPS production (`https://quizorra.ddns.net` qua script `deploy-vps.sh`) và kiểm tra endpoint `https://quizorra.ddns.net/api/health` trả về HTTP 200 với commit mới. Nếu subagent không có quyền SSH trực tiếp tới VPS `103.161.180.142`, chuẩn bị commit sạch đã push lên `origin/main` và bàn giao lại cho agent cha để thực hiện lệnh deploy lên VPS; tuyệt đối không lưu credentials trong git.

## Verification Resources
- Sử dụng các test suite và script kiểm thử hiện có trong `d:\Timeout Quiz` (`npm run test:olympia`, `npm test`, `npx tsc --noEmit`, `npm run build`).
- Đội ngũ triển khai tự xây dựng kịch bản kiểm thử tự động / integration tests mô phỏng các luồng trạng thái Về đích.
- Script chụp ảnh màn hình trình duyệt (Puppeteer / Playwright hoặc test runner có sẵn) để sinh ảnh chụp màn hình WebGL/DOM xác minh.
- Script deploy hiện có `deploy-vps.sh` và endpoint kiểm tra `https://quizorra.ddns.net/api/health`.

## Acceptance Criteria

### Kế hoạch triển khai (/plan)
- [ ] Kế hoạch kỹ thuật chi tiết được trình bày và được phê duyệt trước khi tiến hành sửa đổi mã nguồn.

### Luồng chuyển cảnh & Kích hoạt bảng chọn gói
- [ ] Nhấn vào tên phần thi Về đích chỉ phát intro, không chuyển trạng thái sang giao diện chọn gói câu hỏi.
- [ ] Nhấn nút "Lên sân khấu" chỉ phát nhạc, không chuyển trạng thái sang giao diện chọn gói câu hỏi.
- [ ] Chỉ khi nhấn nút "Mở bảng chọn gói", hiệu ứng cặp mũi tên mới kích hoạt và sau đó hiển thị bảng chọn gói câu hỏi.

### Đồ họa & Hiệu ứng cặp mũi tên
- [ ] Cặp mũi tên được căn giữa chính xác trên màn hình hiển thị trong suốt quá trình hoạt ảnh di chuyển vào.
- [ ] Các lớp mũi tên có hiệu ứng zoom khi bắt đầu xuất hiện hoạt ảnh.

### Hiển thị nội dung câu hỏi
- [ ] Sau khi thí sinh chọn xong gói câu hỏi, màn hình chỉ hiển thị thông tin gói câu hỏi đã chọn (điểm số/cấu trúc gói).
- [ ] Nội dung văn bản/hình ảnh của câu hỏi đầu tiên hoàn toàn không xuất hiện cho đến khi Host/MC thực hiện thao tác bắt đầu câu hỏi.
- [ ] Khi Host/MC bấm nút/phím bắt đầu câu hỏi 1, nội dung câu hỏi 1 hiển thị đầy đủ và chính xác.

### Xác minh hình ảnh trực quan (Visual Screenshots)
- [ ] Chụp đầy đủ 5 ảnh màn hình thực tế (screenshots) WebGL/DOM xác minh: (1) Intro không có bảng chọn gói, (2) Lên sân khấu không có bảng chọn gói, (3) Mở bảng chọn gói với hiệu ứng mũi tên căn giữa và zoom, (4) Xác nhận chọn gói chỉ hiện thông tin gói, (5) Host kích hoạt hiển thị câu hỏi 1.
- [ ] Đường dẫn các file ảnh chụp màn hình được cung cấp rõ ràng trong báo cáo nghiệm thu.

### Kiểm thử, Build & Triển khai VPS
- [ ] Toàn bộ kịch bản kiểm thử tự động mới và test suites hiện có chạy thành công (100% pass rate).
- [ ] Lệnh kiểm tra kiểu dữ liệu `npx tsc --noEmit` và lệnh build `npm run build` hoàn tất không có lỗi.
- [ ] Commit thay đổi sạch sẽ được push lên `origin/main` của `d:\Timeout Quiz`.
- [ ] Ứng dụng production trên VPS `https://quizorra.ddns.net` chạy đúng commit mới, `https://quizorra.ddns.net/api/health` trả về HTTP 200 (hoặc bàn giao commit sạch trên `origin/main` cho agent cha nếu thiếu SSH trực tiếp).
- [ ] Không có bất kỳ file nào bên ngoài thư mục `d:\Timeout Quiz` bị sửa đổi hoặc xóa bỏ; không lưu credentials vào git.

## 2026-11-11T09:39:55Z

[Message từ Agent cha]:
Agent cha đã định dạng và trình duyệt bản kế hoạch kỹ thuật cho người dùng, kèm lưu ý kỹ thuật quan trọng:
- `src/components/olympia/studio/useOlympiaCamera.ts` và `src/components/olympia/studio/Podiums.tsx` cần nhận diện trạng thái `vd.onStage === true` khi `vd.phase === "idle"` để thao tác "Lên sân khấu" kích hoạt chính xác hiệu ứng bước ra bục trung tâm và chuyển góc máy CAM 10 -> CAM 15 mượt mà mà tuyệt đối không mở bảng chọn gói.
- Nhóm tiếp tục dừng tại cổng phê duyệt (/plan), không chỉnh sửa mã nguồn cho đến khi nhận được phê duyệt chính thức từ người dùng. Hãy cập nhật lưu ý này vào `plan.md`.

## 2026-11-11T09:41:50Z

[CHỈ ĐẠO ĐẶC BIỆT QUAN TRỌNG TỪ NGƯỜI DÙNG CHO YÊU CẦU R3 - ZERO-CACHE & INDEX CÂU 0/N]:
"không chỉ ẩn câu hỏi, mà index câu hỏi vẫn duy trì ở 0, chỉ lên 1 khi đã nhấn chuyển câu lần đầu, hạn chế các lỗi bổ sung như chỉ ẩn nên vẫn tồn tại trong cache"

1. **Index câu hỏi duy trì ở 0 (như Khởi Động `Câu 0/N`)**:
   - Sau khi xác nhận gói (`phase === "packageReady"`), `qIdx` nội bộ PHẢI LÀ `-1` (giao diện hiển thị index 1-based là `0`, ví dụ: `0 / 3` hoặc `Câu 0/3`), TUYỆT ĐỐI KHÔNG ĐƯỢC LÀ `1` (`qIdx = 0`).
   - Index chỉ tăng từ `0` lên `1` (`qIdx: -1 -> 0`, hiển thị `1 / 3`) khi Host bấm nút "Chuyển câu" / "Bắt đầu câu" (hoặc phím tắt `N`) **lần đầu tiên**!
   - Tham chiếu cơ chế `qIdx = -1` / `Câu 0/6` của phần Khởi Động (`KhoiDong`) trong `engine.ts`, `DisplayScreen.tsx` và `HostConsole.tsx` để áp dụng chuẩn xác cho Về Đích; chú ý khi bấm "Chuyển câu" lần 1 phải vào đúng Câu 1 (không được nhảy cóc sang Câu 2).
2. **Không tồn tại trong cache (Zero-cache guarantee / Tuyệt đối không dùng CSS-hide)**:
   - Tuyệt đối không mount text, đáp án, media URL hay DOM nodes của Câu 1 trước (không dùng `hidden`, `opacity-0` hay pre-populate `current`).
   - `vd.current` PHẢI LÀ `null` và `qIdx = -1` cho đến khi action chuyển câu đầu tiên diễn ra.
   - Trong `getPublicState()` (dùng cho DisplayScreen và Player qua WebSocket): Bắt buộc xóa bỏ toàn bộ nội dung câu hỏi (`q`, `a`, `media`, `mediaType`, ...) của các câu chưa mở trong `vd.packages[seat]`, chỉ giữ lại `{ points }` (hoặc cờ used/revealed). Nhờ đó, trình duyệt không thể cache câu hỏi 1 qua payload WS hoặc DOM tree!
   - Khi chuyển lượt thí sinh (`vd:nextSeat`) hoặc reset (`vd:onStage` / `beginRound`), reset sạch state React cục bộ trong `DisplayScreen.tsx` / component con để không lưu vết câu hỏi cũ.
3. **Unit / Integration Tests bắt buộc**:
   - Viết assertion kiểm tra ngay sau `vd:confirmPackage`: `qIdx === -1` (hiển thị `0`), `current === null`, và `getPublicState()` chứa ZERO text/media của Câu 1.
   - Viết assertion kiểm tra khi Host bấm chuyển câu lần đầu: `qIdx` chuyển từ `-1` sang `0` (hiển thị `1`), và Câu 1 được nạp chính xác (không bị nhảy sang Câu 2).

## 2026-11-11T10:11:43Z

[CHỈ ĐẠO BẮT BUỘC VỀ GIAO DIỆN HIỂN THỊ VỀ ĐÍCH (DISPLAY UI)]:
"Lưu ý, phần Về đích không hiện Câu x/3 hoặc 4, lĩnh vực gì cả"

1. **Loại bỏ huy hiệu số câu (`Câu x/3` hoặc `Câu x/4`) trên Display Về đích**:
   - Trong `src/components/olympia/DisplayScreen.tsx:821-823` (bên trong `VeDich()` render `EconovaLowerThirdV3`): Xóa bỏ hoặc bỏ truyền prop `questionNumberBadge` (đặt thành `null` hoặc omit prop). Về Đích Display TUYỆT ĐỐI KHÔNG hiển thị `Câu x/3` hay `Câu x/4`.
2. **Loại bỏ hoàn toàn hiển thị lĩnh vực (`subject`) trên Display Về đích**:
   - Trong `DisplayScreen.tsx:824-828` (`EconovaLowerThirdV3` `headerBadge`) và `DisplayScreen.tsx:792-799` (`Vtv3ChalkboardQuestionFrame` `headerBadge`): Hiện đang dùng `cur.q.subject || "VỀ ĐÍCH"`. BẮT BUỘC LOẠI BỎ `cur.q.subject`, chỉ giữ tiêu đề vòng thi/điểm số (ví dụ: `VỀ ĐÍCH · ${cur.points} ĐIỂM` hoặc `${seatName(state, owner)} · VỀ ĐÍCH (${cur.points} điểm)`). Rà soát thêm `V3SingleAnswerBar` và các view liên quan đến Về đích để đảm bảo không rò rỉ bất kỳ chuỗi `subject` hay `Câu x/3` nào.
3. **Giữ nguyên Khởi Động (`KhoiDong`) & State logic nội bộ**:
   - Phần Khởi Động giữ nguyên vẹn không đụng chạm.
   - Logic FSM và HostConsole vẫn giữ `qIdx = -1` (về mặt logic là 0/3, Host bấm chuyển câu thì sang câu 1, zero-cache), nhưng trên giao diện Display/TV chiếu màn hình thì ẩn hẳn `Câu x/3` và ẩn hẳn `lĩnh vực`.
4. **Kiểm thử & Xác minh Screenshot #5**:
   - Thêm assertion kiểm tra DOM không chứa `Câu x/3`, `Câu x/4` và không chứa `subject` khi render Về Đích.
   - Đảm bảo trong screenshot #5 (`state_5_question1_active.png`) của Milestone 4 không có chuỗi `Câu 1/3` hay tên lĩnh vực nào xuất hiện.

## 2026-11-11T10:18:14Z

[YÊU CẦU ƯU TIÊN CHỤP SCREENSHOT ĐỒ HỌA VỀ ĐÍCH SỚM CHO NGƯỜI DÙNG - CẤP TỐC]:
"à mà screenshot đồ hoạ Về đích và gửi lên đây ngay, cấp tốc, để tôi dễ phản ánh lại ngay"

1. Agent cha đang tự động chụp ảnh baseline hiện tại để gửi cho người dùng.
2. Ngay khi Milestone 2 (Căn giữa mũi tên toán học + zoom 4 lớp + bảng gói căn giữa màn hình) hoàn tất mã nguồn, BẮT BUỘC chụp ngay ảnh chụp màn hình trung gian (intermediate screenshots) đồ họa mũi tên và bảng gói để gửi lên ngay lập tức cho người dùng nghiệm thu và phản hồi sớm trước khi chuyển sang các bước tiếp theo!

## 2026-11-11T10:28:55Z

[PHẢN HỒI GIAO DIỆN KHẨN CẤP TỪ NGƯỜI DÙNG KHI SOI SCREENSHOT - BẮT BUỘC SỬA TRONG MILESTONE 2]:
1. **Tên thí sinh dài bị tràn ô tab**:
   - Yêu cầu người dùng: *"có lỗi tên thí sinh chưa tự thu nhỏ chiều ngang (giữ nguyên chiều cao) khi quá dài so với chiều ngang ô chứa"*.
   - Xử lý: Áp dụng co chiều ngang (horizontal-only auto-fit) bằng transform scaleX (`scale(sx, 1)`, giữ nguyên `sy = 1` để không bị méo chiều cao chữ) khi chiều dài tên vượt quá bề rộng ô chứa trong tab.
2. **Tên thí sinh đầu (tab 0) không căn giữa ô**:
   - Yêu cầu người dùng: *"tên thí sinh đầu không căn giữa ô"*.
   - Xử lý: Căn giữa chuẩn xác theo trung điểm thực tế `(left(cy) + right(cy)) / 2`, `y={tab.cy}`, `dominantBaseline="central"`, không để padding/letterSpacing làm lệch ô đầu.
3. **Số điểm tổng trong cụm phải (cluster) của Về đích**:
   - Font chữ sai: Đang dùng `monospace` -> Đổi sang font sans đồng bộ (`Plus Jakarta Sans` / `sans-serif`, `fontWeight="900"`).
   - Chưa căn giữa: Tính tâm thực tế theo đường xiên tại `scoreCy`: `x = (lt.clusterX(scoreCy) + shell.edgeR(scoreCy)) / 2` và `y = scoreCy` với `dominantBaseline="central"`.
   - Màu chữ sai: Đang dùng vàng `#fbbf24` -> Chuyển thành **màu trắng** (`#ffffff`) kèm drop-shadow sắc nét.
4. **Hàng điểm từng câu ở đáy cụm phải (`20 | 30 | 30`) quá bé**:
   - Yêu cầu người dùng: *"số điểm từng câu bên dưới cũng bị bé quá"*.
   - Xử lý: Tăng chiều cao dải `packStrip` lên 42-44px và tăng cỡ chữ từ `13` lên **`20 - 22px`** (`fontWeight="900"`, `dominantBaseline="central"`, `font-sans`) để nổi bật, rõ ràng.

## 2026-11-11T10:38:58Z

[PHÁT HIỆN LỖI THỊ GIÁC: VĂN BẢN CÂU HỎI BỊ ĐÈ QUA ĐƯỜNG XIÊN VÀO CỤM ĐIỂM BÊN PHẢI]:
"đồng thời fix lỗi câu hỏi đôi khi bị lan ra cụm bên phải nữa"

1. **Nguyên nhân**:
   Trong `Vtv3BroadcastGraphics.tsx:2511`, `qRight = lt.clusterLine.x0 - 16` (`967.71px` tại đỉnh `y = 0`). Đường ngăn cách xiên `/` chéo sang trái tới `901.29px` tại đáy hộp câu hỏi (`y = 186`), độ dốc lệch tới `66.4px`. Các dòng câu hỏi nhiều dòng bị tràn qua vạch ngăn cách màu trắng, đè vào cụm điểm số bên phải.
2. **Xử lý bắt buộc trong Milestone 2**:
   - Giới hạn biên phải an toàn bằng đáy đường xiên: `qRight = Math.min(lt.clusterX(qTop), lt.clusterX(qBottom)) - 18`, kết hợp thêm `clipPath` dạng đa giác xiên an toàn và `overflow: hidden`.
   - Tuyệt đối không để bất kỳ ký tự nào của câu hỏi vượt qua hay chạm vào vạch xiên ngăn cách cụm điểm phải.
   - Kiểm tra tương tự trên `Vtv3ChalkboardQuestionFrame` (`o26_classic`) để chữ không tràn ra ngoài khung.
   - Xác minh trực quan bằng test case câu hỏi dài trên screenshot Milestone 2!


## 2026-11-11T11:17:01Z

[CHỈ ĐẠO QUAN TRỌNG TỪ AGENT CHA SAU KHI SOI 2 ẢNH M2]:
Agent cha đã trực tiếp kiểm tra 2 ảnh screenshot M2 và xác nhận các lỗi thị giác đã được sửa rất tốt (`QUANG MINH` căn giữa tab 0, `285` trắng đậm căn giữa cụm xiên, dải `20|30|30` sắc nét, câu hỏi nhiều dòng không bị đè vạch xiên).

Đồng thời yêu cầu Orchestrator thực hiện 3 chỉ đạo quan trọng cho các bước tiếp theo:
1. **Không commit ảnh screenshot vào `public/screenshots/` của repo git**:
   - Lưu các ảnh screenshot nghiệm thu M4 vào thư mục artifact bên ngoài repo (`C:\Users\khanh\.gemini\antigravity\brain\aac021ca-ce70-48a4-b3be-d09545e52c3f\screenshots\` hoặc dọn dẹp sạch `public/screenshots/` trước khi git commit) để giữ repo git tuyệt đối sạch sẽ.
2. **Kiểm tra trực quan chế độ 6-8 thí sinh**:
   - Xác minh thuật toán `scale(sx, 1)` hoạt động hoàn hảo khi có 6 đến 8 thí sinh, đảm bảo tên thí sinh không đè hoặc chạm vào vách ngăn xiên.
3. **Chụp đầy đủ hoạt ảnh mũi tên & bảng gói căn giữa trên Display 3D ở Milestone 4**:
   - Ở trạng thái 3 (`state_3_arrows_package` hoặc `state_3a`/`state_3b`), chụp cả hoạt ảnh cặp mũi tên đang bay vào giữa màn hình (mid-animation centered zoomed twin arrows) trên live Display VÀ bảng chọn gói đã mở căn giữa toàn màn hình trên sân khấu 3D (không bị ép xuống lower-third).


## 2026-11-11T11:20:56Z

[PHẢN HỒI GẤP CỦA NGƯỜI DÙNG VỀ NGÔI SAO HY VỌNG TRÊN THANH CÂU HỎI VỀ ĐÍCH]:
Người dùng vừa xem ảnh `vd_qbox_typography.png` và phản hồi khẩn cấp:
"ngôi sao hy vọng lơ lửng thế, nó phải có kích cỡ khá to, và nằm trên cụm phải, không treo lơ lửng thế kia"

Nguyên nhân và cách xử lý cụ thể:
1. `HopeStarBadge.tsx` là video WebM 480x480 có vùng aura phát sáng rộng gấp đôi, nên `size={76}` làm lõi ngôi sao vàng thực tế chỉ còn ~34px, quá bé!
   -> Tăng kích thước `HopeStarBadge` lên `size={156}` đến `size={168}` (để lõi sao vàng đạt kích cỡ to rõ ~75-84px).
2. Code hiện tại đặt `{ top: -24, right: 12 }` theo `shell.canvasW` (1244px), trong khi cánh phải chỉ kéo dài đến `shell.endX` (1122px). Vì vậy ngôi sao bị trôi ra ngoài vùng đen trống không (x ≈ 1156-1232px), hoàn toàn lơ lửng ngoài cụm phải!
   -> Neo ngôi sao trực tiếp ngự trên đỉnh cụm điểm phải (crowning the right cluster):
   - Căn ngang theo trung tâm cạnh trên của cụm phải: `starCx = isVeDich && lt.clusterX ? (lt.clusterX(0) + shell.edgeR(0)) / 2 : shell.endX - 60` -> `left: starCx - starSize / 2`.
   - Căn dọc đặt ngay trên mép trên của cụm điểm phải (`top: -starSize * 0.44` hoặc tâm `y ≈ 8..14`), để ngôi sao vàng ngự ngay trên đỉnh cụm điểm phải phía trên điểm số `285` (không che điểm 285) và tuyệt đối không lơ lửng ngoài vùng đen.
   - Kiểm tra tương tự trên `V3SingleAnswerBar` nếu có ngôi sao hy vọng.
3. Chụp ngay ảnh `vd_qbox_typography.png` mới và gửi lên ngay để người dùng kiểm tra trực quan!


## 2026-11-11T11:42:36Z

[CHỈ ĐẠO BỔ SUNG QUAN TRỌNG CHO MILESTONE 4 - HOẠT ẢNH MŨI TÊN TRÊN BẢNG CHỌN GÓI & TRÁNH REMOUNT]:
1. **Bổ sung hoạt ảnh cặp mũi tên cho `VeDichSlantedGridGraphic`**:
   - `VeDichSlantedGridGraphic` (`Vtv3BroadcastGraphics.tsx:3069-3174`) hiện vẫn render SVG tĩnh, CHƯA có hoạt ảnh cặp mũi tên bay vào khi Host bấm "Mở bảng chọn gói"!
   - Thêm prop `animate?: boolean` (mặc định `true` trên live `DisplayScreen`).
   - Tái sử dụng trọn vẹn bộ cánh mũi tên 4 lớp (`g1`, `g2`, `l3`, `navy`) với `dc = shell.W / 2`, `--v3-travel = Math.max(canvasW, 1400)`, `transform-box: fill-box; transform-origin: center;`, zoom `scale(0.15) -> 1.15 -> 1.0`, hiệu ứng mở từ tâm `v3-eco-hex-body` và fade-in cho capsule tiêu đề.
2. **Khắc phục lỗi remount trong `DisplayScreen.tsx`**:
   - Trong `DisplayScreen.tsx`, component bọc `VeDichSlantedGridGraphic` KHÔNG được dùng `key` chứa `vd.phase` (vì khi chuyển từ `choosing` sang `packageReady`, nếu key đổi thì React sẽ remount lại và chạy lại hoạt ảnh mũi tên từ đầu hoặc bị chớp giật).
   - Dùng `key={`pkg-grid-${owner}-${vd.turnIdx}`}` để khi bấm "Mở bảng chọn gói" thì mũi tên bay vào mở bảng gói mượt mà, và khi xác nhận gói chuyển sang `packageReady` thì bảng gói giữ nguyên hiển thị các ô đỏ đã chọn một cách liên tục, không bị chớp hay giật lại.
3. **Chụp ảnh kiểm chứng bổ sung ở Milestone 4**:
   - Trạng thái 3: Chụp cả `state_3a_arrows_converging.png` (khoảnh khắc mũi tên đang bay vào giữa khoảng 0.6s-0.8s) VÀ `state_3b_arrows_package.png` (bảng chọn gói đã mở hoàn tất căn giữa toàn màn hình trên sân khấu 3D).
   - Trạng thái 5: Chụp với cấu hình 6-8 thí sinh để chứng minh `scale(sx, 1)` hoạt động hoàn hảo và HopeStar ngự đỉnh cụm điểm.
