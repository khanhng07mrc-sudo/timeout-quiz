# Original User Request

## Approved Task Prompt — 2026-11-16T13:25:00Z

Tự xây dựng và kết xuất hoàn chỉnh bộ 4 video intro WebM 3D (thời lượng 7.66s khớp âm thanh section_intro.mp3) cho 4 vòng thi Olympia (Khởi Động, Vượt Chướng Ngại Vật, Tăng Tốc, Về Đích) theo chuẩn bản mẫu phát sóng VTV3, loại bỏ hoàn toàn đồ hoạ banner cũ trên tất cả các theme, điều phối chuyển cảnh camera trường quay 3D mượt mà không bị che đè sau khi hết intro; loại bỏ intro cho phần Câu Hỏi Phụ và đồng bộ triệt để cài đặt số lượng câu hỏi phụ từ giao diện bên ngoài vào trong phòng thi.

Working directory: d:\Timeout Quiz
Integrity mode: development
The team must NOT: Sửa đổi hoặc xoá bất kỳ tệp tin nào nằm ngoài thư mục d:\Timeout Quiz.

Tài liệu và hình ảnh tham chiếu:
- Tệp âm thanh hiệu ứng vòng thi: `public/olympia-audio/O26/6_NhacKhac/section_intro.mp3` (7.66 giây, nguồn O21.ogg).
- Ảnh tham chiếu phát sóng VTV3:
  * 0.0s - 3.5s (`media_1794830018660_40c1c697.jpg`, `media_1794830022997_427e26f8.jpg`): Không gian 3D đỏ thẫm crimson với bokeh hạt vàng lấp lánh; trụ ngôi sao pha lê / cúp 3D xoay quanh trục khi camera lia từ đế pha lê phía dưới lên trên thân cột lõi vàng.
  * 3.5s - 4.8s (`media_1794830027685_4f53df5d.jpg`, `media_1794830032368_84b772ca.jpg`): Camera chạm đỉnh ngôi sao pha lê; hiệu ứng loé sáng kim vàng (golden lens flare) bùng nổ mạnh mẽ.
  * 4.8s - 7.66s (`media_1794830037648_2495e0a6.jpg`): Chuyển cảnh sang Vòng nguyệt quế vàng 3D ôm quanh đỉnh núi Olympia với ánh mặt trời loé sáng ở đỉnh, khối chữ tên phần thi ("KHỞI ĐỘNG", "VƯỢT CHƯỚNG NGẠI VẬT", "TĂNG TỐC", "VỀ ĐÍCH") mạ vàng 3D extruded bắn/lao ra và định vị bên dưới vòng nguyệt quế trên nền hạt đỏ thẫm.
- Ảnh phản hồi giao diện thực tế: `media_1794834817327_cc7e6c9b.jpg` (vẫn còn biển bảng chữ nhật cũ của O26 Cổ Điển đè lên trường quay).

## Requirements

### R1. Tự thiết kế và kết xuất 4 video intro WebM 3D chuẩn VTV3 (7.66s) cho 4 vòng thi
Xây dựng script 3D (sử dụng Three.js/Canvas trong Node.js hoặc công cụ render) tự thực hiện trọn vẹn quy trình tạo hiệu ứng đồ hoạ: không gian nền 3D đỏ thẫm crimson với bokeh hạt vàng lấp lánh, trụ ngôi sao pha lê xoay quanh trục khi camera lia từ chân đế pha lê lên đỉnh, hiệu ứng bùng nổ loé sáng kim vàng (lens flare) ở đỉnh ngôi sao, chuyển cảnh sang vòng nguyệt quế vàng 3D ôm quanh đỉnh núi Olympia với vầng sáng mặt trời, và khối chữ 3D extruded tên phần thi mạ vàng ("KHỞI ĐỘNG", "VƯỢT CHƯỚNG NGẠI VẬT", "TĂNG TỐC", "VỀ ĐÍCH") bắn ra định vị bên dưới vòng nguyệt quế. Kết xuất thành 4 tệp video `.webm` độc lập lưu tại `public/olympia-intro/` (`khoi_dong.webm`, `vuot_chuong_ngai_vat.webm`, `tang_toc.webm`, `ve_dich.webm`), khớp chính xác 7.66s với âm thanh `public/olympia-audio/O26/6_NhacKhac/section_intro.mp3`, tối ưu dung lượng và phát mượt mà, không giật lag.

