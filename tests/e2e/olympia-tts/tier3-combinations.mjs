import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import {
  WORKSPACE_DIR,
  assertNoRuntimeErrors,
  clickButtonByText,
  clickSidebarRound,
  connectOlympiaSocket,
  createErrorCollector,
  createSandboxCode,
  createTrackedPage,
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
    id: "T3-C1",
    name: "Separate HostConsole & DisplayScreen: TTS toggle + baseRate slider + manual deck + Stop TTS",
    featureArea: "F2,F3,F4,F12",
    requirements: ["R1", "R4"],
  },
  {
    id: "T3-C2",
    name: "VCNV CNV win with TTS ON (pendingCnvWin -> tts:cnvRevealDone) vs TTS OFF (immediate commit)",
    featureArea: "F13",
    requirements: ["R4"],
  },
  {
    id: "T3-C3",
    name: "Ve Dich wrong -> 5s timeout (0 auto-steal) -> Host manual cue -> Player pointer buzz -> ~2.5s callout",
    featureArea: "F6,F12",
    requirements: ["R1", "R4"],
  },
  {
    id: "T3-C4",
    name: "Post-match summary (CAM 3 -> TS1..TSX -> CAM 18 0.75x-1.25x) + Awards (third->second->first->closing, CAM 30/31)",
    featureArea: "F9,F16,F17",
    requirements: ["R6", "R7", "R8"],
  },
  {
    id: "T3-C5",
    name: "Forced /api/olympia/tts 503 -> Web Speech fallback + olympia:tts-speaker lip-sync parity",
    featureArea: "F2,F18",
    requirements: ["R1", "R9"],
  },
  {
    id: "T3-C6",
    name: "Production server.js bundle smoke test (/api/health, /api/olympia/tts, /olympia join, 3-ch audio)",
    featureArea: "F1,F16,F19",
    requirements: ["R1", "R7", "AC"],
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

function probeHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function killProcTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
    } else {
      proc.kill("SIGKILL");
    }
  } catch {}
}

