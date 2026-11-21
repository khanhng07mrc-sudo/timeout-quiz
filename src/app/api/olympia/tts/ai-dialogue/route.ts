import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type AiDialogueSegment =
  | "lobby_greeting"
  | "round_transition"
  | "post_match_summary"
  | "award_ceremony";

export interface ContestantContext {
  id?: number;
  name: string;
  school?: string;
  score: number;
  rank?: number;
}

export interface AiDialogueRequest {
  segment: AiDialogueSegment;
  context: {
    roundName?: string;
    currentRound?: string;
    nextRound?: string;
    contestants?: ContestantContext[];
    roomName?: string;
    matchType?: string;
    customNotes?: string;
  };
  apiKey?: string;
}

export interface AiDialogueLine {
  role: "khanh_vy" | "ngoc_huy";
  text: string;
}

export async function POST(req: NextRequest) {
  let body: AiDialogueRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { segment, context, apiKey } = body;
  if (!segment) {
    return NextResponse.json({ error: "Missing segment parameter" }, { status: 400 });
  }

  const resolvedApiKey = (apiKey || "").trim() || process.env.GEMINI_API_KEY || "";

  if (!resolvedApiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY", fallback: "template" },
      { status: 503 }
    );
  }

  const contestantsList = (context?.contestants || [])
    .map((c, i) => `${i + 1}. ${c.name} (${c.school || "THPT"}) — ${c.score} điểm`)
    .join("\n");

  const prompt = `
Bạn là đạo diễn kịch bản phát thanh truyền hình cho cuộc thi Đường lên đỉnh Olympia (VTV3).
Hãy sáng tác một đoạn đối đáp ngắn gọn, sinh động và hào hứng giữa 2 MC:
- MC KHÁNH VY (role: "khanh_vy"): Nữ MC trẻ trung, hoạt bát, nhiệt huyết, truyền cảm hứng và cổ vũ tinh thần thí sinh.
- MC NGỌC HUY (role: "ngoc_huy"): Nam MC hóm hỉnh, sâu sắc, phong cách bình luận thể thao kịch tính, dứt khoát.

BỐI CẢNH SỰ KIỆN:
- Phân đoạn: ${segment}
- Trận đấu: ${context?.roomName || "Đường lên đỉnh Olympia"}
- Vòng thi hiện tại/vừa qua: ${context?.currentRound || context?.roundName || "Khởi Động"}
- Vòng thi kế tiếp: ${context?.nextRound || "Tiếp theo"}
- Danh sách thí sinh & điểm số:
${contestantsList || "4 nhà leo núi"}

QUY TẮC BẮT BUỘC VỀ NỘI DUNG VTV3:
1. Độ dài: Đúng 2 đến 3 câu đối đáp ngắn gọn luân phiên (1 câu cho Khánh Vy, 1-2 câu cho Ngọc Huy hoặc ngược lại).
2. Tôn trọng thể thức Olympia: Tuyệt đối KHÔNG bao giờ dùng từ "Giải Tư". Olympia chỉ có Quán quân (Vòng nguyệt quế), Giải Nhì, Giải Ba (hoặc Đồng Giải Ba).
3. Đọc đúng tên thí sinh và số điểm thực tế trong bối cảnh.
4. Trả về DUY NHẤT một JSON Array thuần túy theo định dạng dưới đây, không markdown, không lời dẫn:
[
  { "role": "khanh_vy", "text": "..." },
  { "role": "ngoc_huy", "text": "..." }
]
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${resolvedApiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.error?.message || "Gemini upstream error", fallback: "template" },
        { status: 503 }
      );
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (text.startsWith("```json")) {
      text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    const dialogue: AiDialogueLine[] = JSON.parse(text);
    if (!Array.isArray(dialogue) || dialogue.length === 0) {
      return NextResponse.json(
        { error: "Invalid dialogue structure from AI", fallback: "template" },
        { status: 502 }
      );
    }

    return NextResponse.json({ dialogue }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed", fallback: "template" },
      { status: 503 }
    );
  }
}