### R2. Tích hợp phát video intro trên DisplayScreen và loại bỏ hoàn toàn đồ hoạ bảng cũ trên mọi theme
Tích hợp phát video WebM tương ứng trên màn hình phát sóng (DisplayScreen) cùng âm thanh intro khi Host bắt đầu phần thi trên toàn bộ các theme (`o26_classic`, `o26_modern`, `v3_arrow`). Loại bỏ hoàn toàn đồ hoạ bảng chữ nhật/thanh gỗ Framer Motion cũ trên mọi theme để đảm bảo không còn hiện tượng hiển thị bảng cũ đè lên trường quay. Riêng phần thi Câu Hỏi Phụ (`cauHoiPhu`), tuyệt đối không phát video intro, không phát âm thanh intro và không hiển thị banner mở đầu.

### R3. Điều phối camera trường quay 3D tự động chạy sau khi hết intro và không bị che đè
Khi thời lượng 7.66s của video intro kết thúc, lớp phủ video lập tức ẩn/unmount sạch sẽ, không để lại bất kỳ thành phần đồ hoạ, banner hay overlay nào che đè lên trường quay 3D. Ngay khi đó, hệ sinh thái camera tự động của trường quay 3D (`OlympiaStudio3DScene` / `CameraController`) mới bắt đầu kích hoạt chuỗi chuyển động quay quét (pan / orbit toàn cảnh sân khấu hoặc góc rộng) cho đến khi MC/Host bắt đầu câu hỏi thi đấu.

### R4. Đồng bộ triệt để cài đặt số lượng câu hỏi phụ (chpQuestionLimit) từ ngoài vào trong phòng thi
Đồng bộ cài đặt giới hạn số câu hỏi phụ (`chpQuestionLimit`: 3 câu chuẩn VTV3 hoặc Không giới hạn) từ giao diện bên ngoài (Lobby / Tạo phòng / Cài đặt phòng / Sandbox) thông suốt qua `socket-olympia` vào trạng thái phòng của máy chủ và truyền xuống `OlympiaGame`, `HostConsole`, `PlayerPad`, `DisplayScreen`. Đảm bảo khi Host thay đổi cài đặt này trong phòng thì tự động cập nhật ngược lại về server và đồng bộ tới tất cả các máy trong phòng, tránh mâu thuẫn hay lệch cấu hình.

## Verification Resources
- Tệp âm thanh gốc: `public/olympia-audio/O26/6_NhacKhac/section_intro.mp3` (7.66s).
- 4 tệp video WebM kết xuất kiểm tra tại: `public/olympia-intro/khoi_dong.webm`, `public/olympia-intro/vuot_chuong_ngai_vat.webm`, `public/olympia-intro/tang_toc.webm`, `public/olympia-intro/ve_dich.webm`.
- Ảnh tham chiếu VTV3: `C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794830018660_40c1c697.jpg`, `media_1794830022997_427e26f8.jpg`, `media_1794830027685_4f53df5d.jpg`, `media_1794830032368_84b772ca.jpg`, `media_1794830037648_2495e0a6.jpg`.
- Bộ kiểm thử tự động của dự án: `npm run test:olympia`, `tsc --noEmit` (hoặc `npm run type-check`), `npm run build`, và script kiểm thử Playwright/Puppeteer tự động chụp màn hình và xác thực sự kiện kết thúc intro / chuyển động camera.

## Acceptance Criteria

