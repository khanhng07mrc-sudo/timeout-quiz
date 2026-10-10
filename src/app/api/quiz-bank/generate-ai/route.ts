import { NextRequest, NextResponse } from "next/server";
import { validateQuestionItem } from "@/lib/quiz-document-parser";
import { normalizeToThreeLevels } from "@/lib/game-engine/scoring";
import { quantizeOlympiaTimeLimit } from "@/types";

export const dynamic = "force-dynamic";

interface GenerateAIRequest {
  provider: "gemini" | "openai";
  apiKey?: string;
  action?: "generate_from_scratch" | "generate_from_document" | "rebalance_question" | "refine_parsed";
  topic?: string;
  documentText?: string;
  focusPrompt?: string;
  questionCount?: number;
  gradeLevel?: string;
  questionTypes?: string[];
  defaultPoints?: number;
  defaultTimeLimit?: number;
  customPrompt?: string;
  distribution?: {
    points10?: number;
    points20?: number;
    points30?: number;
  };
  targetQuestion?: any;
  rawQuestions?: any[];
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateAIRequest = await req.json();
    const {
      provider = "gemini",
      action = "generate_from_scratch",
      topic = "",
      documentText = "",
      focusPrompt = "",
      questionCount = 10,
      gradeLevel = "Trung bình / THPT",
      questionTypes = ["MC_SINGLE"],
      defaultPoints = 10,
      defaultTimeLimit = 15,
      customPrompt = "",
      distribution,
      targetQuestion,
      rawQuestions,
    } = body;

    // Resolve API key
    let resolvedApiKey = (body.apiKey || "").trim();
    if (!resolvedApiKey) {
      if (provider === "gemini") {
        resolvedApiKey = process.env.GEMINI_API_KEY || "";
      } else {
        resolvedApiKey = process.env.OPENAI_API_KEY || "";
      }
    }

    if (!resolvedApiKey) {
      const envName = provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
      return NextResponse.json(
        {
          error: `Thiếu API Key cho ${provider.toUpperCase()}. Vui lòng nhập API Key trên giao diện hoặc thêm ${envName} vào file .env!`,
        },
        { status: 400 }
      );
    }

    let prompt = "";

    // ── Build Prompt depending on Action ─────────────────────────────────────────

    if (action === "rebalance_question") {
      if (!targetQuestion) {
        return NextResponse.json({ error: "Thiếu dữ liệu câu hỏi cần cân bằng lại" }, { status: 400 });
      }

      prompt = `
Bạn là chuyên gia thẩm định đề thi trắc nghiệm (Psychometrics Expert).
Nhiệm vụ của bạn là: CÂN BẰNG LẠI 4 PHƯƠNG ÁN LỰA CHỌN của câu hỏi dưới đây để loại bỏ triệt để hiện tượng lộ đáp án (cueing):
1. ĐỘ DÀI TƯƠNG ĐỒNG: Cả 4 phương án A, B, C, D phải có độ dài ký tự và số từ xấp xỉ nhau (chênh lệch tối đa 1-2 từ). Tuyệt đối không để đáp án đúng dài hơn hoặc chi tiết hơn 3 đáp án sai.
2. KHÔNG CHÚ THÍCH ĐƠN LẺ: Tuyệt đối không để mở ngoặc giải thích, ví dụ ở riêng đáp án đúng. Mọi giải thích phải chuyển vào trường "hint".
3. CẤU TRÚC NGỮ PHÁP SONG HÀNH: 4 phương án phải có cùng cấu trúc câu hoặc cùng từ loại (danh từ, động từ...).
4. ĐÁP ÁN NHIỄU HỢP LÝ: 3 đáp án sai phải là những sai lầm phổ biến, có tính thuyết phục cao.
5. GIỮ NGUYÊN NỘI DUNG CÂU HỎI VÀ ĐÁP ÁN ĐÚNG.

Câu hỏi cần cân bằng lại:
${JSON.stringify(targetQuestion, null, 2)}

Trả về DUY NHẤT một JSON Object:
{
  "content": "${targetQuestion.content || "Nội dung câu hỏi"}",
  "options": [
    { "id": "A", "text": "...", "isCorrect": boolean },
    { "id": "B", "text": "...", "isCorrect": boolean },
    { "id": "C", "text": "...", "isCorrect": boolean },
    { "id": "D", "text": "...", "isCorrect": boolean }
  ],
  "points": ${normalizeToThreeLevels(targetQuestion.points || 10)},
  "timeLimit": ${targetQuestion.timeLimit || 15},
  "hint": "Giải thích ngắn gọn lý do vì sao đáp án đúng..."
}
`;
    } else if (action === "refine_parsed") {
      if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        return NextResponse.json({ error: "Thiếu danh sách câu hỏi cần hoàn thiện" }, { status: 400 });
      }

