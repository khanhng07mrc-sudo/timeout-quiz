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
 * Dữ liệu mẫu 4 vòng chơi chuẩn Gameshow VTV3 cho tệp mẫu
 */
export const SAMPLE_MAGIC_WHEEL_ROWS: MagicWheelTemplateRow[] = [
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 1,
    Chu_De: "DANH NHÂN LỊCH SỬ",
    Cum_Tu_Bi_Mat: "NGUYỄN TRÃI",
    Goi_Y_MC: "Nhà quân sự, danh nhân văn hóa lỗi lạc thế giới của Việt Nam thời Hậu Lê.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 2,
    Chu_De: "ĐỊA DANH VIỆT NAM",
    Cum_Tu_Bi_Mat: "VỊNH HẠ LONG",
    Goi_Y_MC: "Di sản thiên nhiên thế giới kỳ vĩ được UNESCO công nhận tại Quảng Ninh.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 3,
    Chu_De: "THÀNH NGỮ TỤC NGỮ",
    Cum_Tu_Bi_Mat: "UỐNG NƯỚC NHỚ NGUỒN",
    Goi_Y_MC: "Truyền thống đạo lý tri ân sâu sắc các thế hệ đi trước của dân tộc ta.",
    Diem_So: 20,
    Thoi_Gian_Giay: 30,
  },
  {
    Loai_Cau_Hoi: "WORD_PUZZLE",
    Vong_Thi: 4,
    Chu_De: "KIỆT TÁC THƠ CA",
    Cum_Tu_Bi_Mat: "TRUYỆN KIỀU NGUYỄN DU",
    Goi_Y_MC: "Kiệt tác bất hủ gồm 3254 câu thơ lục bát đỉnh cao của văn học trung đại Việt Nam.",
    Diem_So: 40,
    Thoi_Gian_Giay: 30,
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
    { wch: 24 }, // Chu_De
    { wch: 28 }, // Cum_Tu_Bi_Mat
    { wch: 60 }, // Goi_Y_MC
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
      "CHI TIẾT HƯỚNG DẪN": "Gõ tiếng Việt có dấu đầy đủ (ví dụ: NGUYỄN HUỆ). Hệ thống tự chuẩn hóa khi thí sinh đoán.",
    },
    {
      "QUY TẮC BIÊN SOẠN": "4. CỘT LOẠI CÂU HỎI",
      "CHI TIẾT HƯỚNG DẪN": "Giữ nguyên giá trị 'WORD_PUZZLE' tại cột Loai_Cau_Hoi để hệ thống nhận diện tự động.",
    },
    {
      "QUY TẮC BIÊN SOẠN": "5. VÒNG THI",
      "CHI TIẾT HƯỚNG DẪN": "Điền số thứ tự vòng: 1, 2, 3, hoặc 4 (Vòng Chung kết).",
    },
    {
      "QUY TẮC BIÊN SOẠN": "6. GỢI Ý CỦA MC",
      "CHI TIẾT HƯỚNG DẪN": "Nêu đặc điểm nổi bật để MC đọc gợi ý cho người chơi khi bước vào vòng đấu.",
    },
  ];

  const worksheetGuide = XLSX.utils.json_to_sheet(guideData);
  worksheetGuide["!cols"] = [
    { wch: 25 },
    { wch: 80 },
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
    title: "Bộ Đề Mẫu Ô Chữ - Chiếc Nón Kỳ Diệu (VTV3)",
    description: "Bộ đề mẫu 4 vòng chơi chuẩn Gameshow Chiếc nón kỳ diệu định dạng JSON",
    mode: "MAGIC_WHEEL",
    createdAt: new Date().toISOString(),
    questions: [
      {
        type: "WORD_PUZZLE",
        round: 1,
        category: "DANH NHÂN LỊCH SỬ",
        secretPhrase: "NGUYỄN TRÃI",
        clue: "Nhà quân sự, danh nhân văn hóa lỗi lạc thế giới của Việt Nam thời Hậu Lê.",
        points: 20,
        timeLimit: 30,
      },
      {
        type: "WORD_PUZZLE",
        round: 2,
        category: "ĐỊA DANH VIỆT NAM",
        secretPhrase: "VỊNH HẠ LONG",
        clue: "Di sản thiên nhiên thế giới kỳ vĩ được UNESCO công nhận tại Quảng Ninh.",
        points: 20,
        timeLimit: 30,
      },
      {
        type: "WORD_PUZZLE",
        round: 3,
        category: "THÀNH NGỮ TỤC NGỮ",
        secretPhrase: "UỐNG NƯỚC NHỚ NGUỒN",
        clue: "Truyền thống đạo lý tri ân sâu sắc các thế hệ đi trước của dân tộc ta.",
        points: 20,
        timeLimit: 30,
      },
      {
        type: "WORD_PUZZLE",
        round: 4,
        category: "KIỆT TÁC THƠ CA",
        secretPhrase: "TRUYỆN KIỀU NGUYỄN DU",
        clue: "Kiệt tác bất hủ gồm 3254 câu thơ lục bát đỉnh cao của văn học trung đại Việt Nam.",
        points: 40,
        timeLimit: 30,
      },
    ],
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