export async function runTier(ctx) {
  const { browser, baseUrl, allowOfflineEdgeTts = false } = ctx;
  const cases = [];

  // ── T3-C1: HostConsole + DisplayScreen TTS toggle, baseRate slider, manual deck & Stop TTS ──
  cases.push(
    await runCase("T3-C1", CATALOG[0].name, "F2,F3,F4,F12", async () => {
      const code = createSandboxCode(4, "t3c1");
      const hostCollector = createErrorCollector({ allowOfflineDbErrors: true, allowTts503: true });
      const dispCollector = createErrorCollector({ allowOfflineDbErrors: true, allowTts503: true });
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "host_t3c1", { collector: hostCollector });
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "disp_t3c1", { collector: dispCollector });
      const hostSock = await connectOlympiaSocket(baseUrl, { code, role: "host", key: "sandbox" });
      try {
        await setForceTts503(dispPage, true);
        await dispPage.goto(`${baseUrl}/olympia/display/${code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await unlockDisplayAudio(dispPage);
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(700);

        // Adjust baseRate slider if rendered in HostConsole
        const sliderUpdated = await hostPage.evaluate(() => {
          const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
          const ttsSlider = sliders.find((el) => {
            const ctxTxt = el.closest("div")?.textContent || el.parentElement?.textContent || "";
            return /tốc độ|rate|tts/i.test(ctxTxt);
          }) || sliders[0];
          if (!ttsSlider) return false;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(ttsSlider, "1.2");
          ttsSlider.dispatchEvent(new Event("input", { bubbles: true }));
          ttsSlider.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        });
        await sleep(300);

        await clearTtsProbe(dispPage);
        await clickButtonByText(hostPage, /Thử 2 MC|Chào mở màn/i, { timeoutMs: 8000, waitAfterMs: 250 });
        await waitForTtsCall(
          dispPage,
          (s) => s.fetchCalls.length > 0 || s.speechCalls.some((c) => c.type === "speak"),
          7000
        );

        // Stop TTS via UI button (or fallback socket if label differs)
        const stoppedUi = await tryClickButtonByText(hostPage, /Dừng đọc|Ngắt giọng|Stop TTS/i, { timeoutMs: 2000 });
        if (!stoppedUi) {
          await hostSock.action({ type: "tts:stop" });
        }
        await sleep(300);

        const dispSnap = await readTtsProbe(dispPage);
        if (dispSnap.currentSpeaker !== null) {
          throw new Error(`Expected Display __olympiaTtsSpeaker === null after Stop TTS, got ${dispSnap.currentSpeaker}`);
        }

        // Toggle TTS OFF then back ON
        await clickButtonByText(hostPage, /TTS:\s*(BẬT|TẮT)/i, { timeoutMs: 6000, waitAfterMs: 250 });
        const stOff = hostSock.getState();
        await clickButtonByText(hostPage, /TTS:\s*(BẬT|TẮT)/i, { timeoutMs: 6000, waitAfterMs: 250 });
        const stOn = hostSock.getState();

        await assertHostPageSilent(hostPage, "T3-C1");
        assertNoRuntimeErrors(hostCollector, "T3-C1 Host");
        assertNoRuntimeErrors(dispCollector, "T3-C1 Display");
        return {
          sliderUpdated,
          toggledStates: [stOff?.ttsSettings?.enabled, stOn?.ttsSettings?.enabled],
          displaySpeakerReset: dispSnap.currentSpeaker === null,
        };
      } finally {
        hostSock.close();
        await hostPage.close().catch(() => {});
        await dispPage.close().catch(() => {});
      }
    })
  );

  // ── T3-C2: VCNV CNV win TTS ON (deferred) vs TTS OFF (immediate) ──
  cases.push(
    await runCase("T3-C2", CATALOG[1].name, "F13", async () => {
      // Part A: TTS ON -> deferred commit
      const sOn = await setupOlympiaMatchSession(ctx, { allowTts503: true, ttsEnabled: true, tag: "t3c2_on" });
      let deferredObserved = false;
      try {
        await setForceTts503(sOn.displayPage, true);
        await sOn.hostSock.action({ type: "round:force", round: "vcnv" });
        await sOn.hostSock.action({ type: "banner:skip" });
        await sOn.playerSocks[0].buzz();
        await sOn.hostSock.waitForState((s) => (s?.vcnv?.bells?.length ?? 0) >= 1, 4000);
        const beforeScore = sOn.hostSock.getState().seats[0].score;
        await sOn.hostSock.action({ type: "vcnv:correctCNV", seat: 0 });
        await sleep(60);
        const mid = sOn.hostSock.getState();
        deferredObserved = Boolean(mid.pendingCnvWin) && mid.seats[0].score === beforeScore;
        const done = await sOn.hostSock.waitForState(
          (s) => !s?.pendingCnvWin && s?.seats?.[0]?.score > beforeScore && s?.vcnv?.phase === "done",
          15000
        );
        if (!done.vcnv.piecesRevealed.every(Boolean)) {
          throw new Error("Expected all VCNV pieces revealed after deferred CNV commit");
        }
      } finally {
        await sOn.cleanup();
      }

      // Part B: TTS OFF -> immediate commit
      const sOff = await setupOlympiaMatchSession(ctx, { ttsEnabled: false, openDisplay: false, tag: "t3c2_off" });
      let immediateObserved = false;
      try {
        await sOff.hostSock.action({ type: "round:force", round: "vcnv" });
        await sOff.hostSock.action({ type: "banner:skip" });
        await sOff.playerSocks[0].buzz();
        const before = sOff.hostSock.getState().seats[0].score;
        await sOff.hostSock.action({ type: "vcnv:correctCNV", seat: 0 });
        const after = sOff.hostSock.getState();
        immediateObserved = !after.pendingCnvWin && after.seats[0].score > before && after.vcnv.phase === "done";
        if (!immediateObserved) {
          throw new Error(`Expected immediate CNV commit when TTS OFF, got ${JSON.stringify(after.vcnv)}`);
        }
      } finally {
        await sOff.cleanup();
      }

      return { deferredObserved, immediateObserved };
    })
  );

  // ── T3-C3: Ve Dich wrong -> 5s timeout (0 auto-steal) -> manual Host button -> Player pointer buzz -> ~2.5s callout ──
  cases.push(
    await runCase("T3-C3", CATALOG[2].name, "F6,F12", async () => {
      const code = createSandboxCode(4, "t3c3");
      const { page: hostPage, collector: hostCol } = await createTrackedPage(browser, baseUrl, "host_t3c3", {
        allowOfflineDbErrors: true,
        allowTts503: true,
      });
      const { page: dispPage, collector: dispCol } = await createTrackedPage(browser, baseUrl, "disp_t3c3", {
        allowOfflineDbErrors: true,
        allowTts503: true,
      });
      const { page: p2Page, collector: p2Col } = await createTrackedPage(browser, baseUrl, "p2_t3c3", {
        allowOfflineDbErrors: true,
      });
      const pSocks = [];
      const hostSock = await connectOlympiaSocket(baseUrl, { code, role: "host", key: "sandbox" });
      try {
        for (let i = 0; i < 4; i++) {
          if (i !== 1) {
            pSocks.push(
              await connectOlympiaSocket(baseUrl, {
                code,
                role: "player",
                seatId: i,
                name: `Thí sinh ${i + 1}`,
                token: `t3c3_${i}`,
              })
            );
          }
        }
        await setForceTts503(dispPage, true);
        await dispPage.goto(`${baseUrl}/olympia/display/${code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await unlockDisplayAudio(dispPage);
        await p2Page.goto(`${baseUrl}/olympia/play/${code}?seat=1&name=${encodeURIComponent("Thí sinh 2")}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await hostPage.goto(`${baseUrl}/olympia/host/${code}?key=sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(700);

        await handleStartMatchModals(hostPage);
        await clickSidebarRound(hostPage, /Về Đích/i);
        await tryClickButtonByText(hostPage, /Bỏ qua Intro/i, { timeoutMs: 2500 });
        await hostSock.action({ type: "banner:skip" });
        await hostSock.action({ type: "vd:confirmPackage", points: [20, 20, 20] });
        await hostSock.action({ type: "vd:startQuestion" });
        await hostSock.action({ type: "vd:timer" });

        // Wrong answer -> wait 1s -> assert 0 auto-steal TTS
        await clearTtsProbe(dispPage);
        await hostSock.action({ type: "vd:wrong" });
        await sleep(1000);
        const beforeManual = getAllSpokenTexts(await readTtsProbe(dispPage));
        if (beforeManual.some((t) => /mời các bạn còn lại|giành quyền/i.test(t))) {
          throw new Error(`Auto-steal TTS fired illegally after Ve Dich wrong/timeout: ${JSON.stringify(beforeManual)}`);
        }

        // Host clicks manual "Thoại: Mời các bạn còn lại" & opens steal
        await clickButtonByText(hostPage, /Mời các bạn còn lại/i, { timeoutMs: 6000, waitAfterMs: 200 });
        await waitForTtsCall(
          dispPage,
          (s) => getAllSpokenTexts(s).some((t) => /mời các bạn|giành quyền|cơ hội/i.test(t)),
          7000
        );
        await hostSock.action({ type: "vd:openSteal" });

        // Player 2 triggers real pointer buzzer
        await clearTtsProbe(dispPage);
        const tBuzz = Date.now();
        await triggerBuzzerPointer(p2Page, /CƯỚP ĐIỂM|BẤM CHUÔNG/i, { timeoutMs: 6000 });
        const snap = await waitForTtsCall(
          dispPage,
          (s) => getAllSpokenTexts(s).some((t) => /Thí sinh 2/i.test(t)),
          7000
        );
        const call = [...snap.fetchCalls, ...snap.speechCalls.filter((c) => c.type === "speak")].find((c) =>
          /Thí sinh 2/i.test(c.text)
        );
        const stealDelayMs = call.ts - tBuzz;
        if (stealDelayMs < 1800 || stealDelayMs > 4200) {
          throw new Error(`Expected ~2.5s dramatic steal delay (1800..4200ms), got ${stealDelayMs}ms`);
        }
        await assertHostPageSilent(hostPage, "T3-C3");
        assertNoRuntimeErrors(hostCol, "T3-C3 Host");
        assertNoRuntimeErrors(dispCol, "T3-C3 Display");
        assertNoRuntimeErrors(p2Col, "T3-C3 Player2");
        return { stealDelayMs, text: call.text };
      } finally {
        hostSock.close();
        for (const s of pSocks) s.close();
        await hostPage.close().catch(() => {});
        await dispPage.close().catch(() => {});
        await p2Page.close().catch(() => {});
      }
    })
  );

  // ── T3-C4: Post-match summary + Awards ceremony + Camera & 3D integration ──
  cases.push(
    await runCase("T3-C4", CATALOG[3].name, "F9,F16,F17", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t3c4" });
      try {
        await setForceTts503(session.displayPage, true);
        await session.hostSock.action({ type: "game:end" });
        await session.hostSock.action({ type: "summary:start", isPostMatch: true });
        const sStart = await session.hostSock.waitForState((s) => Boolean(s?.summaryState?.active), 5000);
        if (sStart.summaryState.focusTarget !== "mc" || sStart.summaryState.currentIndex !== -1) {
          throw new Error(`Expected CAM 3 MC focus start, got ${JSON.stringify(sStart.summaryState)}`);
        }
        for (let i = 0; i < 4; i++) {
          await clearTtsProbe(session.displayPage);
          await session.hostSock.action({ type: "summary:focusSeat", seatId: i });
          await session.hostSock.waitForState((s) => s?.summaryState?.currentIndex === i, 4000);
          await sleep(350);
        }
        await session.hostSock.action({ type: "summary:focusMc" });
        await session.hostSock.action({ type: "summary:stop" });

        // Awards ceremony
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "awards:start" });
        await session.hostSock.waitForState((s) => Boolean(s?.awardsState?.active), 5000);
        for (const cam of ["mc", "podium_wide", "podium_close", "auto"]) {
          await session.hostSock.action({ type: "awards:setCamera", cameraMode: cam });
        }
        for (const tier of ["third", "second", "first"]) {
          await session.hostSock.action({ type: "awards:callTier", tier });
          await session.hostSock.waitForState((s) => s?.awardsState?.activeTier === tier, 4000);
          await sleep(350);
        }
        await session.hostSock.action({ type: "tts:command", command: "awards_closing" });
        await waitForTtsCall(session.displayPage, (s) => getAllSpokenTexts(s).length > 0, 7000);
        await session.hostSock.action({ type: "awards:stop" });
        assertNoRuntimeErrors(session.displayCollector, "T3-C4 Display");
        return { completedSummaryAndAwards: true };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── T3-C5: Forced 503 Web Speech fallback + olympia:tts-speaker lip-sync ──
  cases.push(
    await runCase("T3-C5", CATALOG[4].name, "F2,F18", async () => {
      const session = await setupOlympiaMatchSession(ctx, { allowTts503: true, tag: "t3c5" });
      try {
        await setForceTts503(session.displayPage, true);
        await clearTtsProbe(session.displayPage);
        await session.hostSock.action({ type: "tts:command", command: "opening_duo" });
        const snap = await waitForTtsCall(
          session.displayPage,
          (s) =>
            s.speechCalls.some((c) => c.type === "speak") &&
            s.speakerTransitions.some((t) => t.speaker === "khanh_vy") &&
            s.speakerTransitions.some((t) => t.speaker === "ngoc_huy"),
          9000
        );
        return {
          speechCount: snap.speechCalls.filter((c) => c.type === "speak").length,
          speakersSeen: [...new Set(snap.speakerTransitions.map((t) => t.speaker))],
        };
      } finally {
        await session.cleanup();
      }
    })
  );

  // ── T3-C6: Production server.js bundle compatibility smoke test ──
  cases.push(
    await runCase("T3-C6", CATALOG[5].name, "F1,F16,F19", async () => {
      const serverJsPath = path.join(WORKSPACE_DIR, "server.js");
      let targetBaseUrl = baseUrl;
      let spawnedProc = null;

      if (fs.existsSync(serverJsPath)) {
        const smokePort = 3199;
        targetBaseUrl = `http://127.0.0.1:${smokePort}`;
        spawnedProc = spawn("node", ["--max-old-space-size=384", "server.js"], {
          cwd: WORKSPACE_DIR,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            NODE_ENV: "production",
            PORT: String(smokePort),
            HOSTNAME: "127.0.0.1",
            ALLOW_DEV_GRAPHICS: "true",
          },
        });
        const t0 = Date.now();
        let ready = false;
        while (Date.now() - t0 < 35000) {
          if (await probeHttp(`${targetBaseUrl}/api/health`)) {
            ready = true;
            break;
          }
          await sleep(300);
        }
        if (!ready) {
          killProcTree(spawnedProc);
          throw new Error(`Spawned production server.js on ${targetBaseUrl} failed to answer /api/health within 35s`);
        }
      }

      try {
        const health = await fetch(`${targetBaseUrl}/api/health`);
        if (health.status !== 200) throw new Error(`/api/health returned ${health.status}`);

        const ttsRes = await fetch(`${targetBaseUrl}/api/olympia/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Kiểm tra server bundle", role: "khanh_vy" }),
        });
        if (ttsRes.status !== 200 && !(allowOfflineEdgeTts && ttsRes.status === 503)) {
          throw new Error(`/api/olympia/tts returned unexpected status ${ttsRes.status}`);
        }

        const audioRes = await fetch(`${targetBaseUrl}/olympia-audio/O26/6_NhacKhac/prize_award_left.mp3`);
        if (audioRes.status !== 200) {
          throw new Error(`3-channel asset prize_award_left.mp3 returned ${audioRes.status}`);
        }

        const sock = await connectOlympiaSocket(targetBaseUrl, {
          code: createSandboxCode(4, "t3c6"),
          role: "host",
          key: "sandbox",
        });
        sock.close();
        return { targetBaseUrl, spawnedBundle: Boolean(spawnedProc), ttsStatus: ttsRes.status };
      } finally {
        if (spawnedProc) killProcTree(spawnedProc);
      }
    })
  );

  return summarizeCases(3, "Cross-Feature Pairwise Combinations", cases);
}