### Video Intro WebM 3D & Đồng bộ Âm thanh
- [ ] 4 video WebM được tạo từ quy trình script 3D tự dựng hoàn chỉnh (nền crimson hạt vàng, trụ pha lê xoay quanh trục, camera lia từ dưới lên, bùng nổ lens flare ở đỉnh, vòng nguyệt quế và chữ 3D bắn ra), không cắt ghép video có sẵn từ YouTube.
- [ ] 4 tệp video tồn tại tại `public/olympia-intro/` (`khoi_dong.webm`, `vuot_chuong_ngai_vat.webm`, `tang_toc.webm`, `ve_dich.webm`) với thời lượng đúng 7.66 giây, khớp với `section_intro.mp3`.
- [ ] Phát video WebM đồng bộ trên tất cả các theme (`o26_classic`, `o26_modern`, `v3_arrow`); không còn xuất hiện đồ hoạ biển bảng gỗ/khung chữ nhật cũ trên bất kỳ theme nào.

### Trải nghiệm Sau Intro & Trường quay 3D
- [ ] Sau khi video intro 7.66s kết thúc, video unmount/ẩn hoàn toàn, không còn bất kỳ overlay hay banner nào che chắn màn hình trường quay 3D.
- [ ] Chuyển động quay quét tự động của camera trường quay 3D (pan/orbit toàn cảnh) được kích hoạt ngay sau khi video intro kết thúc và duy trì cho tới khi Host mở câu hỏi.
- [ ] Phần thi Câu Hỏi Phụ (`cauHoiPhu`) không phát video intro, không phát âm thanh intro và không hiện banner mở đầu.

### Đồng bộ Cài đặt Câu Hỏi Phụ
- [ ] Cài đặt giới hạn số câu hỏi phụ (`chpQuestionLimit`) được truyền chính xác từ Lobby / Tạo phòng / Sandbox qua socket server vào phòng thi.
- [ ] Trạng thái `chpQuestionLimit` đồng bộ nhất quán giữa HostConsole, PlayerPad và DisplayScreen; khi Host cập nhật trong phòng, server nhận và phản hồi đồng bộ lại cho các bên mà không bị xung đột hay reset sai lệch.

### Kiểm thử, An toàn File & Chất lượng Mã nguồn
- [ ] Mọi thao tác chỉnh sửa và tạo mới tệp tin chỉ nằm trong phạm vi thư mục `d:\Timeout Quiz`, tuyệt đối không sửa hoặc xoá file bên ngoài.
- [ ] Kiểm tra kiểu tĩnh `tsc --noEmit` hoặc `npm run type-check` đạt 0 lỗi.
- [ ] Toàn bộ bài test trong `npm run test:olympia` đều Pass.
- [ ] Lệnh `npm run build` hoàn thành thành công.


## Follow-up — 2026-11-16T13:32:38Z

User yêu cầu bổ sung:
"bất kỳ sản phẩm nào được tạo ra cần ghi rõ link file đầy đủ để dễ theo dõi"

Trong mọi báo cáo tiến độ và báo cáo bàn giao cuối cùng, bất kỳ tệp tin sản phẩm nào được tạo ra hoặc chỉnh sửa (video `.webm`, script render, ảnh chụp màn hình kiểm chứng, file source code, bài test...) đều phải đính kèm đường dẫn tuyệt đối đầy đủ dạng markdown link `[tên_file](file:///d:/Timeout%20Quiz/...)` để user có thể click mở trực tiếp ngay lập tức.

## Follow-up — 2026-11-16T13:32:57Z

User yêu cầu bổ sung quy định nghiêm ngặt về báo cáo:
"bất kỳ sản phẩm nào được tạo ra cần ghi rõ link file đầy đủ để dễ theo dõi"

Yêu cầu: Trong mọi báo cáo tiến độ và báo cáo bàn giao cuối cùng (cũng như kết quả bàn giao của các workers), bất kỳ tệp tin sản phẩm nào được tạo ra hoặc chỉnh sửa (video `.webm`, script render, ảnh chụp màn hình kiểm chứng, file source code, bài test...) đều phải đính kèm đường dẫn tuyệt đối đầy đủ dạng markdown link `[tên_file](file:///d:/Timeout%20Quiz/...)` để người dùng có thể click mở trực tiếp ngay lập tức!


## Follow-up — 2026-11-16T14:32:15Z

CẬP NHẬT QUAN TRỌNG TỪ USER (về chất lượng đồ hoạ 4 video WebM ở Milestone M1):

