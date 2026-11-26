import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  VOICES_UPLOAD_DIR,
  detectAudioContentType,
  estimateF0HzFromPcm,
  parseWavBuffer,
  resolveSafeVoiceFile,
  sanitizeSecretText,
} from "@/lib/olympia/server-tts";
import type { McVoiceCloneProvider, SavedVoiceProfile } from "@/lib/olympia/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".wav", ".mp3", ".ogg", ".webm", ".m4a", ".aac"]);
const VALID_PROVIDERS = new Set<McVoiceCloneProvider>([
  "local_profile",
  "elevenlabs",
  "fish_audio",
  "custom_http",
]);

type StoredProfile = SavedVoiceProfile & { apiKey?: string };

function sanitizeProfile(item: StoredProfile): SavedVoiceProfile {
  const { apiKey, ...pub } = item;
  return {
    ...pub,
    hasApiKey: Boolean(pub.hasApiKey || (typeof apiKey === "string" && apiKey.trim().length > 0)),
  };
}

function getRegistryPath(): string {
  return path.join(VOICES_UPLOAD_DIR, "profiles.json");
}

async function readStoredProfiles(): Promise<StoredProfile[]> {
  try {
    const raw = await fs.promises.readFile(getRegistryPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as StoredProfile[];
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { profiles?: unknown }).profiles)
    ) {
      return (parsed as { profiles: StoredProfile[] }).profiles;
    }
    return [];
  } catch {
    return [];
  }
}

