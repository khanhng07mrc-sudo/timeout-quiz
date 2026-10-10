import * as XLSX from "xlsx";
import Papa from "papaparse";
import * as mammoth from "mammoth";
import { normalizeToThreeLevels } from "./game-engine/scoring";
import { quantizeOlympiaTimeLimit } from "@/types";

export interface OptionUniformityAnalysis {
  isUniform: boolean;
  uniformityScore: number; // 0 to 100
  hasAsymmetricAnnotations: boolean;
  isCorrectOutlier: boolean;
  lengthRatio: number; // length of correct option / average length of distractors
  warningMessage?: string;
  charLengths: { id: string; length: number; wordCount: number; isCorrect: boolean }[];
}

export interface ParsedQuestionItem {
  id?: string;
  type: "MC_SINGLE" | "MC_MULTI" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
  content: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  points: 10 | 20 | 30;
  timeLimit: number;
  hint?: string;
  isValid: boolean;
  validationErrors: string[];
  uniformity?: OptionUniformityAnalysis;
}

/**
 * Tự động loại bỏ các chú giải đơn lẻ xuất hiện riêng ở đáp án đúng và đưa vào trường hint.
 * Ví dụ: "Hà Nội (Thủ đô của Việt Nam)" khi các phương án khác là "Đà Nẵng", "Huế", "TP.HCM"
 * -> Tách "Thủ đô của Việt Nam" vào hint, giữ text là "Hà Nội".
 */
export function sanitizeAndBalanceOptions(
  options: { id: string; text: string; isCorrect: boolean }[],
  existingHint?: string
): { options: { id: string; text: string; isCorrect: boolean }[]; hint?: string } {
  let updatedHint = existingHint ? existingHint.trim() : "";
  const cleanedOptions = options.map((opt) => {
    let t = (opt.text || "").trim();
    // Bỏ tiền tố lặp như "A. ", "B) ", "C: " nếu vô tình sót lại
    t = t.replace(/^[A-Fa-f][\.\)\:\-]\s*/, "").trim();
    return { ...opt, text: t };
  });

  const correctOpt = cleanedOptions.find((o) => o.isCorrect);
  const distractors = cleanedOptions.filter((o) => !o.isCorrect);

  if (correctOpt && distractors.length > 0) {
    // Kiểm tra xem đáp án đúng có đuôi mở ngoặc "(...)" trong khi KHÔNG CÓ distractor nào có mở ngoặc
    const correctParenMatch = correctOpt.text.match(/\s*\(([^)]+)\)\s*$/);
    const distractorsHaveParen = distractors.some((d) => /\([^)]+\)/.test(d.text));

    if (correctParenMatch && !distractorsHaveParen) {
      const extractedClue = correctParenMatch[1].trim();
      correctOpt.text = correctOpt.text.replace(/\s*\([^)]+\)\s*$/, "").trim();
      if (!updatedHint) {
        updatedHint = extractedClue;
      } else if (!updatedHint.includes(extractedClue)) {
        updatedHint = `${updatedHint} (${extractedClue})`;
      }
    }
  }

  return {
    options: cleanedOptions,
    hint: updatedHint || undefined,
  };
}

/**
 * Đánh giá độ đồng nhất hình thức (Psychometric Uniformity & Distractor Plausibility)
 * Ngăn ngừa hiện tượng test-taking cueing (lộ đáp án do đáp án đúng quá dài hoặc quá chi tiết).
 */
export function analyzeOptionUniformity(
  options: { id: string; text: string; isCorrect: boolean }[]
): OptionUniformityAnalysis {
  if (options.length < 2) {
    return {
      isUniform: true,
      uniformityScore: 100,
      hasAsymmetricAnnotations: false,
      isCorrectOutlier: false,
      lengthRatio: 1,
      charLengths: [],
    };
  }

  const charLengths = options.map((o) => {
    const text = (o.text || "").trim();
    const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
    return {
      id: o.id,
      length: text.length,
      wordCount,
      isCorrect: o.isCorrect,
    };
  });

  const correctItems = charLengths.filter((o) => o.isCorrect);
  const distractors = charLengths.filter((o) => !o.isCorrect);

  if (correctItems.length === 0 || distractors.length === 0) {
    return {
      isUniform: true,
      uniformityScore: 100,
      hasAsymmetricAnnotations: false,
      isCorrectOutlier: false,
      lengthRatio: 1,
      charLengths,
    };
  }

  const avgDistractorLength = distractors.reduce((acc, d) => acc + d.length, 0) / distractors.length;
  const avgDistractorWords = distractors.reduce((acc, d) => acc + d.wordCount, 0) / distractors.length;
  const correctLength = correctItems[0].length;
  const correctWords = correctItems[0].wordCount;

  const lengthRatio = avgDistractorLength > 0 ? Number((correctLength / avgDistractorLength).toFixed(2)) : 1;

  // Kiểm tra chú thích bất đối xứng
  const hasAsymmetricAnnotations =
    options.some((o) => o.isCorrect && /\([^)]+\)/.test(o.text)) &&
    options.every((o) => o.isCorrect || !/\([^)]+\)/.test(o.text));

  // Kiểm tra đáp án đúng có bị lệch (quá dài > 1.7x hoặc quá ngắn < 0.45x)
  const isTooLong = (lengthRatio > 1.7 && correctWords >= avgDistractorWords + 4) || lengthRatio > 2.2;
  const isTooShort = lengthRatio < 0.45 && avgDistractorWords >= correctWords + 4;
  const isCorrectOutlier = isTooLong || isTooShort;

  // Tính điểm đồng nhất (0 - 100)
  let penalty = 0;
  if (isTooLong) penalty += 40;
  if (isTooShort) penalty += 30;
  if (hasAsymmetricAnnotations) penalty += 35;
  if (lengthRatio > 1.4 && lengthRatio <= 1.7) penalty += 15;

  const uniformityScore = Math.max(10, Math.min(100, 100 - penalty));
  const isUniform = uniformityScore >= 75 && !hasAsymmetricAnnotations && !isCorrectOutlier;

  let warningMessage: string | undefined = undefined;
  if (hasAsymmetricAnnotations) {
    warningMessage = "⚠️ Đáp án đúng chứa chú thích riêng biệt (dễ làm lộ câu trả lời)";
  } else if (isTooLong) {
    warningMessage = `⚠️ Đáp án đúng dài hơn đáng kể (${lengthRatio}x) so với các phương án còn lại`;
  } else if (isTooShort) {
    warningMessage = `⚠️ Đáp án đúng ngắn bất thường (${lengthRatio}x) so với các phương án còn lại`;
  }

  return {
    isUniform,
    uniformityScore,
    hasAsymmetricAnnotations,
    isCorrectOutlier,
    lengthRatio,
    warningMessage,
    charLengths,
  };
}

