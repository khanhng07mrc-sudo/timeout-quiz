import {
  buildCustomQuestionSet,
  runCase,
  setupOlympiaMatchSession,
  sleep,
  summarizeCases,
} from "./lib/harness.mjs";
import { clearTtsProbe, readTtsProbe, waitForTtsCall } from "./lib/tts-probes.mjs";

const CATALOG = [
  // B1: API & Name boundaries
  { id: "T2-B1-1", name: "Blank/whitespace room.name uses clean opening fallback", featureArea: "F7", requirements: ["R2"] },
  { id: "T2-B1-2", name: "POST /api/olympia/tts rejects empty & whitespace text with 400", featureArea: "F1", requirements: ["R1"] },
  { id: "T2-B1-3", name: "POST /api/olympia/tts handles oversized text (>2000 chars) without 500", featureArea: "F1", requirements: ["R1"] },
  { id: "T2-B1-4", name: "POST /api/olympia/tts clamps extreme low rate (0.1) safely", featureArea: "F4", requirements: ["R1"] },
  { id: "T2-B1-5", name: "POST /api/olympia/tts clamps extreme high rate (5.0) safely", featureArea: "F4", requirements: ["R1"] },
  // B2: 2 vs 8 contestants
  { id: "T2-B2-1", name: "Minimum 2 contestants intro uses 'và' and omits empty school", featureArea: "F8", requirements: ["R2"] },
  { id: "T2-B2-2", name: "Maximum 8 contestants intro covers all 8 seats with 'và' before 8th", featureArea: "F8", requirements: ["R2"] },
  { id: "T2-B2-3", name: "8-contestant post-match summary steps down summary_rank_4 pitch for ranks 5-8", featureArea: "F9", requirements: ["R6", "R7"] },
  { id: "T2-B2-4", name: "8-contestant post-match summary NEVER says 'Giải Tư'", featureArea: "F9", requirements: ["R6"] },
  { id: "T2-B2-5", name: "8-contestant awardsState groups ranks 3..8 into Giải Ba without Giải Tư", featureArea: "F17", requirements: ["R8"] },
  // B3: Grouping & Spelling errors
  { id: "T2-B3-1", name: "Keyboard mash / gibberish answer in TT labeled 'sai chính tả'", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B3-2", name: "Missing-diacritic answer in VCNV handled cleanly without crash", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B3-3", name: "1-2 char typo / unreadable answer in VCNV labeled 'sai chính tả'", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B3-4", name: "Multiple contestants with identical answer grouped into single readout", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B3-5", name: "All contestants noAnswer handled cleanly without 'undefined'", featureArea: "F14", requirements: ["R4"] },
  // B4: TT timing & CHP winner boundaries
  { id: "T2-B4-1", name: "Tăng Tốc ultra-fast answer (<2.0s) announces response time", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B4-2", name: "Tăng Tốc >=2 tied / shared fastest answers announces tied times", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B4-3", name: "Tăng Tốc normal (>2.5s) single answer stays concise", featureArea: "F14", requirements: ["R4"] },
  { id: "T2-B4-4", name: "cauHoiPhu winner==null after wrong buzz NEVER says 'Chính xác!'", featureArea: "F15", requirements: ["R3", "R4"] },
  { id: "T2-B4-5", name: "cauHoiPhu winner===0 (falsy seat index) properly congratulates TS1", featureArea: "F15", requirements: ["R3", "R4"] },
  // B5: VCNV elimination & Post-match manual order
  { id: "T2-B5-1", name: "VCNV wrong CNV announces elimination and preserves active row play", featureArea: "F13", requirements: ["R4"] },
  { id: "T2-B5-2", name: "VCNV all seats eliminated transitions safely without deadlock", featureArea: "F13", requirements: ["R4"] },
  { id: "T2-B5-3", name: "Post-match summary isAuto=false does NOT auto-advance over wait window", featureArea: "F9", requirements: ["R6"] },
  { id: "T2-B5-4", name: "Post-match summary enforces TS1->TS2->...->TSX order regardless of score rank", featureArea: "F9", requirements: ["R6"] },
  { id: "T2-B5-5", name: "Host tts:setRate extreme values (0.2, 3.0) clamp cleanly", featureArea: "F4", requirements: ["R1"] },
];

