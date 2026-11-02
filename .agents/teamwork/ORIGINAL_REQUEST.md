# Original User Request

## Initial Request — 2026-11-01T06:27:36Z

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

## Acceptance Criteria

### Bố cục Backdrop Panorama & Cổng vòm
- [ ] Bức tường backdrop phía sau khán đài (Z = 5.05m) tạo thành vòm trụ cong panorama bao bọc liền mạch toàn bộ khán đài khán giả, không còn là mặt phẳng phẳng lì.
- [ ] 4 tầng cổng vòm thể hiện đúng kích thước, màu sắc và thứ tự: Cung 1 (ngà ấm, lớn #3), Cung 2 (vách đệm tối bé nhất), Cung 3 (đen bóng lớn nhất), Cung 4 (ngà ấm cao nhất 5.2m).

### Địa hình núi, Đường lên đỉnh và Chi tiết sân khấu
- [ ] Đường lên đỉnh núi thể hiện rõ thung lũng / hẻm núi phát sáng hữu cơ uốn lượn mượt mà giữa các triền núi, triệt để loại bỏ đường line thô cứng và lỗi thác nước đổ ra từ lều rỗng.
- [ ] Dãy núi hiển thị nhiều đỉnh nhọn, sườn hiểm trở, nhiều chông gai với lưới wireframe, vertex nodes phát sáng và các mảng đa giác xanh lam sáng tối tương phản.
- [ ] Đỉnh núi có đèn beacon toả sáng dịu và lá cờ chìm đuôi nheo bán trong suốt màu lam nhạt/trắng tung bay sang phải trên cột cờ thanh mảnh.
- [ ] Hộp đèn Quizorra và huy hiệu Olympia có 2 chân trụ thẳng đứng cắm cố định xuống bục plinth, không trôi nổi.

### Kiểm thử và Xác minh Đồ họa
- [ ] Chụp ảnh màn hình tự động các góc quay camera chính: Cam 11 (khán đài khán giả), Cam 12, góc bục MC và góc toàn cảnh bao quát cổng vòm / đỉnh núi.
- [ ] So sánh trực quan các ảnh chụp màn hình với ảnh phát sóng tham chiếu (`media_1793509491924_ff35bde5.jpg`) để xác nhận tất cả 6 điểm phản hồi của người dùng đều được khắc phục thỏa đáng.
- [ ] Không có tệp tin nào bên ngoài thư mục `d:\Timeout Quiz` bị xoá và không có tệp hiện hữu nào bị xoá ngoài ý muốn.
