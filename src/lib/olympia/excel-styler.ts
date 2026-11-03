import ExcelJS from "exceljs";
import type { OlympiaQuestionSet } from "./types";
import { exportOlympiaSetToSheets } from "./excel-import";

interface SheetTheme {
  tabColor: string;
  headerColor: string;
}

const SHEET_THEMES: Record<string, SheetTheme> = {
  "KhoiDong Rieng": { tabColor: "FF1E3A8A", headerColor: "FF1E3A8A" },
  "KhoiDong Chung": { tabColor: "FF2563EB", headerColor: "FF2563EB" },
  VCNV: { tabColor: "FF065F46", headerColor: "FF065F46" },
  TangToc: { tabColor: "FFB45309", headerColor: "FFB45309" },
  TangToc_DuPhong: { tabColor: "FF78350F", headerColor: "FF78350F" },
  VeDich: { tabColor: "FF6D28D9", headerColor: "FF6D28D9" },
  CauPhu: { tabColor: "FFB91C1C", headerColor: "FFB91C1C" },
};

const CENTER_COLUMNS = new Set([
  "thí sinh",
  "thisinh",
  "câu số",
  "causo",
  "hàng",
  "hang",
  "mức điểm",
  "mucdiem",
  "đã dùng",
  "dadung",
  "loại câu hỏi",
  "loaicauhoi",
  "phân vùng",
  "phanvung",
]);

function getColumnWidth(header: string, rows: Record<string, unknown>[]): number {
  const hLower = header.trim().toLowerCase();
  if (hLower.includes("câu hỏi") || hLower.includes("cauhoi")) return 82;
  if (hLower.includes("gợi ý") || hLower.includes("goiy")) return 55;
  if (hLower.includes("đáp án") || hLower.includes("dapan")) return 42;
  if (hLower.includes("file") || hLower.includes("media") || hLower.includes("ảnh")) return 38;
  if (hLower.includes("lĩnh vực") || hLower.includes("linhvuc")) return 22;
  if (hLower.includes("phân vùng") || hLower.includes("phanvung")) return 18;
  if (hLower.includes("loại câu hỏi") || hLower.includes("loaicauhoi")) return 16;
  if (hLower.includes("thí sinh") || hLower.includes("câu số") || hLower.includes("hàng") || hLower.includes("mức điểm")) return 14;
  if (hLower.includes("đã dùng") || hLower.includes("dadung")) return 14;

  let maxLen = header.length;
  for (const r of rows) {
    const val = r[header];
    if (val != null) {
      const len = String(val).length;
      if (len > maxLen) maxLen = len;
    }
  }
  return Math.min(85, Math.max(14, maxLen + 4));
}

export async function buildStyledOlympiaExcelWorkbook(set: OlympiaQuestionSet): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Quizorra Gameshow Arena";
  wb.title = set.name || "Ngân hàng đề Đường Lên Đỉnh Olympia";
  wb.created = new Date();

  const sheets = exportOlympiaSetToSheets(set);

  for (const [sheetName, rows] of Object.entries(sheets)) {
    const theme = SHEET_THEMES[sheetName] || { tabColor: "FF1E293B", headerColor: "FF1E293B" };
    const ws = wb.addWorksheet(sheetName.slice(0, 31), {
      properties: { tabColor: { argb: theme.tabColor } },
      pageSetup: { showGridLines: true },
    });

    ws.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];

    if (rows.length === 0) {
      continue;
    }

    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: getColumnWidth(h, rows),
    }));

    // Style Header Row (Row 1)
    const headerRow = ws.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: theme.headerColor },
      };
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FFD4AF37" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Populate and Style Data Rows
    rows.forEach((rowData, idx) => {
      const row = ws.addRow(rowData);
      const isEven = idx % 2 === 0;
      const zebraColor = isEven ? "FFFFFFFF" : "FFF8FAFC";

      // Compute row height dynamically based on text length
      let maxCellLen = 0;
      headers.forEach((h) => {
        const val = rowData[h];
        if (val != null) {
          const l = String(val).length;
          if (l > maxCellLen) maxCellLen = l;
        }
      });
      row.height = maxCellLen > 120 ? 48 : maxCellLen > 60 ? 36 : 26;

      row.eachCell((cell, colNumber) => {
        const headerName = headers[colNumber - 1] || "";
        const isCenter = CENTER_COLUMNS.has(headerName.trim().toLowerCase());

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: zebraColor },
        };
        cell.font = {
          name: "Calibri",
          size: 11,
          bold: isCenter && (headerName.includes("Câu số") || headerName.includes("Mức điểm")),
          color: { argb: "FF0F172A" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: isCenter ? "center" : "left",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // Enable Excel auto-filter
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }

  return wb;
}
