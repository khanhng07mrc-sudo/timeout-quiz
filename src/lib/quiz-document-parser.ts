import * as XLSX from "xlsx";
import Papa from "papaparse";
// mammoth is imported dynamically or directly when parsing docx in browser or node
import * as mammoth from "mammoth";
import { normalizeToThreeLevels } from "./game-engine/scoring";

export interface ParsedQuestionItem {
  id?: string;
  type: "MC_SINGLE" | "MC_MULTI" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
  content: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  points: number;
  timeLimit: number;
  hint?: string;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Validates a single question item and attaches status + error messages
 */
export function validateQuestionItem(q: Partial<ParsedQuestionItem>): ParsedQuestionItem {
  const errors: string[] = [];
  const content = (q.content || "").trim();
  const type = q.type || "MC_SINGLE";
  const points = normalizeToThreeLevels(Number(q.points) || 10);
  const timeLimit = Math.max(5, Number(q.timeLimit) || 30);
  const hint = q.hint?.trim() || undefined;

  if (!content) {
    errors.push("Nội dung câu hỏi không được để trống");
  }

  let options = (q.options || []).map((o, idx) => ({
    id: o.id || String.fromCharCode(65 + idx),
    text: (o.text || "").trim(),
    isCorrect: !!o.isCorrect,
  }));

  let answer = q.answer?.trim();

  if (type === "MC_SINGLE" || type === "MC_MULTI") {
    // Filter non-empty options
    const validOpts = options.filter((o) => o.text !== "");
    if (validOpts.length < 2) {
      errors.push("Câu hỏi trắc nghiệm cần ít nhất 2 phương án lựa chọn");
    }
    const correctCount = validOpts.filter((o) => o.isCorrect).length;
    if (correctCount === 0) {
      errors.push("Chưa đánh dấu đáp án đúng");
    } else if (type === "MC_SINGLE" && correctCount > 1) {
      errors.push("Trắc nghiệm đơn chỉ được có 1 đáp án đúng");
    }
    options = validOpts;
  } else if (type === "TRUE_FALSE") {
    if (options.length === 0) {
      options = [
        { id: "true", text: "Đúng (True)", isCorrect: answer === "true" || answer === "T" || answer === "Đ" },
        { id: "false", text: "Sai (False)", isCorrect: answer === "false" || answer === "F" || answer === "S" },
      ];
    }
    const hasCorrect = options.some((o) => o.isCorrect);
    if (!hasCorrect) {
      errors.push("Chưa chọn đáp án Đúng hoặc Sai");
    }
  } else if (type === "FILL_BLANK") {
    if (!answer) {
      errors.push("Chưa điền từ cần trả lời");
    }
  }

  return {
    id: q.id,
    type,
    content,
    options,
    answer,
    points,
    timeLimit,
    hint,
    isValid: errors.length === 0,
    validationErrors: errors,
  };
}

/**
 * Parses raw text containing quiz questions in typical Vietnamese or English formats
 * Examples:
 * Câu 1: Thủ đô của Việt Nam là gì?
 * A. Đà Nẵng
 * B. Hà Nội*
 * C. Hải Phòng
 * D. Cần Thơ
 * Đáp án: B
 */
export function parseRawQuizText(rawText: string, defaultPoints = 10, defaultTime = 30): ParsedQuestionItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Split into question blocks by "Câu X:", "Câu hỏi X:", or numbered "1.", "2."
  // Pattern: matches beginning of question block
  const lines = normalized.split("\n");
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const isQuestionHeader = (line: string): boolean => {
    const trimmed = line.trim();
    return (
      /^Câu\s+\d+[:.]/i.test(trimmed) ||
      /^Câu\s+hỏi\s+\d+[:.]/i.test(trimmed) ||
      /^Bài\s+\d+[:.]/i.test(trimmed) ||
      /^\d+[\.\)]\s+/.test(trimmed)
    );
  };

  for (const line of lines) {
    if (isQuestionHeader(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [line];
    } else {
      if (currentBlock.length > 0) {
        currentBlock.push(line);
      } else if (line.trim().length > 0) {
        // First block without header
        currentBlock.push(line);
      }
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // Parse each block into a QuestionItem
  const parsedItems: ParsedQuestionItem[] = [];

  for (const block of blocks) {
    const blockText = block.join("\n").trim();
    if (!blockText) continue;

    let content = "";
    const options: { id: string; text: string; isCorrect: boolean }[] = [];
    let detectedAnswerKey: string | null = null;
    let hint: string | undefined = undefined;

    const blockLines = block.map((l) => l.trim()).filter((l) => l.length > 0);
    if (blockLines.length === 0) continue;

    // Header / Content line
    let contentLines: string[] = [];
    let i = 0;

    // Consume content until we hit options or answers
    while (i < blockLines.length) {
      const line = blockLines[i];
      const optMatch = line.match(/^([A-Fa-f])[\.\)\:\-]\s*(.*)$/);
      const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer|Key)[:\s]+([A-Fa-f0-9\w\s,]+)/i);
      const hintMatch = line.match(/^(?:Giải thích|Gợi ý|Hint|Explain)[:\s]+(.*)$/i);

      if (optMatch || ansMatch || hintMatch) {
        break;
      }

      // Strip "Câu 1: " or "1. " from first line
      if (i === 0) {
        const cleanContent = line.replace(/^(?:Câu\s+\d+[:.]|Câu\s+hỏi\s+\d+[:.]|Bài\s+\d+[:.]|\d+[\.\)]\s*)/i, "").trim();
        contentLines.push(cleanContent || line);
      } else {
        contentLines.push(line);
      }
      i++;
    }

    content = contentLines.join(" ").trim();

    // Consume options and answer metadata
    while (i < blockLines.length) {
      const line = blockLines[i];
      const optMatch = line.match(/^([A-Fa-f])[\.\)\:\-]\s*(.*)$/);
      const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer|Key)[:\s]+([A-Fa-f0-9\w\s,]+)/i);
      const hintMatch = line.match(/^(?:Giải thích|Gợi ý|Hint|Explain)[:\s]+(.*)$/i);

      if (optMatch) {
        const optLetter = optMatch[1].toUpperCase();
        let optText = optMatch[2].trim();
        let isCorrect = false;

        // Check if marked with asterisk or [x] (e.g. "B. Hà Nội*")
        if (optText.endsWith("*") || optText.endsWith("✓") || optText.endsWith("(đúng)")) {
          isCorrect = true;
          optText = optText.replace(/[*✓]|\(đúng\)$/g, "").trim();
        }

        options.push({
          id: optLetter,
          text: optText,
          isCorrect,
        });
      } else if (ansMatch) {
        detectedAnswerKey = ansMatch[1].trim().toUpperCase();
      } else if (hintMatch) {
        hint = hintMatch[1].trim();
      }
      i++;
    }

    // Apply detected answer key if options didn't have asterisks
    if (detectedAnswerKey) {
      const answers = detectedAnswerKey.split(/[,;\s]+/).map((a) => a.trim().toUpperCase());
      options.forEach((opt) => {
        if (answers.includes(opt.id)) {
          opt.isCorrect = true;
        }
      });
    }

    // Determine type: MC_MULTI if multiple correct, otherwise MC_SINGLE
    const correctCount = options.filter((o) => o.isCorrect).length;
    const type = correctCount > 1 ? "MC_MULTI" : "MC_SINGLE";

    parsedItems.push(
      validateQuestionItem({
        type,
        content,
        options,
        points: defaultPoints,
        timeLimit: defaultTime,
        hint,
      })
    );
  }

  return parsedItems;
}

