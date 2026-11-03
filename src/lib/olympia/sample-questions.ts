import type { OlympiaQuestionSet } from "./types";
import { autoTagOlympiaSet } from "./ai-classifier";

/**
 * Raw comprehensive Olympia Question Set (96 Khởi Động questions across 6 zones & 11 subjects,
 * full VCNV with mystery image & center question, 4 Tăng Tốc with timed clueImages,
 * 27 Về Đích questions balanced 9x10đ / 9x20đ / 9x30đ across KHTN-KHXH-HBC, and 6 Câu Hỏi Phụ).
 * Guaranteed 100% zero-duplicate questions across all rounds and unique distinct answers.
 */
const RAW_SAMPLE_QUESTION_SET: OlympiaQuestionSet = {
  "id": "olympia_preset_standard_full",
  "name": "Đề thi Olympia 25–26 toàn tập (113 câu Khởi động · 27 câu Về đích)",
  "description": "Kho đề Olympia chuẩn đa lĩnh vực (tham khảo Form test Olympia 25 & O22–O26): 80 câu Khởi động riêng (8 thí sinh × 10 câu) + 33 câu Khởi động chung (11 lĩnh vực × 3 câu), VCNV 5 mảnh ghép (ảnh bí ẩn nội bộ), 4 câu Tăng tốc kèm ảnh & video nội bộ, 27 câu Về đích cân bằng KHTN - KHXH - Hiểu biết chung và 6 Câu hỏi phụ.",
  "balancedRandom": true,
  "khoiDong": {
    "solo": {
      "1": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Số nguyên tố chẵn duy nhất là số nào?",
          "a": "2"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Trong hệ nhị phân, số thập phân 5 được biểu diễn như thế nào?",
          "a": "101"
        },
        {
          "subject": "Lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Đơn vị đo cường độ dòng điện trong hệ SI là gì?",
          "a": "Ampe"
        },
        {
          "subject": "Hóa",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Kim loại nào tồn tại ở trạng thái lỏng ở điều kiện nhiệt độ và áp suất phòng?",
          "a": "Thủy ngân"
        },
        {
          "subject": "Văn",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Tác phẩm 'Dế Mèn phiêu lưu ký' là của nhà văn nào?",
          "a": "Tô Hoài"
        },
        {
          "subject": "Sử",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Ai là người đọc bản Tuyên ngôn Độc lập ngày 2/9/1945 tại Quảng trường Ba Đình?",
          "a": "Hồ Chí Minh"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Một đội bóng đá tiêu chuẩn thi đấu trên sân gồm bao nhiêu cầu thủ?",
          "a": "11"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Bức họa nàng Mona Lisa là kiệt tác của danh họa nào?",
          "a": "Leonardo da Vinci"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "What is the past tense of the verb 'go'?",
          "a": "Went"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Đuôi tên miền quốc gia cấp cao nhất của Việt Nam trên Internet là gì?",
          "a": ".vn"
        }
      ],
      "2": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Tổng ba góc trong một tam giác phẳng bằng bao nhiêu độ?",
          "a": "180"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Đa giác đều nào có số đường chéo bằng đúng số cạnh của nó?",
          "a": "Ngũ giác đều"
        },
        {
          "subject": "Sinh",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Quá trình cây xanh tổng hợp chất hữu cơ nhờ ánh sáng mặt trời gọi là gì?",
          "a": "Quang hợp"
        },
        {
          "subject": "Lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Gia tốc trọng trường tại mặt đất xấp xỉ bao nhiêu m/s²?",
          "a": "9,8"
        },
        {
          "subject": "Địa",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Dãy núi nào là ranh giới tự nhiên giữa châu Âu và châu Á?",
          "a": "Dãy Ural"
        },
        {
          "subject": "Văn",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Tác giả của bài thơ 'Sóng' (1967) là nữ thi sĩ nào?",
          "a": "Xuân Quỳnh"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Kỳ Thế vận hội Olympic mùa hè hiện đại đầu tiên được tổ chức vào năm nào tại Athens (Hy Lạp)?",
          "a": "1896"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Nhạc cụ truyền thống đàn bầu của Việt Nam có mấy dây?",
          "a": "1"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "Từ nào còn thiếu trong thành ngữ tiếng Anh: 'It's raining cats and ...'?",
          "a": "Dogs"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Biển báo giao thông hình tam giác đều, viền đỏ, nền vàng dùng để chỉ nhóm biển báo gì?",
          "a": "Biển báo nguy hiểm"
        }
      ],
      "3": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Căn bậc hai số học của 81 bằng bao nhiêu?",
          "a": "9"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Nhà toán học nào được cho là người đã có công hợp nhất đại số và hình học Euclide?",
          "a": "René Descartes"
        },
        {
          "subject": "Hóa",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Nguyên tố hoá học nhẹ nhất trong bảng tuần hoàn là gì?",
          "a": "Hydro"
        },
        {
          "subject": "Sinh",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Tuyến nội tiết nào lớn nhất trong cơ thể người, nằm ở vùng cổ và có hình con bướm?",
          "a": "Tuyến giáp"
        },
        {
          "subject": "Sử",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Chiến thắng Điện Biên Phủ lừng lẫy năm châu diễn ra vào năm nào?",
          "a": "1954"
        },
        {
          "subject": "Địa",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Dòng sông dài nhất chảy hoàn toàn trên lãnh thổ Việt Nam là con sông nào?",
          "a": "Sông Đồng Nai"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Nốt nhạc nào có giá trị trường độ bằng một nửa nốt đen trong hệ thống ký hiệu âm nhạc phương Tây?",
          "a": "Nốt móc đơn"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Kình ngư Nguyễn Thị Ánh Viên sinh ra ở tỉnh/thành phố nào?",
          "a": "Cần Thơ"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "Which planet is known as the Red Planet?",
          "a": "Mars"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Chữ O trong công nghệ màn hình OLED là viết tắt của từ tiếng Anh nào?",
          "a": "Organic"
        }
      ],
      "4": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Một hình lập phương có tất cả bao nhiêu mặt?",
          "a": "6"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Những số nguyên nào có bình phương bằng tổng của số liền trước và số liền sau nó?",
          "a": "0 và 2"
        },
        {
          "subject": "Hóa",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Kim loại nào có khả năng dẫn điện tốt nhất ở điều kiện thường?",
          "a": "Bạc"
        },
        {
          "subject": "Sinh",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Bốn loại bazơ nitơ cấu tạo nên phân tử ADN gồm Ađênin, Timin, Guanin và loại nào?",
          "a": "Xitôzin (Cytosine / C)"
        },
        {
          "subject": "Văn",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Đại thi hào Nguyễn Du nổi tiếng nhất với kiệt tác truyện thơ Nôm nào?",
          "a": "Truyện Kiều"
        },
        {
          "subject": "Sử",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Vị vua nào đã ban Chiếu dời đô từ Hoa Lư về Thăng Long năm 1010?",
          "a": "Lý Thái Tổ"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Bàn cờ vua tiêu chuẩn gồm tất cả bao nhiêu ô vuông?",
          "a": "64"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Ai là tác giả của ca khúc 'Tiến quân ca' (Quốc ca Việt Nam)?",
          "a": "Văn Cao"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "In telecommunications, the letter G in 3G, 4G, 5G stands for what word?",
          "a": "Generation"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Loài hoa nào được tôn vinh là Quốc hoa của Việt Nam?",
          "a": "Hoa sen"
        }
      ],
      "5": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Trong một tam giác vuông, cạnh đối diện với góc vuông được gọi là cạnh gì?",
          "a": "Cạnh huyền"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Hằng số Pi (π) làm tròn đến chữ số thập phân thứ hai bằng bao nhiêu?",
          "a": "3,14"
        },
        {
          "subject": "Lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Hiện tượng lệch hướng chuyển động của vật thể do sự tự quay của Trái Đất gọi là hiệu ứng gì?",
          "a": "Coriolis"
        },
        {
          "subject": "Hóa",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Trong bảng tuần hoàn Mendeleev, hai chữ cái không xuất hiện trong kí hiệu hóa học là J và chữ nào?",
          "a": "Q"
        },
        {
          "subject": "Địa",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Quốc gia nào có đường bờ biển dài nhất thế giới?",
          "a": "Canada"
        },
        {
          "subject": "Sử",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Cuộc khởi nghĩa Hai Bà Trưng nổ ra vào năm nào sau Công nguyên?",
          "a": "Năm 40"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Bức tranh sơn dầu 'Thiếu nữ bên hoa huệ' là tác phẩm nổi tiếng của họa sĩ nào?",
          "a": "Tô Ngọc Vân"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Võ sĩ huyền thoại Muhammad Ali thi đấu ở môn thể thao nào?",
          "a": "Quyền Anh"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "How many goals are there in the United Nations Millennium Development Goals?",
          "a": "8"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Mạng xã hội TikTok có nguồn gốc xuất phát từ quốc gia nào?",
          "a": "Trung Quốc"
        }
      ],
      "6": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Cột mốc ngã ba biên giới Việt Nam - Lào - Campuchia ở Kon Tum có dạng lăng trụ đứng đáy là hình gì?",
          "a": "Tam giác"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Phép tính nhân một số thực với chính nó được gọi là phép tính gì?",
          "a": "Bình phương"
        },
        {
          "subject": "Sinh",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Loài động vật có vú nào lớn nhất còn sinh sống trên Trái Đất hiện nay?",
          "a": "Cá voi xanh"
        },
        {
          "subject": "Hóa",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Chất khí nào là nguyên nhân chính gây ra hiện tượng mưa axit trong tự nhiên?",
          "a": "SO2"
        },
        {
          "subject": "Văn",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Tập thơ 'Nhật ký trong tù' của Chủ tịch Hồ Chí Minh được viết nguyên bản bằng chữ gì?",
          "a": "Chữ Hán"
        },
        {
          "subject": "Địa",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Hiện nay miền Nam nước ta có 10 tỉnh đều có một huyện mang cùng tên là huyện gì?",
          "a": "Châu Thành"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Thẻ vàng trong bóng đá được sử dụng chính thức lần đầu tại kỳ World Cup năm nào?",
          "a": "1970"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Lễ hội Lim với làn điệu dân ca Quan họ là lễ hội truyền thống của tỉnh nào?",
          "a": "Bắc Ninh"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "In Vietnam, which rare forest animal is known as the 'Asian unicorn'?",
          "a": "Saola"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Các trạm thu phí không dừng ETC ở nước ta sử dụng loại sóng gì để nhận diện thẻ e-Tag?",
          "a": "Sóng vô tuyến"
        }
      ],
      "7": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Trong toán học, tập hợp các số thực lớn hơn 0 được gọi là số gì?",
          "a": "Số dương"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Tích của tất cả các số nguyên tố nhỏ hơn 10 bằng bao nhiêu?",
          "a": "210"
        },
        {
          "subject": "Lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Khí cụ chuyên dụng nào trong khí tượng học dùng để đo vận tốc gió?",
          "a": "Phong kế"
        },
        {
          "subject": "Sinh",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Vitamin D có vai trò chính giúp cơ thể người hấp thụ khoáng chất nào cho xương?",
          "a": "Canxi"
        },
        {
          "subject": "Sử",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Bản Hiến pháp đầu tiên của nước Việt Nam Dân chủ Cộng hòa được thông qua vào năm nào?",
          "a": "1946"
        },
        {
          "subject": "Địa",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Vườn quốc gia nào nằm trên dãy Trường Sơn thuộc tỉnh Quảng Bình được UNESCO công nhận là Di sản thiên nhiên thế giới?",
          "a": "Phong Nha - Kẻ Bàng"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Môn võ cổ truyền Vovinam (Việt Võ Đạo) do võ sư nào sáng lập năm 1938?",
          "a": "Nguyễn Lộc"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Nghệ sĩ dương cầm Việt Nam nào từng giành giải Nhất cuộc thi Piano quốc tế Chopin năm 1980?",
          "a": "Đặng Thái Sơn"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "What is the capital city of Australia?",
          "a": "Canberra"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Trong thần thoại Hy Lạp, vị thần nào cai quản thế giới ngầm (địa ngục)?",
          "a": "Hades"
        }
      ],
      "8": [
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Một hình lập phương có tất cả bao nhiêu đường chéo chính nối hai đỉnh đối diện nhau qua tâm?",
          "a": "4 đường chéo chính"
        },
        {
          "subject": "Toán",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN",
          "q": "Chữ cái đầu tiên trong bảng chữ cái Hy Lạp là chữ gì?",
          "a": "Alpha"
        },
        {
          "subject": "Hóa",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Pin sạc trên điện thoại di động ngày nay (LIB) hoạt động dựa vào sự di chuyển của ion kim loại nào?",
          "a": "Lithium"
        },
        {
          "subject": "Sinh",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN",
          "q": "Loài bạch tuộc có tất cả bao nhiêu trái tim trong cơ thể?",
          "a": "3"
        },
        {
          "subject": "Văn",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Trong thơ Lưu Quang Vũ, điều gì 'rung rinh nhịp đập trái tim người / Như tiếng sáo như dây đàn máu nhỏ'?",
          "a": "Tiếng Việt"
        },
        {
          "subject": "Sử",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH",
          "q": "Vị tướng nào dưới thời chúa Nguyễn đã xác lập chủ quyền tại vùng đất Gia Định - Đồng Nai vào năm 1698?",
          "a": "Nguyễn Hữu Cảnh"
        },
        {
          "subject": "Thể thao",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Ai là tay vợt nam đầu tiên của Việt Nam lọt vào Top 300 thế giới trên bảng xếp hạng ATP?",
          "a": "Lý Hoàng Nam"
        },
        {
          "subject": "Nghệ thuật",
          "kdZone": "ARTS_SPORTS",
          "vdZone": "HBC",
          "q": "Tác giả của bộ truyện tranh nổi tiếng 'Doraemon' là họa sĩ người Nhật nào?",
          "a": "Fujiko F. Fujio"
        },
        {
          "subject": "Tiếng Anh",
          "kdZone": "FOREIGN_LANG",
          "vdZone": "HBC",
          "q": "What is the opposite word of 'ancient' in English?",
          "a": "Modern"
        },
        {
          "subject": "Lĩnh vực khác",
          "kdZone": "GENERAL",
          "vdZone": "HBC",
          "q": "Vệ tinh nhân tạo đầu tiên của nhân loại được Liên Xô phóng lên quỹ đạo năm 1957 có tên là gì?",
          "a": "Sputnik 1"
        }
      ]
    },
    "shared": [
      {
        "subject": "Toán",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "q": "Tổng số đo các góc trong của một hình tứ giác lồi trên mặt phẳng Euclid luôn bằng bao nhiêu độ?",
        "a": "360"
      },
      {
        "subject": "Toán",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "q": "Số nguyên tố lớn nhất có hai chữ số trong tập hợp các số tự nhiên là số nào?",
        "a": "97"
      },
      {
        "subject": "Toán",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "q": "Hình đa giác đều có 6 cạnh bằng nhau và 6 góc bằng nhau được gọi là hình gì?",
        "a": "Lục giác đều"
      },
      {
        "subject": "Lý",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Trọng lượng của một vật trên bề mặt Mặt Trăng bằng khoảng một phần mấy trọng lượng của nó trên Trái Đất?",
        "a": "1/6"
      },
      {
        "subject": "Lý",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Loại điốt phát sáng nào được sử dụng phổ biến nhất trên màn hình trường quay S14?",
        "a": "LED"
      },
      {
        "subject": "Lý",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Vận tốc truyền ánh sáng trong môi trường chân không xấp xỉ bằng bao nhiêu nghìn km/s?",
        "a": "300"
      },
      {
        "subject": "Hóa",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Trong hóa học, dung dịch có độ pH = 7 ở nhiệt độ 25°C mang tính chất gì?",
        "a": "Trung tính"
      },
      {
        "subject": "Hóa",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Kim loại kiềm mềm nhất, có nhiệt độ nóng chảy thấp (28,5°C) và phản ứng mãnh liệt với nước có tên gọi là gì?",
        "a": "Xesi (Caesium / Cs)"
      },
      {
        "subject": "Hóa",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Khí gas sinh học (biogas) có thành phần chính là hợp chất hydrocacbon nào?",
        "a": "Methane (hoặc CH4)"
      },
      {
        "subject": "Sinh",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Cơ quan tiêu hóa dài nhất trong hệ tiêu hóa của cơ thể người trưởng thành là gì?",
        "a": "Ruột non"
      },
      {
        "subject": "Sinh",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Nhóm máu nào được gọi là nhóm máu chuyên cho trong hệ thống nhóm máu ABO?",
        "a": "Nhóm O"
      },
      {
        "subject": "Sinh",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Bào quan nào trong tế bào thực vật chứa chất diệp lục giúp thực hiện quá trình quang hợp?",
        "a": "Lục lạp"
      },
      {
        "subject": "Văn",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Ai là tác giả của áng thiên cổ hùng văn 'Bình Ngô đại cáo'?",
        "a": "Nguyễn Trãi"
      },
      {
        "subject": "Văn",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Tác phẩm Truyện Kiều của đại thi hào Nguyễn Du được sáng tác theo thể thơ dân tộc nào?",
        "a": "Lục bát"
      },
      {
        "subject": "Văn",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Nhân vật Lão Hạc trong truyện ngắn cùng tên của Nam Cao nuôi một con chó cưng tên là gì?",
        "a": "Cậu Vàng"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Quân và dân vùng đất nào của TP. Hồ Chí Minh được phong tặng danh hiệu 'Đất thép thành đồng'?",
        "a": "Củ Chi"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Chiến dịch Hồ Chí Minh lịch sử giải phóng hoàn toàn miền Nam, thống nhất non sông toàn thắng vào năm nào?",
        "a": "1975"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Vị vua anh minh nào của triều Hậu Lê đã ban hành bộ luật Hồng Đức (Quốc triều hình luật)?",
        "a": "Lê Thánh Tông"
      },
      {
        "subject": "Địa",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Quốc gia nào có diện tích tự nhiên lớn nhất thế giới hiện nay?",
        "a": "Nga"
      },
      {
        "subject": "Địa",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Kênh đào Panama nối liền hai đại dương lớn nào trên thế giới?",
        "a": "Thái Bình Dương và Đại Tây Dương"
      },
      {
        "subject": "Địa",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Đỉnh núi Fansipan – 'Nóc nhà Đông Dương' nằm trên dãy núi nào của Việt Nam?",
        "a": "Hoàng Liên Sơn"
      },
      {
        "subject": "Thể thao",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Đội tuyển bóng đá quốc gia nào đã giành chức vô địch FIFA World Cup 2022 tại Qatar?",
        "a": "Argentina"
      },
      {
        "subject": "Thể thao",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Biểu tượng của phong trào Thế vận hội Olympic quốc tế gồm bao nhiêu vòng tròn đan vào nhau?",
        "a": "5"
      },
      {
        "subject": "Thể thao",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Cự ly chạy tiêu chuẩn của một chặng đua Marathon đường trường là bao nhiêu km?",
        "a": "42,195 km"
      },
      {
        "subject": "Nghệ thuật",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Bức tranh nổi tiếng 'Đêm đầy sao' (The Starry Night) là kiệt tác của danh họa người Hà Lan nào?",
        "a": "Vincent van Gogh"
      },
      {
        "subject": "Nghệ thuật",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Nhạc sĩ nào là tác giả của bản giao hưởng - ca khúc tráng lệ 'Người Hà Nội' sáng tác năm 1947?",
        "a": "Nguyễn Đình Thi"
      },
      {
        "subject": "Nghệ thuật",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Nhạc cụ gõ cổ xưa của đồng bào các dân tộc Tây Nguyên được làm từ các thanh đá tự nhiên gọi là đàn gì?",
        "a": "Đàn đá"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "What is the official currency of the United Kingdom?",
        "a": "Pound Sterling"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "Which chemical element has the symbol 'Au' in the periodic table?",
        "a": "Gold"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "What does the abbreviation 'CPU' stand for in computer science?",
        "a": "Central Processing Unit"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "What is the largest city and financial hub of Australia, famous for its iconic Opera House?",
        "a": "Sydney"
      },
      {
        "subject": "Lĩnh vực khác",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "q": "Nhà khoa học nào được mệnh danh là Cha đẻ của khoa học máy tính và trí tuệ nhân tạo hiện đại?",
        "a": "Alan Turing"
      },
      {
        "subject": "Lĩnh vực khác",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "q": "Số điện thoại khẩn cấp gọi lực lượng Cảnh sát Phòng cháy chữa cháy và Cứu nạn cứu hộ tại Việt Nam là số nào?",
        "a": "114"
      },
      {
        "subject": "Lĩnh vực khác",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "q": "Tổ chức Giáo dục, Khoa học và Văn hóa của Liên Hợp Quốc viết tắt theo tiếng Anh là gì?",
        "a": "UNESCO"
      },
      {
        "subject": "Lĩnh vực khác",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "q": "Tổ chức Hàng không Dân dụng Quốc tế viết tắt theo tiếng Anh là gì?",
        "a": "ICAO"
      }
    ]
  },
  "vcnv": {
    "answer": "TIÊU LỆNH CHỮA CHÁY",
    "mysteryImage": "/olympia/media/vcnv_mystery.png",
    "rows": [
      {
        "hint": "Hiện nay, Việt Nam có bao nhiêu tỉnh mà tên gọi bắt đầu bằng chữ cái N? (1 chữ số)",
        "answer": "4"
      },
      {
        "hint": "Theo Quyết định số 05/2020/QĐ-TTg, cấp ... lũ được phân thành ba cấp căn cứ vào độ lớn mực nước lũ và mức độ tác động đến an toàn đê điều (7 chữ cái).",
        "answer": "BÁO ĐỘNG"
      },
      {
        "hint": "Từ nào còn thiếu trong hai câu thơ của Tản Đà: 'Non xanh đã biết hay chưa? / ... đi ra bể lại mưa về nguồn' (4 chữ cái)?",
        "answer": "NƯỚC"
      },
      {
        "hint": "Trong mạng điện gia đình, aptomat là thiết bị tự động có chức năng thay thế cho cả cầu chì và thiết bị đóng ngắt điện nào (6 chữ cái)?",
        "answer": "CẦU DAO"
      }
    ],
    "centerQuestion": {
      "q": "Câu hỏi số 5 (Ô trung tâm): Khi phát hiện hỏa hoạn, bước đầu tiên trong quy trình 4 bước xử lý khẩn cấp là hô hoán, báo động gấp cho mọi người xung quanh biết có sự cố gì?",
      "a": "CHÁY"
    }
  },
  "tangToc": [
    {
      "category": "iq",
      "q": "[Câu 1 — Tư duy IQ] Tìm số thích hợp điền vào dấu chấm hỏi trong quy luật dãy số: 2, 3, 5, 8, 13, 21, ?",
      "type": "image",
      "media": "/olympia/media/tangtoc_cau1_iq.png",
      "answer": "34",
      "duration": 20
    },
    {
      "category": "data",
      "q": "[Câu 2 — Dữ kiện mở dần] Đây là địa danh nào của Việt Nam? Quan sát các gợi ý xuất hiện theo thời gian để đưa ra câu trả lời chính xác.",
      "type": "image",
      "media": "/olympia/media/tangtoc_cau2_clue1.png",
      "answer": "Vịnh Hạ Long",
      "duration": 20,
      "clueImages": [
        {
          "atSecond": 0,
          "label": "Dữ kiện 1 (0s): Vịnh biển Đông Bắc diện tích hơn 1.500 km² với bờ biển dài 120 km",
          "url": "/olympia/media/tangtoc_cau2_clue1.png"
        },
        {
          "atSecond": 5,
          "label": "Dữ kiện 2 (5s): Sở hữu gần 2.000 hòn đảo đá vôi kỳ vĩ như Hòn Trống Mái, Đảo Ti Tốp",
          "url": "/olympia/media/tangtoc_cau2_clue2.png"
        },
        {
          "atSecond": 10,
          "label": "Dữ kiện 3 (10s): Quần thể hang động thạch nhũ tráng lệ: Hang Sửng Sốt, Động Thiên Cung",
          "url": "/olympia/media/tangtoc_cau2_clue3.png"
        },
        {
          "atSecond": 15,
          "label": "Dữ kiện 4 (15s): Được UNESCO công nhận là Di sản thiên nhiên thế giới vào các năm 1994 và 2000",
          "url": "/olympia/media/tangtoc_cau2_clue4.png"
        }
      ]
    },
    {
      "category": "arrange",
      "q": "[Câu 3 — Sắp xếp 6 mảnh] Sắp xếp 6 thiên thể sau theo thứ tự khoảng cách từ gần Mặt Trời nhất đến xa Mặt Trời nhất: (1) Sao Hỏa, (2) Sao Thủy, (3) Sao Mộc, (4) Sao Kim, (5) Sao Thổ, (6) Trái Đất.",
      "type": "image",
      "media": "/olympia/media/tangtoc_cau3_arrange.png",
      "answer": "246135",
      "duration": 30
    },
    {
      "category": "data",
      "q": "[Câu 4 — Dữ kiện tổng hợp / Video] Đây là ai? Nhà vật lý, toán học vĩ đại người Anh (1643–1727), tác giả bộ sách 'Principia', người phát biểu 3 định luật chuyển động và định luật vạn vật hấp dẫn.",
      "type": "video",
      "media": "/olympia/media/tangtoc_cau4_video.webm",
      "answer": "Isaac Newton",
      "duration": 30
    }
  ],
  "veDich": {
    "10": [
      {
        "subject": "Hóa",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Chất khí nào trong không khí duy trì sự hô hấp của con người và sự cháy?",
        "a": "Oxy",
        "type": "theory"
      },
      {
        "subject": "Toán",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "q": "Vòi 1 chảy một mình 3 giờ đầy bể, vòi 2 chảy một mình 6 giờ đầy bể. Mở cả hai vòi cùng lúc thì sau mấy giờ đầy bể?",
        "a": "2 giờ",
        "type": "theory"
      },
      {
        "subject": "Lý",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Đơn vị đo tần số dao động (Hz) được đặt theo tên của nhà vật lý học người nước nào?",
        "a": "Đức (Heinrich Hertz)",
        "type": "theory"
      },
      {
        "subject": "Địa",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Sông Mê Kông chảy vào lãnh thổ Việt Nam đầu tiên qua địa phận của hai tỉnh biên giới nào?",
        "a": "Đồng Tháp và An Giang",
        "type": "theory"
      },
      {
        "subject": "Văn",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Ai là tác giả của tiểu thuyết hiện thực phê phán 'Tắt đèn' xuất bản năm 1939?",
        "a": "Ngô Tất Tố",
        "type": "theory"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Nguyễn Tất Thành ra đi tìm đường cứu nước tại Bến cảng Nhà Rồng vào ngày 5/6 của năm nào?",
        "a": "1911",
        "type": "theory"
      },
      {
        "subject": "Thể thao",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Trong môn bơi lội thi đấu Thế vận hội, có tất cả bao nhiêu kiểu bơi tiêu chuẩn được đưa vào tranh tài?",
        "a": "4 kiểu bơi (Bơi bướm, bơi ngửa, bơi ếch, bơi tự do)",
        "type": "theory"
      },
      {
        "subject": "Nghệ thuật",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Trong ký âm nhạc lý cơ bản, nốt nhạc nào đứng liền sau nốt Pha (F)?",
        "a": "Nốt Son (G)",
        "type": "theory"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "What is the largest and deepest of Earth's five oceanic divisions?",
        "a": "Pacific Ocean",
        "type": "theory"
      }
    ],
    "20": [
      {
        "subject": "Hóa",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Muối halogen nào (công thức KI) được dùng để bảo vệ tuyến giáp trước nguy cơ hấp thụ đồng vị iốt phóng xạ?",
        "a": "Kali iotua (Potassium iodide)",
        "type": "theory"
      },
      {
        "subject": "Toán",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "q": "Nhà toán học De Morgan sinh ở thế kỷ XIX từng đố: 'Tôi x tuổi vào năm x bình phương'. Ông sinh vào năm nào?",
        "a": "1806 (43 tuổi vào năm 1849)",
        "type": "theory"
      },
      {
        "subject": "Lý",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Nhờ có đồng thời hai tính chất vật lý đặc biệt nào mà vật liệu Indium Tin Oxide (ITO) được dùng làm màn hình cảm ứng điện thoại?",
        "a": "Dẫn điện và trong suốt với ánh sáng",
        "type": "practice"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Tại bến cảng lịch sử nào thuộc tỉnh Cà Mau vào tháng 10/1962, chuyến tàu đầu tiên của 'Đoàn tàu không số' đã cập bến an toàn?",
        "a": "Bến Vàm Lũng",
        "type": "theory"
      },
      {
        "subject": "Văn",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Nhà văn Sương Nguyệt Minh đã ví hệ thống công trình nào trên thềm lục địa phía Nam như 'bông hoa hướng dương vàng rực đội nước vươn lên trời xanh'?",
        "a": "Nhà giàn DK1",
        "type": "theory"
      },
      {
        "subject": "Địa",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Tấm bản đồ cổ nào của triều Nguyễn vẽ khoảng năm 1838 có ghi rõ hai địa danh 'Hoàng Sa' và 'Vạn Lý Trường Sa' thuộc lãnh thổ Việt Nam?",
        "a": "Đại Nam nhất thống toàn đồ",
        "type": "theory"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "If you rearrange the letters in the word 'CIFAIPC', you get the name of an ocean. What ocean is it?",
        "a": "PACIFIC",
        "type": "theory"
      },
      {
        "subject": "Lĩnh vực khác",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "q": "Theo Tổ chức Sở hữu trí tuệ thế giới (WIPO), chỉ số đổi mới sáng tạo toàn cầu được viết tắt bằng 3 chữ cái tiếng Anh là gì?",
        "a": "GII (Global Innovation Index)",
        "type": "theory"
      },
      {
        "subject": "Nghệ thuật",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Di sản Nhã nhạc cung đình Huế được UNESCO ghi danh là Kiệt tác truyền khẩu và phi vật thể của nhân loại vào năm nào?",
        "a": "2003",
        "type": "theory"
      }
    ],
    "30": [
      {
        "subject": "Hóa",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Màu xanh lam quý hiếm của viên kim cương 'The De Beers Blue' được tạo nên bởi sự hiện diện của nguyên tố hóa học nào trong mạng tinh thể cacbon?",
        "a": "Bo (Boron)",
        "type": "theory"
      },
      {
        "subject": "Toán",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "q": "Một hệ thống gồm 8 đèn. Mỗi đèn sáng xanh 2 phút rồi chuyển sang đỏ 2 phút. Đèn 1 bật xanh lúc 0s, cứ sau 10s đèn tiếp theo bật xanh. Trong 3 phút đầu, cả 8 đèn cùng sáng xanh trong bao nhiêu giây?",
        "a": "50 giây",
        "type": "theory"
      },
      {
        "subject": "Sinh",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Bào quan nào bên trong tế bào nhân thực ngoài nhân tế bào có chứa hệ phân tử ADN mạch vòng riêng biệt và có khả năng tự nhân đôi ở động vật?",
        "a": "Ti thể",
        "type": "practice"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Câu ca dao lịch sử: 'Chu tri rành rành / Cái đanh nổ lửa / Con ngựa đứt cương / Ba vương tập đế' nhắc đến ba vị vua nào của triều Nguyễn trong biến cố Tứ nguyệt tam vương?",
        "a": "Dục Đức, Hiệp Hòa, Kiến Phúc",
        "type": "theory"
      },
      {
        "subject": "Văn",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Trong tiểu thuyết 'Tắt đèn' của nhà văn Ngô Tất Tố, nhân vật 'Chị Dậu' trước khi lấy anh Nguyễn Văn Dậu có tên khai sinh thật là gì?",
        "a": "Lê Thị Đào",
        "type": "theory"
      },
      {
        "subject": "Địa",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Dòng hải lưu lạnh chảy dọc bờ biển phía tây khu vực Nam Mỹ, mang lại nguồn cá cơm phong phú cho Peru và Chile có tên quốc tế là gì?",
        "a": "Hải lưu Humboldt (hoặc hải lưu Peru)",
        "type": "theory"
      },
      {
        "subject": "Lĩnh vực khác",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "q": "Vệ tinh tự nhiên lớn nhất của Sao Mộc và cũng là vệ tinh tự nhiên lớn nhất trong toàn bộ Hệ Mặt Trời mang tên gì?",
        "a": "Ganymede",
        "type": "theory"
      },
      {
        "subject": "Tiếng Anh",
        "kdZone": "FOREIGN_LANG",
        "vdZone": "HBC",
        "q": "What English word starting with the letter 'P' refers to the phenomenon where plants convert light energy into chemical energy?",
        "a": "Photosynthesis",
        "type": "theory"
      },
      {
        "subject": "Thể thao",
        "kdZone": "ARTS_SPORTS",
        "vdZone": "HBC",
        "q": "Vận động viên bắn súng Hoàng Xuân Vinh đã giành tấm Huy chương Vàng lịch sử đầu tiên cho đoàn thể thao Việt Nam tại Thế vận hội Olympic mùa hè năm 2016 ở thành phố nào?",
        "a": "Rio de Janeiro (Brazil)",
        "type": "theory"
      }
    ],
    "40": [
      {
        "subject": "Lý",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN",
        "q": "Hạt cơ bản nào được tiên đoán bởi nhà vật lý Peter Higgs năm 1964 và được xác nhận tại máy gia tốc LHC (CERN) năm 2012?",
        "a": "Boson Higgs",
        "type": "theory"
      },
      {
        "subject": "Sử",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "q": "Hội nghị thành lập Đảng Cộng sản Việt Nam đầu năm 1930 do Nguyễn Ái Quốc chủ trì diễn ra tại bán đảo nào thuộc Hương Cảng (Trung Quốc)?",
        "a": "Cửu Long",
        "type": "theory"
      }
    ]
  },
  "cauHoiPhu": [
    {
      "subject": "Sử",
      "kdZone": "SOCIAL_SCI",
      "vdZone": "KHXH",
      "q": "Triều đại phong kiến nào tồn tại lâu dài nhất trong lịch sử chế độ quân chủ Việt Nam (kéo dài 356 năm)?",
      "a": "Nhà Hậu Lê"
    },
    {
      "subject": "Hóa",
      "kdZone": "NATURAL_SCI",
      "vdZone": "KHTN",
      "q": "Kim loại nào có nhiệt độ nóng chảy cao nhất trong tất cả các kim loại nguyên chất (3.422°C), thường dùng làm dây tóc bóng đèn?",
      "a": "Vonfram (Tungsten / W)"
    },
    {
      "subject": "Địa",
      "kdZone": "SOCIAL_SCI",
      "vdZone": "KHXH",
      "q": "Quốc gia nào có số lượng múi giờ nhiều nhất thế giới (tính cả các vùng lãnh thổ hải ngoại)?",
      "a": "Pháp"
    },
    {
      "subject": "Toán",
      "kdZone": "MATH_IT",
      "vdZone": "KHTN",
      "q": "Một năm thế kỷ (kết thúc bằng hai chữ số 00) chỉ là năm nhuận khi nó chia hết cho số tự nhiên nào?",
      "a": "400"
    },
    {
      "subject": "Văn",
      "kdZone": "SOCIAL_SCI",
      "vdZone": "KHXH",
      "q": "Bài thơ 'Tây Tiến' của nhà thơ Quang Dũng được sáng tác vào năm nào tại Phù Lưu Chanh?",
      "a": "1948"
    },
    {
      "subject": "Lĩnh vực khác",
      "kdZone": "GENERAL",
      "vdZone": "HBC",
      "q": "Trụ sở chính của Tổ chức Giáo dục, Khoa học và Văn hóa Liên Hợp Quốc (UNESCO) đặt tại thành phố nào?",
      "a": "Paris (Pháp)"
    }
  ]
};

