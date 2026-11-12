# Original User Request

## Initial Request — 2026-11-12T17:51:02Z

Khắc phục lỗi giật lag và đảm bảo công bằng tuyệt đối cho nút bấm chuông, xử lý dứt điểm lỗi lặp vô tận âm thanh mở đầu và giới thiệu thí sinh, chuẩn hóa toàn diện các luồng thao tác và đồ họa vòng Vượt chướng ngại vật (nút ô trống, nền chờ đáp án, clear câu hỏi sau chấm, lọc bỏ số chữ cái thừa, hiển thị đáp án trống không có dấu gạch ngang, định dạng và thứ tự tín hiệu chuông CNV), tăng cỡ chữ câu hỏi khi Full Screen, kiểm thử tự động toàn diện và triển khai lên GitHub cùng VPS production.

Working directory: d:\Timeout Quiz
Integrity mode: development

STRICT CONSTRAINT: Tuyệt đối không chỉnh sửa hoặc xóa bất kỳ file nào bên ngoài thư mục `d:\Timeout Quiz` (chỉ được đọc các thư mục bên ngoài để tham khảo và phân tích logic). Không xóa hoặc sửa đổi nội dung khối quy tắc trong `d:\Timeout Quiz\AGENTS.md`. Tuyệt đối không ghi thông tin SSH credentials hoặc secret keys vào git.

## Reference Material
- Repository: `d:\Timeout Quiz`
- Production VPS: `103.161.180.142` (`https://quizorra.ddns.net`)
- Hình ảnh tham chiếu giao diện lỗi:
  + `C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794503471542_821139d1.jpg`: Giao diện Host Console & Sandbox màn hình bảng đáp án hiển thị dấu `-` khi thí sinh chưa trả lời.
  + `C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794503658809_093139c9.jpg`: Màn hình Display VCNV có câu hỏi kèm `(9 chữ cái)` bị sai/thừa và cỡ chữ câu hỏi góc dưới bên trái bị bé khi full screen.
  + `C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794503738168_83bc6311.jpg`: Tín hiệu chuông CNV có icon chuông và cần chuẩn hóa thứ tự từ trái sang phải.

## Requirements

### R1. Khắc phục triệt để lỗi âm thanh lặp vô tận
- Sửa dứt điểm lỗi nhạc mở đầu cuộc thi khi nhấn nút "Bắt đầu trò chơi" bị lặp vô tận (infinite loop); nhạc chỉ phát 1 lần hoặc dừng đúng khi kết thúc/chuyển trạng thái.
- Sửa dứt điểm lỗi nhạc giới thiệu thí sinh bị lặp vô tận; đảm bảo dừng/ngắt đúng sự kiện.

### R2. Khắc phục giật lag và đảm bảo công bằng tuyệt đối cho nút bấm chuông
- Khắc phục triệt để tình trạng giật lag ở Sandbox và phòng đấu chính.
- Khắc phục lỗi nút chuông sáng sớm hơn thời gian quy định (2s hoặc 5s, sớm hơn vài trăm ms) gây mất công bằng cho các thí sinh.
- Phân tích và tối ưu hóa toàn diện luồng socket, trạng thái UI và cơ chế đồng bộ server-timestamp/countdown giữa server và client: nút chuông chỉ được mở đồng bộ và chỉ cho phép ghi nhận tín hiệu chuông sau khi server phát cờ cho phép bấm chuông.

### R3. Chuẩn hóa luồng nút "Ô trống", "Nền chờ đáp án" và đọc câu hỏi vòng VCNV
- Khi nhấn nút "Mở Câu Hỏi": hệ thống phải kích hoạt đọc câu hỏi theo đúng luồng.
- Khi nhấn nút "Ô trống": hệ thống phải phát âm thanh ô trống, không đọc câu hỏi và tuyệt đối không bị văng ra trường quay 3D.
- Khi nhấn nút "Nền chờ đáp án": hệ thống phải hiển thị đúng background bảng đáp án (nền chờ trước khi hiện đáp án), tuyệt đối không bị văng về trường quay 3D.

### R4. Chuẩn hóa hiển thị bảng đáp án thí sinh và dọn dẹp câu hỏi sau khi chấm hàng ngang
- Trên bảng hiển thị đáp án thí sinh (Host Console, Sandbox, Display): nếu thí sinh không gửi câu trả lời thì phải để trống hoàn toàn, tuyệt đối không hiển thị ký tự dấu gạch ngang `-`.
- Sau khi Host nhấn "Cộng điểm HN" hoặc "Sai / Không ĐA" ở hàng ngang VCNV, hệ thống phải tự động xóa/clear nội dung câu hỏi khỏi đồ họa hiển thị trên màn hình Display.

### R5. Chuẩn hóa nội dung câu hỏi VCNV và tối ưu cỡ chữ Full Screen
- Tự động loại bỏ chuỗi hiển thị số chữ cái trong ngoặc `(X chữ cái)` ở cuối nội dung câu hỏi VCNV ở tầng render hiển thị đồ họa Display, tránh gây bối rối và mâu thuẫn với số ô tròn chữ cái của hàng ngang.
- Tăng kích thước phông chữ linh hoạt (responsive/adaptive text size, tăng khoảng 1.2x - 1.5x) cho khung hiển thị câu hỏi (quadrant góc dưới bên trái của DisplayScreen) khi trình chiếu full screen để đảm bảo to rõ, dễ đọc và tự co giãn không tràn khung khi câu hỏi dài.

### R6. Định dạng và sắp xếp tín hiệu chuông VCNV
- Tín hiệu chuông xin trả lời Chướng ngại vật (CNV) ở vòng VCNV: loại bỏ hoàn toàn icon chuông (chỉ hiển thị tên thí sinh) và sắp xếp thứ tự bấm từ trái sang phải (thí sinh bấm đầu tiên nằm ở ngoài cùng bên trái).
- TUYỆT ĐỐI GIỮ NGUYÊN định dạng tín hiệu chuông bằng shape màu đỏ ở các vòng thi khác (Khởi động, Về đích, Câu hỏi phụ, v.v.), không can thiệp hoặc thay đổi các vòng này.

### R7. Kiểm thử tự động, Push GitHub và Deploy VPS Production
- Chạy toàn bộ test suites hiện có (`npm test`, `npm run test:olympia`) và bổ sung automated test / kịch bản kiểm thử mô phỏng để xác minh tính đồng bộ của socket chuông, âm thanh không bị lặp, luồng nút VCNV và UI render.
- Kiểm tra typecheck (`npx tsc --noEmit`) và build thành công (`npm run build`).
- Commit sạch sẽ toàn bộ thay đổi lên nhánh `origin/main` của repository `d:\Timeout Quiz`.
- Triển khai thành công lên VPS production `103.161.180.142` (`https://quizorra.ddns.net`) qua script `deploy-vps.sh` và xác nhận endpoint `https://quizorra.ddns.net/api/health` trả về HTTP 200 tương ứng với commit mới nhất. Nếu agent không có quyền SSH trực tiếp tới VPS, chuẩn bị commit sạch đã push lên `origin/main` và bàn giao lại cho agent cha thực hiện deploy.
