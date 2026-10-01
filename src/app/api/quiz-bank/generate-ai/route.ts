import { NextRequest, NextResponse } from "next/server";
import { validateQuestionItem } from "@/lib/quiz-document-parser";

export const dynamic = "force-dynamic";

interface GenerateAIRequest {
  provider: "gemini" | "openai";
  apiKey?: string;
  topic: string;
  questionCount?: number;
  gradeLevel?: string;
  questionTypes?: string[];
  defaultPoints?: number;
  defaultTimeLimit?: number;
  customPrompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateAIRequest = await req.json();
    const {
      provider = "gemini",
      topic,
      questionCount = 10,
      gradeLevel = "Trung bình / THPT",
      questionTypes = ["MC_SINGLE"],
      defaultPoints = 10,
      defaultTimeLimit = 30,
      customPrompt = "",
    } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập chủ đề đề thi (Topic)" },
        { status: 400 }
      );
    }

    const count = Math.min(40, Math.max(1, Number(questionCount) || 10));

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

    // Strict system prompt to return pure JSON array
    const prompt = `
Bạn là một chuyên gia giáo dục và biên soạn đề thi trắc nghiệm tiếng Việt chất lượng cao.
Hãy tạo một bộ đề thi gồm chính xác ${count} câu hỏi với các tiêu chí sau:
- Chủ đề: "${topic}"
- Cấp độ/Độ khó: ${gradeLevel}
- Dạng câu hỏi mong muốn: ${questionTypes.join(", ")}
${customPrompt ? `- Yêu cầu thêm từ người dùng: ${customPrompt}` : ""}

QUY ĐỊNH BẮT BUỘC VỀ ĐỊNH DẠNG:
- Trả về DUY NHẤT một mảng JSON thuần (JSON Array). KHÔNG có bất kỳ lời dẫn, markdown bọc ngoài nào khác.
- Mỗi câu hỏi là một object với cấu trúc:
[
  {
    "type": "MC_SINGLE", // hoặc "MC_MULTI", "TRUE_FALSE", "FILL_BLANK"
    "content": "Nội dung câu hỏi rõ ràng, chính xác",
    "options": [
      { "id": "A", "text": "Phương án A", "isCorrect": false },
      { "id": "B", "text": "Phương án B", "isCorrect": true },
      { "id": "C", "text": "Phương án C", "isCorrect": false },
      { "id": "D", "text": "Phương án D", "isCorrect": false }
    ],
    "points": ${defaultPoints},
    "timeLimit": ${defaultTimeLimit},
    "hint": "Giải thích ngắn gọn lý do vì sao đáp án này đúng"
  }
]
ĐẢM BẢO:
- Mỗi câu hỏi MC_SINGLE phải có đúng 1 đáp án "isCorrect": true và 3 phương án false.
- Nội dung câu hỏi và các phương án phải trung thực, chính xác, không trùng lặp.
`;

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
            temperature: 0.7,
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
              content: "You are an expert exam creator. Respond only with a raw valid JSON array.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
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

    let parsedQuestions: any[] = [];
    try {
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        parsedQuestions = parsed;
      } else if (parsed && Array.isArray(parsed.questions)) {
        parsedQuestions = parsed.questions;
      } else if (parsed && typeof parsed === "object") {
        // Find any array property
        const arrayProp = Object.values(parsed).find((val) => Array.isArray(val));
        if (arrayProp) {
          parsedQuestions = arrayProp as any[];
        }
      }
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          error: "Không thể phân tích kết quả JSON từ AI: " + parseErr.message,
          rawOutput: generatedText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    // Validate and normalize all generated questions
    const validatedQuestions = parsedQuestions.map((q, idx) => {
      return validateQuestionItem({
        id: `ai_${Date.now()}_${idx}`,
        type: q.type || "MC_SINGLE",
        content: q.content || `Câu hỏi ${idx + 1}`,
        options: q.options || [],
        points: Math.max(10, Math.round((Number(q.points) || defaultPoints) / 10) * 10),
        timeLimit: Number(q.timeLimit) || defaultTimeLimit,
        hint: q.hint || undefined,
        answer: q.answer || undefined,
      });
    });

    return NextResponse.json({
      success: true,
      topic,
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
