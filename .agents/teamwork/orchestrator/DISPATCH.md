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
