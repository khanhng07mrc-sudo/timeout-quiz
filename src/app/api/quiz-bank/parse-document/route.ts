import { NextRequest, NextResponse } from "next/server";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  parseExcelQuestions,
  parseCsvQuestions,
  parseRawQuizText,
} from "@/lib/quiz-document-parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const defaultPoints = Number(formData.get("defaultPoints")) || 10;
    const defaultTime = Number(formData.get("defaultTime")) || 15;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file tải lên" }, { status: 400 });
    }

    const filename = file.name || "document";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let parsedQuestions: any[] = [];
    let hasStructuredQuestions = false;

    if (ext === "pdf") {
      extractedText = await extractTextFromPdf(buffer);
      parsedQuestions = parseRawQuizText(extractedText, defaultPoints, defaultTime);
      hasStructuredQuestions = parsedQuestions.length >= 2;
    } else if (ext === "docx") {
      extractedText = await extractTextFromDocx(arrayBuffer);
      parsedQuestions = parseRawQuizText(extractedText, defaultPoints, defaultTime);
      hasStructuredQuestions = parsedQuestions.length >= 2;
    } else if (ext === "xlsx" || ext === "xls") {
      parsedQuestions = await parseExcelQuestions(arrayBuffer, defaultPoints, defaultTime);
      hasStructuredQuestions = parsedQuestions.length > 0;
      extractedText = parsedQuestions.map((q, i) => `${i + 1}. ${q.content}`).join("\n");
    } else if (ext === "csv") {
      const csvStr = buffer.toString("utf-8");
      parsedQuestions = await parseCsvQuestions(csvStr, defaultPoints, defaultTime);
      hasStructuredQuestions = parsedQuestions.length > 0;
      extractedText = parsedQuestions.map((q, i) => `${i + 1}. ${q.content}`).join("\n");
    } else if (ext === "txt" || ext === "md") {
      extractedText = buffer.toString("utf-8");
      parsedQuestions = parseRawQuizText(extractedText, defaultPoints, defaultTime);
      hasStructuredQuestions = parsedQuestions.length >= 2;
    } else if (ext === "json") {
      const jsonStr = buffer.toString("utf-8");
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          parsedQuestions = parsed;
          hasStructuredQuestions = true;
        } else if (parsed && Array.isArray(parsed.questions)) {
          parsedQuestions = parsed.questions;
          hasStructuredQuestions = true;
        }
      } catch {}
      extractedText = jsonStr;
    } else {
      return NextResponse.json(
        { error: `Định dạng .${ext} chưa được hỗ trợ. Vui lòng chọn file PDF, Word (.docx), Excel (.xlsx), CSV hoặc TXT.` },
        { status: 400 }
      );
    }

    // Calculate word count
    const cleanWords = extractedText.trim().length > 0 ? extractedText.trim().split(/\s+/).length : 0;

    return NextResponse.json({
      success: true,
      filename,
      ext,
      size: file.size,
      wordCount: cleanWords,
      extractedText: extractedText.trim(),
      parsedQuestions,
      hasStructuredQuestions,
    });
  } catch (err: any) {
    console.error("[parse-document] Error:", err);
    return NextResponse.json(
      { error: "Lỗi phân tích tài liệu: " + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