export function getCatalog() {
  return CATALOG.slice();
}

function getAllSpokenTexts(snap) {
  const f = (snap?.fetchCalls || []).map((c) => c.text).filter(Boolean);
  const s = (snap?.speechCalls || []).filter((c) => c.type === "speak").map((c) => c.text).filter(Boolean);
  return [...f, ...s];
}

export async function runTier(ctx) {
  const { baseUrl } = ctx;
  const cases = [];

  // ── B1: API & Name boundaries ──
  cases.push(
    await runCase("T2-B1-1", CATALOG[0].name, "F7", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b1_blank" });
      try {
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo", roomName: "   " });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length >= 2, 8000);
        const joined = getAllSpokenTexts(snap).join(" ");
        if (/  +/.test(joined.replace(/\s+/g, " "))) {
          throw new Error(`Unexpected blank gap in fallback opening: ${joined}`);
        }
        return { text: joined };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B1-2", CATALOG[1].name, "F1", async () => {
      for (const payload of [{ text: "" }, { text: "   \n\t " }, { role: "khanh_vy" }]) {
        const res = await fetch(`${baseUrl}/api/olympia/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status !== 400) {
          throw new Error(`Expected 400 for ${JSON.stringify(payload)}, got ${res.status}`);
        }
      }
      return { rejectedAllEmpty: true };
    })
  );

  cases.push(
    await runCase("T2-B1-3", CATALOG[2].name, "F1", async () => {
      const bigText = "Xin chào Đường lên đỉnh Olympia. ".repeat(120);
      const res = await fetch(`${baseUrl}/api/olympia/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bigText, role: "khanh_vy" }),
      });
      if (res.status >= 500 && res.status !== 503) {
        throw new Error(`Server crashed (${res.status}) on oversized TTS text`);
      }
      return { status: res.status, inputLength: bigText.length };
    })
  );

  cases.push(
    await runCase("T2-B1-4", CATALOG[3].name, "F4", async () => {
      const res = await fetch(`${baseUrl}/api/olympia/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Kiểm tra tốc độ thấp.", role: "ngoc_huy", rate: 0.1 }),
      });
      if (res.status >= 500 && res.status !== 503) {
        throw new Error(`Expected clamped rate=0.1 without 500 error, got ${res.status}`);
      }
      return { status: res.status };
    })
  );

  cases.push(
    await runCase("T2-B1-5", CATALOG[4].name, "F4", async () => {
      const res = await fetch(`${baseUrl}/api/olympia/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Kiểm tra tốc độ cao.", role: "khanh_vy", rate: 5.0 }),
      });
      if (res.status >= 500 && res.status !== 503) {
        throw new Error(`Expected clamped rate=5.0 without 500 error, got ${res.status}`);
      }
      return { status: res.status };
    })
  );

  // ── B2: 2 vs 8 contestants ──
  cases.push(
    await runCase("T2-B2-1", CATALOG[5].name, "F8", async () => {
      const session = await setupOlympiaMatchSession(ctx, {
        seats: 2,
        contestants: [
          { name: "Minh", school: "THPT Amsterdam" },
          { name: "Lan", school: "" },
        ],
        allowTts503: true,
        tag: "t2b2_2s",
      });
      try {
        await session.hostSock.action({ type: "game:start" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "intro_contestants" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length >= 2, 9000);
        const joined = getAllSpokenTexts(snap).join(" || ");
        if (!joined.includes("Minh") || !joined.includes("Lan")) {
          throw new Error(`Missing 2-seat contestant names: ${joined}`);
        }
        if (/Lan.*đến từ/i.test(joined)) {
          throw new Error(`Empty school should omit 'đến từ': ${joined}`);
        }
        if (!/\bvà\b/i.test(joined)) {
          throw new Error(`Missing 'và' before last contestant: ${joined}`);
        }
        return { text: joined };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-2", CATALOG[6].name, "F8", async () => {
      const contestants = Array.from({ length: 8 }, (_, i) => ({
        name: `Bạn Số ${i + 1}`,
        school: i % 2 === 0 ? `THPT ${i + 1}` : "",
      }));
      const session = await setupOlympiaMatchSession(ctx, {
        seats: 8,
        contestants,
        allowTts503: true,
        tag: "t2b2_8s",
      });
      try {
        await session.hostSock.action({ type: "game:start" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "intro_contestants" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length >= 8, 15000);
        const joined = getAllSpokenTexts(snap).join(" || ");
        for (let i = 1; i <= 8; i++) {
          if (!joined.includes(`Bạn Số ${i}`)) {
            throw new Error(`Missing contestant #${i} in 8-seat intro: ${joined}`);
          }
        }
        if (!/\bvà\b.*Bạn Số 8/i.test(joined)) {
          throw new Error(`Expected 'và' before 8th contestant: ${joined}`);
        }
        return { count: 8 };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-3", CATALOG[7].name, "F9", async () => {
      const session = await setupOlympiaMatchSession(ctx, { seats: 8, allowTts503: true, tag: "t2b2_pitch" });
      try {
        for (let i = 0; i < 8; i++) {
          await session.hostSock.action({ type: "seat:setScore", seatId: i, score: (8 - i) * 30 }).catch(() => null);
        }
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 5000);
        await clearTtsProbe(session.displayPage);
        // Focus seat 7 (rank 8) -> expects summary_rank_4 with playbackRate < 1
        await session.hostSock.action({ type: "summary:focusSeat", seatId: 7 });
        await sleep(700);
        const snap = await readTtsProbe(session.displayPage);
        const rankAudio = snap.audioPlays.find((a) => a.src.includes("summary_rank_4") && a.action === "play");
        const bufSrc = snap.audioBufferSources.find((b) => b.startedAt != null && b.playbackRate < 0.99);
        if (!rankAudio && !bufSrc) {
          throw new Error(`Expected summary_rank_4 pitch step-down (<1.0 playbackRate) for rank 8, got plays=${JSON.stringify(snap.audioPlays)} buffers=${JSON.stringify(snap.audioBufferSources)}`);
        }
        if (rankAudio && !(rankAudio.playbackRate < 1 && rankAudio.preservesPitch === false)) {
          throw new Error(`Expected HTMLAudio playbackRate < 1 & preservesPitch=false, got ${JSON.stringify(rankAudio)}`);
        }
        return { rankAudio, bufSrc };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-4", CATALOG[8].name, "F9", async () => {
      const session = await setupOlympiaMatchSession(ctx, { seats: 8, allowTts503: true, tag: "t2b2_nog4" });
      try {
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 5000);
        await clearTtsProbe(session.displayPage);
        for (const sid of [3, 6, 7]) {
          await session.hostSock.action({ type: "summary:focusSeat", seatId: sid });
          await sleep(400);
        }
        const snap = await readTtsProbe(session.displayPage);
        const texts = getAllSpokenTexts(snap).join(" ");
        if (/giải tư/i.test(texts)) {
          throw new Error(`Forbidden 'Giải Tư' found in 8-seat post-match summary: ${texts}`);
        }
        return { checkedSeats: [3, 6, 7], noGiaiTu: true };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-5", CATALOG[9].name, "F17", async () => {
      const session = await setupOlympiaMatchSession(ctx, { seats: 8, allowTts503: true, tag: "t2b2_aw8" });
      try {
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "awards:start" });
        const st = await session.hostSock.waitForState((s) => Boolean(s?.awardsState?.active), 5000);
        const tiers = st.awardsState.tiers;
        const totalPlaced = (tiers.first?.length || 0) + (tiers.second?.length || 0) + (tiers.third?.length || 0);
        if (totalPlaced < 3) {
          throw new Error(`Expected awardsState.tiers to place contestants in 8-seat match: ${JSON.stringify(tiers)}`);
        }
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "awards:callTier", tier: "third" });
        await sleep(500);
        const texts = getAllSpokenTexts(await readTtsProbe(session.displayPage)).join(" ");
        if (/giải tư/i.test(texts)) {
          throw new Error(`Forbidden 'Giải Tư' in 8-seat awards TTS: ${texts}`);
        }
        return { tiers };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── B3: Gibberish / typos / grouping / blank ──
  cases.push(
    await runCase("T2-B3-1", CATALOG[10].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b3_mash" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await session.playerSocks[0].answer("qwertzxcv");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        const text = getAllSpokenTexts(snap).join(" ");
        if (!/sai chính tả/i.test(text)) {
          throw new Error(`Expected 'sai chính tả' for keyboard mash, got: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-2", CATALOG[11].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b3_nodia" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "vcnv:selectRow", row: 0 });
        await session.hostSock.action({ type: "vcnv:openQuestion" });
        await session.hostSock.action({ type: "vcnv:timer" });
        await session.playerSocks[0].answer("THAI BINH DUONG");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "vcnv:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        return { text: getAllSpokenTexts(snap).join(" ") };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-3", CATALOG[12].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b3_typo" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "vcnv:selectRow", row: 1 });
        await session.hostSock.action({ type: "vcnv:openQuestion" });
        await session.hostSock.action({ type: "vcnv:timer" });
        await session.playerSocks[0].answer("xqzpt");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "vcnv:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        const text = getAllSpokenTexts(snap).join(" ");
        if (!/sai chính tả/i.test(text)) {
          throw new Error(`Expected 'sai chính tả' for unreadable VCNV answer, got: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-4", CATALOG[13].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b3_grp" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await session.playerSocks[0].answer("32");
        await session.playerSocks[1].answer("32");
        await session.playerSocks[2].answer("32");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        const text = getAllSpokenTexts(snap).join(" ");
        const occurrencesOf32 = (text.match(/\b32\b/g) || []).length;
        if (occurrencesOf32 > 1) {
          throw new Error(`Expected identical answer '32' grouped into 1 mention, saw ${occurrencesOf32}x in: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-5", CATALOG[14].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b3_empty" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        await sleep(700);
        const snap = await readTtsProbe(session.displayPage);
        const text = getAllSpokenTexts(snap).join(" ");
        if (/undefined|null/i.test(text)) {
          throw new Error(`Spoken text contains undefined/null when all blank: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── B4: TT timing & CHP winner boundaries ──
  cases.push(
    await runCase("T2-B4-1", CATALOG[15].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b4_fast" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await sleep(150);
        await session.playerSocks[0].answer("32");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        const text = getAllSpokenTexts(snap).join(" ");
        if (!/giây/i.test(text)) {
          throw new Error(`Expected response time callout ('giây') for <2.0s TT answer, got: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-2", CATALOG[16].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b4_tie" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await sleep(300);
        await Promise.all([session.playerSocks[0].answer("32"), session.playerSocks[1].answer("32")]);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        return { text: getAllSpokenTexts(snap).join(" ") };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-3", CATALOG[17].name, "F14", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b4_slow" });
      try {
        await session.hostSock.action({ type: "round:force", round: "tangToc" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "tt:next" });
        await session.hostSock.action({ type: "tt:show" });
        await session.hostSock.action({ type: "tt:timer" });
        await sleep(2600);
        await session.playerSocks[0].answer("32");
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tt:reveal" });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 8000);
        return { text: getAllSpokenTexts(snap).join(" ") };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-4", CATALOG[18].name, "F15", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b4_chpnull" });
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
        await sleep(700);
        const text = getAllSpokenTexts(await readTtsProbe(session.displayPage)).join(" ");
        if (/chính xác/i.test(text)) {
          throw new Error(`False 'Chính xác!' emitted when cauHoiPhu.winner == null: ${text}`);
        }
        return { text };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-5", CATALOG[19].name, "F15", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b4_chp0" });
      try {
        await session.hostSock.action({ type: "round:force", round: "cauHoiPhu" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "chp:setTied", seats: [0, 1] });
        await session.hostSock.action({ type: "chp:next" });
        await session.hostSock.action({ type: "chp:show" });
        await session.hostSock.action({ type: "chp:timer" });
        await session.playerSocks[0].buzz();
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "chp:correct" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => getAllSpokenTexts(s).some((t) => /Chính xác|Thí sinh 1/i.test(t)),
          7000
        );
        return { text: getAllSpokenTexts(snap).join(" ") };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── B5: VCNV elimination & Post-match manual order ──
  cases.push(
    await runCase("T2-B5-1", CATALOG[20].name, "F13", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t2b5_elim" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.playerSocks[2].buzz();
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "vcnv:wrongCNV", seat: 2 });
        const snap = await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 7000);
        // Verify row play still works after elimination
        await session.hostSock.action({ type: "vcnv:selectRow", row: 0 });
        await session.hostSock.action({ type: "vcnv:openQuestion" });
        const st = session.hostSock.getState();
        if (st.vcnv.phase !== "question" || !st.vcnv.eliminatedSeats.includes(2)) {
          throw new Error(`Expected VCNV row play to continue with seat 2 eliminated`);
        }
        return { elimText: getAllSpokenTexts(snap).join(" ") };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-2", CATALOG[21].name, "F13", async () => {
      const session = await setupOlympiaMatchSession(ctx, { seats: 2, openDisplay: false, tag: "t2b5_all" });
      try {
        await session.hostSock.action({ type: "round:force", round: "vcnv" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.playerSocks[0].buzz();
        await session.hostSock.action({ type: "vcnv:wrongCNV", seat: 0 });
        await session.playerSocks[1].buzz();
        await session.hostSock.action({ type: "vcnv:wrongCNV", seat: 1 });
        await session.hostSock.action({ type: "vcnv:end" });
        const st = session.hostSock.getState();
        if (st.vcnv.eliminatedSeats.length !== 2) {
          throw new Error(`Expected both seats eliminated: ${JSON.stringify(st.vcnv.eliminatedSeats)}`);
        }
        return { phase: st.vcnv.phase, eliminated: st.vcnv.eliminatedSeats };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-3", CATALOG[22].name, "F9", async () => {
      const session = await setupOlympiaMatchSession(ctx, { openDisplay: false, tag: "t2b5_noauto" });
      try {
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 4000);
        await sleep(5500);
        const st = session.hostSock.getState();
        if (st.summaryState.currentIndex !== -1 || st.summaryState.isAuto !== false) {
          throw new Error(`Post-match summary unexpectedly auto-advanced: ${JSON.stringify(st.summaryState)}`);
        }
        return { currentIndexAfterWait: st.summaryState.currentIndex, isAuto: st.summaryState.isAuto };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-4", CATALOG[23].name, "F9", async () => {
      const session = await setupOlympiaMatchSession(ctx, { seats: 4, openDisplay: false, tag: "t2b5_order" });
      try {
        // Give TS4 highest score and TS1 lowest score
        await session.hostSock.action({ type: "seat:setScore", seatId: 0, score: 10 }).catch(() => null);
        await session.hostSock.action({ type: "seat:setScore", seatId: 3, score: 300 }).catch(() => null);
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        const st = await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 4000);
        if (JSON.stringify(st.summaryState.orderedSeats) !== JSON.stringify([0, 1, 2, 3])) {
          throw new Error(`Expected ascending seat order [0,1,2,3], got ${JSON.stringify(st.summaryState.orderedSeats)}`);
        }
        return { orderedSeats: st.summaryState.orderedSeats };
      } finally {
        await session.cleanup();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-5", CATALOG[24].name, "F4", async () => {
      const session = await setupOlympiaMatchSession(ctx, { openDisplay: false, tag: "t2b5_clamp" });
      try {
        await session.hostSock.action({ type: "tts:setRate", baseRate: 0.2 });
        const low = session.hostSock.getState()?.ttsSettings?.baseRate;
        await session.hostSock.action({ type: "tts:setRate", baseRate: 3.0 });
        const high = session.hostSock.getState()?.ttsSettings?.baseRate;
        if (low != null && low < 0.5) {
          throw new Error(`Expected baseRate lower bound >= 0.5, got ${low}`);
        }
        if (high != null && high > 2.0) {
          throw new Error(`Expected baseRate upper bound <= 2.0, got ${high}`);
        }
        return { low, high };
      } finally {
        await session.cleanup();
      }
    })
  );

  return summarizeCases(2, "Boundary & Corner Cases", cases);
}
