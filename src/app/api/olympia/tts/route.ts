import { NextRequest, NextResponse } from "next/server";
import {
  EDGE_TTS_VOICES,
  TtsUpstreamError,
  TtsValidationError,
  getTtsCacheStats,
  synthesizeEdgeTts,
  type SynthesizeTtsInput,
} from "@/lib/olympia/server-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      engine: "edge-neural",
      voices: EDGE_TTS_VOICES,
      cache: getTtsCacheStats(),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await synthesizeEdgeTts(body as SynthesizeTtsInput);
    return new Response(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.audio.byteLength),
        "Cache-Control": "no-store",
        "X-TTS-Engine": "edge-neural",
        "X-TTS-Voice": result.voice,
        "X-TTS-Lang": result.lang,
        "X-TTS-Cache": result.cacheHit ? "hit" : "miss",
      },
    });
  } catch (err) {
    if (err instanceof TtsValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message =
      err instanceof TtsUpstreamError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Edge TTS upstream unavailable";
    return NextResponse.json(
      {
        error: message,
        fallback: "webspeech",
      },
      { status: 503 }
    );
  }
}