User vừa xem video render đầu tiên và gửi 4 ảnh đối chiếu (`C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794838971012_40216fc0.jpg`, `media_1794838978621_fa2574e8.jpg`, `media_1794839032065_0069fa7d.jpg`, `media_1794839051269_10063cdf.jpg`) kèm yêu cầu:
"chưa ổn bạn nhé, góc nhìn vòng nguyệt quế nó phải dốc xuống chút, có tia sáng xung quanh, cái đỉnh cúp có dạng ngôi sao, tức là vốn dĩ vòng nguyệt quế phải làm dạng ngôi sao nhô dày, sau đó mới lên như ảnh 1, nhưng phần chữ tên phần thi phải sửa lại độ sáng, vòng nguyệt quế quá to, tia sáng không khớp, sửa hết"

Chi tiết cần đảm bảo trong `scripts/intro-scene-builder.mjs` và kết xuất lại cả 4 file `.webm`:
1. **Đế cúp & Thân cúp (0.0s - 2.2s, đối chiếu `media_1794839032065_0069fa7d.jpg`)**:
   - Đế dưới là khối cầu pha lê (crystal dome/globe) trong suốt phản xạ ánh bạc/trắng/đen kim cương (tuyệt đối không phải bệ bát giác màu hồng).
   - Thân cúp vươn lên từ quả cầu pha lê gồm các thanh/cánh pha lê vát cạnh trong suốt mở rộng dần lên trên, kèm các dải hạt sáng vàng chạy dọc theo cạnh pha lê.
2. **Đỉnh cúp ngôi sao pha lê nhô dày (2.2s - 4.2s, đối chiếu `media_1794839051269_10063cdf.jpg`)**:
   - Đỉnh cúp là khối **ngôi sao 5 cánh pha lê 3D nhô dày** (extruded dày + mặt vát kim cương sắc nét từ tâm ra 5 đỉnh, độ tương phản phản xạ pha lê đen/bạc/trắng lấp lánh như pha lê thật, có đường tia vàng dọc chính giữa).
   - Toàn bộ đỉnh nhọn trên cùng của ngôi sao phải nằm gọn trong khung hình (không bị cắt mất đỉnh trên) và có điểm loé sáng lens flare vàng-đỏ kèm tia sáng khớp ngay tại đỉnh nhọn trên cùng của ngôi sao.
3. **Vòng nguyệt quế + Đỉnh núi + Tia sáng + Chữ 3D tên phần thi (4.2s - 7.66s, đối chiếu `media_1794830037648_2495e0a6.jpg`)**:
   - **Kích cỡ vòng nguyệt quế**: Phải thu gọn vừa vặn ở trung tâm phía trên (chiếm khoảng 28-32% chiều cao màn hình, tuyệt đối không quá to hay chạm mép trên), phần đỉnh vòng nguyệt quế hở tự nhiên (không có vệt vòng tròn nối liền 2 đầu lá trên cùng).
   - **Góc nhìn vòng nguyệt quế**: Có độ nghiêng/dốc xuống 3D (`rotation.x`) và có hiệu ứng chuyển động 3D rõ nét, kèm **tia sáng xung quanh** (radial light rays / flare) và điểm mặt trời loé sáng khớp chính xác ngay trên đỉnh chóp núi Olympia.
   - **Độ sáng chữ 3D tên phần thi (`KHỞI ĐỘNG`, `VƯỢT CHƯỚNG NGẠI VẬT`, `TĂNG TỐC`, `VỀ ĐÍCH`)**: Phải sáng rực màu vàng kim champagne (`#ffe885` / `#f5c84c`), nổi khối 3D sắc nét, tuyệt đối không bị tối xỉn màu nâu như bản cũ.

Hãy cập nhật `scripts/intro-scene-builder.mjs`, render lại toàn bộ 4 file `.webm` (`khoi_dong.webm`, `vuot_chuong_ngai_vat.webm`, `tang_toc.webm`, `ve_dich.webm`), kiểm tra từng frame bằng mắt và hoàn tất luôn M2, M3, M4!


## Follow-up — 2026-11-16T14:48:36Z