/**
 * Extracts raw text from a Word .docx file using Mammoth
 */
export async function extractTextFromDocx(file: File | ArrayBuffer): Promise<string> {
  try {
    let arrayBuffer: ArrayBuffer;
    if (file instanceof ArrayBuffer) {
      arrayBuffer = file;
    } else {
      arrayBuffer = await file.arrayBuffer();
    }
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } catch (err: any) {
    throw new Error("Không thể trích xuất file Word (.docx): " + (err.message || String(err)));
  }
}

/**
 * Parses questions from an Excel (.xlsx, .xls) file
 */
export async function parseExcelQuestions(file: File | ArrayBuffer, defaultPoints = 10, defaultTime = 30): Promise<ParsedQuestionItem[]> {
  let arrayBuffer: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else {
    arrayBuffer = await file.arrayBuffer();
  }

  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row, idx) => {
    const rawCorrect = String(row.correct || row.answer || row["Đáp án"] || "").toUpperCase().trim();
    const correctKeys = rawCorrect.split(/[,;\s]+/).map((k) => k.trim());

    const options = [
      { id: "A", text: String(row.optionA || row.A || row["A"] || "").trim(), isCorrect: correctKeys.includes("A") },
      { id: "B", text: String(row.optionB || row.B || row["B"] || "").trim(), isCorrect: correctKeys.includes("B") },
      { id: "C", text: String(row.optionC || row.C || row["C"] || "").trim(), isCorrect: correctKeys.includes("C") },
      { id: "D", text: String(row.optionD || row.D || row["D"] || "").trim(), isCorrect: correctKeys.includes("D") },
    ].filter((o) => o.text !== "");

    const type = correctKeys.length > 1 ? "MC_MULTI" : "MC_SINGLE";
    const points = Math.max(10, Math.round((Number(row.points || row["Điểm"]) || defaultPoints) / 10) * 10);
    const timeLimit = Number(row.timeLimit || row["Thời gian"]) || defaultTime;
    const content = String(row.content || row.question || row["Câu hỏi"] || `Câu hỏi ${idx + 1}`).trim();
    const hint = row.hint || row["Gợi ý"] || undefined;

    return validateQuestionItem({
      type,
      content,
      options,
      points,
      timeLimit,
      hint,
    });
  });
}

/**
 * Parses questions from a CSV file using PapaParse
 */
export async function parseCsvQuestions(file: File | string, defaultPoints = 10, defaultTime = 30): Promise<ParsedQuestionItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        try {
          const items = results.data.map((row: any, idx: number) => {
            const rawCorrect = String(row.correct || row.answer || row["Đáp án"] || "").toUpperCase().trim();
            const correctKeys = rawCorrect.split(/[,;\s]+/).map((k) => k.trim());

            const options = [
              { id: "A", text: String(row.optionA || row.A || "").trim(), isCorrect: correctKeys.includes("A") },
              { id: "B", text: String(row.optionB || row.B || "").trim(), isCorrect: correctKeys.includes("B") },
              { id: "C", text: String(row.optionC || row.C || "").trim(), isCorrect: correctKeys.includes("C") },
              { id: "D", text: String(row.optionD || row.D || "").trim(), isCorrect: correctKeys.includes("D") },
            ].filter((o) => o.text !== "");

            const type = correctKeys.length > 1 ? "MC_MULTI" : "MC_SINGLE";
            const points = Math.max(10, Math.round((Number(row.points) || defaultPoints) / 10) * 10);
            const timeLimit = Number(row.timeLimit) || defaultTime;
            const content = String(row.content || row.question || `Câu hỏi ${idx + 1}`).trim();
            const hint = row.hint || undefined;

            return validateQuestionItem({
              type,
              content,
              options,
              points,
              timeLimit,
              hint,
            });
          });
          resolve(items);
        } catch (err) {
          reject(err);
        }
      },
      error: (err: any) => reject(err),
    });
  });
}
