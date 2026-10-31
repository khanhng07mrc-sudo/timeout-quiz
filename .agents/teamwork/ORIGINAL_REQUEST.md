# Original User Request

## Approved Task Prompt — 2026-10-31T01:34:02Z

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

## Acceptance Criteria

### Bố cục sân khấu 3D & Nhận diện
- [ ] Không gian trường quay 3D tương tác hiển thị và vận hành mượt mà trong ứng dụng web Timeout Quiz.
- [ ] Màn LED trung tâm rộng rãi, thể hiện độ tương phản sáng tối hiện đại theo phong cách quốc tế.
- [ ] Logo Olympia từ file `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` hiển thị chính xác cùng chữ gradient vàng sáng - tối bên dưới.
- [ ] Đầy đủ 1 bục MC, 4 bục thí sinh và khu vực đặt vòng nguyệt quế trên sân khấu 3D.

### Kịch bản chiếu sáng và Hiệu ứng Fade
- [ ] Trạng thái chung ngoài thi đấu hiển thị ánh sáng tông màu xanh dương chủ đạo.
- [ ] Phần Khởi động: Đèn chuyển sang màu đỏ khi bắt đầu lượt thi, tự động quay về màu xanh khi kết thúc lượt thi.
- [ ] Phần Vượt chướng ngại vật và Tăng tốc: Đèn chuyển sang màu đỏ sau 2 - 3 giây kể từ khi bắt đầu vòng thi.
- [ ] Phần Về đích: Đèn đỏ kích hoạt từ khi thí sinh bước lên sân khấu tới khi hoàn thành lượt thi, sau đó quay lại màu xanh.
- [ ] Quá trình chuyển đổi đèn diễn ra từ từ: cụm màn hình bên trong fade trước, cụm đèn sau sân khấu và khán giả fade sau.

### Tín hiệu Chuông bục thí sinh
- [ ] Phần Khởi động, Về đích, Câu hỏi phụ: Bục của thí sinh bấm chuông phát sáng màu đỏ.
- [ ] Phần Vượt chướng ngại vật: Khi nhiều thí sinh cùng bấm chuông, chỉ duy nhất bục của thí sinh bấm nhanh nhất phát sáng màu đỏ.

### Kiểm thử và An toàn
- [ ] Hoàn thành quy trình kiểm tra trực quan (visual walkthrough) và tương tác kiểm chứng đạt tất cả các tiêu chí trên.
- [ ] Không có bất kỳ tệp tin nào bên ngoài thư mục `d:\Timeout Quiz` bị xóa.
