import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  ALL_AUDIO_SEASONS,
  WORKSPACE_DIR,
  assertNoRuntimeErrors,
  buildCustomQuestionSet,
  clickButtonByText,
  createSandboxCode,
  createTrackedPage,
  connectOlympiaSocket,
  handleStartMatchModals,
  runCase,
  setupOlympiaMatchSession,
  sleep,
  summarizeCases,
  tryClickButtonByText,
  unlockDisplayAudio,
} from "./lib/harness.mjs";
import {
  assertHostPageSilent,
  clearTtsProbe,
  readTtsProbe,
  setForceTts503,
  waitForTtsCall,
} from "./lib/tts-probes.mjs";

const CATALOG = [
  // F1: Server TTS
  { id: "T1-F1-1", name: "POST /api/olympia/tts synthesizes khanh_vy female voice", featureArea: "F1", requirements: ["R1"] },
  { id: "T1-F1-2", name: "POST /api/olympia/tts synthesizes distinct ngoc_huy male voice", featureArea: "F1", requirements: ["R1"] },
  { id: "T1-F1-3", name: "POST /api/olympia/tts supports English auto and explicit lang=en", featureArea: "F1", requirements: ["R1"] },
  { id: "T1-F1-4", name: "POST /api/olympia/tts respects rate parameter", featureArea: "F1", requirements: ["R1"] },
  { id: "T1-F1-5", name: "POST /api/olympia/tts returns HTTP 400 on invalid/empty text", featureArea: "F1", requirements: ["R1"] },
  // F2: Web Speech fallback & lip-sync
  { id: "T1-F2-1", name: "Display falls back to window.speechSynthesis on /api/olympia/tts 503", featureArea: "F2", requirements: ["R1"] },
  { id: "T1-F2-2", name: "Web Speech fallback preserves vi-VN lang and role pitch/rate differentiation", featureArea: "F2", requirements: ["R1"] },
  { id: "T1-F2-3", name: "olympia:tts-speaker event emits khanh_vy / ngoc_huy on speech start", featureArea: "F2", requirements: ["R1", "R9"] },
  { id: "T1-F2-4", name: "window.__olympiaTtsSpeaker updates during speech and resets to null", featureArea: "F2", requirements: ["R1", "R9"] },
  { id: "T1-F2-5", name: "tts:stop cancels active playback and resets __olympiaTtsSpeaker to null", featureArea: "F2", requirements: ["R1", "R9"] },
  // F3: Host -> Display isolation
  { id: "T1-F3-1", name: "HostConsole remains 100% silent during lobby, start, and questions", featureArea: "F3", requirements: ["R1", "R4"] },
  { id: "T1-F3-2", name: "Host manual cue plays on DisplayScreen while HostConsole stays silent", featureArea: "F3", requirements: ["R1", "R4"] },
  { id: "T1-F3-3", name: "HostConsole PiP display iframe (?mute=1) remains 100% silent", featureArea: "F3", requirements: ["R1"] },
  { id: "T1-F3-4", name: "Host TTS toggle button syncs ttsSettings.enabled to DisplayScreen", featureArea: "F3", requirements: ["R1", "R4"] },
  { id: "T1-F3-5", name: "Audio Drawer voice/steal controls keep HostConsole silent", featureArea: "F3", requirements: ["R1", "R4"] },
  // F4 & F5: Speed separation, Host slider & English
  { id: "T1-F4-1", name: "O22 question TTS rate is significantly faster than O26 question rate", featureArea: "F4", requirements: ["R1"] },
  { id: "T1-F4-2", name: "Narration/greeting TTS rate is distinct from question rate", featureArea: "F4", requirements: ["R1"] },
  { id: "T1-F4-3", name: "Host baseRate slider updates state.ttsSettings.baseRate and Display rate", featureArea: "F4", requirements: ["R1"] },
  { id: "T1-F5-1", name: "English question triggers automatic English voice/lang switch", featureArea: "F5", requirements: ["R1"] },
  { id: "T1-F5-2", name: "Vietnamese question after English reverts back to Vietnamese voice/lang", featureArea: "F5", requirements: ["R1"] },
  // F6: Word-boundary cut & timing delays
  { id: "T1-F6-1", name: "Khoi Dong buzz cleanly cancels mid-question TTS speech", featureArea: "F6", requirements: ["R1"] },
  { id: "T1-F6-2", name: "Khoi Dong buzz waits ~0.5s reflex + ~0.5s bell before MC callout", featureArea: "F6", requirements: ["R1"] },
  { id: "T1-F6-3", name: "Cau Hoi Phu buzz interrupts question speech and calls contestant", featureArea: "F6", requirements: ["R1"] },
  { id: "T1-F6-4", name: "Ve Dich steal buzz waits ~2.5s dramatic delay before MC callout", featureArea: "F6", requirements: ["R1"] },
  { id: "T1-F6-5", name: "tts:stop interrupts long narration cleanly without dangling speaker state", featureArea: "F6", requirements: ["R1"] },
  // F7 & F8: R2 Scripts
  { id: "T1-F7-1", name: "Lobby greeting speaks concisely when room enters lobby", featureArea: "F7", requirements: ["R2"] },
  { id: "T1-F7-2", name: "Opening duo incorporates custom room.name in Khánh Vy + Ngọc Huy intro", featureArea: "F7", requirements: ["R2"] },
  { id: "T1-F8-1", name: "Contestant intro (3D step) formats position, school omission, and 'và'", featureArea: "F8", requirements: ["R2"] },
  { id: "T1-F8-2", name: "Contestant intro skip narrates continuously with 1-2 breathers before ready", featureArea: "F8", requirements: ["R2"] },
  { id: "T1-F8-3", name: "Inter-round score summary speaks standings and brief commentary", featureArea: "F8", requirements: ["R2"] },
  // F10 & F11: R3 Alternation & Scripts
  { id: "T1-F10-1", name: "Khoi Dong solo keeps MC pair per seat & flips across seats/shared", featureArea: "F10", requirements: ["R3"] },
  { id: "T1-F10-2", name: "VCNV keeps MC per row, alternates center, and speaks CNV bell/verdict", featureArea: "F10", requirements: ["R3"] },
  { id: "T1-F10-3", name: "Tang Toc, Ve Dich, and Cau Hoi Phu follow strict per-turn alternation", featureArea: "F10", requirements: ["R3"] },
  { id: "T1-F11-1", name: "Result announcement shortens parentheticals and semicolon/slash alternatives", featureArea: "F11", requirements: ["R3"] },
  { id: "T1-F11-2", name: "Explanation/hint readout speaks provided question explanation safely", featureArea: "F11", requirements: ["R3"] },
  { id: "T1-F11-3", name: "Repeated buzzer callouts vary phrasing and include hype fillers", featureArea: "F11", requirements: ["R3"] },
  // F12, F13, F14, F15: R4 Manual Deck, VCNV/TT, CHP
  { id: "T1-F12-1", name: "Host manual TTS deck buttons dispatch cues to DisplayScreen", featureArea: "F12", requirements: ["R4"] },
  { id: "T1-F12-2", name: "Ve Dich timeout NEVER auto-speaks steal invitation without Host cue", featureArea: "F12", requirements: ["R4"] },
  { id: "T1-F13-1", name: "VCNV correct CNV defers points & full reveal until TTS finishes", featureArea: "F13", requirements: ["R4"] },
  { id: "T1-F13-2", name: "VCNV correct CNV commits immediately when TTS is OFF; wrong CNV announces elimination", featureArea: "F13", requirements: ["R4"] },
  { id: "T1-F14-1", name: "VCNV/TT groups matching answers, labels typos, and announces TT fast/tied times", featureArea: "F14", requirements: ["R4"] },
  { id: "T1-F15-1", name: "cauHoiPhu winner==null does not announce 'Chính xác!' and Display keys re-trigger", featureArea: "F15", requirements: ["R3", "R4"] },
  // F9, F16, F17, F18, F19: R6-R9
  { id: "T1-F9-1", name: "Post-match summary uses isPostMatch=true, isAuto=false, CAM 3 -> TS1..TSX, no Giải Tư", featureArea: "F9", requirements: ["R2", "R6"] },
  { id: "T1-F16-1", name: "All 6 seasons serve 3-channel summary_rank_1..4 & prize_award HTTP 200", featureArea: "F16", requirements: ["R7"] },
  { id: "T1-F17-1", name: "awardsState steps third->second->first->closing with VictoryPodium3D & laurelCrowned", featureArea: "F17", requirements: ["R8"] },
  { id: "T1-F18-1", name: "LIGHT quality mode (?perf=light) renders 3D studio cleanly with lip-sync events", featureArea: "F18", requirements: ["R9"] },
  { id: "T1-F19-1", name: "Production /api/health & Electron server.js build/bundle contract check", featureArea: "F19", requirements: ["AC"] },
  { id: "T1-F19-2", name: "AGENTS.md remains untouched with 0 git diffs", featureArea: "F19", requirements: ["R5", "AC"] },
];

