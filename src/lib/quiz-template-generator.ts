/**
 * QUIZ & WORD PUZZLE TEMPLATE GENERATOR
 * -------------------------------------
 * Tạo và tải xuống các tệp mẫu chuẩn (Excel .xlsx & JSON .json)
 * phục vụ việc nhập đề ô chữ Chiếc Nón Kỳ Diệu và ngân hàng câu hỏi tổng hợp.
 */

import * as XLSX from "xlsx";

export interface MagicWheelTemplateRow {
  Loai_Cau_Hoi: "WORD_PUZZLE";
  Vong_Thi: number;
  Chu_De: string;
  Cum_Tu_Bi_Mat: string;
  Goi_Y_MC: string;
  Diem_So: number;
  Thoi_Gian_Giay: number;
}

/**
 * Dữ liệu mẫu 11 vòng chơi chuẩn Gameshow Chiếc Nón Kỳ Diệu (2 Vòng Đoán Nhanh + 8 Vòng Chính tối đa + 1 Vòng Đặc Biệt)
 */
export const SAMPLE_MAGIC_WHEEL_ROWS: MagicWheelTemplateRow[] = [
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 1,
    Chu_De: "ĐOÁN NHANH 1: ĐỊA DANH",
    Cum_Tu_Bi_Mat: "HỒ HOÀN KIẾM",
    Goi_Y_MC: "Trái tim lịch sử gắn với truyền thuyết rùa vàng trả gươm giữa lòng Thủ đô Hà Nội.",
    Diem_So: 10,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 2,
    Chu_De: "ĐOÁN NHANH 2: ẨM THỰC",
    Cum_Tu_Bi_Mat: "BÁNH CHƯNG XANH",
    Goi_Y_MC: "Món bánh truyền thống tượng trưng cho mặt đất vuông vức mỗi dịp Tết Nguyên Đán.",
    Diem_So: 15,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 3,
    Chu_De: "VÒNG 1: DANH NHÂN LỊCH SỬ",
    Cum_Tu_Bi_Mat: "NGUYỄN TRÃI",
    Goi_Y_MC: "Nhà quân sự, danh nhân văn hóa lỗi lạc thế giới của Việt Nam thời Hậu Lê.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 4,
    Chu_De: "VÒNG 2: DI SẢN THIÊN NHIÊN",
    Cum_Tu_Bi_Mat: "VỊNH HẠ LONG",
    Goi_Y_MC: "Di sản thiên nhiên thế giới kỳ vĩ được UNESCO công nhận tại Quảng Ninh.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 5,
    Chu_De: "VÒNG 3: THÀNH NGỮ TỤC NGỮ",
    Cum_Tu_Bi_Mat: "UỐNG NƯỚC NHỚ NGUỒN",
    Goi_Y_MC: "Truyền thống đạo lý tri ân sâu sắc các thế hệ đi trước của dân tộc ta.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 6,
    Chu_De: "VÒNG 4: VĂN HỌC VIỆT NAM",
    Cum_Tu_Bi_Mat: "DẾ MÈN PHIÊU LƯU KÝ",
    Goi_Y_MC: "Tác phẩm văn học thiếu nhi kinh điển nổi tiếng nhất của nhà văn Tô Hoài.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 7,
    Chu_De: "VÒNG 5: LÀNG NGHỀ TRUYỀN THỐNG",
    Cum_Tu_Bi_Mat: "GỐM SỨ BÁT TRÀNG",
    Goi_Y_MC: "Làng nghề làm gốm lâu đời nằm bên bờ sông Hồng thuộc huyện Gia Lâm, Hà Nội.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 8,
    Chu_De: "VÒNG 6: ÂM NHẠC DÂN TỘC",
    Cum_Tu_Bi_Mat: "NHÃ NHẠC CUNG ĐÌNH HUẾ",
    Goi_Y_MC: "Loại hình âm nhạc bác học đầu tiên của Việt Nam được UNESCO vinh danh.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 9,
    Chu_De: "VÒNG 7: KỲ QUAN HANG ĐỘNG",
    Cum_Tu_Bi_Mat: "HANG SƠN ĐOÒNG",
    Goi_Y_MC: "Hang động tự nhiên lớn nhất thế giới nằm trong quần thể Phong Nha - Kẻ Bàng.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 10,
    Chu_De: "VÒNG 8: KHOA HỌC CÔNG NGHỆ",
    Cum_Tu_Bi_Mat: "TRÍ TUỆ NHÂN TẠO",
    Goi_Y_MC: "Lĩnh vực công nghệ đột phá mô phỏng tư duy và khả năng học hỏi của con người.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 11,
    Chu_De: "VÒNG ĐẶC BIỆT: KIỆT TÁC THƠ CA",
    Cum_Tu_Bi_Mat: "TRUYỆN KIỀU NGUYỄN DU",
    Goi_Y_MC: "Kiệt tác bất hủ gồm 3254 câu thơ lục bát đỉnh cao của văn học trung đại Việt Nam.",
    Diem_So: 40,
    Thoi_Gian_Giay: 40,
  },
];