YÊU CẦU KHẨN TỪ USER (`/goal /plan /grill-me /teamwork`):
User vừa gửi 2 ảnh chụp (`C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794840368859_ae4e1d3d.jpg`, `C:/Users/khanh/.gemini/antigravity/brain/aac021ca-ce70-48a4-b3be-d09545e52c3f/.user_uploaded/media_1794840408658_e03158f8.jpg`) và yêu cầu:

"nó vẫn chưa được bạn ơi, vẫn còn sao độc lập, góc quay chưa chuẩn, phân tích kỹ file olympia real cái mà làm, tia sáng cũng chưa hợp lý, sau khi cúp ngôi sao bay xuống gần hết thì cái vòng nguyệt quế, tên phần thi các kiểu toàn cụm sẽ fly in xuống, phân tích hết đi rồi hỏi lại"

HƯỚNG DẪN XỬ LÝ:
1. Phân tích kỹ file video Olympia thực tế (Real Reference Video) tại `D:\Olympia 26\public\olympia-intro\raw_intro.webm` (và `clean_intro.webm`). Trích xuất chuỗi frame liên tiếp (mỗi 0.25s từ 0.0s đến 7.66s) vào `d:\Timeout Quiz\.agents\teamwork\` và phân tích trực tiếp từng frame:
   - Cấu trúc hình học thật sự của Cúp Pha Lê: Toàn bộ thân cúp là một khối trụ lăng kính ngôi sao pha lê nguyên khối vươn thẳng từ quả cầu đế lên đỉnh nhọn trung tâm (không gắn sao độc lập trên đầu thanh trụ).
   - Chuyển động chuyển cảnh (3.2s - 5.2s): Khi camera lia lên tới đỉnh chóp nhọn, cúp ngôi sao bay/trượt XUỐNG phía dưới khung hình gần hết, thì toàn bộ cụm Vòng nguyệt quế + Đỉnh núi + Mặt trời flare + Tên phần thi 3D cùng FLY IN từ trên xuống.
   - Hiệu ứng tia sáng: Xoá bỏ nan quạt giả tạo, dùng optical lens flare tự nhiên; xoá viền vòng cung thừa giữa 2 đầu lá trên đỉnh vòng nguyệt quế.
2. Tổng hợp bản phân tích từng giây (0.0s -> 7.66s) và lập danh sách câu hỏi xác nhận (`/grill-me`) gửi lại User duyệt trước khi render lại.


## Follow-up — 2026-11-16T14:48:59Z

User bổ sung thêm 2 ảnh chụp (`media_1794840481232_e527bad7.jpg`, `media_1794840502231_6919fd24.jpg`) và nói:
"chân cúp không thể béo bự như thế được, nó chỉ thực sự bé thôi, nó vẫn là góc thẳng, chưa quay xuống nên tôi chưa đồng ý"

Lưu ý:
1. Chân cúp: Rất gọn, mảnh, chỉ nhô nhẹ ở sát mép dưới màn hình (không được to béo bự choán nửa màn hình), thân cúp vươn nghiêng trục 3D nhẹ chứ không đứng thẳng đơ.
2. Góc quay camera: Có độ nghiêng/chúc xuống (tilt/pitch) và lia chéo theo thân cúp. Khi lên tới đỉnh cúp, cúp trượt/bay xuống dưới khung hình, toàn bộ cụm Vòng nguyệt quế + Đỉnh núi + Flare + Tên phần thi fly-in từ trên xuống theo góc nghiêng 3D rồi định vị.
3. Trích xuất frame từ `D:\Olympia 26\public\olympia-intro\raw_intro.webm`, lập bản phân tích thông số chính xác và bộ câu hỏi `/grill-me` để User duyệt trước khi render lại.


## Follow-up — 2026-11-16T15:16:14Z

User đã xác nhận và phê duyệt toàn bộ 5 câu hỏi `/grill-me`: **1A, 2A, 3A, 4A, 5A**!

Chi tiết User đã chốt:
- **Câu 1 (A)**: Tạo khối trụ lăng kính ngôi sao 5 cánh nguyên khối (Monolithic Star Prism Column) vươn liền mạch từ chân đế lên đến đỉnh chóp nhọn trên cùng, mặt vát kim cương chia mảng tương phản trắng bạc/đen kim cương sắc nét, chân đế pha lê mỏng tròn vát cạnh gọn gàng ở đáy (~15% màn hình).
- **Câu 2 (A)**: Camera có góc chúc xuống rõ rệt (downward tilt/pitch 15°–20°), lia chéo từ chân đế lên dọc theo sống thân cúp đang xoay quanh trục Y, tạo chiều sâu 3D chân thực như bản gốc VTV3.
- **Câu 3 (A)**: Chóp nhọn cúp lóe sáng optical lens flare (với tia ngang anamorphic); cúp ngôi sao trượt thẳng xuống mép dưới màn hình; khi cúp bay xuống gần hết thì toàn bộ cụm Vòng nguyệt quế + Đỉnh núi + Chữ 3D cùng fly-in từ trên xuống theo góc nghiêng 3D rồi khóa khớp định vị.
- **Câu 4 (A)**: Loại bỏ hoàn toàn nan quạt xoay cơ học; dùng quầng sáng mặt trời quang học tự nhiên (soft radial sunburst + optical flare) tọa lạc chính xác trên đỉnh núi; hai đầu lá trên cùng của vòng nguyệt quế hở tự nhiên không có viền nối; góc dốc 3D khoảng 12°–15°.
- **Câu 5 (A)**: Vàng kim champagne sáng rực (`#ffe885` mặt chính, viền vát cạnh vàng đồng `#f5c84c`), bổ sung nguồn sáng trực diện cường độ cao đảm bảo chữ luôn nổi khối sắc nét, sáng rực rỡ, không bị ngả nâu tối.