export function getCatalog() {
  return CATALOG.slice();
}

function getAllSpokenTexts(snap) {
  const fromFetch = (snap?.fetchCalls || []).map((c) => c.text).filter(Boolean);
  const fromSpeech = (snap?.speechCalls || []).filter((c) => c.type === "speak").map((c) => c.text).filter(Boolean);
  return [...fromFetch, ...fromSpeech];
}

function getAllTtsCalls(snap) {
  const f = (snap?.fetchCalls || []).map((c) => ({ ...c, source: "fetch" }));
  const s = (snap?.speechCalls || []).filter((c) => c.type === "speak").map((c) => ({ ...c, source: "speech" }));
  return [...f, ...s].sort((a, b) => a.ts - b.ts);
}

async function callServerTtsApi(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/api/olympia/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const contentType = res.headers.get("content-type") || "";
  const engine = res.headers.get("x-tts-engine") || "";
  const voice = res.headers.get("x-tts-voice") || "";
  const lang = res.headers.get("x-tts-lang") || "";
  const buf = await res.arrayBuffer();
  let json = null;
  if (contentType.includes("application/json")) {
    try {
      json = JSON.parse(new TextDecoder().decode(buf));
    } catch {}
  }
  return { status: res.status, contentType, engine, voice, lang, bytes: buf.byteLength, json };
}

function assertTtsApiSuccessOrAllowedOffline(res, allowOffline, label) {
  if (res.status === 200) {
    if (!res.contentType.includes("audio/mpeg") && !res.contentType.includes("audio/")) {
      throw new Error(`[${label}] Expected audio/* content-type, got ${res.contentType}`);
    }
    if (res.bytes < 100) {
      throw new Error(`[${label}] Expected non-trivial audio bytes, got ${res.bytes}`);
    }
    return { offline: false };
  }
  if (allowOffline && res.status === 503 && res.json?.fallback === "webspeech") {
    return { offline: true };
  }
  throw new Error(`[${label}] Unexpected /api/olympia/tts response: status=${res.status}, ct=${res.contentType}, json=${JSON.stringify(res.json)}`);
}

