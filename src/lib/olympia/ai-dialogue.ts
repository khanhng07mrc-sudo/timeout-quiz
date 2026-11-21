import type { DualMcRole, DualMcScriptSegment } from "./tts";
import {
  buildLobbyGreetingScript,
  buildScoreSummaryScript,
  buildOpeningDuoScript,
  buildAwardTierScript,
  ROUND_INTRO_LINES,
} from "./tts";

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

export interface AiDialogueContext {
  roundName?: string;
  currentRound?: string;
  nextRound?: string;
  contestants?: ContestantContext[];
  roomName?: string;
  matchType?: string;
  customNotes?: string;
}

export interface AiDialogueLine {
  role: DualMcRole;
  text: string;
}

export function getTemplateFallbackDialogue(
  segment: AiDialogueSegment,
  context: AiDialogueContext
): DualMcScriptSegment[] {
  switch (segment) {
    case "lobby_greeting":
      return buildLobbyGreetingScript({ roomName: context.roomName });

    case "round_transition": {
      const seats = (context.contestants || []).map((c, i) => ({
        id: c.id ?? i,
        name: c.name,
        school: c.school,
        score: c.score,
      }));
      return buildScoreSummaryScript(seats, {
        completedRound: context.currentRound,
        nextRound: context.nextRound,
      });
    }

    case "post_match_summary": {
      const seats = (context.contestants || []).map((c, i) => ({
        id: c.id ?? i,
        name: c.name,
        school: c.school,
        score: c.score,
      }));
      return buildScoreSummaryScript(seats, {
        completedRound: "veDich",
        nextRound: undefined,
      });
    }

    case "award_ceremony": {
      const seats = (context.contestants || []).map((c, i) => ({
        id: c.id ?? i,
        name: c.name,
        school: c.school,
        score: c.score,
      }));
      return buildAwardTierScript("first", seats, { roomName: context.roomName });
    }

    default:
      return buildOpeningDuoScript({ roomName: context.roomName });
  }
}

export async function fetchAiDialogue(
  segment: AiDialogueSegment,
  context: AiDialogueContext,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<DualMcScriptSegment[]> {
  // 1. Instant zero-latency offline check
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return getTemplateFallbackDialogue(segment, context);
  }

  const timeoutMs = options?.timeoutMs ?? 3000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/olympia/tts/ai-dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment, context }),
      signal: options?.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return getTemplateFallbackDialogue(segment, context);
    }

    const data = await res.json();
    if (Array.isArray(data?.dialogue) && data.dialogue.length > 0) {
      return data.dialogue.map((d: AiDialogueLine, idx: number) => ({
        role: d.role === "khanh_vy" ? "khanh_vy" : "ngoc_huy",
        kind: "dialogue" as const,
        pauseAfterMs: idx === data.dialogue.length - 1 ? 0 : 300,
        text: d.text,
      }));
    }

    return getTemplateFallbackDialogue(segment, context);
  } catch {
    clearTimeout(timeoutId);
    return getTemplateFallbackDialogue(segment, context);
  }
}