/**
 * Tải xuống tệp mẫu Excel (.xlsx) dành riêng cho đề Ô Chữ Chiếc Nón Kỳ Diệu
 */
export function downloadMagicWheelExcelTemplate(): void {
  if (typeof window === "undefined") return;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Dữ liệu mẫu các ô chữ
  const worksheetData = XLSX.utils.json_to_sheet(SAMPLE_MAGIC_WHEEL_ROWS);

  // Thiết lập độ rộng cột (Column widths) cho đẹp và dễ đọc
  worksheetData["!cols"] = [
    { wch: 16 }, // Loai_Cau_Hoi
    { wch: 10 }, // Vong_Thi
    { wch: 30 }, // Chu_De
    { wch: 28 }, // Cum_Tu_Bi_Mat
    { wch: 65 }, // Goi_Y_MC
    { wch: 10 }, // Diem_So
    { wch: 14 }, // Thoi_Gian_Giay
  ];

  XLSX.utils.book_append_sheet(workbook, worksheetData, "De_Mau_O_Chu");

  // Sheet 2: Hướng dẫn quy cách biên soạn ô chữ 4x14
  const guideData = [
    {
      "QUY TẮC BIÊN SOẠN": "1. BẢNG Ô CHỮ",
      "CHI TIẾT HƯỚNG DẪN": "Bàn ô chữ của Chiếc nón kỳ diệu gồm 4 hàng x 14 ô (tổng cộng 56 ô chữ).",
    },
    {
      "QUY TẮC BIÊN SOẠN": "2. ĐỘ DÀI TỪ KHÓA",
      "CHI TIẾT HƯỚNG DẪN": "Mỗi từ đơn không được dài quá 14 chữ cái (để không bị tràn ra ngoài biên hàng ngang).",
    },
    {
      "QUY TẮC BIÊN SOẠN": "3. ĐỊNH DẠNG CHỮ",
      "CHI TIẾT HƯỚNG DẪN": "Gõ tiếng Việt có dấu đầy đủ (ví dụ: NGUYỄN TRÃI). Hệ thống tự chuẩn hóa khi thí sinh đoán.",
    },
    {
      "QUY TẮC BIÊN SOẠN": "4. CỘT LOẠI CÂU HỎI",
      "CHI TIẾT HƯỚNG DẪN": "Giữ nguyên giá trị 'WORD_PUZZLE' tại cột Loai_Cau_Hoi để hệ thống nhận diện tự động.",
    },
    {
      "QUY TẮC BIÊN SOẠN": "5. CẤU TRÚC 11 VÒNG",
      "CHI TIẾT HƯỚNG DẪN": "Vòng 1-2: 2 Vòng Đoán Nhanh | Vòng 3-10: Tối đa 8 Vòng Chơi Chính (tự động lấy N vòng theo số đội, tối đa 8 đội) | Vòng 11: Vòng Đặc Biệt.",
    },
    {
      "QUY TẮC BIÊN SOẠN": "6. GỢI Ý CỦA MC",
      "CHI TIẾT HƯỚNG DẪN": "Nêu đặc điểm nổi bật để MC đọc gợi ý cho người chơi khi bước vào vòng đấu.",
    },
  ];

  const worksheetGuide = XLSX.utils.json_to_sheet(guideData);
  worksheetGuide["!cols"] = [
    { wch: 25 },
    { wch: 90 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheetGuide, "Huong_Dan_Quy_Tac");

  // Xuất file
  XLSX.writeFile(workbook, "Mau_De_O_Chu_Chiec_Non_Ky_Dieu.xlsx");
}

/**
 * Tải xuống tệp mẫu JSON (.json) chuẩn cấu trúc cho đề Ô Chữ
 */
export function downloadMagicWheelJsonTemplate(): void {
  if (typeof window === "undefined") return;

  const templateObj = {
    title: "Bộ Đề Mẫu Ô Chữ 11 Vòng - Chiếc Nón Kỳ Diệu (VTV3)",
    description: "Bộ đề mẫu chuẩn (2 Vòng Đoán Nhanh + 8 Vòng Chính tối đa + 1 Vòng Đặc Biệt) định dạng JSON",
    mode: "MAGIC_WHEEL",
    createdAt: new Date().toISOString(),
    questions: SAMPLE_MAGIC_WHEEL_ROWS.map((r) => ({
      type: "WORD_PUZZLE",
      round: r.Vong_Thi,
      category: r.Chu_De,
      secretPhrase: r.Cum_Tu_Bi_Mat,
      clue: r.Goi_Y_MC,
      points: r.Diem_So,
      timeLimit: r.Thoi_Gian_Giay,
    })),
  };

  const jsonStr = JSON.stringify(templateObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Mau_De_O_Chu_Chiec_Non_Ky_Dieu.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