export async function runTier(ctx) {
  const { browser, baseUrl, allowOfflineEdgeTts = false } = ctx;
  const cases = [];

  // ── F1: Server TTS API ──
  cases.push(
    await runCase("T1-F1-1", CATALOG[0].name, "F1", async () => {
      const res = await callServerTtsApi(baseUrl, {
        text: "Xin chào mừng quý vị khán giả đến với Đường lên đỉnh Olympia.",
        role: "khanh_vy",
        lang: "vi",
      });
      const mode = assertTtsApiSuccessOrAllowedOffline(res, allowOfflineEdgeTts, "T1-F1-1");
      if (!mode.offline) {
        if (!res.voice || !res.engine) {
          throw new Error(`Missing X-TTS-Voice/X-TTS-Engine headers: ${JSON.stringify(res)}`);
        }
      }
      return { status: res.status, voice: res.voice, engine: res.engine, bytes: res.bytes };
    })
  );

  cases.push(
    await runCase("T1-F1-2", CATALOG[1].name, "F1", async () => {
      const kv = await callServerTtsApi(baseUrl, { text: "Khánh Vy xin chào.", role: "khanh_vy", lang: "vi" });
      const nh = await callServerTtsApi(baseUrl, { text: "Ngọc Huy xin chào.", role: "ngoc_huy", lang: "vi" });
      const m1 = assertTtsApiSuccessOrAllowedOffline(kv, allowOfflineEdgeTts, "T1-F1-2-kv");
      const m2 = assertTtsApiSuccessOrAllowedOffline(nh, allowOfflineEdgeTts, "T1-F1-2-nh");
      if (!m1.offline && !m2.offline && kv.voice === nh.voice) {
        throw new Error(`Expected distinct voices for khanh_vy (${kv.voice}) vs ngoc_huy (${nh.voice})`);
      }
      return { kvVoice: kv.voice, nhVoice: nh.voice };
    })
  );

  cases.push(
    await runCase("T1-F1-3", CATALOG[2].name, "F1", async () => {
      const enAuto = await callServerTtsApi(baseUrl, {
        text: "What is the capital city of France?",
        role: "khanh_vy",
        lang: "auto",
      });
      const m = assertTtsApiSuccessOrAllowedOffline(enAuto, allowOfflineEdgeTts, "T1-F1-3");
      if (!m.offline && enAuto.lang && !enAuto.lang.toLowerCase().startsWith("en")) {
        throw new Error(`Expected X-TTS-Lang starting with 'en', got ${enAuto.lang}`);
      }
      return { status: enAuto.status, voice: enAuto.voice, lang: enAuto.lang };
    })
  );

  cases.push(
    await runCase("T1-F1-4", CATALOG[3].name, "F1", async () => {
      const slow = await callServerTtsApi(baseUrl, { text: "Câu hỏi số một.", role: "ngoc_huy", rate: 1.0 });
      const fast = await callServerTtsApi(baseUrl, { text: "Câu hỏi số một.", role: "ngoc_huy", rate: 1.4 });
      assertTtsApiSuccessOrAllowedOffline(slow, allowOfflineEdgeTts, "T1-F1-4-slow");
      assertTtsApiSuccessOrAllowedOffline(fast, allowOfflineEdgeTts, "T1-F1-4-fast");
      return { slowBytes: slow.bytes, fastBytes: fast.bytes };
    })
  );

  cases.push(
    await runCase("T1-F1-5", CATALOG[4].name, "F1", async () => {
      const bad1 = await callServerTtsApi(baseUrl, {});
      const bad2 = await callServerTtsApi(baseUrl, { text: "   ", role: "khanh_vy" });
      if (bad1.status !== 400 || bad2.status !== 400) {
        throw new Error(`Expected HTTP 400 for invalid/empty text, got ${bad1.status} and ${bad2.status}`);
      }
      return { bad1Status: bad1.status, bad2Status: bad2.status };
    })
  );

  // ── F2: Web Speech fallback & lip-sync events ──
  cases.push(
    await runCase("T1-F2-1", CATALOG[5].name, "F2", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f2" });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "test_mc" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.speechCalls.some((c) => c.type === "speak"),
          8000
        );
        return {
          fetches503: snap.fetchCalls.filter((f) => f.status === 503).length,
          speeches: snap.speechCalls.filter((c) => c.type === "speak").length,
        };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F2-2", CATALOG[6].name, "F2", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f2_role" });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.speechCalls.filter((c) => c.type === "speak").length >= 2,
          9000
        );
        const speaks = snap.speechCalls.filter((c) => c.type === "speak");
        const hasVi = speaks.some((s) => (s.lang || "").toLowerCase().includes("vi"));
        if (!hasVi) {
          throw new Error(`Expected vi-VN lang in fallback utterances: ${JSON.stringify(speaks)}`);
        }
        return { speaksCount: speaks.length, pitches: speaks.map((s) => s.pitch) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F2-3", CATALOG[7].name, "F2", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f2_ev" });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.speakerTransitions.some((t) => t.speaker === "khanh_vy" || t.speaker === "ngoc_huy"),
          8000
        );
        return { transitions: snap.speakerTransitions };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F2-4", CATALOG[8].name, "F2", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f2_null" });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "lobby_greeting" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) =>
            s.speakerTransitions.some((t) => t.speaker === "khanh_vy" || t.speaker === "ngoc_huy") &&
            s.currentSpeaker === null,
          8000
        );
        return { transitions: snap.speakerTransitions.length, finalSpeaker: snap.currentSpeaker };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F2-5", CATALOG[9].name, "F2", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f2_stop" });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        await sleep(100);
        await session.hostSock.action({ type: "tts:stop" });
        await sleep(300);
        const snap = await readTtsProbe(session.displayPage);
        if (snap.currentSpeaker !== null) {
          throw new Error(`Expected __olympiaTtsSpeaker === null after tts:stop, got ${snap.currentSpeaker}`);
        }
        return { canceled: snap.speechCalls.some((c) => c.type === "cancel"), finalSpeaker: snap.currentSpeaker };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── F3: Host -> Display isolation ──
  cases.push(
    await runCase("T1-F3-1", CATALOG[10].name, "F3", async () => {
      const code = createSandboxCode(4, "t1f3_iso");
      const { page: hostPage, collector: hostCollector } = await createTrackedPage(browser, baseUrl, "host_t1f3", {
        allowOfflineDbErrors: true,
        allowTts503: allowOfflineEdgeTts,
      });
      const { page: dispPage, collector: dispCollector } = await createTrackedPage(browser, baseUrl, "disp_t1f3", {
        allowOfflineDbErrors: true,
        allowTts503: allowOfflineEdgeTts,
      });
      const players = [];
      try {
        for (let i = 0; i < 4; i++) {
          players.push(
            await connectOlympiaSocket(baseUrl, {
              code,
              role: "player",
              seatId: i,
              name: `TS ${i + 1}`,
              token: `t1f3_${i}`,
            })
          );
        }
        await dispPage.goto(`${baseUrl}/olympia/display/${code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await unlockDisplayAudio(dispPage);
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(600);
        await handleStartMatchModals(hostPage);
        await sleep(800);
        await assertHostPageSilent(hostPage, "T1-F3-1");
        assertNoRuntimeErrors(hostCollector, "T1-F3-1 Host");
        assertNoRuntimeErrors(dispCollector, "T1-F3-1 Display");
        return { hostSilent: true };
      } finally {
        for (const p of players) p.close();
        await hostPage.close().catch(() => {});
        await dispPage.close().catch(() => {});
      }
    })
  );

  cases.push(
    await runCase("T1-F3-2", CATALOG[11].name, "F3", async () => {
      const code = createSandboxCode(4, "t1f3_cmd");
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_t1f3_cmd", {
        allowOfflineDbErrors: true,
        allowTts503: true,
      });
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "disp_t1f3_cmd", {
        allowOfflineDbErrors: true,
        allowTts503: true,
      });
      try {
        await setForceTts503(dispPage, true);
        await dispPage.goto(`${baseUrl}/olympia/display/${code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await unlockDisplayAudio(dispPage);
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(600);
        await clearTtsProbe(hostPage);
        await clearTtsProbe(dispPage);
        await clickButtonByText(hostPage, /Thử 2 MC/i, { timeoutMs: 10000, waitAfterMs: 400 });
        const dispSnap = await waitForTtsCall(
          dispPage,
          (s) => s.fetchCalls.length > 0 || s.speechCalls.some((c) => c.type === "speak"),
          7000
        );
        await assertHostPageSilent(hostPage, "T1-F3-2");
        return { displayCalls: getAllTtsCalls(dispSnap).length };
      } finally {
        await hostPage.close().catch(() => {});
        await dispPage.close().catch(() => {});
      }
    })
  );

  cases.push(
    await runCase("T1-F3-3", CATALOG[12].name, "F3", async () => {
      const code = createSandboxCode(4, "t1f3_pip");
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_pip", {
        allowOfflineDbErrors: true,
        allowTts503: true,
      });
      try {
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(600);
        await tryClickButtonByText(hostPage, /^Chiếu$/i, { scopeSelector: "aside", timeoutMs: 4000 });
        await sleep(800);
        await clickButtonByText(hostPage, /Thử 2 MC/i, { timeoutMs: 8000, waitAfterMs: 600 });
        await assertHostPageSilent(hostPage, "T1-F3-3 PiP");
        return { pipSilent: true };
      } finally {
        await hostPage.close().catch(() => {});
      }
    })
  );

  cases.push(
    await runCase("T1-F3-4", CATALOG[13].name, "F3", async () => {
      const code = createSandboxCode(4, "t1f3_toggle");
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_t1f3_tog", {
        allowOfflineDbErrors: true,
      });
      const obsSock = await connectOlympiaSocket(baseUrl, { code, role: "display" });
      try {
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(500);
        const before = obsSock.getState()?.ttsSettings?.enabled;
        await clickButtonByText(hostPage, /TTS:\s*(BẬT|TẮT)/i, { timeoutMs: 8000, waitAfterMs: 300 });
        const afterState = await obsSock.waitForState((s) => s?.ttsSettings?.enabled !== before, 5000);
        return { before, after: afterState.ttsSettings?.enabled };
      } finally {
        obsSock.close();
        await hostPage.close().catch(() => {});
      }
    })
  );

  cases.push(
    await runCase("T1-F3-5", CATALOG[14].name, "F3", async () => {
      const code = createSandboxCode(4, "t1f3_drawer");
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_t1f3_drw", {
        allowOfflineDbErrors: true,
      });
      try {
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(500);
        await clickButtonByText(hostPage, /AUDIO/i, { timeoutMs: 8000, waitAfterMs: 300 });
        await clickButtonByText(hostPage, /Thử 2 MC/i, { timeoutMs: 6000, waitAfterMs: 400 });
        await assertHostPageSilent(hostPage, "T1-F3-5 Drawer");
        return { drawerHostSilent: true };
      } finally {
        await hostPage.close().catch(() => {});
      }
    })
  );

  // ── F4 & F5: Speed separation, slider, English detection ──
  cases.push(
    await runCase("T1-F4-1", CATALOG[15].name, "F4", async () => {
      async function measureQuestionRate(rulesetId) {
        const session = await setupOlympiaMatchSession(ctx, { rulesetId, allowTts503: true, tag: `rate_${rulesetId}` });
        try {
          await session.hostSock.action({ type: "game:start" });
          await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
          await session.hostSock.action({ type: "intro:skip" });
          await session.hostSock.action({ type: "banner:skip" });
          await clearTtsProbe(session.displayPage);
          await session.hostSock.action({ type: "kd:next" });
          const snap = await waitForTtsCall(
            session.displayPage,
            (s) => s.fetchCalls.some((f) => f.text.includes("Số nguyên tố")),
            8000
          );
          const call = snap.fetchCalls.find((f) => f.text.includes("Số nguyên tố"));
          return Number(call?.rate || 0);
        } finally {
          await session.cleanup();
        }
      }
      const rateO22 = await measureQuestionRate("O22");
      const rateO26 = await measureQuestionRate("O26");
      if (!(rateO22 > rateO26)) {
        throw new Error(`Expected O22 question rate (${rateO22}) > O26 question rate (${rateO26})`);
      }
      return { rateO22, rateO26 };
    })
  );

  cases.push(
    await runCase("T1-F4-2", CATALOG[16].name, "F4", async () => {
      const session = await setupOlympiaMatchSession(ctx, { rulesetId: "O22", allowTts503: true, tag: "t1f4_nar" });
      try {
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const narSnap = await waitForTtsCall(session.displayPage, (s) => s.fetchCalls.length > 0, 8000);
        const narrationRate = Number(narSnap.fetchCalls[0]?.rate || 0);

        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "kd:next" });
        const qSnap = await waitForTtsCall(
          session.displayPage,
          (s) => s.fetchCalls.some((f) => f.text.includes("Số nguyên tố")),
          8000
        );
        const questionRate = Number(qSnap.fetchCalls.find((f) => f.text.includes("Số nguyên tố"))?.rate || 0);
        if (!(questionRate > narrationRate)) {
          throw new Error(`Expected O22 question rate (${questionRate}) > narration rate (${narrationRate})`);
        }
        return { narrationRate, questionRate };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F4-3", CATALOG[17].name, "F4", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f4_slider" });
      try {
        await session.hostSock.action({ type: "tts:setRate", baseRate: 1.25 });
        const st = await session.hostSock.waitForState((s) => Math.abs((s?.ttsSettings?.baseRate ?? 1) - 1.25) < 0.05, 5000);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "lobby_greeting" });
        const snap = await waitForTtsCall(session.displayPage, (s) => s.fetchCalls.length > 0, 7000);
        const observedRate = Number(snap.fetchCalls[0]?.rate || 0);
        if (!(observedRate > 1.05)) {
          throw new Error(`Expected scaled TTS rate > 1.05 when baseRate=1.25, got ${observedRate}`);
        }
        return { baseRate: st.ttsSettings?.baseRate, observedRate };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F5-1", CATALOG[18].name, "F5", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f5_en" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "kd:next" }); // Q1 (VN)
        await session.hostSock.action({ type: "kd:correct" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "kd:next" }); // Q2 (EN: capital of France)
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.fetchCalls.some((f) => /capital city of France/i.test(f.text)),
          8000
        );
        const call = snap.fetchCalls.find((f) => /capital city of France/i.test(f.text));
        const isEn = (call?.lang || "").toLowerCase().startsWith("en") || (call?.respLang || "").toLowerCase().startsWith("en");
        if (!isEn) {
          throw new Error(`Expected English lang detection on English question, got ${JSON.stringify(call)}`);
        }
        return { lang: call.lang, respLang: call.respLang, voice: call.voice };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F5-2", CATALOG[19].name, "F5", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f5_vi" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "kd:next" }); // Q1
        await session.hostSock.action({ type: "kd:correct" });
        await session.hostSock.action({ type: "kd:next" }); // Q2 (EN)
        await sleep(300);
        await session.hostSock.action({ type: "kd:correct" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "kd:next" }); // Q3 (VN)
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.fetchCalls.some((f) => /cường độ dòng điện/i.test(f.text)),
          8000
        );
        const call = snap.fetchCalls.find((f) => /cường độ dòng điện/i.test(f.text));
        if ((call?.lang || "").toLowerCase().startsWith("en")) {
          throw new Error(`Expected Vietnamese lang on Q3 after English Q2, got ${JSON.stringify(call)}`);
        }
        return { lang: call.lang, respLang: call.respLang };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── F6: Word-boundary cut & reflex/steal delays ──
  cases.push(
    await runCase("T1-F6-1", CATALOG[20].name, "F6", async () => {
      const session = await setupOlympiaMatchSession(ctx, { rulesetId: "O22", allowTts503: true, tag: "t1f6_cut" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        // Advance to shared KD segment (4 solo seats * 4 qs or finishTurn)
        for (let i = 0; i < 4; i++) {
          await session.hostSock.action({ type: "kd:next" });
          await session.hostSock.action({ type: "kd:finishTurn" });
        }
        await session.hostSock.action({ type: "kd:next" });
        await session.hostSock.action({ type: "kd:buzzer", open: true }).catch(() => null);
        await sleep(250);
        await session.playerSocks[0].buzz();
        await sleep(900);
        const snap = await readTtsProbe(session.displayPage);
        const pausedOrCanceled =
          snap.audioPlays.some((a) => a.action === "pause") ||
          snap.speechCalls.some((c) => c.type === "cancel") ||
          snap.gainEvents.length > 0 ||
          snap.audioBufferSources.some((b) => b.stoppedAt != null);
        if (!pausedOrCanceled) {
          throw new Error(`Expected clean cut/pause/cancel on buzz, got ${JSON.stringify(snap)}`);
        }
        return { pausedOrCanceled };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F6-2", CATALOG[21].name, "F6", async () => {
      const session = await setupOlympiaMatchSession(ctx, { rulesetId: "O22", allowTts503: true, tag: "t1f6_kd" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        for (let i = 0; i < 4; i++) {
          await session.hostSock.action({ type: "kd:next" });
          await session.hostSock.action({ type: "kd:finishTurn" });
        }
        await session.hostSock.action({ type: "kd:next" });
        await session.hostSock.action({ type: "kd:buzzer", open: true }).catch(() => null);
        await clearTtsProbe(session.displayPage);
        const tBuzz = Date.now();
        await session.playerSocks[0].buzz();
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => getAllTtsCalls(s).some((c) => /Thí sinh 1/i.test(c.text)),
          6000
        );
        const call = getAllTtsCalls(snap).find((c) => /Thí sinh 1/i.test(c.text));
        const deltaMs = call.ts - tBuzz;
        if (deltaMs < 350 || deltaMs > 2500) {
          throw new Error(`Expected KD reflex+bell callout around ~1.0s (350..2500ms), got ${deltaMs}ms`);
        }
        return { deltaMs, text: call.text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F6-3", CATALOG[22].name, "F6", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f6_chp" });
      try {
        await session.hostSock.action({ type: "round:force", round: "cauHoiPhu" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "chp:setTied", seats: [0, 1] });
        await session.hostSock.action({ type: "chp:next" });
        await session.hostSock.action({ type: "chp:show" });
        await session.hostSock.action({ type: "chp:timer" });
        await clearTtsProbe(session.displayPage);
        await session.playerSocks[1].buzz();
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => getAllTtsCalls(s).some((c) => /Thí sinh 2/i.test(c.text)),
          6000
        );
        return { called: getAllTtsCalls(snap).map((c) => c.text) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F6-4", CATALOG[23].name, "F6", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f6_vd" });
      try {
        await session.hostSock.action({ type: "round:force", round: "veDich" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "vd:confirmPackage", points: [20, 20, 20] });
        await session.hostSock.action({ type: "vd:startQuestion" });
        await session.hostSock.action({ type: "vd:wrong" });
        await session.hostSock.action({ type: "vd:openSteal" });
        await clearTtsProbe(session.displayPage);
        const tBuzz = Date.now();
        await session.playerSocks[2].buzz();
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => getAllTtsCalls(s).some((c) => /Thí sinh 3/i.test(c.text)),
          7000
        );
        const call = getAllTtsCalls(snap).find((c) => /Thí sinh 3/i.test(c.text));
        const deltaMs = call.ts - tBuzz;
        if (deltaMs < 1800 || deltaMs > 4200) {
          throw new Error(`Expected Về Đích dramatic steal delay (~2.5s; 1800..4200ms), got ${deltaMs}ms`);
        }
        return { deltaMs, text: call.text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F6-5", CATALOG[24].name, "F6", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f6_stop" });
      try {
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        await sleep(150);
        await session.hostSock.action({ type: "tts:stop" });
        await sleep(250);
        const snap = await readTtsProbe(session.displayPage);
        if (snap.currentSpeaker !== null) {
          throw new Error(`Speaker not cleared on tts:stop: ${snap.currentSpeaker}`);
        }
        return { cleared: true };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── F7 & F8: R2 Scripts ──
  cases.push(
    await runCase("T1-F7-1", CATALOG[25].name, "F7", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f7_lob" });
      try {
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "lobby_greeting" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 7000);
        const texts = getAllSpokenTexts(snap);
        return { texts };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F7-2", CATALOG[26].name, "F7", async () => {
      const customName = "Chung kết Năm Olympia E2E";
      let session;
      try {
        session = await setupOlympiaMatchSession(ctx, {
          official: true,
          roomName: customName,
          allowTts503: true,
          tag: "t1f7_name",
        });
      } catch {
        // Fallback if DB offline in local environment: verify state.name via sandbox
        session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f7_name_sb" });
      }
      try {
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllTtsCalls(s).length >= 2, 8000);
        const texts = getAllSpokenTexts(snap).join(" | ");
        const stName = session.hostSock.getState()?.name;
        if (stName && !stName.startsWith("[Sandbox]") && !texts.includes(customName)) {
          throw new Error(`Expected opening_duo TTS to include room.name "${customName}", got: ${texts}`);
        }
        return { roomName: stName, texts };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F8-1", CATALOG[27].name, "F8", async () => {
      const contestants = [
        { name: "An", school: "THPT Chu Văn An" },
        { name: "Bình", school: "" },
        { name: "Châu", school: "THPT Lê Hồng Phong" },
      ];
      const session = await setupOlympiaMatchSession(ctx, { seats: 3, contestants, allowTts503: true, tag: "t1f8_step" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "entrance:start" });
        for (let i = 0; i < 3; i++) {
          await sleep(300);
          await session.hostSock.action({ type: "entrance:next" });
        }
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length >= 3, 10000);
        const joined = getAllSpokenTexts(snap).join(" || ");
        if (!joined.includes("An") || !joined.includes("Bình") || !joined.includes("Châu")) {
          throw new Error(`Expected all 3 contestant names in intro TTS: ${joined}`);
        }
        if (/Bình.*đến từ/i.test(joined)) {
          throw new Error(`Expected empty school for Bình to omit 'đến từ': ${joined}`);
        }
        if (!/\bvà\b/i.test(joined)) {
          throw new Error(`Expected 'và' connector before last contestant: ${joined}`);
        }
        return { texts: getAllSpokenTexts(snap) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F8-2", CATALOG[28].name, "F8", async () => {
      const session = await setupOlympiaMatchSession(ctx, { seats: 4, allowTts503: true, tag: "t1f8_skip" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "intro_contestants" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => getAllSpokenTexts(s).some((t) => /sẵn sàng/i.test(t)),
          12000
        );
        const texts = getAllSpokenTexts(snap);
        const readyIdx = texts.findIndex((t) => /sẵn sàng/i.test(t));
        if (readyIdx < 2) {
          throw new Error(`Expected breather line(s) before 'Các bạn đã sẵn sàng chưa?': ${JSON.stringify(texts)}`);
        }
        return { totalLines: texts.length, readyIdx };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F8-3", CATALOG[29].name, "F8", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f8_sum" });
      try {
        await session.hostSock.action({ type: "round:force", round: "khoiDong" });
        await session.hostSock.action({ type: "banner:skip" });
        for (let i = 0; i < 4; i++) {
          await session.hostSock.action({ type: "kd:next" });
          await session.hostSock.action({ type: "kd:finishTurn" });
        }
        await session.hostSock.action({ type: "kd:next" });
        await session.hostSock.action({ type: "kd:finishTurn" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "round_summary" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 7000);
        return { texts: getAllSpokenTexts(snap) };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── F10 & F11: 6-mode alternation & scripts ──
  cases.push(
    await runCase("T1-F10-1", CATALOG[30].name, "F10", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f10_kd" });
      try {
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "kd:next" });
        await sleep(300);
        await session.hostSock.action({ type: "kd:correct" });
        await sleep(250);
        await session.hostSock.action({ type: "kd:next" });
        await sleep(300);
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllTtsCalls(s).length >= 3, 7000);
        const calls = getAllTtsCalls(snap);
        const qCalls = calls.filter((c) => /Số nguyên tố|capital/i.test(c.text));
        if (qCalls.length >= 2 && qCalls[0].role && qCalls[1].role && qCalls[0].role !== qCalls[1].role) {
          throw new Error(`Expected same MC reading questions within 1 KD solo turn, got ${qCalls[0].role} vs ${qCalls[1].role}`);
        }
        return { roles: qCalls.map((c) => c.role) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F10-2", CATALOG[31].name, "F10", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f10_vcnv" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "vcnv:selectRow", row: 0 });
        await session.hostSock.action({ type: "vcnv:openQuestion" });
        await session.hostSock.action({ type: "vcnv:reveal" });
        await session.hostSock.action({ type: "vcnv:revealCorrect" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllTtsCalls(s).length >= 2, 8000);
        return { calls: getAllTtsCalls(snap).map((c) => ({ role: c.role, text: c.text })) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F10-3", CATALOG[32].name, "F10", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f10_tt" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await sleep(300);
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllTtsCalls(s).length >= 2, 8000);
        return { ttCalls: getAllTtsCalls(snap).map((c) => ({ role: c.role, text: c.text })) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F11-1", CATALOG[33].name, "F11", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f11_short" });
      try {
        await session.hostSock.action({ type: "round:force", round: "veDich" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "vd:confirmPackage", points: [20, 20, 20] });
        await session.hostSock.action({ type: "vd:startQuestion" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "vd:wrong" });
        await session.hostSock.action({ type: "vd:closeSteal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 7000);
        const text = getAllSpokenTexts(snap).join(" ");
        if (text.includes("(Ag)") || text.includes("Silver")) {
          throw new Error(`Expected shortened primary answer without '(Ag)' or '; Silver', got: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F11-2", CATALOG[34].name, "F11", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f11_exp" });
      try {
        await session.hostSock.action({ type: "round:force", round: "veDich" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "vd:confirmPackage", points: [20, 20, 20] });
        await session.hostSock.action({ type: "vd:startQuestion" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "explain_answer" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 7000);
        const text = getAllSpokenTexts(snap).join(" ");
        if (!/độ dẫn điện|Bạc/i.test(text)) {
          throw new Error(`Expected explanation readout mentioning provided explanation, got: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F11-3", CATALOG[35].name, "F11", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f11_hype" });
      try {
        await clearTtsProbe(session.displayPage);
        for (let i = 0; i < 3; i++) {
          await session.hostSock.action({ type: "tts:command", command: "hype_filler" });
          await sleep(250);
        }
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length >= 2, 7000);
        return { fillers: getAllSpokenTexts(snap) };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── F12-F15: Manual deck, Ve Dich manual steal, VCNV deferral, grouping, CHP guard ──
  cases.push(
    await runCase("T1-F12-1", CATALOG[36].name, "F12", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f12_deck" });
      try {
        const commands = ["lobby_greeting", "opening_duo", "round_intro", "hype_filler", "round_summary"];
        for (const cmd of commands) {
          await clearTtsProbe(session.displayPage);
          await session.hostSock.action({ type: "tts:command", command: cmd });
          await waitForTtsCall(session.displayPage, (s) => getAllTtsCalls(s).length > 0, 6000);
        }
        return { testedCommands: commands };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F12-2", CATALOG[37].name, "F12", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f12_steal" });
      try {
        await session.hostSock.action({ type: "round:force", round: "veDich" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "vd:confirmPackage", points: [20, 20, 20] });
        await session.hostSock.action({ type: "vd:startQuestion" });
        await session.hostSock.action({ type: "vd:timer" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "vd:wrong" });
        await sleep(1200);
        const snapBefore = await readTtsProbe(session.displayPage);
        const autoStealSpeech = getAllSpokenTexts(snapBefore).some((t) => /mời các bạn còn lại|giành quyền/i.test(t));
        if (autoStealSpeech) {
          throw new Error(`Về Đích must NOT auto-speak steal invitation before Host triggers it: ${JSON.stringify(getAllSpokenTexts(snapBefore))}`);
        }
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "vd_steal_invite" });
        const snapAfter = await waitForTtsCall(
          session.displayPage,
          (s) => getAllSpokenTexts(s).some((t) => /mời các bạn|cơ hội|giành quyền/i.test(t)),
          7000
        );
        return { manualStealText: getAllSpokenTexts(snapAfter) };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F13-1", CATALOG[38].name, "F13", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, ttsEnabled: true, tag: "t1f13_def" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.playerSocks[0].buzz();
        await session.hostSock.waitForState((s) => (s?.vcnv?.bells?.length ?? 0) >= 1, 4000);
        const scoreBefore = session.hostSock.getState().seats[0].score;
        await session.hostSock.action({ type: "vcnv:correctCNV", seat: 0 });
        await sleep(80);
        const duringState = session.hostSock.getState();
        if (duringState.pendingCnvWin && duringState.seats[0].score !== scoreBefore) {
          throw new Error(`Expected score to be deferred while pendingCnvWin is active`);
        }
        const committed = await session.hostSock.waitForState(
          (s) => !s?.pendingCnvWin && s?.seats?.[0]?.score > scoreBefore && s?.vcnv?.phase === "done",
          15000
        );
        return { scoreBefore, scoreAfter: committed.seats[0].score, phase: committed.vcnv.phase };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F13-2", CATALOG[39].name, "F13", async () => {
      const session = await setupOlympiaMatchSession(ctx, { ttsEnabled: false, openDisplay: false, tag: "t1f13_off" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.playerSocks[1].buzz();
        await session.hostSock.action({ type: "vcnv:wrongCNV", seat: 1 });
        const afterWrong = session.hostSock.getState();
        if (!afterWrong.vcnv.eliminatedSeats.includes(1)) {
          throw new Error("Expected seat 1 eliminated on wrong CNV");
        }
        await session.playerSocks[0].buzz();
        const scoreBefore = session.hostSock.getState().seats[0].score;
        await session.hostSock.action({ type: "vcnv:correctCNV", seat: 0 });
        const immediate = session.hostSock.getState();
        if (!(immediate.seats[0].score > scoreBefore) || immediate.vcnv.phase !== "done") {
          throw new Error("Expected immediate CNV score commit when TTS is OFF");
        }
        return { immediateScore: immediate.seats[0].score };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F14-1", CATALOG[40].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f14_grp" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await session.playerSocks[0].answer("32");
        await session.playerSocks[1].answer("32");
        await session.playerSocks[2].answer("asdfghjkl");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        const text = getAllSpokenTexts(snap).join(" ");
        if (!/sai chính tả/i.test(text)) {
          throw new Error(`Expected 'sai chính tả' label for gibberish answer, got: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F15-1", CATALOG[41].name, "F15", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f15_chp" });
      try {
        await session.hostSock.action({ type: "round:force", round: "cauHoiPhu" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "chp:setTied", seats: [0, 1] });
        await session.hostSock.action({ type: "chp:next" });
        await session.hostSock.action({ type: "chp:show" });
        await session.hostSock.action({ type: "chp:timer" });
        await session.playerSocks[0].buzz();
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "chp:wrong" });
        await sleep(800);
        const snap = await readTtsProbe(session.displayPage);
        const texts = getAllSpokenTexts(snap).join(" ");
        if (/chính xác/i.test(texts)) {
          throw new Error(`Expected NO false 'Chính xác!' when cauHoiPhu winner == null, got: ${texts}`);
        }
        return { texts };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── F9, F16, F17, F18, F19: Post-match summary, 3ch audio, awards, LIGHT mode, Electron/AGENTS ──
  cases.push(
    await runCase("T1-F9-1", CATALOG[42].name, "F9", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f9_post" });
      try {
        await session.hostSock.action({ type: "round:force", round: "veDich" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        const sumStart = await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 5000);
        if (sumStart.summaryState.isAuto !== false) {
          throw new Error(`Expected post-match summary isAuto=false, got ${sumStart.summaryState.isAuto}`);
        }
        if (sumStart.summaryState.currentIndex !== -1) {
          throw new Error(`Expected post-match summary to start at MC Cam (currentIndex=-1), got ${sumStart.summaryState.currentIndex}`);
        }
        if (JSON.stringify(sumStart.summaryState.orderedSeats) !== JSON.stringify([0, 1, 2, 3])) {
          throw new Error(`Expected ascending seat order [0,1,2,3], got ${JSON.stringify(sumStart.summaryState.orderedSeats)}`);
        }
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "summary:focusSeat", seatId: 0 });
        const s0 = await session.hostSock.waitForState((s) => s?.summaryState?.currentIndex === 0, 4000);
        await sleep(600);
        const snap = await readTtsProbe(session.displayPage);
        const texts = getAllSpokenTexts(snap).join(" ");
        if (/giải tư/i.test(texts)) {
          throw new Error(`Olympia post-match summary must NEVER say 'Giải Tư': ${texts}`);
        }
        return { orderedSeats: s0.summaryState.orderedSeats, currentIndex: s0.summaryState.currentIndex };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F16-1", CATALOG[43].name, "F16", async () => {
      const tracks = ["summary_rank_1", "summary_rank_2", "summary_rank_3", "summary_rank_4", "prize_award"];
      const suffixes = ["", "_left", "_right"];
      const checked = [];
      for (const season of ALL_AUDIO_SEASONS) {
        for (const t of tracks) {
          for (const suf of suffixes) {
            const url = `${baseUrl}/olympia-audio/${season}/6_NhacKhac/${t}${suf}.mp3`;
            const res = await fetch(url);
            if (res.status !== 200) {
              throw new Error(`Missing 3-channel audio asset HTTP ${res.status}: ${url}`);
            }
            const buf = await res.arrayBuffer();
            if (buf.byteLength < 1000) {
              throw new Error(`Audio asset too small (${buf.byteLength}B): ${url}`);
            }
            checked.push(`${season}/${t}${suf}.mp3`);
          }
        }
      }
      return { totalVerifiedAssets: checked.length };
    })
  );

  cases.push(
    await runCase("T1-F17-1", CATALOG[44].name, "F17", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t1f17_aw" });
      try {
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "awards:start" });
        const stStart = await session.hostSock.waitForState((s) => Boolean(s?.awardsState?.active), 5000);
        for (const tier of ["third", "second", "first"]) {
          await session.hostSock.action({ type: "awards:callTier", tier });
          await session.hostSock.waitForState((s) => s?.awardsState?.activeTier === tier, 4000);
        }
        const crowned = await session.hostSock.waitForState((s) => Boolean(s?.awardsState?.laurelCrowned), 4000);
        await session.hostSock.action({ type: "awards:setCamera", cameraMode: "podium_wide" });
        await session.hostSock.action({ type: "awards:stop" });
        await session.hostSock.waitForState((s) => !s?.awardsState?.active, 4000);
        return {
          revealedTiers: crowned.awardsState.revealedTiers,
          laurelCrowned: crowned.awardsState.laurelCrowned,
          started: stStart.awardsState.active,
        };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F18-1", CATALOG[45].name, "F18", async () => {
      const session = await setupOlympiaMatchSession(ctx, {
        displayQuery: "perf=light",
        allowTts503: true,
        tag: "t1f18_light",
      });
      try {
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.speakerTransitions.some((t) => t.speaker === "khanh_vy" || t.speaker === "ngoc_huy"),
          8000
        );
        const hasCanvas = await session.displayPage.evaluate(() => document.querySelectorAll("canvas").length > 0);
        assertNoRuntimeErrors(session.displayCollector, "T1-F18-1 LIGHT");
        return { hasCanvas, speakerTransitions: snap.speakerTransitions.length };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T1-F19-1", CATALOG[46].name, "F19", async () => {
      const healthRes = await fetch(`${baseUrl}/api/health`);
      if (healthRes.status !== 200) {
        throw new Error(`Expected /api/health HTTP 200, got ${healthRes.status}`);
      }
      const health = await healthRes.json();
      const pkg = JSON.parse(fs.readFileSync(path.join(WORKSPACE_DIR, "package.json"), "utf8"));
      const hasElectronMain = fs.existsSync(path.join(WORKSPACE_DIR, "electron/main.js"));
      const hasServerJs = fs.existsSync(path.join(WORKSPACE_DIR, "server.js"));
      if (!hasElectronMain || !pkg?.scripts?.build) {
        throw new Error(`Missing Electron or build script contract`);
      }
      return { healthStatus: health.status, hasElectronMain, hasServerJs };
    })
  );

  cases.push(
    await runCase("T1-F19-2", CATALOG[47].name, "F19", async () => {
      const diff = execSync('git diff -- "AGENTS.md"', { cwd: WORKSPACE_DIR, encoding: "utf8" }).trim();
      if (diff.length > 0) {
        throw new Error(`AGENTS.md was modified (expected 0 diffs):\n${diff}`);
      }
      return { agentsMdDiffBytes: 0 };
    })
  );

  return summarizeCases(1, "Feature Coverage (F1–F19 / R1–R9)", cases);
}