## Follow-up — 2026-11-16T15:36:55Z

CẬP NHẬT KHẨN TỪ USER (kèm ảnh `media_1794843293553_f3ea1b65.jpg`):
User vừa xem file `khoi_dong.webm` mới xuất và phản hồi:
"ê bạn ơi, cái cúp vô địch nó chỉ trông ra dáng ngôi sao chéo, chứ đừng làm nó phẳng lì kiểu này, thô lắm, nhìn olympia họ làm thế nào ấy, cúp nó đi xuống liên tục không có điểm dừng mà cụ"

ĐỐI CHIẾU TRỰC TIẾP VỚI `clean_frame_001.png`, `clean_frame_005.png`, `clean_frame_008.png`, `clean_frame_010.png`, `transition_07.png` TRONG `.agents/teamwork/real_intro_frames/`:
1. Chuyển động của Cúp: Phải trôi đi xuống LIÊN TỤC KHÔNG CÓ ĐIỂM DỪNG từ 0.0s đến 3.2s. Đỉnh cúp đi từ mép trên (~2.1s) trôi thẳng một mạch xuống giữa màn hình (~2.7s, loé flare đỏ-vàng ở chóp) và trôi tiếp biến mất khỏi mép dưới màn hình (~3.2s). Tuyệt đối không dừng lại ở giữa.
2. Hình khối & Chất liệu Cúp Pha Lê:
   - Thân cúp là khối tháp pha lê chữ V mở rộng đều từ đế lên tới 2 vai ngang phẳng (horizontal flat shoulders), ở giữa nhô lên 1 đỉnh chóp tháp nhọn duy nhất (single central pyramid spire). Mặt trước có các mặt vát kim cương chéo chữ X / chữ V chạy dọc suốt chiều dài thân cúp tạo dáng ngôi sao chéo 3D thanh thoát. Không phải hình ngôi sao dẹt thô cứng có cánh thò ra 2 bên.
   - Chất liệu là pha lê thuỷ tinh trong suốt (transparent refractive glass, transmission cao) nhìn xuyên thấu thấy nền đỏ burgundy ấm áp, có các vệt phản quang trắng chéo và các đường tia sáng vàng đứt đoạn chạy dọc bên trong, TUYỆT ĐỐI KHÔNG tô mảng đen xì / trắng đục đặc (flatShading đen-trắng thô cứng).


## Follow-up — 2026-11-16T15:37:49Z

CẬP NHẬT KHẨN TỪ USER (kèm ảnh `media_1794843370285_0682c262.jpg`):
User phản hồi:
"chữ shadow đen xì nhìn nó khủng bố quá"

