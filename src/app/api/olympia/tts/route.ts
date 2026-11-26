import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_SERVER_TTS_RATE,
  EDGE_TTS_VOICES,
  TtsUpstreamError,
  TtsValidationError,
  getTtsCacheStats,
  getTtsCapabilities,
  sanitizeSecretText,
  synthesizeEdgeTtsStream,
  warmEdgeTtsVoices,
  type SynthesizeTtsInput,
} from "@/lib/olympia/server-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  warmEdgeTtsVoices();
  const capabilities = await getTtsCapabilities();
  return NextResponse.json(
    {
      status: "ok",
      engine: "edge-neural",
      voices: EDGE_TTS_VOICES,
      defaultRate: DEFAULT_SERVER_TTS_RATE,
      capabilities,
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

  const secretKey =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as { clone?: { apiKey?: unknown } }).clone &&
    typeof (body as { clone?: { apiKey?: unknown } }).clone?.apiKey === "string"
      ? ((body as { clone: { apiKey: string } }).clone.apiKey)
      : undefined;

  try {
    const result = await synthesizeEdgeTtsStream(body as SynthesizeTtsInput);
    const engineHeader = result.engine ?? "edge-neural";
    const headers: Record<string, string> = {
      "Content-Type": result.contentType ?? "audio/mpeg",
      "Cache-Control": "no-store",
      "X-TTS-Engine": engineHeader,
      "X-TTS-Voice": result.voice,
      "X-TTS-Role": result.role,
      "X-TTS-Lang": result.lang,
      "X-TTS-Cache": result.cacheHit ? "hit" : "miss",
      "X-TTS-Clone-Used": result.cloneUsed ? "true" : "false",
    };

    if (result.fallbackReason) {
      headers["X-TTS-Fallback-Reason"] = sanitizeSecretText(result.fallbackReason, [secretKey]);
    }

    if (result.audio) {
      headers["Content-Length"] = String(result.audio.byteLength);
      return new Response(new Uint8Array(result.audio), {
        status: 200,
        headers,
      });
    }

    return new Response(result.stream, {
      status: 200,
      headers,
    });
  } catch (err) {
    if (err instanceof TtsValidationError) {
      return NextResponse.json(
        { error: sanitizeSecretText(err.message, [secretKey]) },
        { status: 400 }
      );
    }
    const rawMessage =
      err instanceof TtsUpstreamError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Edge TTS upstream unavailable";
    const message = sanitizeSecretText(rawMessage, [secretKey]) || "Edge TTS upstream unavailable";
    return NextResponse.json(
      {
        error: message,
        fallback: "webspeech",
      },
      { status: 503 }
    );
  }
}