      prompt = `
Bạn là chuyên gia biên soạn đề thi trắc nghiệm chuẩn Quizorra.
Dưới đây là danh sách câu hỏi trích xuất từ tài liệu, có thể có câu thiếu phương án, lỗi định dạng hoặc điểm số chưa chuẩn:
${JSON.stringify(rawQuestions.slice(0, 30), null, 2)}

Nhiệm vụ:
1. Chuẩn hóa tất cả câu hỏi thành trắc nghiệm chuẩn 4 phương án A, B, C, D (với đúng 1 đáp án đúng). Bổ sung phương án nhiễu hợp lý và thuyết phục nếu câu bị thiếu.
2. ĐỘ DÀI ĐỒNG NHẤT: Đảm bảo 4 phương án có độ dài xấp xỉ nhau, không để lộ đáp án đúng.
3. CHUẨN HÓA ĐIỂM SỐ & THỜI GIAN THEO QUIZORRA:
   - Dễ (Nhận biết / Thông hiểu cơ bản): 10 điểm (15 giây)
   - Trung bình (Vận dụng): 20 điểm (20 giây)
   - Khó (Vận dụng cao / Tình huống nâng cao): 30 điểm (30 giây)
4. Mọi chú thích giải thích phải đặt trong trường "hint", không để trong nội dung phương án.

Trả về DUY NHẤT một mảng JSON các câu hỏi đã hoàn thiện.
`;
    } else {
      // action === "generate_from_scratch" or "generate_from_document"
      let totalQuestions = Number(questionCount) || 10;
      let distributionInstructions = "";

      if (distribution) {
        const p10 = Math.max(0, Number(distribution.points10) || 0);
        const p20 = Math.max(0, Number(distribution.points20) || 0);
        const p30 = Math.max(0, Number(distribution.points30) || 0);
        const sum = p10 + p20 + p30;
        if (sum > 0) {
          totalQuestions = Math.min(40, sum);
          distributionInstructions = `
PHÂN BỔ ĐIỂM SỐ & ĐỘ KHÓ BẮT BUỘC THEO CHUẨN QUIZORRA (Tổng cộng chính xác ${totalQuestions} câu):
- Mức 10 điểm (Nhận biết / Thông hiểu cơ bản - thời gian 15s): ${p10} câu
- Mức 20 điểm (Vận dụng / So sánh / Tính toán hoặc liên hệ - thời gian 20s): ${p20} câu
- Mức 30 điểm (Vận dụng cao / Tình huống nâng cao / Phân tích tổng hợp - thời gian 30s): ${p30} câu
`;
        }
      }

      if (!distributionInstructions) {
        totalQuestions = Math.min(40, Math.max(1, totalQuestions));
        distributionInstructions = `
TỔNG SỐ CÂU: Chính xác ${totalQuestions} câu.
Mỗi câu hỏi phải được phân bổ điểm số là 10, 20 hoặc 30 điểm (kèm thời gian tương ứng 15s, 20s, 30s) tùy theo độ khó thực tế.
`;
      }

      const isDocMode = action === "generate_from_document" && Boolean(documentText?.trim());

      prompt = `
Bạn là một chuyên gia giáo dục và biên soạn đề thi trắc nghiệm tiếng Việt chất lượng cao chuẩn khảo thí (Psychometrics & Test Construction).
${
  isDocMode
    ? `DƯỚI ĐÂY LÀ NỘI DUNG TÀI LIỆU CẦN RA ĐỀ:\n"""\n${documentText.slice(0, 15000)}\n"""\n`
    : `CHỦ ĐỀ ĐỀ THI: "${topic || "Kiến thức tổng hợp"}"\n`
}
${focusPrompt ? `- TRỌNG TÂM NỘI DUNG CẦN RA ĐỀ: ${focusPrompt}` : ""}
${customPrompt ? `- YÊU CẦU BỔ SUNG: ${customPrompt}` : ""}
- CẤP ĐỘ / ĐỐI TƯỢNG: ${gradeLevel}
${distributionInstructions}

QUY TẮC BẮT BUỘC VỀ TÍNH ĐỒNG NHẤT ĐÁP ÁN (CHỐNG LỘ ĐÁP ÁN ĐÚNG - ANTI-CUEING RULES):
1. ĐỘ DÀI TƯƠNG ĐỒNG: Cả 4 phương án A, B, C, D BẮT BUỘC phải có độ dài ký tự và số từ xấp xỉ nhau (chênh lệch không quá 2-3 từ). TUYỆT ĐỐI KHÔNG để đáp án đúng dài hơn hoặc chi tiết hơn hẳn 3 đáp án sai!
2. CẤU TRÚC NGỮ PHÁP SONG HÀNH: Cả 4 phương án phải có cùng dạng ngữ pháp (cùng bắt đầu bằng danh từ, động từ, hoặc cùng là một mệnh đề hoàn chỉnh).
3. KHÔNG CHÚ THÍCH RIÊNG LẺ: TUYỆT ĐỐI KHÔNG thêm mở ngoặc chú thích, ví dụ, trạng từ giải thích vào đáp án đúng mà các đáp án khác không có. Mọi giải thích vì sao đáp án đúng BẮT BUỘC phải đặt trong trường "hint".
4. ĐÁP ÁN NHIỄU CÓ SỨC HÚT LOGIC (Plausible Distractors): Các phương án sai phải là những quan niệm sai lầm phổ biến hoặc thuộc cùng nhóm thực tế, có tính thuyết phục cao.
5. VỊ TRÍ ĐÁP ÁN ĐÚNG: Phân bổ ngẫu nhiên đều giữa A, B, C, D (không thiên vị vị trí nào).

QUY ĐỊNH BẮT BUỘC VỀ ĐỊNH DẠNG ĐẦU RA:
- Trả về DUY NHẤT một mảng JSON thuần (JSON Array). KHÔNG có bất kỳ lời dẫn, markdown bọc ngoài nào khác.
- Mỗi câu hỏi là một object với cấu trúc:
[
  {
    "type": "MC_SINGLE",
    "content": "Nội dung câu hỏi rõ ràng, chính xác",
    "options": [
      { "id": "A", "text": "Phương án A", "isCorrect": false },
      { "id": "B", "text": "Phương án B", "isCorrect": true },
      { "id": "C", "text": "Phương án C", "isCorrect": false },
      { "id": "D", "text": "Phương án D", "isCorrect": false }
    ],
    "points": 10,
    "timeLimit": 15,
    "hint": "Giải thích ngắn gọn lý do vì sao đáp án này đúng"
  }
]
`;
    }

    let generatedText = "";

    if (provider === "gemini") {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${resolvedApiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.65,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `Lỗi từ Google Gemini API (${response.status})`;
        return NextResponse.json({ error: msg }, { status: response.status });
      }

      const data = await response.json();
      generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // OpenAI
      const endpoint = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert psychometrics test author. Output only pure valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.65,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `Lỗi từ OpenAI API (${response.status})`;
        return NextResponse.json({ error: msg }, { status: response.status });
      }

      const data = await response.json();
      generatedText = data?.choices?.[0]?.message?.content || "";
    }

    if (!generatedText) {
      return NextResponse.json(
        { error: "AI không phản hồi nội dung. Vui lòng thử lại!" },
        { status: 500 }
      );
    }

    // Clean JSON content if wrapped in markdown code blocks
    let cleanJson = generatedText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    let parsedResult: any = null;
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          error: "Không thể phân tích kết quả JSON từ AI: " + parseErr.message,
          rawOutput: generatedText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    if (action === "rebalance_question") {
      let rawObj = parsedResult;
      if (Array.isArray(parsedResult)) {
        rawObj = parsedResult[0];
      } else if (parsedResult && parsedResult.question) {
        rawObj = parsedResult.question;
      }

      const validated = validateQuestionItem({
        id: targetQuestion.id,
        type: rawObj.type || targetQuestion.type || "MC_SINGLE",
        content: rawObj.content || targetQuestion.content,
        options: rawObj.options || targetQuestion.options,
        points: normalizeToThreeLevels(Number(rawObj.points || targetQuestion.points) || 10),
        timeLimit: Number(rawObj.timeLimit || targetQuestion.timeLimit) || 15,
        hint: rawObj.hint || targetQuestion.hint,
      });

      return NextResponse.json({
        success: true,
        action,
        question: validated,
      });
    }

    // List of questions
    let rawList: any[] = [];
    if (Array.isArray(parsedResult)) {
      rawList = parsedResult;
    } else if (parsedResult && Array.isArray(parsedResult.questions)) {
      rawList = parsedResult.questions;
    } else if (parsedResult && typeof parsedResult === "object") {
      const arrayProp = Object.values(parsedResult).find((val) => Array.isArray(val));
      if (arrayProp) {
        rawList = arrayProp as any[];
      }
    }

    const validatedQuestions = rawList.map((q, idx) => {
      const normPts = normalizeToThreeLevels(Number(q.points) || defaultPoints || 10);
      return validateQuestionItem({
        id: `ai_${Date.now()}_${idx}`,
        type: q.type || "MC_SINGLE",
        content: q.content || `Câu hỏi ${idx + 1}`,
        options: q.options || [],
        points: normPts,
        timeLimit: Number(q.timeLimit) || quantizeOlympiaTimeLimit(normPts, defaultTimeLimit),
        hint: q.hint || undefined,
        answer: q.answer || undefined,
      });
    });

    return NextResponse.json({
      success: true,
      action,
      topic: topic || "Tài liệu",
      count: validatedQuestions.length,
      questions: validatedQuestions,
    });
  } catch (err: any) {
    console.error("[generate-ai] Error:", err);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi sinh đề: " + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