async function writeStoredProfiles(profiles: StoredProfile[]): Promise<void> {
  await fs.promises.mkdir(VOICES_UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(
    getRegistryPath(),
    JSON.stringify({ profiles }, null, 2),
    "utf8"
  );
}

function sanitizeSampleBasename(name: string): string {
  const extRaw = path.extname(name).toLowerCase();
  const ext = ALLOWED_EXTENSIONS.has(extRaw) ? extRaw : ".wav";
  const base = path
    .basename(name, extRaw)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base || "sample"}_${Date.now().toString(36)}_${suffix}${ext}`;
}

function guessMimeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".webm") return "audio/webm";
  if (ext === ".m4a" || ext === ".aac") return "audio/mp4";
  return "audio/mpeg";
}

export async function GET(req: NextRequest) {
  const fileParam = req.nextUrl.searchParams.get("file");
  if (fileParam) {
    const safePath = resolveSafeVoiceFile(fileParam);
    if (!safePath) {
      return NextResponse.json({ error: "Invalid voice file path" }, { status: 400 });
    }
    try {
      const buf = await fs.promises.readFile(safePath);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": detectAudioContentType(buf) ?? guessMimeFromExt(safePath),
          "Content-Length": String(buf.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ error: "Voice sample not found" }, { status: 404 });
    }
  }

  const stored = await readStoredProfiles();
  return NextResponse.json(
    {
      profiles: stored.map(sanitizeProfile),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const ctype = req.headers.get("content-type") || "";
  const now = Date.now();

  try {
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const fileEntry = form.get("file");
      const rawName = String(form.get("name") || "").trim();
      const rawRoleHint = String(form.get("roleHint") || "").trim();
      const rawProvider = String(form.get("provider") || "local_profile").trim() as McVoiceCloneProvider;
      const rawPitchHz = form.get("targetPitchHz");
      const rawVoiceId = String(form.get("voiceId") || "").trim();
      const rawEndpointUrl = String(form.get("endpointUrl") || "").trim();
      const rawApiKey = String(form.get("apiKey") || "").trim();

      if (!(fileEntry instanceof File)) {
        return NextResponse.json({ error: "Thiếu file âm thanh mẫu (field 'file')" }, { status: 400 });
      }
      if (fileEntry.size <= 0 || fileEntry.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `Kích thước file phải từ 1 byte đến ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      const ext = path.extname(fileEntry.name || "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: "Định dạng không hỗ trợ. Hãy dùng .wav, .mp3, .ogg, .webm hoặc .m4a" },
          { status: 400 }
        );
      }

      const buf = Buffer.from(await fileEntry.arrayBuffer());
      const safeFile = sanitizeSampleBasename(fileEntry.name || "voice.wav");
      await fs.promises.mkdir(VOICES_UPLOAD_DIR, { recursive: true });
      const targetPath = path.join(VOICES_UPLOAD_DIR, safeFile);
      await fs.promises.writeFile(targetPath, buf);

      let targetPitchHz: number | undefined =
        rawPitchHz !== null && String(rawPitchHz).trim() !== "" && Number.isFinite(Number(rawPitchHz))
          ? Math.min(400, Math.max(65, Number(rawPitchHz)))
          : undefined;

      if (targetPitchHz === undefined && detectAudioContentType(buf) === "audio/wav") {
        try {
          const parsed = parseWavBuffer(buf);
          const f0 = estimateF0HzFromPcm(parsed.samples, parsed.sampleRate);
          if (f0) targetPitchHz = Math.round(f0 * 10) / 10;
        } catch {
          // ignore F0 auto-detection failure; fallback heuristic applies cleanly
        }
      }

      const profileId = `vp_${now.toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
      const profile: StoredProfile = {
        id: profileId,
        name: rawName || path.basename(fileEntry.name, ext) || profileId,
        roleHint: rawRoleHint === "khanh_vy" || rawRoleHint === "ngoc_huy" ? rawRoleHint : undefined,
        provider: VALID_PROVIDERS.has(rawProvider) ? rawProvider : "local_profile",
        sampleUrl: `/api/olympia/tts/voice-sample?file=${encodeURIComponent(safeFile)}`,
        sampleName: fileEntry.name || safeFile,
        ...(rawVoiceId ? { voiceId: rawVoiceId } : {}),
        ...(rawEndpointUrl ? { endpointUrl: rawEndpointUrl } : {}),
        ...(rawApiKey ? { apiKey: rawApiKey } : {}),
        ...(targetPitchHz !== undefined ? { targetPitchHz } : {}),
        createdAt: now,
        updatedAt: now,
      };

      const existing = await readStoredProfiles();
      existing.unshift(profile);
      await writeStoredProfiles(existing.slice(0, 50));

      return NextResponse.json({ ok: true, profile: sanitizeProfile(profile) }, { status: 201 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const provider = String(body.provider || "local_profile") as McVoiceCloneProvider;
    if (!VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Provider voice cloning không hợp lệ" }, { status: 400 });
    }
    const id =
      typeof body.id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(body.id)
        ? body.id
        : `vp_${now.toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    const name = String(body.name || id).trim().slice(0, 80);
    const existing = await readStoredProfiles();
    const prevIdx = existing.findIndex((p) => p.id === id);
    const prev = prevIdx >= 0 ? existing[prevIdx] : undefined;

    const profile: StoredProfile = {
      id,
      name: name || id,
      roleHint:
        body.roleHint === "khanh_vy" || body.roleHint === "ngoc_huy"
          ? body.roleHint
          : prev?.roleHint,
      provider,
      voiceId: typeof body.voiceId === "string" ? body.voiceId.trim() : prev?.voiceId,
      sampleUrl: typeof body.sampleUrl === "string" ? body.sampleUrl.trim() : prev?.sampleUrl,
      sampleName: typeof body.sampleName === "string" ? body.sampleName.trim() : prev?.sampleName,
      endpointUrl: typeof body.endpointUrl === "string" ? body.endpointUrl.trim() : prev?.endpointUrl,
      apiKey:
        typeof body.apiKey === "string" && body.apiKey.trim().length > 0
          ? body.apiKey.trim()
          : prev?.apiKey,
      targetPitchHz:
        typeof body.targetPitchHz === "number" && Number.isFinite(body.targetPitchHz)
          ? Math.min(400, Math.max(65, body.targetPitchHz))
          : prev?.targetPitchHz,
      pitchRatio:
        typeof body.pitchRatio === "number" && Number.isFinite(body.pitchRatio)
          ? Math.min(1.65, Math.max(0.52, body.pitchRatio))
          : prev?.pitchRatio,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };

    if (prevIdx >= 0) existing[prevIdx] = profile;
    else existing.unshift(profile);
    await writeStoredProfiles(existing.slice(0, 50));

    return NextResponse.json({ ok: true, profile: sanitizeProfile(profile) }, { status: 200 });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : "Failed to save voice profile";
    return NextResponse.json({ error: sanitizeSecretText(rawMsg) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profileId") || "";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(profileId)) {
    return NextResponse.json({ error: "profileId không hợp lệ" }, { status: 400 });
  }
  const existing = await readStoredProfiles();
  const target = existing.find((p) => p.id === profileId);
  const next = existing.filter((p) => p.id !== profileId);
  await writeStoredProfiles(next);

  if (target?.sampleUrl) {
    const safePath = resolveSafeVoiceFile(target.sampleUrl);
    if (safePath) {
      await fs.promises.unlink(safePath).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, removed: Boolean(target) }, { status: 200 });
}