ĐỐI CHIẾU TRỰC TIẾP VỚI `clean_frame_015.png`, `clean_frame_010.png`, `transition_07.png`:
1. XOÁ BỎ HOÀN TOÀN BÓNG ĐEN (`shadowMesh` / `laurelLayers` đen) ở chữ 3D và vòng nguyệt quế (`clean_frame_015.png`). Độ dày chữ thanh mảnh tinh tế (`depth = 0.07`, `bevelThickness = 0.015`, `bevelSize = 0.012`), mặt chính vàng satin dịu mắt (`#ecc765` -> `#f7de88`), cạnh vát vàng đồng ấm (`#b5892e`), tuyệt đối không có màu đen xì hay bóng đen sau chữ và vòng nguyệt quế.
2. Thân cúp là khối tháp pha lê thuỷ tinh trong suốt mở rộng từ đế cầu lên 2 vai ngang phẳng (flat horizontal shoulders) và ở giữa nhô lên 1 đỉnh chóp tháp nhọn duy nhất (single central pyramid spire), mặt vát chéo kim cương trong suốt nhìn xuyên thấu nền đỏ burgundy và tia sáng vàng đứt đoạn bên trong.
3. Chuyển động cúp trôi từ trên xuống dưới LIÊN TỤC đều đặn từ 0.0s đến 3.2s, KHÔNG DỪNG LẠI ở giữa màn hình.


## Follow-up — 2026-11-16T15:38:44Z

BỔ SUNG KHẨN TỪ USER (kèm ảnh zoom cận cảnh lá vòng nguyệt quế `media_1794843478705_c8497796.png`):
User chỉ rõ:
"với lại vòng nguyệt quế cũng bị đứt mép này"

YÊU CẦU SỬA:
- Chiếc lá trên cùng của vòng nguyệt quế không được bị cắt vát đứt mất đầu nhọn!
- Khôi phục đầy đủ mũi nhọn của các chiếc lá trên cùng (bằng Bezier path / vector nét mượt mà) để mọi chiếc lá nguyệt quế đều nguyên vẹn, sắc nét, đầu lá thuôn nhọn tự nhiên 100%, tuyệt đối không bị cụt hay đứt mép.
- Bỏ kiểu xếp chồng layer dày màu nâu sẫm làm thô mép lá.


## Follow-up — 2026-11-16T15:40:05Z

CẬP NHẬT QUAN TRỌNG TỪ USER (`/goal /plan /grill-me /teamwork`):
User vừa chỉ ra chính xác bản chất hình học 3D của chiếc cúp pha lê:
"cúp pha lê, mà cái đầu nó là ngôi sao bạn có thấy không, ngôi sao nghiêng còn gì, hỏi tôi đi"

PHÂN TÍCH HÌNH HỌC THEO PHÁT HIỆN CỦA USER:
- Phần đỉnh đầu của cúp pha lê là một NGÔI SAO 5 CÁNH NẰM NGHIÊNG (tilted 5-pointed star — mặt ngôi sao ngửa/nghiêng góc ~50°–65° so với trục đứng).
- Toàn bộ phần thân cúp bên dưới chính là khối lăng trụ kéo dài (loft/extrude) từ các đỉnh của mặt ngôi sao nghiêng đó thuôn nhỏ dần xuống quả cầu pha lê ở chân đế.
- Nhờ mặt ngôi sao nằm nghiêng:
  * 2 cánh dưới nhô về phía trước tạo thành các sống vát kim cương dọc mặt trước thân cúp!
  * 2 cánh ngang mở sang hai bên tạo thành phần vai cúp!
  * Cánh trên cùng vươn cao lên đỉnh nơi có điểm loé sáng Optical Lens Flare!
- Tạm dừng render, lập bộ câu hỏi phỏng vấn `/grill-me` hỏi thật kỹ User về cấu trúc ngôi sao nghiêng này để User duyệt chốt.


## Follow-up — 2026-11-16T15:41:36Z

User đã xác nhận và phê duyệt 100% toàn bộ các mục: **1A, 2A, 3A, 4A, 5A**!