/**
 * Validates a single question item and attaches status + error messages
 */
export function validateQuestionItem(q: Partial<ParsedQuestionItem>): ParsedQuestionItem {
  const errors: string[] = [];
  const content = (q.content || "").trim();
  const type = q.type || "MC_SINGLE";
  const points = normalizeToThreeLevels(Number(q.points) || 10);
  const timeLimit = Math.max(5, Number(q.timeLimit) || quantizeOlympiaTimeLimit(points));
  let hint = q.hint?.trim() || undefined;

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
    // Sanitize options to avoid isolated clues in correct answer
    const sanitized = sanitizeAndBalanceOptions(options, hint);
    options = sanitized.options;
    hint = sanitized.hint;

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

  const uniformity = analyzeOptionUniformity(options);

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
    uniformity,
  };
}

/**
 * Parses raw text containing quiz questions in typical Vietnamese or English formats
 */
export function parseRawQuizText(rawText: string, defaultPoints = 10, defaultTime = 15): ParsedQuestionItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Split into question blocks by "Câu X:", "Câu hỏi X:", or numbered "1.", "2."
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
        currentBlock.push(line);
      }
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

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

    let contentLines: string[] = [];
    let i = 0;

    while (i < blockLines.length) {
      const line = blockLines[i];
      const optMatch = line.match(/^([A-Fa-f])[\.\)\:\-]\s*(.*)$/);
      const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer|Key)[:\s]+([A-Fa-f0-9\w\s,]+)/i);
      const hintMatch = line.match(/^(?:Giải thích|Gợi ý|Hint|Explain)[:\s]+(.*)$/i);

      if (optMatch || ansMatch || hintMatch) {
        break;
      }

      if (i === 0) {
        const cleanContent = line.replace(/^(?:Câu\s+\d+[:.]|Câu\s+hỏi\s+\d+[:.]|Bài\s+\d+[:.]|\d+[\.\)]\s*)/i, "").trim();
        contentLines.push(cleanContent || line);
      } else {
        contentLines.push(line);
      }
      i++;
    }

    content = contentLines.join(" ").trim();

    while (i < blockLines.length) {
      const line = blockLines[i];
      const optMatch = line.match(/^([A-Fa-f])[\.\)\:\-]\s*(.*)$/);
      const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer|Key)[:\s]+([A-Fa-f0-9\w\s,]+)/i);
      const hintMatch = line.match(/^(?:Giải thích|Gợi ý|Hint|Explain)[:\s]+(.*)$/i);

      if (optMatch) {
        const optLetter = optMatch[1].toUpperCase();
        let optText = optMatch[2].trim();
        let isCorrect = false;

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

    if (detectedAnswerKey) {
      const answers = detectedAnswerKey.split(/[,;\s]+/).map((a) => a.trim().toUpperCase());
      options.forEach((opt) => {
        if (answers.includes(opt.id)) {
          opt.isCorrect = true;
        }
      });
    }

    const correctCount = options.filter((o) => o.isCorrect).length;
    const type = correctCount > 1 ? "MC_MULTI" : "MC_SINGLE";
    const normPts = normalizeToThreeLevels(defaultPoints);

    parsedItems.push(
      validateQuestionItem({
        type,
        content,
        options,
        points: normPts,
        timeLimit: quantizeOlympiaTimeLimit(normPts, defaultTime),
        hint,
      })
    );
  }

  return parsedItems;
}

/**
 * Extracts raw text from a PDF file using pdf-parse
 */
export async function extractTextFromPdf(file: File | ArrayBuffer | Buffer): Promise<string> {
  try {
    const pdfParse = require("pdf-parse");
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (file instanceof ArrayBuffer) {
      buffer = Buffer.from(file);
    } else {
      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    }
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err: any) {
    throw new Error("Không thể trích xuất file PDF: " + (err.message || String(err)));
  }
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
export async function parseExcelQuestions(file: File | ArrayBuffer, defaultPoints = 10, defaultTime = 15): Promise<ParsedQuestionItem[]> {
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
    const rawPoints = Number(row.points || row["Điểm"]) || defaultPoints;
    const points = normalizeToThreeLevels(rawPoints);
    const timeLimit = Number(row.timeLimit || row["Thời gian"]) || quantizeOlympiaTimeLimit(points, defaultTime);
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
export async function parseCsvQuestions(file: File | string, defaultPoints = 10, defaultTime = 15): Promise<ParsedQuestionItem[]> {
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
            const rawPoints = Number(row.points) || defaultPoints;
            const points = normalizeToThreeLevels(rawPoints);
            const timeLimit = Number(row.timeLimit) || quantizeOlympiaTimeLimit(points, defaultTime);
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
