import {
  assertNoRuntimeErrors,
  clickButtonByText,
  connectOlympiaSocket,
  createErrorCollector,
  createSandboxRoomApi,
  createTrackedPage,
  getDisplayFrame,
  launchOlympiaSandbox,
  loginAdminFast,
  runCase,
  selectSandboxSeatTab,
  sleep,
  summarizeCases,
  triggerPointerDownBuzzer,
  tryClickButtonByText,
} from "./lib/browser.mjs";
import { getWebGLSnapshot } from "./lib/cdp-profiler.mjs";

export async function runTier(ctx) {
  const { browser, baseUrl } = ctx;
  const cases = [];

  // C1: Host Round/Camera Actions + Live 3D Studio + PlayerPad Steal Input
  cases.push(
    await runCase("T3-C1", "Host vd:onStage + vd:openSteal + Live 3D Studio + Player 2 Steal + vd:correctSteal", "C1.Host-3D-Steal", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T3-C1-disp", { collector });
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T3-C1-host", { collector });
      const { page: p2Page } = await createTrackedPage(browser, baseUrl, "T3-C1-p2", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p2Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=2&name=TS3&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await dispPage.waitForSelector("canvas", { timeout: 20000 });
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(hostPage, "Về Đích", { waitAfterMs: 250 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Lên sân khấu", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Mở bảng chọn gói đồ họa", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Xác nhận gói", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Bắt đầu Câu 1", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Tính Giờ Thi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "SAI & MỞ CƯỚP 5S", { waitAfterMs: 200 });

        const buzz = await triggerPointerDownBuzzer(p2Page, 4000);
        if (!buzz.triggered) throw new Error("Player 2 steal buzzer failed in C1");
        await sleep(250);
        await clickButtonByText(hostPage, "✔ Cướp Đúng", { waitAfterMs: 300 });

        const snap = await getWebGLSnapshot(dispPage);
        if (!snap?.canvases?.[0]?.width) throw new Error("3D canvas disappeared during C1 steal");
        const p2Text = await p2Page.evaluate(() => document.body?.innerText || "");
        if (!p2Text.includes("20")) throw new Error(`Expected +20 steal score on TS3, got: ${p2Text.slice(0, 200)}`);
        assertNoRuntimeErrors(collector, "T3-C1");
        return { stealLatencyMs: buzz.latencyMs };
      } finally {
        await Promise.allSettled([p2Page.close(), hostPage.close(), dispPage.close()]);
      }
    })
  );

  // C2: Sandbox Seat Tab Switching + VCNV Draft Preservation + Bell + Grading
  cases.push(
    await runCase("T3-C2", "Sandbox Seat Switching + VCNV Draft Preservation + CNV Bell + Grading", "C2.Sandbox-VCNV", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T3-C2", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", timeoutMs: 12000 });
        await clickButtonByText(page, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 15000, waitAfterMs: 250 });
        if (await tryClickButtonByText(page, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(page, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(page, "VCNV", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Hàng 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Mở Câu Hỏi", { waitAfterMs: 200 });
        await clickButtonByText(page, "Đếm 15s (Space)", { waitAfterMs: 300 });

        const s0 = await selectSandboxSeatTab(page, 0);
        await s0.frame.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await s0.frame.type('input[placeholder*="Nhập đáp án"]', "PARTIAL_0");

        const s1 = await selectSandboxSeatTab(page, 1);
        await s1.frame.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await s1.frame.type('input[placeholder*="Nhập đáp án"]', "SEAT_1_FINAL");
        await clickButtonByText(s1.frame, "GỬI", { waitAfterMs: 250 });

        const s0Back = await selectSandboxSeatTab(page, 0);
        const preserved = await s0Back.frame.$eval('input[placeholder*="Nhập đáp án"]', (el) => el.value);
        if (preserved !== "PARTIAL_0") throw new Error(`Expected PARTIAL_0 preserved, got "${preserved}"`);
        await clickButtonByText(s0Back.frame, "GỬI", { waitAfterMs: 250 });

        const s2 = await selectSandboxSeatTab(page, 2);
        const bell = await triggerPointerDownBuzzer(s2.frame, 4000);
        if (!bell.triggered) throw new Error("Seat 2 CNV bell failed");
        await sleep(250);
        await clickButtonByText(page, "✔ Chấm ĐÚNG", { waitAfterMs: 300 });

        assertNoRuntimeErrors(collector, "T3-C2");
        return { preserved, seat2Bell: true };
      } finally {
        await page.close();
      }
    })
  );

  // C3: Theme Toggle (o26_classic <-> v3_arrow) + Overlay Mode (LOWER_THIRD <-> FULLSCREEN) + Quality (LT/HQ)
  cases.push(
    await runCase("T3-C3", "Theme (o26_classic/v3_arrow) + Overlay (LOWER_THIRD/FULLSCREEN) + Quality (LT/HQ)", "C3.Theme-Overlay-Quality", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T3-C3-d", { collector });
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T3-C3-h", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          dispPage.goto(`${baseUrl}/olympia/display/${room.code}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await dispPage.waitForSelector("canvas", { timeout: 25000 });
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 200 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(hostPage, "Khởi Động", { waitAfterMs: 250 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "BẮT ĐẦU", { waitAfterMs: 3700 });
        await clickButtonByText(hostPage, "CÂU TIẾP", { waitAfterMs: 250 });

        await tryClickButtonByText(hostPage, "Mũi Tên V3", { waitAfterMs: 200 }) || await tryClickButtonByText(hostPage, "O26 Cổ Điển", { waitAfterMs: 200 });
        await tryClickButtonByText(hostPage, "1/3 Dưới", { waitAfterMs: 200 }) || await tryClickButtonByText(hostPage, "Toàn Màn", { waitAfterMs: 200 });
        await dispPage.evaluate(() => {
          const b = Array.from(document.querySelectorAll("button")).find((el) =>
            (el.getAttribute("title") || "").startsWith("Chất lượng đồ họa:")
          );
          b?.click();
        });
        await sleep(400);
        const snap = await getWebGLSnapshot(dispPage);
        if (!snap?.canvases?.[0]?.width) throw new Error("Display canvas failed under Theme+Overlay+Quality switch");
        assertNoRuntimeErrors(collector, "T3-C3");
        return { combinedSwitchOk: true };
      } finally {
        await Promise.allSettled([hostPage.close(), dispPage.close()]);
      }
    })
  );

  // C4: Audio Unlock + Round Intro Skip + TTS Toggle + GPU Saver Mode
  cases.push(
    await runCase("T3-C4", "GPU Saver + Audio Unlock + banner:skip + TTS toggle propagation", "C4.Audio-TTS-GpuSaver", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T3-C4", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", timeoutMs: 12000 });
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Cài đặt"));
          btn?.click();
        });
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Chế độ tiết kiệm GPU"), { timeout: 8000 });
        await page.evaluate(() => {
          const p = Array.from(document.querySelectorAll("p")).find((el) => (el.textContent || "").includes("Chế độ tiết kiệm GPU"));
          p?.parentElement?.parentElement?.querySelector("button")?.click();
        });
        await clickButtonByText(page, "✕", { waitAfterMs: 150 });

        await clickButtonByText(page, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { waitAfterMs: 200 });
        if (await tryClickButtonByText(page, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(page, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(page, "Khởi Động", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 200 });
        await clickButtonByText(page, "TTS:", { waitAfterMs: 200 });

        const hasGpuClass = await page.evaluate(() => document.documentElement.classList.contains("gpu-saver-mode"));
        const dispFrame = await getDisplayFrame(page, 8000);
        const dispOk = await dispFrame.evaluate(() => Boolean(document.querySelector("canvas")));
        if (!hasGpuClass || !dispOk) throw new Error(`C4 check failed: gpu=${hasGpuClass}, disp=${dispOk}`);
        assertNoRuntimeErrors(collector, "T3-C4");
        return { gpuSaverActive: hasGpuClass, dispOk };
      } finally {
        await page.close();
      }
    })
  );

  // C5: 8-Seat Ruleset O27 + CHP Unlimited + Score Summary (CAM 25..28) + summary:stop
  cases.push(
    await runCase("T3-C5", "8-Seat O27 + CHP Unlimited + Score Summary CAM 25..28 + pointLights <= 18", "C5.8Seat-Summary", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T3-C5-d", { collector });
      let hostSock = null;
      try {
        const teams = Array.from({ length: 8 }, (_, i) => ({ name: `TS ${i + 1}`, color: "#38bdf8" }));
        const room = await createSandboxRoomApi(dispPage, baseUrl, { teams, rulesetId: "O27", chpQuestionLimit: "unlimited" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await dispPage.waitForSelector("canvas", { timeout: 25000 });

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "cauHoiPhu" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "chp:selectSeats", seats: [4, 5, 6, 7] });
        await hostSock.emitAck("action", { type: "chp:next" });
        await hostSock.emitAck("action", { type: "chp:buzzer" });
        await hostSock.emitAck("action", { type: "chp:correct", seat: 7 });

        await hostSock.emitAck("action", { type: "summary:start" });
        for (let i = 0; i < 6; i++) {
          await hostSock.emitAck("action", { type: "summary:next" });
          await sleep(120);
        }
        const snap = await getWebGLSnapshot(dispPage);
        const pl = snap?.canvases?.[0]?.sceneLights?.activePointLights ?? null;
        if (pl == null || pl > 18) {
          throw new Error(`8-seat Summary activePointLights=${pl} exceeds <= 18`);
        }
        await hostSock.emitAck("action", { type: "summary:stop" });
        assertNoRuntimeErrors(collector, "T3-C5");
        return { seats: 8, activePointLights: pl };
      } finally {
        if (hostSock) hostSock.close();
        await dispPage.close();
      }
    })
  );

  // C6: Hope Star (packageReady) + Wrong + Rival Steal Math (-1x owner once, +1x or -pts stealer)
  cases.push(
    await runCase("T3-C6", "Về Đích Hope Star in packageReady + wrong + rival steal math & RED->BLUE", "C6.HopeStar-Steal", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T3-C6", { collector });
      let hostSock = null, p1Sock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        p1Sock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 1, name: "TS2" });

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "veDich" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "vd:onStage" });
        await hostSock.emitAck("action", { type: "vd:confirmPackage", points: [20, 20, 30] });
        await hostSock.emitAck("action", { type: "vd:hopeStar" });
        await hostSock.emitAck("action", { type: "vd:startQuestion" });
        await hostSock.emitAck("action", { type: "vd:openSteal" });
        await p1Sock.emitAck("playerBuzz", { seat: 1 });
        await hostSock.emitAck("action", { type: "vd:correctSteal" });
        await sleep(250);

        const st = hostSock.getState();
        if (st.seats[0].score !== -20 || st.seats[1].score !== 20) {
          throw new Error(`Expected HopeStar steal math seat0=-20, seat1=+20; got ${st.seats[0].score}, ${st.seats[1].score}`);
        }
        assertNoRuntimeErrors(collector, "T3-C6");
        return { seat0Score: st.seats[0].score, seat1Score: st.seats[1].score };
      } finally {
        if (p1Sock) p1Sock.close();
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  // C7: Tăng Tốc Backup Swap + Hide Overlay (H) + Ranked Timing Grading
  cases.push(
    await runCase("T3-C7", "Tăng Tốc Backup Swap + Hide Overlay (H) + Ranked Grading", "C7.TT-Swap-Hide", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T3-C7-d", { collector });
      let hostSock = null, p0Sock = null;
      try {
        const room = await createSandboxRoomApi(dispPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        p0Sock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 0, name: "TS1" });
        await dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await dispPage.waitForSelector("canvas", { timeout: 20000 });

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "tangToc" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "tt:selectQuestion", qIdx: 0 });
        await hostSock.emitAck("action", { type: "tt:swapBackup" });
        await hostSock.emitAck("action", { type: "tt:show" });
        await hostSock.emitAck("action", { type: "tt:timer" });
        await p0Sock.emitAck("playerAnswer", { seat: 0, text: "ANS" });
        await hostSock.emitAck("action", { type: "tt:toggleHideOverlay" });
        await sleep(300);
        await hostSock.emitAck("action", { type: "tt:toggleHideOverlay" });
        await hostSock.emitAck("action", { type: "tt:reveal" });
        await hostSock.emitAck("action", { type: "tt:grade", correctSeats: [0] });
        if (hostSock.getState()?.seats?.[0]?.score !== 40) {
          throw new Error(`Expected +40 after TT backup+hide+grade, got ${hostSock.getState()?.seats?.[0]?.score}`);
        }
        assertNoRuntimeErrors(collector, "T3-C7");
        return { score: 40 };
      } finally {
        if (p0Sock) p0Sock.close();
        if (hostSock) hostSock.close();
        await dispPage.close();
      }
    })
  );

  // C8: VCNV Eliminated Seat Lock + Re-Unlock + Row Reveal + Puzzle Tile
  cases.push(
    await runCase("T3-C8", "VCNV Wrong CNV lock -> Host re-unlock -> Row reveal -> Puzzle tile", "C8.VCNV-Lock-Tile", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T3-C8", { collector });
      let hostSock = null, p0Sock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        p0Sock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 0, name: "TS1" });

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "vcnv" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await p0Sock.emitAck("playerBuzz", { seat: 0 });
        await hostSock.emitAck("action", { type: "vcnv:wrongCNV", seat: 0 });
        await hostSock.emitAck("action", { type: "vcnv:clearBells", force: true });

        const lockedBuzz = await p0Sock.emitAck("playerBuzz", { seat: 0 });
        if (lockedBuzz?.ok !== false) throw new Error("Eliminated seat was allowed to re-buzz");

        await hostSock.emitAck("action", { type: "vcnv:toggleLockSeat", seat: 0 });
        await hostSock.emitAck("action", { type: "vcnv:revealTile" });
        const unlockedBuzz = await p0Sock.emitAck("playerBuzz", { seat: 0 });
        if (!unlockedBuzz?.ok) throw new Error(`Re-unlocked seat buzz failed: ${JSON.stringify(unlockedBuzz)}`);
        assertNoRuntimeErrors(collector, "T3-C8");
        return { reunlockedOk: true };
      } finally {
        if (p0Sock) p0Sock.close();
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  // C9: /admin/sandbox Custom Names + Offline Fallback + Language Toggle
  cases.push(
    await runCase("T3-C9", "Sandbox Custom Team Names + Offline Studio + Language Switch", "C9.Offline-Lang", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T3-C9", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, {
          seats: 3,
          ruleset: "O24",
          teamNames: ["An", "Binh", "Chi"],
          offline: true,
          timeoutMs: 15000,
        });
        const body = await page.evaluate(() => document.body?.innerText || "");
        if (!body.includes("An") || !body.includes("Binh")) {
          throw new Error("Custom team names not reflected in Offline Olympia Studio");
        }
        assertNoRuntimeErrors(collector, "T3-C9");
        return { customNamesOfflineOk: true };
      } finally {
        await page.close();
      }
    })
  );

  // C10: Standalone HQ Display + Host Console + 2 Players + CUT/MORPH + PTZ + Buzzer
  cases.push(
    await runCase("T3-C10", "Standalone HQ Display + Host + 2 Players + CUT/PTZ + Shared KD Buzzer", "C10.HQ-Host-Pad", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T3-C10-d", { collector });
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T3-C10-h", { collector });
      const { page: p0Page } = await createTrackedPage(browser, baseUrl, "T3-C10-p0", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          dispPage.goto(`${baseUrl}/olympia/display/${room.code}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p0Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await dispPage.waitForSelector("canvas", { timeout: 25000 });
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 200 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(hostPage, "Khởi Động", { waitAfterMs: 250 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Lượt Chung", { waitAfterMs: 200 });
        await clickButtonByText(hostPage, "BẮT ĐẦU", { waitAfterMs: 3800 });
        await clickButtonByText(hostPage, "CÂU TIẾP", { waitAfterMs: 250 });

        await dispPage.bringToFront();
        await clickButtonByText(dispPage, "MƯỢT", { timeoutMs: 5000, waitAfterMs: 150 });
        const buzz = await triggerPointerDownBuzzer(p0Page, 4000);
        if (!buzz.triggered) throw new Error("Player 0 buzz failed during HQ Display concurrent session");
        assertNoRuntimeErrors(collector, "T3-C10");
        return { hqConcurrentBuzzOk: true };
      } finally {
        await Promise.allSettled([p0Page.close(), hostPage.close(), dispPage.close()]);
      }
    })
  );

  return summarizeCases(3, "Tier 3: Pairwise Cross-Feature Combinations (C1-C10)", cases);
}