Chi tiết User đã chốt:
1. **[1A] Cấu trúc 3D "Mặt Ngôi Sao Nghiêng" của Cúp Pha Lê**: Mặt đỉnh của chiếc cúp là ngôi sao 5 cánh nằm nghiêng vát chéo (~55°–65° ngửa về phía camera: cánh trên cùng vươn cao lên đỉnh chóp nơi loé flare, 2 cánh ngang mở sang 2 bên tạo vai cúp, 2 cánh dưới nhô ra phía trước), và toàn bộ thân cúp là khối lăng trụ pha lê kéo dài (loft/extrude) liền mạch từ 10 đỉnh của mặt ngôi sao nghiêng đó thuôn nhỏ dần xuống quả cầu pha lê nhỏ gọn ở đáy.
2. **[2A] Chất liệu Pha Lê Thuỷ Tinh Trong Suốt**: Thủy tinh pha lê trong suốt (transparent refractive crystal), nhìn xuyên thấu thấy nền đỏ burgundy ấm áp, các mặt vát bên trong, vệt phản quang trắng chéo và các đường tia sáng vàng mảnh chạy dọc theo các sống cạnh của lăng trụ ngôi sao từ đế lên đỉnh (tuyệt đối xoá bỏ các mảng màu đen xì / trắng đục).
3. **[3A] Chuyển động Cúp Trôi Xuống Liên Tục Không Dừng (0.0s — 3.2s)**: Cúp đi xuống LIÊN TỤC một mạch từ 0.0s đến 3.2s (tuyệt đối không dừng lại ở giữa màn hình) kết hợp xoay nhẹ để mặt ngôi sao nghiêng lộ rõ khi đi qua tâm màn hình (~2.5s–2.9s, chóp trên cùng lóe optical flare đỏ-vàng); khi cúp trôi xuống gần khuất khỏi đáy màn hình (~3.1s) thì toàn cụm Vòng nguyệt quế + Tên phần thi fly-in xuống.
4. **[4A] Khôi phục Mũi Lá Vòng Nguyệt Quế (Không Đứt Mép) & Xoá Bỏ Lớp Viền Đen**: Vòng nguyệt quế giữ nguyên 100% đầu lá thuôn nhọn sắc nét (không bị cắt đứt mép lá trên cùng, không có viền cung tròn thừa, bỏ lớp đế tối màu).
5. **[5A] Xoá Bỏ Hoàn Toàn Bóng Đen (`shadowMesh`) Ở Chữ 3D**: Chữ 3D bỏ hoàn toàn shadow đen xì đằng sau, độ dày thanh mảnh tinh tế (`depth = 0.07`), mặt chữ vàng gold satin (`#ecc765`–`#f7de88`) và cạnh vát vàng đồng ấm (`#b5892e`) đúng như `clean_frame_015.png`.


## Follow-up — 2026-11-16T15:42:55Z

YÊU CẦU BỔ SUNG TỪ USER:
"bổ sung thêm hiệu ứng zoom in cho vòng nguyệt quế, các lá ở vòng nguyệt quế cũng lật ra từ dưới đáy lên trên từng đỉnh"

CHI TIẾT KỸ THUẬT:
1. Hiệu ứng Zoom-in cho Vòng Nguyệt Quế + Đỉnh Núi: Cụm biểu trưng zoom-in mượt mà về phía ống kính từ 3.0s đến 7.66s tạo chiều sâu sống động.
2. Hiệu ứng các chiếc lá ở Vòng Nguyệt Quế LẬT RA TỪ DƯỚI ĐÁY LÊN TRÊN TỪNG ĐỈNH:
   - Dựng các cặp lá nguyệt quế 3D / Bezier độc lập dọc theo 2 nhánh cành trái và phải từ cuống đáy lên đỉnh.
   - Khi xuất hiện (3.0s - 4.2s), từng cặp lá lần lượt lật mở ra (3D flip/unfold + scale từ 0 lên 1 tuần tự so le từ dưới đáy lên trên đỉnh).
   - Mọi chiếc lá sắc nét, đầu lá thuôn nhọn tự nhiên 100%, không bị lỗi đứt mép bitmap.