export const SAMPLE_QUESTION_SET: OlympiaQuestionSet = autoTagOlympiaSet(RAW_SAMPLE_QUESTION_SET, false);

/**
 * Bộ đề Olympia Chuyên đề Đấu thầu Nhà nước & Gói thầu 01TB-BA Thủy điện Tích năng Bác Ái
 * Khởi động 80 câu riêng (8 thí sinh x 10 câu) + 16 câu chung
 * VCNV 5 mảnh ghép (Từ khóa: ẮC QUY NƯỚC) và bộ dự phòng
 * 8 câu Tăng tốc (bộ chính + dự phòng)
 * 48 câu Về đích (16 câu 10đ, 12 câu 20đ, 12 câu 30đ, 8 câu 40đ) và 6 câu hỏi phụ.
 * Guaranteed 100% zero-duplicate questions across all rounds and unique distinct answers.
 */
const RAW_BAC_AI_QUESTION_SET: OlympiaQuestionSet = {
  "id": "olympia_preset_dauthau_bacai",
  "name": "Đấu thầu Gói thầu 01TB-BA - Thủy điện Tích năng Bác Ái (Toàn diện)",
  "description": "Kho đề Olympia quy mô toàn diện chuyên đề Đấu thầu Nhà nước & Thủy điện Bác Ái: 80 câu Khởi động riêng (8 thí sinh x 10 câu) + 16 câu Khởi động chung, VCNV bộ chính ('ẮC QUY NƯỚC') và bộ dự phòng ('CHI PHÍ VÒNG ĐỜI'), 8 câu Tăng tốc (bộ chính + dự phòng), 48 câu Về đích (16 câu 10đ, 12 câu 20đ, 12 câu 30đ, 8 câu 40đ) và 6 câu hỏi phụ.",
  "targetRuleset": "O26",
  "balancedRandom": true,
  "khoiDong": {
    "solo": {
      "1": [
        {
          "q": "Mục tiêu cốt lõi của hoạt động đấu thầu mua sắm công là tối ưu hóa yếu tố nào xuyên suốt thời gian vận hành dự án?",
          "a": "Chi phí vòng đời (LCC)",
          "subject": "Lý luận đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Tên viết tắt của Tập đoàn Điện lực Việt Nam, đơn vị làm chủ đầu tư dự án Bác Ái là gì?",
          "a": "EVN",
          "subject": "Quản lý dự án",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Gói thầu mua sắm máy vi tính, bàn ghế cho văn phòng thuộc loại gói thầu nào theo bản chất sản phẩm?",
          "a": "Mua sắm hàng hóa",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Bốn nguyên tắc căn bản của hoạt động đấu thầu theo luật định gồm Cạnh tranh, Công bằng, Minh bạch và nguyên tắc nào sau đây: Hiệu quả kinh tế, Ưu tiên nội địa, hay Lợi nhuận tối đa?",
          "a": "Hiệu quả kinh tế",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hình thức lựa chọn nhà thầu mặc định, không hạn chế số lượng nhà thầu tham dự theo Luật Đấu thầu là gì?",
          "a": "Đấu thầu rộng rãi",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Trong hệ đơn vị quốc tế SI, đơn vị đo công suất là gì?",
          "a": "Oát (W / Watt)",
          "subject": "Vật lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Theo Luật Đấu thầu số 90/2025/QH15, quy trình tổ chức thực hiện đấu thầu chuẩn hóa gồm bao nhiêu bước liên tục?",
          "a": "7 bước",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hành vi thông đồng giữa các nhà thầu để nâng khống giá hoặc phân chia gói thầu là hành vi bị cấm gọi là gì?",
          "a": "Thông thầu",
          "subject": "Pháp luật đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Nhà thầu nộp chung hồ sơ đề xuất kỹ thuật và đề xuất tài chính trong cùng một túi hồ sơ là phương thức gì?",
          "a": "Một giai đoạn một túi hồ sơ (1G1T)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Tài liệu pháp lý cao nhất điều chỉnh hoạt động đấu thầu sử dụng vốn nhà nước tại Việt Nam là gì?",
          "a": "Luật Đấu thầu",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        }
      ],
      "2": [
        {
          "q": "Đơn vị nào trực tiếp được EVN giao làm đại diện chủ đầu tư quản lý và điều hành dự án Thủy điện Bác Ái?",
          "a": "Ban Quản lý Dự án Điện 3 (Ban QLDA Điện 3)",
          "subject": "Quản lý dự án",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Nhà máy Thủy điện Tích năng Bác Ái được thiết kế bao gồm tất cả bao nhiêu tổ máy?",
          "a": "4 tổ máy",
          "subject": "Dự án Bác Ái",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Hình thức lựa chọn trực tiếp nhà thầu trong trường hợp cấp bách do thiên tai, dịch bệnh hoặc bí mật nhà nước là gì?",
          "a": "Chỉ định thầu",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Phương thức đấu thầu mà nhà thầu nộp riêng hồ sơ đề xuất kỹ thuật và hồ sơ đề xuất tài chính được gọi là gì?",
          "a": "Một giai đoạn hai túi hồ sơ (1G2T)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Gói thầu khảo sát, lập thiết kế chi tiết, thẩm tra và giám sát thi công thuộc nhóm gói thầu dịch vụ gì?",
          "a": "Dịch vụ tư vấn",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Công suất thiết kế định mức của mỗi tổ máy trong tổng số 4 tổ máy tại Thủy điện Bác Ái là bao nhiêu MW?",
          "a": "300 MW",
          "subject": "Dự án Bác Ái",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Đơn vị đo điện thế và suất điện động trong hệ SI mang tên nhà bác học Alessandro Volta là gì?",
          "a": "Vôn (Volt / V)",
          "subject": "Vật lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Hình thức đấu thầu chỉ mời một số nhà thầu có năng lực kỹ thuật cao tham dự gọi là gì?",
          "a": "Đấu thầu hạn chế",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Tài liệu do bên mời thầu lập quy định tiêu chuẩn kỹ thuật, năng lực và hướng dẫn nộp thầu viết tắt là gì?",
          "a": "HSMT (Hồ sơ mời thầu)",
          "subject": "Thuật ngữ đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Gói thầu cung cấp thiết bị cơ điện chính của Thủy điện Bác Ái có mã ký hiệu là gì?",
          "a": "Gói thầu 01TB-BA",
          "subject": "Gói thầu 01TB-BA",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        }
      ],
      "3": [
        {
          "q": "Theo mô hình tổ chức chính quyền địa phương 2 cấp, Nhà máy Thủy điện Tích năng Bác Ái xây dựng tại xã Phước Hòa trực thuộc tỉnh nào?",
          "a": "Khánh Hòa",
          "subject": "Địa lý dự án",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Thời gian thực hiện hợp đồng Gói thầu số 01TB-BA kể từ ngày có hiệu lực kéo dài bao nhiêu tháng?",
          "a": "51 tháng",
          "subject": "Gói thầu 01TB-BA",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Biện pháp tài chính mà nhà thầu phải nộp để đảm bảo trách nhiệm không rút hồ sơ sau khi mở thầu gọi là bảo đảm gì?",
          "a": "Bảo đảm dự thầu (Bảo lãnh dự thầu)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Tua-bin cơ điện chính tại Thủy điện Bác Ái có khả năng hoạt động luân phiên giữa 2 chế độ cơ bản nào?",
          "a": "Bơm và phát (bơm - phát điện)",
          "subject": "Kỹ thuật cơ điện",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Khi nhà thầu trong nước chưa đủ năng lực sản xuất tua-bin công suất lớn, chủ đầu tư áp dụng đấu thầu trong nước hay quốc tế?",
          "a": "Quốc tế (Đấu thầu rộng rãi quốc tế)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Trong trường hợp nhà thầu cố tình từ chối hoàn thiện hoặc ký hợp đồng sau khi trúng thầu, khoản tiền nào sẽ bị tịch thu?",
          "a": "Bảo lãnh dự thầu (Tiền bảo đảm dự thầu)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Đại lượng vật lý đặc trưng cho khả năng sinh công của dòng nước qua tua-bin trong một đơn vị thời gian được gọi là gì?",
          "a": "Công suất cơ học",
          "subject": "Vật lý",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Hồ nước tự nhiên tiếp nhận nước xả phát điện và cấp nước bơm của Thủy điện Bác Ái là hồ gì?",
          "a": "Hồ Sông Cái",
          "subject": "Địa lý - Dự án",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Nền tảng công nghệ bắt buộc áp dụng cho các hình thức đấu thầu phổ biến hiện nay là đấu thầu qua đâu?",
          "a": "Qua mạng (Mạng đấu thầu quốc gia)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Ba tiêu chí phân loại gói thầu phục vụ quản lý dự án gồm quy mô, bản chất sản phẩm và tiêu chí nào: Mức độ phức tạp, Nguồn vốn vay, hay Địa bàn xây dựng?",
          "a": "Mức độ phức tạp",
          "subject": "Quản lý dự án",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        }
      ],
      "4": [
        {
          "q": "Quốc gia châu Âu nào là nơi đặt trụ sở tập đoàn công nghệ năng lượng Voith Hydro, đơn vị đứng đầu liên danh cung cấp thiết bị chính gói 01TB-BA?",
          "a": "Cộng hòa Liên bang Đức (Đức)",
          "subject": "Địa lý kinh tế",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Tổng công suất thiết kế của toàn bộ 4 tổ máy Thủy điện Bác Ái là bao nhiêu MW?",
          "a": "1.200 MW (1200)",
          "subject": "Dự án Bác Ái",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Việc nhà thầu chuyển nhượng cho nhà thầu khác phần công việc vượt mức quy định trong HSMT là hành vi vi phạm gì?",
          "a": "Chuyển nhượng thầu trái phép (Bán thầu)",
          "subject": "Pháp luật đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Phương thức đấu thầu áp dụng cho gói thầu có yêu cầu kỹ thuật công nghệ mới, chưa thể xác định chi tiết ngay từ đầu gọi là gì?",
          "a": "Hai giai đoạn",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Gói thầu cung cấp dịch vụ vận chuyển thiết bị, bảo trì định kỳ, bảo hiểm công trình thuộc nhóm dịch vụ gì?",
          "a": "Dịch vụ phi tư vấn",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hồ sơ do nhà thầu chuẩn bị và nộp cho bên mời thầu theo yêu cầu của HSMT được viết tắt là gì?",
          "a": "HSDT (Hồ sơ dự thầu)",
          "subject": "Thuật ngữ đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Tiêu chuẩn quốc tế của Ủy ban Kỹ thuật Điện Quốc tế áp dụng cho thiết bị cơ điện gói 01TB-BA là tiêu chuẩn nào: IEC, ISO, hay ASTM?",
          "a": "IEC",
          "subject": "Tiêu chuẩn kỹ thuật",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Mẫu điều kiện hợp đồng quốc tế chuẩn do Hiệp hội Kỹ sư Tư vấn Quốc tế phát hành áp dụng cho gói 01TB-BA viết tắt là gì?",
          "a": "FIDIC",
          "subject": "Hợp đồng quốc tế",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Khi nhà thầu cần làm rõ HSMT, văn bản yêu cầu phải được gửi đến bên mời thầu trước thời điểm nào: Đóng thầu, Mở thầu, hay Phê duyệt kết quả?",
          "a": "Đóng thầu (Thời điểm đóng thầu)",
          "subject": "Quy trình đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Quy hoạch phát triển điện lực quốc gia định hướng vai trò phủ đỉnh của Thủy điện Bác Ái là Quy hoạch điện mấy?",
          "a": "Quy hoạch điện VIII (Quy hoạch điện 8)",
          "subject": "Chính sách năng lượng",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        }
      ],
      "5": [
        {
          "q": "Đối tác kỹ thuật Trung Quốc trong liên danh trúng thầu cùng Voith Hydro là tập đoàn nào?",
          "a": "Powerchina (Powerchina Zhongnan)",
          "subject": "Nhà thầu",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Trong liên danh nhà thầu tham dự gói 01TB-BA, các thành viên liên danh phải chịu trách nhiệm như thế nào trước chủ đầu tư: Trách nhiệm liên đới, hay Trách nhiệm riêng rẽ?",
          "a": "Trách nhiệm liên đới (Liên đới)",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Bước kiểm tra độc lập tính hợp pháp, tính đúng đắn của kết quả lựa chọn nhà thầu trước khi phê duyệt gọi là bước gì?",
          "a": "Thẩm định kết quả (Thẩm định)",
          "subject": "Quy trình đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hệ thống giám sát, điều khiển tự động hóa và thu thập dữ liệu trung tâm của nhà máy điện viết tắt là gì?",
          "a": "SCADA",
          "subject": "Công nghệ thông tin",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Trong thương thảo hợp đồng, bên mời thầu và nhà thầu tuyệt đối KHÔNG được phép thay đổi nội dung nào sau đây: Giá dự thầu, Kế hoạch huy động nhân sự, hay Tiến độ thi công chi tiết?",
          "a": "Giá dự thầu (hoặc Giá dự thầu và các tiêu chuẩn kỹ thuật đã đạt)",
          "subject": "Thương thảo hợp đồng",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hình thức mua sắm trực tiếp chỉ được áp dụng khi ký hợp đồng với nhà thầu đã trúng thầu gói thầu nào trước đó?",
          "a": "Gói thầu tương tự",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Cơ quan lập pháp cao nhất ban hành Luật Đấu thầu số 90/2025/QH15 là cơ quan nào?",
          "a": "Quốc hội",
          "subject": "Pháp luật",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Chiều quay của máy phát - động cơ khi nhà máy Bác Ái vận hành ở chế độ bơm nước có giống chiều phát điện không?",
          "a": "Không (Đảo chiều quay)",
          "subject": "Kỹ thuật cơ điện",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Biện pháp tài chính mà nhà thầu trúng thầu nộp để đảm bảo thực hiện đúng các cam kết hợp đồng gọi là gì?",
          "a": "Bảo đảm thực hiện hợp đồng (Bảo lãnh thực hiện hợp đồng)",
          "subject": "Quản lý hợp đồng",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Thời gian thực hiện hợp đồng 51 tháng của gói 01TB-BA tương đương với bao nhiêu năm?",
          "a": "4,25 năm",
          "subject": "Tiến độ dự án",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        }
      ],
      "6": [
        {
          "q": "Tổ chức độc lập được thuê để giám sát chất lượng và kiểm tra thử nghiệm tại xưởng chế tạo nước ngoài gọi là kiểm định gì?",
          "a": "Kiểm định độc lập (Bên thứ ba / Third-party inspection)",
          "subject": "Quản trị chất lượng",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Cấu trúc thị trường chỉ có một vài tập đoàn lớn toàn cầu nắm giữ công nghệ nguồn được gọi là gì?",
          "a": "Độc quyền nhóm (Oligopoly)",
          "subject": "Kinh tế học",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Đường dài nhất xuyên suốt sơ đồ mạng quyết định tổng thời gian hoàn thành dự án được gọi là đường gì?",
          "a": "Đường găng (Critical path)",
          "subject": "Quản lý dự án",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Hình thức chủ đầu tư trực tiếp huy động nhân lực, thiết bị của mình để triển khai gói thầu khi đủ năng lực gọi là hình thức gì: Tự thực hiện, Chỉ định thầu, hay Mua sắm trực tiếp?",
          "a": "Tự thực hiện",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Bước số 2 trong quy trình 7 bước tổ chức thực hiện đấu thầu là bước gì?",
          "a": "Mời thầu",
          "subject": "Quy trình đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Gói thầu thi công xây dựng đập, hầm dẫn dòng và gian máy ngầm thuộc nhóm gói thầu gì theo bản chất?",
          "a": "Gói thầu xây lắp",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Chức năng phủ đỉnh biểu đồ phụ tải của Bác Ái được kích hoạt vào giờ cao điểm hay thấp điểm của hệ thống điện?",
          "a": "Giờ cao điểm",
          "subject": "Vận hành hệ thống điện",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Nếu chỉ số hiệu suất chi phí CPI = EV / AC > 1 trong phương pháp EVM, dự án đang tiết kiệm chi phí hay vượt ngân sách?",
          "a": "Tiết kiệm chi phí (Dưới ngân sách)",
          "subject": "Quản trị chi phí",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Việc bên mời thầu cố tình đưa ra các tiêu chuẩn kỹ thuật chỉ một hãng sản xuất đáp ứng được là hành vi vi phạm gì?",
          "a": "Cài cắm tiêu chí độc quyền (Hạn chế cạnh tranh)",
          "subject": "Pháp luật đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hợp đồng FIDIC Vàng (Yellow Book) là hợp đồng mà nhà thầu chịu trách nhiệm cho cả hai khâu: Thiết kế và khâu gì?",
          "a": "Thi công (Thiết kế và thi công / Design-Build)",
          "subject": "Hợp đồng quốc tế",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        }
      ],
      "7": [
        {
          "q": "Theo Luật Đấu thầu, hai phương pháp đánh giá về mặt kỹ thuật phổ biến nhất là phương pháp Đạt/Không đạt và phương pháp nào: Chấm điểm bằng thang điểm, hay Bốc thăm ngẫu nhiên?",
          "a": "Chấm điểm bằng thang điểm (Phương pháp chấm điểm)",
          "subject": "Đánh giá hồ sơ",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Gói thầu có quy mô tài chính lớn, phạm vi công việc rộng đòi hỏi năng lực kỹ thuật và tài chính cao gọi là gói thầu gì?",
          "a": "Gói thầu quy mô lớn",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Mục tiêu cốt lõi của việc mở túi kỹ thuật trước túi tài chính trong phương thức 1G2T là gì?",
          "a": "Đảm bảo chất lượng kỹ thuật (Ngăn giá rẻ lấn át kỹ thuật)",
          "subject": "Phương thức đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Thiết bị van cơ khí an toàn dùng để ngăn dòng nước áp lực cao bảo vệ buồng xoắn tua-bin gọi là van gì?",
          "a": "Van cầu / Van bi",
          "subject": "Kỹ thuật thủy lực",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Khi có kiến nghị về kết quả lựa chọn nhà thầu, nhà thầu phải gửi đơn kiến nghị đầu tiên đến cấp nào: Chủ đầu tư, Trọng tài thương mại, hay Tòa án nhân dân?",
          "a": "Chủ đầu tư (Bên mời thầu / Chủ đầu tư)",
          "subject": "Giải quyết kiến nghị",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Hình thức giao nhiệm vụ cung ứng dịch vụ công ích cho đơn vị sự nghiệp công lập thực hiện gọi là gì?",
          "a": "Đặt hàng",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Nhà máy thủy điện tích năng hoạt động tích lũy và hoàn trả năng lượng cho hệ thống điện giống như thiết bị tích điện nào?",
          "a": "Ắc quy (Ắc quy nước / Pin sạc)",
          "subject": "Khoa học công nghệ",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Hiện tượng tăng áp lực đột ngột trong đường ống dẫn nước kín khi đóng van khẩn cấp được gọi là hiện tượng gì?",
          "a": "Búa nước (Water Hammer)",
          "subject": "Kỹ thuật thủy lực",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Trong trường hợp nhà thầu từ chối gia hạn hiệu lực HSDT khi bên mời thầu yêu cầu, khoản tiền bảo đảm dự thầu sẽ được: Hoàn trả lại cho nhà thầu, hay Tịch thu sung công quỹ?",
          "a": "Hoàn trả lại cho nhà thầu",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Một tổ máy 300 MW chạy hết công suất trong 2 giờ liên tục sẽ phát ra sản lượng điện năng là bao nhiêu MWh?",
          "a": "600 MWh (300 * 2 = 600)",
          "subject": "Vật lý - Năng lượng",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        }
      ],
      "8": [
        {
          "q": "Trong phương thức 1G2T, những nhà thầu không vượt qua bước đánh giá kỹ thuật có được mở túi tài chính hay không?",
          "a": "Không",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Điều kiện tự nhiên tiên quyết về địa hình để xây dựng thủy điện tích năng hiệu quả là sự chênh lệch lớn về yếu tố gì giữa 2 hồ?",
          "a": "Độ cao (Cột nước / Độ chênh cao)",
          "subject": "Địa lý kỹ thuật",
          "kdZone": "NATURAL_SCI",
          "vdZone": "KHTN"
        },
        {
          "q": "Hình thức đàm phán giá theo Luật Đấu thầu số 90/2025/QH15 được áp dụng chủ yếu cho nhóm hàng hóa nào sau đây: Thuốc và thiết bị y tế đặc thù, Vật liệu xây dựng thông thường, hay Xe ô tô công vụ?",
          "a": "Thuốc và thiết bị y tế đặc thù",
          "subject": "Luật Đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Bước làm việc giữa chủ đầu tư và nhà thầu xếp hạng thứ nhất để rà soát, thống nhất dự thảo hợp đồng trước khi ký kết gọi là: Hoàn thiện hợp đồng, Thẩm định kết quả, hay Mở thầu?",
          "a": "Hoàn thiện hợp đồng (Thương thảo, hoàn thiện hợp đồng)",
          "subject": "Quản lý hợp đồng",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Vào giờ thấp điểm ban đêm, Thủy điện Bác Ái bơm nước lên hồ trên giúp giải quyết tình trạng cắt giảm công suất của nguồn năng lượng nào?",
          "a": "Năng lượng tái tạo (Điện gió, điện mặt trời)",
          "subject": "Năng lượng tái tạo",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Nguyên tắc phân bổ chi phí và đánh giá hiệu quả dự án dựa trên toàn bộ chu kỳ sống của thiết bị gọi là gì trong quản trị?",
          "a": "Chi phí vòng đời (Life-Cycle Cost / Value for Money)",
          "subject": "Kinh tế dự án",
          "kdZone": "MATH_IT",
          "vdZone": "KHTN"
        },
        {
          "q": "Bước số 7, bước cuối cùng trong quy trình 7 bước tổ chức thực hiện đấu thầu là bước gì?",
          "a": "Công bố kết quả và ký kết hợp đồng",
          "subject": "Quy trình đấu thầu",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        },
        {
          "q": "Thách thức logistics lớn nhất khi vận chuyển máy phát và bánh công tác tua-bin nặng hàng trăm tấn qua đèo dốc Khánh Hòa là gì?",
          "a": "Hàng siêu trường siêu trọng",
          "subject": "Logistics dự án",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Mục tiêu cam kết của Việt Nam tại COP26 đưa mức phát thải khí nhà kính ròng về 0 vào năm 2050 gọi là gì?",
          "a": "Net Zero",
          "subject": "Môi trường",
          "kdZone": "GENERAL",
          "vdZone": "HBC"
        },
        {
          "q": "Thời hạn tối đa để chủ đầu tư có văn bản trả lời kiến nghị của nhà thầu về kết quả lựa chọn nhà thầu theo luật là bao nhiêu ngày?",
          "a": "15 ngày",
          "subject": "Giải quyết kiến nghị",
          "kdZone": "SOCIAL_SCI",
          "vdZone": "KHXH"
        }
      ]
    },
    "shared": [
      {
        "q": "Trong phương thức Một giai đoạn hai túi hồ sơ, túi hồ sơ nào bắt buộc phải được mở và đánh giá đạt yêu cầu trước: Hồ sơ đề xuất kỹ thuật, hay Hồ sơ đề xuất tài chính?",
        "a": "Hồ sơ đề xuất kỹ thuật",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Ba lớp kiểm soát độc lập (Control Points) trong quy trình đánh giá xét thầu gồm những cấp nào?",
        "a": "Tổ chuyên gia, Hội đồng xét thầu và Cơ quan thẩm định",
        "subject": "Quản trị dự án",
        "kdZone": "GENERAL",
        "vdZone": "HBC"
      },
      {
        "q": "Tỷ lệ tiết kiệm đấu thầu được tính bằng công thức nào?",
        "a": "(Dự toán - Giá trúng thầu) / Dự toán * 100%",
        "subject": "Kinh tế đấu thầu",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN"
      },
      {
        "q": "Tại sao thị trường tua-bin bơm tích năng công suất lớn lại mang tính chất độc quyền nhóm (Oligopoly)?",
        "a": "Do rào cản công nghệ lõi và bản quyền sáng chế phức tạp",
        "subject": "Kinh tế học",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Mẫu hợp đồng quốc tế chuẩn nào của FIDIC thường áp dụng cho gói thầu thiết kế, cung cấp và lắp đặt thiết bị cơ điện nhà máy điện?",
        "a": "FIDIC Vàng (Yellow Book) hoặc FIDIC Bạc (Silver Book)",
        "subject": "Hợp đồng quốc tế",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Hạng mục thi công nào của dự án Bác Ái có nguy cơ chậm tiến độ cao nhất làm ảnh hưởng đến thời gian lắp đặt thiết bị cơ điện?",
        "a": "Đào hầm dẫn nước và gian máy ngầm",
        "subject": "Quản lý rủi ro",
        "kdZone": "GENERAL",
        "vdZone": "HBC"
      },
      {
        "q": "Việc bắt buộc mở thầu qua mạng nhằm triệt tiêu nguy cơ gian lận gì trong đấu thầu truyền thống?",
        "a": "Tráo đổi hồ sơ, thông thầu và can thiệp thủ công",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Công suất 1.200 MW của Thủy điện Bác Ái tương đương bao nhiêu Gigawatt?",
        "a": "1,2 GW",
        "subject": "Vật lý",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN"
      },
      {
        "q": "Tại sao trong thị trường công nghệ nguồn độc quyền nhóm, biên độ giảm giá thầu thường rất hẹp?",
        "a": "Vì giá thành phần lớn cấu thành từ chi phí nghiên cứu và bản quyền công nghệ độc quyền",
        "subject": "Kinh tế đấu thầu",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN"
      },
      {
        "q": "Chức năng điều tần của Thủy điện Bác Ái có vai trò giữ ổn định thông số nào của dòng điện xoay chiều quốc gia?",
        "a": "Tần số (50 Hz)",
        "subject": "Kỹ thuật điện",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN"
      },
      {
        "q": "Sau khi kết quả lựa chọn nhà thầu được người có thẩm quyền phê duyệt, chủ đầu tư phải hoàn thành bước ký hợp đồng trong bước thứ mấy?",
        "a": "Bước 7",
        "subject": "Quy trình đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Tiêu chuẩn quốc tế của Viện Kỹ sư Điện và Điện tử về thiết bị điện và tự động hóa viết tắt là gì?",
        "a": "IEEE",
        "subject": "Tiêu chuẩn kỹ thuật",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN"
      },
      {
        "q": "Thời hạn thực hiện hợp đồng 51 tháng của gói 01TB-BA bắt đầu có hiệu lực tính từ mốc thời gian nào?",
        "a": "Ngày hợp đồng có hiệu lực (hoặc ngày khởi công quy định trong hợp đồng)",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Trong tam giác ràng buộc dự án, việc vận chuyển thiết bị cơ điện chậm trễ qua đèo dốc sẽ trực tiếp đe dọa yếu tố nào: Tiến độ (Thời gian), Phạm vi, hay Ngân sách ban đầu?",
        "a": "Tiến độ (Thời gian)",
        "subject": "Quản lý dự án",
        "kdZone": "GENERAL",
        "vdZone": "HBC"
      },
      {
        "q": "Nguyên tắc Value for Money trong đấu thầu quốc tế yêu cầu đánh giá chi phí dự án theo chu kỳ nào: Toàn bộ vòng đời tài sản (Life-Cycle Cost), hay Chỉ tính giá mua ban đầu?",
        "a": "Toàn bộ vòng đời tài sản (Life-Cycle Cost)",
        "subject": "Kinh tế dự án",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN"
      },
      {
        "q": "Khoản tiền mà nhà thầu phải nộp để đảm bảo nghĩa vụ sửa chữa hư hỏng phát sinh trong thời gian bảo hành công trình gọi là gì?",
        "a": "Bảo đảm bảo hành (Bảo lãnh bảo hành)",
        "subject": "Quản lý hợp đồng",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Văn bản pháp lý do người có thẩm quyền ký ban hành để chính thức công nhận đơn vị trúng thầu được gọi là Quyết định phê duyệt gì?",
        "a": "Kết quả lựa chọn nhà thầu (KQLCNT)",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Hiện tượng dao động áp lực lớn và chấn động dòng chảy khi tua-bin chuyển đổi đột ngột giữa chế độ bơm và phát điện được gọi là: Quá độ thủy lực, Sự cố ngắn mạch, hay Xâm thực cánh tua-bin?",
        "a": "Quá độ thủy lực",
        "subject": "Kỹ thuật cơ điện",
        "kdZone": "NATURAL_SCI",
        "vdZone": "KHTN"
      },
      {
        "q": "Theo Luật Đấu thầu số 90/2025/QH15, giá trị bảo lãnh dự thầu đối với gói thầu quy mô lớn được quy định từ ... đến ... phần trăm giá gói thầu?",
        "a": "1 đến 3 (từ 1% đến 3%)",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Cấp có thẩm quyền phê duyệt kế hoạch lựa chọn nhà thầu đối với dự án do EVN làm chủ đầu tư là cơ quan nào?",
        "a": "Hội đồng Thành viên EVN (HĐTV EVN)",
        "subject": "Quản lý dự án",
        "kdZone": "GENERAL",
        "vdZone": "HBC"
      },
      {
        "q": "Thời điểm đóng thầu và mở thầu công khai gói 01TB-BA diễn ra vào ngày mấy trong tháng 2 năm 2026?",
        "a": "Ngày 23 (23/02/2026)",
        "subject": "Mốc sự kiện",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Nhóm chuyên gia được bên mời thầu thành lập để trực tiếp chấm điểm và lập báo cáo đánh giá HSDT gọi là gì?",
        "a": "Tổ chuyên gia đấu thầu",
        "subject": "Quy trình đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Văn bản thỏa thuận pháp lý giữa các nhà thầu độc lập để cùng tham gia nộp một hồ sơ dự thầu gọi là thỏa thuận gì?",
        "a": "Thỏa thuận liên danh",
        "subject": "Thuật ngữ đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      },
      {
        "q": "Theo thông lệ hợp đồng FIDIC quốc tế, nếu các bên không hòa giải được sau phán quyết của Ban Phân xử tranh chấp DAB, tranh chấp sẽ được chuyển đến cơ quan nào: Trọng tài quốc tế, hay Hội đồng Nhân dân tỉnh?",
        "a": "Trọng tài quốc tế",
        "subject": "Pháp luật hợp đồng",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH"
      }
    ]
  },
  "vcnv": {
    "answer": "ẮC QUY NƯỚC",
    "mysteryImage": "/olympia/media/bac_ai_cnv_mystery.png",
    "rows": [
      {
        "hint": "Năm 1800, nhà vật lý người Ý nào đã chế tạo thành công nguồn điện hóa học đầu tiên trong lịch sử từ các đĩa đồng và kẽm xếp chồng lên nhau, và tên ông được đặt cho đơn vị hiệu điện thế? (5 chữ cái)",
        "answer": "VOLTA"
      },
      {
        "hint": "Trong Vật lý cơ học, dạng năng lượng dự trữ của một vật có khối lượng m khi được đưa lên độ cao h so với mốc tính trong trường trọng lực Trái Đất (Wt = mgh) được gọi là gì? (7 chữ cái)",
        "answer": "THẾ NĂNG"
      },
      {
        "hint": "Trong Hóa học, những phản ứng có thể diễn ra đồng thời theo cả hai chiều ngược nhau trong cùng một điều kiện (ký hiệu bằng mũi tên ⇌) được gọi là phản ứng ... (9 chữ cái)",
        "answer": "THUẬN NGHỊCH"
      },
      {
        "hint": "Một bình ắc quy chì - axit tiêu chuẩn dùng để khởi động ô tô con thông thường được ghép nối tiếp từ 6 ngăn đơn (mỗi ngăn có suất điện động 2 Vôn). Hỏi hiệu điện thế định mức của bình ắc quy này là bao nhiêu Vôn? (2 chữ số)",
        "answer": "12"
      }
    ],
    "centerQuestion": {
      "q": "Hai quá trình cơ bản lặp đi lặp lại trong suốt chu kỳ làm việc của một viên pin sạc hoặc hệ thống tích năng được gọi ngắn gọn là chu trình ... (5 chữ cái)",
      "a": "NẠP XẢ (Chấp nhận SẠC XẢ hoặc TÍCH XẢ)"
    }
  },
  "vcnvBackup": {
    "answer": "CHI PHÍ VÒNG ĐỜI",
    "mysteryImage": "/olympia/media/life_cycle_cost_chart.jpg",
    "rows": [
      {
        "hint": "Văn bản xác định toàn bộ chi phí dự kiến cần thiết để hoàn thành gói thầu trước khi tổ chức đấu thầu gọi là ... (6 chữ cái)",
        "answer": "DỰ TOÁN"
      },
      {
        "hint": "Hoạt động kiểm tra, sửa chữa và thay thế định kỳ phụ tùng để duy trì khả năng hoạt động liên tục của thiết bị trong suốt 40 năm vận hành gọi là ... (7 chữ cái)",
        "answer": "BẢO DƯỠNG"
      },
      {
        "hint": "Tỷ số giữa năng lượng hữu ích thu được so với tổng năng lượng tiêu hao trong chu trình vận hành máy móc gọi là ... (8 chữ cái)",
        "answer": "HIỆU SUẤT"
      },
      {
        "hint": "Khoản chênh lệch dương giữa giá dự toán được duyệt và giá trúng thầu sau đàm phán (85 tỷ đồng) thể hiện chỉ tiêu ... trong đấu thầu? (8 chữ cái)",
        "answer": "TIẾT KIỆM"
      }
    ],
    "centerQuestion": {
      "q": "Khoảng thời gian từ lúc mua sắm, khai thác vận hành cho đến khi thanh lý toàn bộ tài sản công trình được gọi là chu kỳ ... (7 chữ cái)",
      "a": "VÒNG ĐỜI"
    }
  },
  "tangToc": [
      {
          "q": "Hình thức lựa chọn nhà thầu nào được Luật Đấu thầu số 90/2025/QH15 quy định là hình thức mặc định, áp dụng không hạn chế số lượng nhà thầu tham dự?",
          "answer": "ĐẤU THẦU RỘNG RÃI",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_cau1.png",
          "category": "iq"
      },
      {
          "q": "Đây là tên tập đoàn nào? Dữ kiện 1: Tập đoàn cơ khí năng lượng hàng đầu của Đức. Dữ kiện 2: Có cơ sở chế tạo lớn tại Thượng Hải. Dữ kiện 3: Chuyên chế tạo tua-bin cột nước cao. Dữ kiện 4: Đứng đầu liên danh trúng thầu gói 01TB-BA Bác Ái.",
          "answer": "VOITH HYDRO",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_cau2.png",
          "category": "data"
      },
      {
          "q": "Hãy sắp xếp các mốc thời gian đấu thầu gói 01TB-BA theo trình tự trước sau: (1) Đóng và mở thầu công khai (23/02/2026), (2) Phát hành Hồ sơ mời thầu (15/10/2025), (3) EVN chính thức ký hợp đồng (26/10/2026), (4) Phê duyệt kết quả trúng thầu (21/10/2026).",
          "answer": "2-1-4-3",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_cau3.png",
          "category": "arrange"
      },
      {
          "q": "Gói thầu 01TB-BA có giá dự toán là 4.548,081 tỷ đồng và giá trúng thầu là 4.462,603 tỷ đồng. Hãy tính số tiền tiết kiệm tuyệt đối mà EVN đạt được qua đấu thầu là bao nhiêu tỷ đồng?",
          "answer": "85,478 TỶ ĐỒNG (85.478)",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_cau4.png",
          "category": "data"
      }
  ],
  "tangTocBackup": [
      {
          "q": "Theo Luật Đấu thầu số 90/2025/QH15, quy trình tổ chức thực hiện đấu thầu chuẩn hóa gồm bao nhiêu bước liên tục?",
          "answer": "7 BƯỚC (7)",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_dp_cau1.png",
          "category": "iq"
      },
      {
          "q": "Đây là công trình nào? Dữ kiện 1: Đặt tại tỉnh Khánh Hòa. Dữ kiện 2: Tổng mức đầu tư hơn 21.100 tỷ đồng. Dữ kiện 3: Tổng công suất 1.200 MW. Dữ kiện 4: Nhà máy thủy điện tích năng đầu tiên của Việt Nam.",
          "answer": "THỦY ĐIỆN TÍCH NĂNG BÁC ÁI (BÁC ÁI)",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_dp_cau2.png",
          "category": "data"
      },
      {
          "q": "Hãy sắp xếp các bước trong phương thức đấu thầu Một giai đoạn hai túi hồ sơ theo thứ tự quy định: (1) Mở túi đề xuất tài chính, (2) Đánh giá hồ sơ đề xuất kỹ thuật, (3) Mở túi đề xuất kỹ thuật, (4) Phê duyệt kết quả trúng thầu.",
          "answer": "3-2-1-4",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_dp_cau3.png",
          "category": "arrange"
      },
      {
          "q": "Gói thầu 01TB-BA có dự toán 4.548,081 tỷ đồng và tiết kiệm được 85,478 tỷ đồng. Hãy tính tỷ lệ phần trăm tiết kiệm so với giá dự toán (làm tròn 2 chữ số thập phân)?",
          "answer": "1,88% (1.88)",
          "type": "image",
          "media": "/olympia/media/bac_ai_tt_dp_cau4.png",
          "category": "data"
      }
  ],
  "veDich": {
    "10": [
      {
        "q": "Trong quy trình 7 bước tổ chức đấu thầu chuẩn hóa, bước đầu tiên mang tính pháp lý tiên quyết để bên mời thầu làm căn cứ triển khai phát hành hồ sơ mời thầu là bước gì?",
        "a": "Phê duyệt Kế hoạch lựa chọn nhà thầu (KHLCNT)",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "type": "theory"
      },
      {
        "q": "Ngày 26 tháng 10 năm 2026 đã diễn ra sự kiện pháp lý quan trọng nào đối với Gói thầu số 01TB-BA Thủy điện Bác Ái?",
        "a": "Ký kết hợp đồng",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Tổng công suất lắp đặt định mức của toàn bộ 4 tổ máy tại Nhà máy Thủy điện Tích năng Bác Ái khi hoàn thành là bao nhiêu MW?",
        "a": "1.200 MW",
        "subject": "Dự án Bác Ái",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "type": "theory"
      },
      {
        "q": "Trong quản lý dự án xây dựng, tài liệu do chủ đầu tư ban hành xác định phạm vi, quy mô công việc và yêu cầu kỹ thuật đối với dịch vụ tư vấn được viết tắt là gì (tương đương TOR)?",
        "a": "Điều khoản tham chiếu (TOR)",
        "subject": "Quản lý dự án",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "type": "theory"
      },
      {
        "q": "Theo tài liệu nghiên cứu chuyên đề về quản lý dự án, văn bản pháp luật cao nhất điều chỉnh hoạt động đấu thầu được viện dẫn có số hiệu đầy đủ là gì?",
        "a": "Luật Đấu thầu số 90/2025/QH15",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Chủ đầu tư chịu trách nhiệm toàn diện về hiệu quả Dự án Thủy điện Tích năng Bác Ái là tập đoàn nào?",
        "a": "Tập đoàn Điện lực Việt Nam (EVN)",
        "type": "theory",
        "vdZone": "HBC"
      },
      {
        "q": "Ban Quản lý Dự án nào trực tiếp được EVN giao đại diện quản lý dự án Thủy điện Bác Ái: Ban QLDA Điện 1, Ban QLDA Điện 2, hay Ban QLDA Điện 3?",
        "a": "Ban QLDA Điện 3 (Ban Quản lý Dự án Điện 3)",
        "type": "theory",
        "vdZone": "HBC"
      },
      {
        "q": "Trong quy chuẩn thử nghiệm thiết bị cơ điện, việc chạy thử nghiệm liên tục không tải và có tải của tổ máy trước khi bàn giao thương mại thường kéo dài bao nhiêu giờ?",
        "a": "72 giờ",
        "type": "theory",
        "vdZone": "KHTN"
      },
      {
        "q": "Hồ dưới của Thủy điện Bác Ái (hồ Sông Cái) là công trình đầu mối tích trữ nước thuộc đại dự án thủy lợi trọng điểm nào của vùng khô hạn Nam Trung Bộ?",
        "a": "Hệ thống thủy lợi Tân Mỹ",
        "subject": "Dự án Bác Ái",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "type": "theory"
      },
      {
        "q": "Tên chính thức của gói thầu số 01TB-BA thuộc dự án Thủy điện Bác Ái là Cung cấp thiết bị gì?",
        "a": "Thiết bị cơ điện",
        "type": "theory",
        "vdZone": "HBC"
      },
      {
        "q": "Hình thức lựa chọn nhà thầu áp dụng cho gói thầu mua sắm hàng hóa thông dụng, có sẵn trên thị trường với giá trị gói thầu nhỏ dưới hạn mức luật định được gọi là gì?",
        "a": "Chào hàng cạnh tranh",
        "subject": "Luật Đấu thầu",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "type": "theory"
      },
      {
        "q": "Loại hợp đồng áp dụng chính thức cho Gói thầu số 01TB-BA cung cấp thiết bị cơ điện Thủy điện Tích năng Bác Ái theo hồ sơ mời thầu là loại hợp đồng nào?",
        "a": "Hợp đồng trọn gói",
        "subject": "Dự án Bác Ái",
        "kdZone": "SOCIAL_SCI",
        "vdZone": "KHXH",
        "type": "theory"
      },
      {
        "q": "Nguyên tắc đấu thầu tối ưu hóa chi phí vòng đời tài sản trong tiếng Anh được viết tắt là gì?",
        "a": "Value for Money (VfM)",
        "type": "theory",
        "vdZone": "HBC"
      },
      {
        "q": "Thiết bị điều khiển logic khả trình được dùng rộng rãi để tự động hóa quy trình đóng cắt van và điều khiển tổ máy phát điện viết tắt là gì?",
        "a": "PLC (Programmable Logic Controller)",
        "subject": "Tự động hóa",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "type": "theory"
      },
      {
        "q": "Trong bộ điều kiện hợp đồng quốc tế FIDIC, mẫu hợp đồng thiết kế, cung cấp thiết bị và thi công xây dựng trọn gói (EPC / Turnkey) thường được nhận diện bởi cuốn sách có bìa màu gì?",
        "a": "Sách Bạc (Silver Book)",
        "subject": "Hợp đồng quốc tế",
        "kdZone": "GENERAL",
        "vdZone": "HBC",
        "type": "theory"
      },
      {
        "q": "Mục tiêu cốt lõi của bước Mở thầu trong quy trình tổ chức đấu thầu là gì?",
        "a": "Bảo đảm tính công khai, minh bạch và ghi nhận các thông tin cơ bản của các HSDT nộp đúng hạn. [Barem chấm điểm: Thí sinh nêu được ý Công khai/Minh bạch và Ghi nhận/Mở công khai các đề xuất]",
        "type": "theory",
        "vdZone": "KHXH"
      }
    ],
    "20": [
      {
        "q": "Tại sao trong gói thầu thiết bị cơ điện công nghệ cao 01TB-BA, chủ đầu tư EVN áp dụng phương thức Một giai đoạn hai túi hồ sơ mà không áp dụng một túi hồ sơ?",
        "a": "Để tách biệt đánh giá kỹ thuật với giá dự thầu, ngăn chặn việc nhà thầu chào giá thấp lấn át chất lượng kỹ thuật",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Nhà máy Thủy điện Tích năng Bác Ái có 4 tổ máy 300 MW (tổng 1.200 MW). Nếu cả 4 tổ máy phát điện hết công suất định mức liên tục trong 6 giờ chu kỳ cao điểm, tổng sản lượng điện năng phát lên lưới quốc gia là bao nhiêu triệu kWh?",
        "a": "7,2 triệu kWh",
        "subject": "Dự án Bác Ái",
        "kdZone": "MATH_IT",
        "vdZone": "KHTN",
        "type": "practice"
      },
      {
        "q": "Dự toán gói thầu 01TB-BA là 4.548,081 tỷ đồng, tổng mức đầu tư dự án Bác Ái là 21.101,468 tỷ đồng. Gói thầu cơ điện chiếm tỷ trọng làm tròn 2 chữ số thập phân là ... % tổng mức đầu tư?",
        "a": "21,55%",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Khi nhà máy Bác Ái tiêu thụ 20 triệu kWh điện ở chế độ bơm tích năng ban đêm, nếu hiệu suất chu trình kép là 75% thì lượng điện năng phát ra lúc cao điểm là bao nhiêu triệu kWh?",
        "a": "15 triệu kWh",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Trong quản lý dự án hiện đại, thuật ngữ viết tắt LCC là gì và có vai trò như thế nào khi đánh giá hiệu quả kinh tế gói thầu thiết bị?",
        "a": "Life-Cycle Cost (Chi phí vòng đời tài sản), dùng để tối ưu hóa tổng chi phí mua sắm, vận hành, bảo dưỡng trong toàn bộ thời gian sử dụng",
        "type": "theory",
        "vdZone": "HBC"
      },
      {
        "q": "Hãy nêu 2 rủi ro hiện trường lớn nhất đe dọa đến tiến độ và an toàn thiết bị của gói thầu 01TB-BA tại tỉnh Khánh Hòa?",
        "a": "Rủi ro vận chuyển logistics siêu trường siêu trọng qua đèo dốc và rủi ro chậm tiến độ đào hầm gian máy ngầm",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Thế nào là thị trường độc quyền nhóm (Oligopoly) trong cung ứng thiết bị thủy điện tích năng quốc tế?",
        "a": "Thị trường chỉ có một vài tập đoàn hàng đầu thế giới đủ bí quyết công nghệ tua-bin đảo chiều cột nước cao, tạo rào cản gia nhập cực lớn",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Khi đánh giá và quản lý thực hiện gói 01TB-BA, vai trò của đơn vị kiểm định độc lập (Third-party inspection) tại các nhà máy chế tạo ở Thượng Hải là gì?",
        "a": "Giám sát, kiểm tra độc lập quy trình đúc rèn và thử nghiệm xuất xưởng tại xưởng chế tạo nước ngoài trước khi giao hàng. [Barem chấm điểm: Thí sinh nêu được ý Giám sát quy trình chế tạo/đúc rèn hoặc Kiểm định chất lượng xuất xưởng tại xưởng nước ngoài]",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Gói thầu 01TB-BA có giá trúng thầu 4.462,603 tỷ đồng và dự toán 4.548,081 tỷ đồng. Hãy tính số tiền tiết kiệm tuyệt đối mà EVN đạt được?",
        "a": "85,478 tỷ đồng",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Tại sao việc đấu thầu các gói thầu phổ biến hiện nay bắt buộc thực hiện qua Hệ thống mạng đấu thầu quốc gia?",
        "a": "Nhằm tăng tính minh bạch, giảm chi phí hành chính, ngăn chặn tiêu cực thông thầu và tạo thuận lợi cho giám sát xã hội",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Theo Quy hoạch điện VIII, Thủy điện Tích năng Bác Ái đóng vai trò gì trong việc tích hợp năng lượng tái tạo?",
        "a": "Tích trữ điện năng dư thừa từ điện gió và mặt trời lúc thấp điểm, xả phát điện điều tần và phủ đỉnh lúc cao điểm",
        "type": "theory",
        "vdZone": "HBC"
      },
      {
        "q": "Điều kiện tiên quyết để hồ sơ đề xuất tài chính của một nhà thầu được mở và đánh giá trong phương thức 1G2T là gì?",
        "a": "Hồ sơ đề xuất kỹ thuật phải được đánh giá đạt yêu cầu theo các tiêu chuẩn quy định trong HSMT",
        "type": "theory",
        "vdZone": "KHXH"
      }
    ],
    "30": [
      {
        "q": "Một chủ đầu tư đánh giá phương án nhà thầu theo công thức điểm tổng hợp: 0,7 điểm Kỹ thuật + 0,3 điểm Tài chính. Nếu nhà thầu A đạt 90 điểm kỹ thuật và 80 điểm tài chính, hãy tính điểm tổng hợp của nhà thầu A?",
        "a": "87 điểm (0,7 * 90 + 0,3 * 80 = 63 + 24 = 87)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Gói thầu 01TB-BA có giá trúng thầu 4.462,603 tỷ đồng, tiết kiệm 85,478 tỷ đồng so với dự toán. Tỷ lệ phần trăm tiết kiệm của gói thầu khi làm tròn 2 chữ số thập phân là ... %?",
        "a": "1,88%",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Tại sao trong đấu thầu thiết bị công nghệ nguồn độc quyền nhóm, tỷ lệ tiết kiệm thấp (1,88%) vẫn được đánh giá là thành công lớn và tuân thủ đúng nguyên tắc Value for Money?",
        "a": "Vì biên độ giảm giá công nghệ lõi rất hẹp; mục tiêu cao nhất là mua được thiết bị an toàn, độ tin cậy cao, tối ưu chi phí vận hành bảo dưỡng 40 năm chứ không phải chạy đua hạ giá ban đầu",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Phương án thiết bị X có giá mua 4.462 tỷ, chi phí bảo dưỡng 40 năm là 1.200 tỷ, tổn thất hiệu suất là 180 tỷ. Phương án Y có giá mua 4.400 tỷ, chi phí bảo dưỡng 1.350 tỷ, tổn thất hiệu suất 250 tỷ. Theo tiêu chí Chi phí vòng đời (LCC), phương án nào tối ưu hơn và tiết kiệm hơn bao nhiêu tỷ đồng?",
        "a": "Phương án X tối ưu hơn, tiết kiệm hơn 158 tỷ đồng (LCC_X = 5.842 tỷ vs LCC_Y = 6.000 tỷ)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Tại sao Gói thầu 01TB-BA được xác định là gói thầu nằm trên 'đường găng' (Critical Path) quyết định toàn bộ tiến độ dự án Bác Ái?",
        "a": "Vì chu kỳ chế tạo, vận chuyển và lắp đặt thiết bị kéo dài tới 51 tháng; bất kỳ sự chậm trễ nào của gói này đều trực tiếp làm lùi mốc phát điện thương mại của toàn bộ dự án 21.100 tỷ",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Hãy nêu các giải pháp quản trị rủi ro biến động tỷ giá và giá kim loại trong chu kỳ thực hiện hợp đồng 51 tháng?",
        "a": "Áp dụng mẫu hợp đồng quốc tế FIDIC với công thức điều chỉnh giá rõ ràng, thỏa thuận đồng tiền thanh toán và sử dụng công cụ tài chính phái sinh",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Chấm điểm theo phương thức 1G2T: Điểm tổng hợp = 0,8 điểm Kỹ thuật + 0,2 điểm Tài chính. Nhà thầu B đạt 95 điểm Kỹ thuật và 70 điểm Tài chính. Tính điểm tổng hợp của nhà thầu B?",
        "a": "90 điểm (0,8 * 95 + 0,2 * 70 = 76 + 14 = 90)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Tình huống: Gian máy ngầm bị chậm tiến độ 6 tháng trong khi thiết bị cơ điện về đúng hạn 51 tháng. Chủ đầu tư EVN xử lý giải pháp nào tối ưu nhất theo FIDIC?",
        "a": "Bố trí kho bảo quản chuyên dụng kiểm soát nhiệt ẩm tại cảng/hiện trường, đàm phán gia hạn bảo hiểm lưu kho và chia nhỏ tiến độ lắp đặt cuốn chiếu theo từng tổ máy",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Tại sao EVN không áp dụng hình thức Chào hàng cạnh tranh hay Chỉ định thầu cho Gói thầu 01TB-BA?",
        "a": "Do quy mô hơn 4.500 tỷ vượt xa hạn mức chào hàng cạnh tranh; tính chất kỹ thuật cao độc quyền quốc tế đòi hỏi đấu thầu rộng rãi quốc tế để đảm bảo tính cạnh tranh và minh bạch",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Phân tích cơ chế tách biệt đánh giá kỹ thuật và tài chính trong phương thức 1G2T giúp bảo vệ an toàn hệ thống điện quốc gia như thế nào?",
        "a": "Loại bỏ hoàn toàn các nhà thầu chào giá rẻ nhưng thiết bị không đạt chuẩn kỹ thuật; ngăn ngừa nguy cơ sự cố dừng máy hoặc rã lưới điện quốc gia. [Barem chấm điểm: Nêu được ý Loại bỏ thầu giá rẻ kém chất lượng và Bảo đảm an toàn vận hành/chất lượng thiết bị]",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Một tổ máy 300 MW của Bác Ái vận hành phát điện hết công suất liên tục trong 6 giờ cao điểm sẽ tạo ra sản lượng điện năng hòa lưới là bao nhiêu MWh?",
        "a": "1.800 MWh (300 MW * 6 h = 1.800 MWh)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Hãy phân tích bài học kinh nghiệm từ gói 01TB-BA về khảo sát tuyến đường vận chuyển logistics siêu trường siêu trọng tại Khánh Hòa?",
        "a": "Cần khảo sát chi tiết bán kính cong, độ dốc đèo và tải trọng cầu cống từ cảng biển vào công trình trước khi mời thầu để lập phương án gia cố và tránh tắc nghẽn",
        "type": "theory",
        "vdZone": "KHXH"
      }
    ],
    "40": [
      {
        "q": "Chủ đầu tư đánh giá 3 phương án tua-bin: Phương án 1 (mua 4.462 tỷ, OPEX 40 năm 1.150 tỷ, tổn thất hiệu suất 160 tỷ); Phương án 2 (mua 4.410 tỷ, OPEX 1.300 tỷ, tổn thất 240 tỷ); Phương án 3 (mua 4.500 tỷ, OPEX 1.050 tỷ, tổn thất 120 tỷ). Hãy tính LCC của cả 3 phương án và xác định phương án tối ưu nhất tiết kiệm hơn phương án giá rẻ nhất (PA2) bao nhiêu tỷ đồng?",
        "a": "Phương án 3 tối ưu nhất (LCC3 = 5.670 tỷ), tiết kiệm hơn Phương án 2 (LCC2 = 5.950 tỷ) là 280 tỷ đồng (LCC1 = 5.772 tỷ)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Gói thầu 01TB-BA có thời gian 51 tháng. Nếu chi phí thúc đẩy biện pháp thi công để đưa tổ máy 1 phát điện sớm 90 ngày là 45 tỷ đồng, nhưng việc phát điện sớm giúp EVN giảm chi phí chạy dầu 1,2 tỷ đồng mỗi ngày. Hỏi chủ đầu tư có nên thúc đẩy tiến độ không và lợi ích kinh tế thuần thu được là bao nhiêu tỷ đồng?",
        "a": "Nên thúc đẩy; Lợi ích kinh tế thuần là 63 tỷ đồng (Lợi ích = 90 * 1,2 = 108 tỷ; Lợi ích thuần = 108 - 45 = 63 tỷ đồng)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Nhà máy Bác Ái bơm nước ban đêm với giá điện mua vào 1.000 VNĐ/kWh, tiêu thụ 10 triệu kWh. Hiệu suất chu trình kép đạt 80%. Ban ngày xả nước phát điện vào giờ cao điểm bán với giá 3.200 VNĐ/kWh. Hãy tính lợi nhuận gộp (chênh lệch doanh thu phát điện trừ chi phí mua điện bơm) của chu trình trong ngày đó là bao nhiêu triệu đồng?",
        "a": "15.600 triệu đồng (15,6 tỷ đồng) [Chi phí bơm: 10 tỷ; Doanh thu phát: 8 triệu kWh * 3.200 = 25,6 tỷ; Lợi nhuận gộp: 25,6 - 10 = 15,6 tỷ]",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Trong quá trình lắp đặt thiết bị, nhà thầu khiếu nại yêu cầu bồi thường 150 tỷ đồng do mặt bằng ngầm chậm bàn giao. Theo mẫu hợp đồng FIDIC, trình tự 4 bước giải quyết tranh chấp này diễn ra như thế nào?",
        "a": "(1) Nhà thầu gửi Thông báo khiếu nại (Claim) -> (2) Kỹ sư tư vấn (The Engineer) ra quyết định -> (3) Ban Phân xử tranh chấp (DAB) đưa ra phán quyết -> (4) Trọng tài quốc tế (Arbitration). [Barem chấm điểm: Thí sinh nêu đúng trình tự qua Kỹ sư tư vấn, Ban DAB và Trọng tài quốc tế]",
        "type": "practice",
        "vdZone": "KHXH"
      },
      {
        "q": "Theo phương pháp Giá đánh giá (Evaluated Price): Nhà thầu 1 chào giá 4.462 tỷ, thưởng tiến độ sớm -30 tỷ, bảo hành mở rộng -15 tỷ. Nhà thầu 2 chào giá 4.430 tỷ, bị cộng phạt hiệu suất thấp +80 tỷ. Hãy tính Giá đánh giá của từng nhà thầu và cho biết nhà thầu nào xếp thứ nhất?",
        "a": "Nhà thầu 1 xếp thứ nhất với Giá đánh giá là 4.417 tỷ đồng (Nhà thầu 2 có Giá đánh giá là 4.510 tỷ đồng, Nhà thầu 1 thấp hơn 93 tỷ đồng)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Dự án Bác Ái có tổng mức đầu tư 21.101,468 tỷ đồng. Gói thầu 01TB-BA có giá trúng thầu 4.462,603 tỷ đồng được tài trợ 80% từ vốn vay nước ngoài và 20% từ nguồn vốn đối ứng tự có của EVN. Hãy tính số vốn đối ứng chính xác mà EVN phải bỏ ra cho riêng gói thầu 01TB-BA?",
        "a": "892,52 tỷ đồng (4.462,603 * 20% = 892,5206 tỷ đồng)",
        "type": "practice",
        "vdZone": "KHTN"
      },
      {
        "q": "Trong đấu thầu quốc tế quy mô lớn, các dấu hiệu bất thường nào trong Hồ sơ dự thầu cho thấy nguy cơ thông đồng, dàn xếp thầu giữa các liên danh dự thầu?",
        "a": "Giá dự thầu chênh lệch nhau theo một tỷ lệ phần trăm cố định bất thường; hồ sơ có cùng lỗi chính tả, cùng mẫu format văn bản hoặc cùng địa chỉ IP; có nhà thầu bỏ giá thầu cao bất hợp lý để nhường quyền thắng cho nhà thầu được chỉ định trước",
        "type": "theory",
        "vdZone": "KHXH"
      },
      {
        "q": "Nhà máy Bác Ái công suất 1.200 MW vận hành thay thế nhiệt điện than có hệ số phát thải 0,9 kg CO2/kWh. Nếu trong một năm, nhà máy phát điện phủ đỉnh 2.500 giờ với công suất trung bình 800 MW, hỏi lượng phát thải CO2 giảm thiểu được trong năm đó là bao nhiêu tấn?",
        "a": "1.800.000 tấn CO2 (1,8 triệu tấn) [Sản lượng: 800.000 kW * 2.500 h = 2 tỷ kWh; Giảm phát thải: 2 tỷ * 0,9 kg = 1,8 tỷ kg = 1,8 triệu tấn CO2]",
        "type": "practice",
        "vdZone": "KHTN"
      }
    ]
  },
  "cauHoiPhu": [
    {
      "q": "Bộ quy tắc thương mại quốc tế chuẩn hóa do Phòng Thương mại Quốc tế (ICC) phát hành quy định trách nhiệm giao nhận hàng hóa viết tắt là gì?",
      "a": "Incoterms",
      "subject": "Thương mại quốc tế",
      "kdZone": "GENERAL",
      "vdZone": "HBC"
    },
    {
      "q": "Theo Quy hoạch điện VIII, nguồn năng lượng nào có tính biến thiên mạnh cần Thủy điện tích năng Bác Ái bù đắp công suất nhiều nhất?",
      "a": "Năng lượng tái tạo (Điện mặt trời và điện gió)"
    },
    {
      "q": "Việc đánh giá hồ sơ dự thầu qua tổ chuyên gia, hội đồng xét thầu và cơ quan thẩm định độc lập được gọi là thiết lập các điểm gì trong kiểm soát nội bộ?",
      "a": "Điểm kiểm soát (Control Points)"
    },
    {
      "q": "Thông số chênh lệch độ cao giữa hồ trên và hồ dưới quyết định trực tiếp áp lực nước và công suất phát của tua-bin gọi là gì?",
      "a": "Độ chênh cao (Cột nước / Head)"
    },
    {
      "q": "Thời gian có hiệu lực tối thiểu của bảo đảm dự thầu được quy định bằng thời gian có hiệu lực của hồ sơ dự thầu cộng thêm bao nhiêu ngày?",
      "a": "30 ngày",
      "subject": "Luật Đấu thầu",
      "kdZone": "SOCIAL_SCI",
      "vdZone": "KHXH"
    },
    {
      "q": "Theo mô hình tổ chức chính quyền địa phương 2 cấp, Nhà máy Thủy điện Tích năng Bác Ái được xây dựng tại đơn vị hành chính cấp cơ sở nào của tỉnh Khánh Hòa?",
      "a": "Xã Phước Hòa (Phước Hòa)"
    }
  ]
};

export const BAC_AI_QUESTION_SET: OlympiaQuestionSet = autoTagOlympiaSet(RAW_BAC_AI_QUESTION_SET, false);
