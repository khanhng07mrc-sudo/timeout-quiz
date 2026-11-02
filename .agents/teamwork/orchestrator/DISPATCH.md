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
