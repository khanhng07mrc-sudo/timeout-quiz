import {
  assertNoRuntimeErrors,
  buildCustomQuestionSet,
  clickButtonByText,
  connectOlympiaSocket,
  createErrorCollector,
  createOfficialRoom,
  createSandboxCode,
  createTrackedPage,
  deleteRoom,
  handleStartMatchModals,
  runCase,
  setupOlympiaMatchSession,
  sleep,
  summarizeCases,
  triggerBuzzerPointer,
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
  {
    id: "T4-S1",
    name: "Scenario 1: Full 4-contestant O26 match (Official room.name -> KD -> VCNV -> TT -> VD -> Post-match TS1..TS4 -> Awards & Closing)",
    featureArea: "F1..F19",
    requirements: ["R1", "R2", "R3", "R4", "R6", "R7", "R8", "R9"],
  },
  {
    id: "T4-S2",
    name: "Scenario 2: 8-contestant match with missing schools, rank 5-8 pitch step-down, never Giải Tư, 8-seat Victory Podium",
    featureArea: "F8,F9,F16,F17",
    requirements: ["R2", "R6", "R7", "R8"],
  },
  {
    id: "T4-S3",
    name: "Scenario 3: O22 fast-tempo match -> Top-Tie -> Cau Hoi Phu (winner==null miss then win) -> Summary -> Awards",
    featureArea: "F4,F10,F15,F17",
    requirements: ["R1", "R3", "R4", "R6", "R8"],
  },
  {
    id: "T4-S4",
    name: "Scenario 4: Offline /api/olympia/tts (503) Web Speech fallback + manual Host deck + lip-sync in live browser gameplay",
    featureArea: "F2,F3,F12,F18",
    requirements: ["R1", "R4", "R9"],
  },
  {
    id: "T4-S5",
    name: "Scenario 5: Sandbox LIGHT quality 3D mode (?perf=light) unfrozen animations, lip-sync, audio 200, 0 console/page errors",
    featureArea: "F16,F18,F19",
    requirements: ["R7", "R9", "AC"],
  },
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
  const { browser, baseUrl, allowOfflineEdgeTts = false } = ctx;
  const cases = [];

  // ── Scenario 1: Full 4-contestant O26 match on real Host + Display + Player pages ──
  cases.push(
    await runCase("T4-S1", CATALOG[0].name, "F1..F19", async () => {
      const roomTitle = "Chung kết Olympia E2E Toàn Trận";
      const qSet = buildCustomQuestionSet();
      let code;
      let hostKey = "sandbox";
      let auth = null;
      let officialCreated = false;
      try {
        const created = await createOfficialRoom(baseUrl, {
          name: roomTitle,
          rulesetId: "O26",
          seatCount: 4,
          questionSet: qSet,
        });
        code = created.code;
        hostKey = created.hostKey;
        auth = created.auth;
        officialCreated = true;
      } catch {
        code = createSandboxCode(4, "t4s1");
      }

      const hostCol = createErrorCollector({ allowOfflineDbErrors: !officialCreated, allowTts503: allowOfflineEdgeTts });
      const dispCol = createErrorCollector({ allowOfflineDbErrors: !officialCreated, allowTts503: allowOfflineEdgeTts });
      const p1Col = createErrorCollector({ allowOfflineDbErrors: !officialCreated });

      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_s1", { collector: hostCol });
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "disp_s1", { collector: dispCol });
      const { page: p1Page } = await createTrackedPage(browser, baseUrl, "p1_s1", { collector: p1Col });

      const hostSock = await connectOlympiaSocket(baseUrl, { code, role: "host", key: hostKey });
      if (!officialCreated) {
        await hostSock.emitAck("olympia:change_quiz_bank", { questionSet: qSet });
      }
      const pSocks = [];
      for (let i = 1; i < 4; i++) {
        pSocks.push(
          await connectOlympiaSocket(baseUrl, {
            code,
            role: "player",
            seatId: i,
            name: `Thí sinh ${i + 1}`,
            school: `THPT ${i + 1}`,
            token: `s1_seat_${i}`,
          })
        );
        if (officialCreated) await hostSock.action({ type: "seat:approve", seatId: i }).catch(() => null);
      }

      try {
        await dispPage.goto(`${baseUrl}/olympia/display/${code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await unlockDisplayAudio(dispPage);
        await p1Page.goto(`${baseUrl}/olympia/play/${code}?seat=0&name=${encodeURIComponent("An Nguyễn")}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        if (officialCreated) {
          await hostSock.action({ type: "seat:approve", seatId: 0 }).catch(() => null);
        }
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=${encodeURIComponent(hostKey)}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await sleep(800);

        // Lobby + Opening + 3D Intro
        await hostSock.action({ type: "tts:command", command: "lobby_greeting" });
        await handleStartMatchModals(hostPage);
        await hostSock.action({ type: "entrance:start" });
        for (let i = 0; i < 4; i++) {
          await sleep(180);
          await hostSock.action({ type: "entrance:next" });
        }
        await hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await hostSock.action({ type: "intro:skip" });
        await hostSock.action({ type: "banner:skip" });

        // Round 1: Khoi Dong (solo + shared quick pass)
        for (let seg = 0; seg < 4; seg++) {
          await hostSock.action({ type: "kd:next" });
          if (seg === 0) await hostSock.action({ type: "kd:correct" });
          await hostSock.action({ type: "kd:finishTurn" });
        }
        await hostSock.action({ type: "kd:next" });
        await hostSock.action({ type: "kd:buzzer", open: true }).catch(() => null);
        await triggerBuzzerPointer(p1Page, /BẤM CHUÔNG/i, { timeoutMs: 6000 }).catch(() => null);
        await hostSock.action({ type: "kd:correct" }).catch(() => null);
        await hostSock.action({ type: "kd:finishTurn" });

        // Round 2: VCNV (1 row + CNV solve with TTS ON)
        await hostSock.action({ type: "round:next" });
        await hostSock.action({ type: "banner:skip" });
        await hostSock.action({ type: "vcnv:selectRow", row: 0 });
        await hostSock.action({ type: "vcnv:openQuestion" });
        await pSocks[0].answer("THÁI BÌNH DƯƠNG");
        await hostSock.action({ type: "vcnv:reveal" });
        await hostSock.action({ type: "vcnv:correct", seatIds: [1] });
        await pSocks[0].buzz();
        await hostSock.action({ type: "vcnv:correctCNV", seat: 1 });
        await hostSock.waitForState((s) => !s?.pendingCnvWin && s?.vcnv?.phase === "done", 15000);

        // Round 3: Tang Toc
        await hostSock.action({ type: "round:next" });
        await hostSock.action({ type: "banner:skip" });
        for (let q = 0; q < 4; q++) {
          await hostSock.action({ type: "tt:next" });
          await hostSock.action({ type: "tt:show" });
          await hostSock.action({ type: "tt:timer" });
          if (q === 0) await pSocks[1].answer("32");
          await hostSock.action({ type: "tt:reveal" });
          await hostSock.action({ type: "tt:grade" });
        }

        // Round 4: Ve Dich (first seat 1 question then fast-complete)
        await hostSock.action({ type: "round:next" });
        await hostSock.action({ type: "banner:skip" });
        for (let turn = 0; turn < 4; turn++) {
          await hostSock.action({ type: "vd:onStage" });
          await hostSock.action({ type: "vd:confirmPackage", points: [20, 20, 20] });
          await hostSock.action({ type: "vd:startQuestion" });
          await hostSock.action({ type: turn === 0 ? "vd:correct" : "vd:wrong" });
          await hostSock.action({ type: "vd:finishTurn" });
          await hostSock.action({ type: "vd:nextSeat" });
        }

        // Post-match Manual Summary TS1..TS4 -> Awards + Closing
        await hostSock.action({ type: "game:end" });
        await hostSock.action({ type: "summary:start", isPostMatch: true });
        await hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 5000);
        for (let sid = 0; sid < 4; sid++) {
          await hostSock.action({ type: "summary:focusSeat", seatId: sid });
          await sleep(250);
        }
        await hostSock.action({ type: "summary:stop" });

        await hostSock.action({ type: "awards:start" });
        for (const tier of ["third", "second", "first"]) {
          await hostSock.action({ type: "awards:callTier", tier });
          await sleep(300);
        }
        await hostSock.action({ type: "tts:command", command: "awards_closing" });
        await sleep(500);
        await hostSock.action({ type: "awards:stop" });

        await assertHostPageSilent(hostPage, "T4-S1 Host");
        assertNoRuntimeErrors(hostCol, "T4-S1 Host");
        assertNoRuntimeErrors(dispCol, "T4-S1 Display");
        assertNoRuntimeErrors(p1Col, "T4-S1 Player1");

        const dispSnap = await readTtsProbe(dispPage);
        return {
          officialCreated,
          displayTtsFetches: dispSnap.fetchCalls.length,
          displaySpeeches: dispSnap.speechCalls.length,
          speakerEvents: dispSnap.speakerTransitions.length,
        };
      } finally {
        hostSock.close();
        for (const s of pSocks) s.close();
        await hostPage.close().catch(() => {});
        await dispPage.close().catch(() => {});
        await p1Page.close().catch(() => {});
        if (officialCreated && auth) await deleteRoom(baseUrl, code, auth);
      }
    })
  );

  // ── Scenario 2: 8-contestant match with missing schools, rank 5-8 pitch shift, never Giải Tư ──
  cases.push(
    await runCase("T4-S2", CATALOG[1].name, "F8,F9,F16,F17", async () => {
      const contestants = Array.from({ length: 8 }, (_, i) => ({
        name: `Leo Núi ${i + 1}`,
        school: i % 2 === 0 ? `THPT Số ${i + 1}` : "",
      }));
      const session = await setupOlympiaMatchSession(ctx, {
        seats: 8,
        contestants,
        allowTts503: true,
        tag: "t4s2_8",
      });
      try {
        await setForceTts503(session.displayPage, true);
        await session.hostSock.action({ type: "game:start" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "intro_contestants" });
        await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length >= 8, 15000);

        for (let i = 0; i < 8; i++) {
          await session.hostSock.action({ type: "seat:setScore", seatId: i, score: (8 - i) * 40 }).catch(() => null);
        }
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 5000);
        await clearTtsProbe(session.displayPage);
        for (let i = 0; i < 8; i++) {
          await session.hostSock.action({ type: "summary:focusSeat", seatId: i });
          await sleep(300);
        }
        const sumSnap = await readTtsProbe(session.displayPage);
        const sumTexts = getAllSpokenTexts(sumSnap).join(" ");
        if (/giải tư/i.test(sumTexts)) {
          throw new Error(`Scenario 2 forbidden 'Giải Tư' spoken: ${sumTexts}`);
        }

        await session.hostSock.action({ type: "summary:stop" });
        await session.hostSock.action({ type: "awards:start" });
        await session.hostSock.action({ type: "awards:callTier", tier: "third" });
        await session.hostSock.action({ type: "awards:callTier", tier: "second" });
        await session.hostSock.action({ type: "awards:callTier", tier: "first" });
        const awState = await session.hostSock.waitForState((s) => Boolean(s?.awardsState?.laurelCrowned), 5000);
        assertNoRuntimeErrors(session.displayCollector, "T4-S2 Display");
        return {
          seats: 8,
          laurelCrowned: awState.awardsState.laurelCrowned,
          audioPlays: sumSnap.audioPlays.filter((a) => a.action === "play").length,
        };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── Scenario 3: O22 fast-tempo -> Top-Tie -> Cau Hoi Phu -> Post-match Summary & Awards ──
  cases.push(
    await runCase("T4-S3", CATALOG[2].name, "F4,F10,F15,F17", async () => {
      const session = await setupOlympiaMatchSession(ctx, {
        rulesetId: "O22",
        o22Quarter: 3,
        allowTts503: true,
        tag: "t4s3_o22",
      });
      try {
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:skip" }).catch(() => null);
        await session.hostSock.action({ type: "intro:skip" });
        await session.hostSock.action({ type: "banner:skip" });
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "kd:next" });
        const o22Snap = await waitForTtsCall(session.displayPage, (s) => s.fetchCalls.length > 0, 8000);
        const o22Rate = Number(o22Snap.fetchCalls[0]?.rate || 0);

        // Set top tie between seat 0 and seat 1 -> enter CHP
        await session.hostSock.action({ type: "seat:setScore", seatId: 0, score: 200 }).catch(() => null);
        await session.hostSock.action({ type: "seat:setScore", seatId: 1, score: 200 }).catch(() => null);
        await session.hostSock.action({ type: "round:force", round: "cauHoiPhu" });
        await session.hostSock.action({ type: "banner:skip" });
        await session.hostSock.action({ type: "chp:setTied", seats: [0, 1] });

        // Q1: miss -> winner == null (no false "Chính xác!")
        await session.hostSock.action({ type: "chp:next" });
        await session.hostSock.action({ type: "chp:show" });
        await session.hostSock.action({ type: "chp:timer" });
        await session.playerSocks[0].buzz();
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "chp:wrong" });
        await sleep(500);
        const missText = getAllSpokenTexts(await readTtsProbe(session.displayPage)).join(" ");
        if (/chính xác/i.test(missText)) {
          throw new Error(`False 'Chính xác!' on CHP miss: ${missText}`);
        }

        // Q2: seat 1 wins
        await session.hostSock.action({ type: "chp:next" });
        await session.hostSock.action({ type: "chp:show" });
        await session.hostSock.action({ type: "chp:timer" });
        await session.playerSocks[1].buzz();
        await session.hostSock.action({ type: "chp:correct" });
        await session.hostSock.action({ type: "chp:finish" });
        await session.hostSock.action({ type: "game:end" });

        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        await session.hostSock.action({ type: "summary:focusSeat", seatId: 1 });
        await session.hostSock.action({ type: "summary:stop" });
        await session.hostSock.action({ type: "awards:start" });
        await session.hostSock.action({ type: "awards:callTier", tier: "first" });
        await session.hostSock.action({ type: "awards:stop" });
        assertNoRuntimeErrors(session.displayCollector, "T4-S3 Display");
        return { o22Rate, chpResolved: true };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── Scenario 4: Offline /api/olympia/tts (503) Web Speech fallback + manual Host deck ──
  cases.push(
    await runCase("T4-S4", CATALOG[3].name, "F2,F3,F12,F18", async () => {
      const code = createSandboxCode(4, "t4s4");
      const hostCol = createErrorCollector({ allowOfflineDbErrors: true, allowTts503: true });
      const dispCol = createErrorCollector({ allowOfflineDbErrors: true, allowTts503: true });
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_s4", { collector: hostCol });
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "disp_s4", { collector: dispCol });
      const players = [];
      for (let i = 0; i < 4; i++) {
        players.push(
          await connectOlympiaSocket(baseUrl, {
            code,
            role: "player",
            seatId: i,
            name: `TS ${i + 1}`,
            token: `s4_${i}`,
          })
        );
      }
      try {
        await setForceTts503(dispPage, true);
        await dispPage.goto(`${baseUrl}/olympia/display/${code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await unlockDisplayAudio(dispPage);
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(700);

        await clearTtsProbe(dispPage);
        await clickButtonByText(hostPage, /Thử 2 MC|Chào mở màn/i, { timeoutMs: 8000, waitAfterMs: 300 });
        await handleStartMatchModals(hostPage);
        await tryClickButtonByText(hostPage, /Bỏ qua Intro/i, { timeoutMs: 2500 });
        const snap = await waitForTtsCall(
          dispPage,
          (s) =>
            s.speechCalls.some((c) => c.type === "speak") &&
            s.speakerTransitions.some((t) => t.speaker === "khanh_vy" || t.speaker === "ngoc_huy"),
          10000
        );
        await assertHostPageSilent(hostPage, "T4-S4 Host");
        assertNoRuntimeErrors(hostCol, "T4-S4 Host");
        assertNoRuntimeErrors(dispCol, "T4-S4 Display");
        return {
          forced503Count: dispCol.forcedTts503s.length,
          fallbackSpeaks: snap.speechCalls.filter((c) => c.type === "speak").length,
          speakerEvents: snap.speakerTransitions.length,
        };
      } finally {
        for (const p of players) p.close();
        await hostPage.close().catch(() => {});
        await dispPage.close().catch(() => {});
      }
    })
  );

  // ── Scenario 5: Sandbox / LIGHT quality 3D mode (?perf=light) unfrozen animations & 0 errors ──
  cases.push(
    await runCase("T4-S5", CATALOG[4].name, "F16,F18,F19", async () => {
      const session = await setupOlympiaMatchSession(ctx, {
        displayQuery: "perf=light&sandbox=1",
        allowTts503: true,
        tag: "t4s5_light",
      });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "game:start" });
        await session.hostSock.action({ type: "entrance:start" });
        await session.hostSock.action({ type: "entrance:next" });
        await sleep(600);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) => s.speakerTransitions.some((t) => t.speaker === "khanh_vy" || t.speaker === "ngoc_huy"),
          8000
        );
        const canvasCount = await session.displayPage.evaluate(() => document.querySelectorAll("canvas").length);
        if (canvasCount === 0) {
          throw new Error("Expected 3D WebGL <canvas> mounted in LIGHT quality mode");
        }
        assertNoRuntimeErrors(session.displayCollector, "T4-S5 LIGHT");
        return {
          canvasCount,
          audio404s: session.displayCollector.missingAudio404s.length,
          speakerTransitions: snap.speakerTransitions.length,
        };
      } finally {
        await session.cleanup();
      }
    })
  );

  return summarizeCases(4, "Real-World End-to-End Browser Scenarios", cases);
}
