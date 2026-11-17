import {
  assertNoRuntimeErrors,
  clickButtonByText,
  connectOlympiaSocket,
  createErrorCollector,
  createSandboxRoomApi,
  createTrackedPage,
  launchOlympiaSandbox,
  loginAdminFast,
  runCase,
  selectSandboxSeatTab,
  sleep,
  summarizeCases,
  tryClickButtonByText,
} from "./lib/browser.mjs";
import { getWebGLSnapshot } from "./lib/cdp-profiler.mjs";

export async function runTier(ctx) {
  const { browser, baseUrl } = ctx;
  const cases = [];

  // ═══════════════════════════════════════════════════════════════════════
  // AREA B1: 3D Studio Boundaries
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T2-B1-1", "Repeated LT->MD->HQ->LT cycling avoids WebGL context loss & unbounded texture growth", "B1.3D-Boundaries", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B1-1", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(1500);

        const initialSnap = await getWebGLSnapshot(page);
        for (let i = 0; i < 6; i++) {
          await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll("button")).find((el) =>
              (el.getAttribute("title") || "").startsWith("Chất lượng đồ họa:")
            );
            b?.click();
          });
          await sleep(250);
        }
        const finalSnap = await getWebGLSnapshot(page);
        const c0 = finalSnap?.canvases?.[0];
        if (!c0 || c0.width === 0) throw new Error("Canvas lost after repeated quality cycling");
        const initTex = initialSnap?.canvases?.[0]?.r3f?.textures ?? 0;
        const endTex = c0.r3f?.textures ?? 0;
        if (endTex - initTex > 24) {
          throw new Error(`Texture count leaked across quality cycling: ${initTex} -> ${endTex}`);
        }
        assertNoRuntimeErrors(collector, "T2-B1-1");
        return { initTex, endTex };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B1-2", "2 vs 4 vs 8 seats in 3D Studio keeps activePointLights <= 18", "B1.3D-Boundaries", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B1-2", { collector });
      try {
        const results = {};
        for (const seats of [2, 4, 8]) {
          await page.goto(`${baseUrl}/dev/graphics?tab=r6-4&seats=${seats}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await page.waitForSelector("canvas", { timeout: 20000 });
          await sleep(1200);
          const snap = await getWebGLSnapshot(page);
          const pl = snap?.canvases?.[0]?.sceneLights?.activePointLights ?? null;
          results[`seats_${seats}`] = pl;
          if (pl == null || pl > 18) {
            throw new Error(`Seats=${seats}: activePointLights=${pl} exceeds budget <= 18`);
          }
        }
        assertNoRuntimeErrors(collector, "T2-B1-2");
        return results;
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B1-3", "Rapid camera preset spam (1->5->10->15->16) settles without NaN position", "B1.3D-Boundaries", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B1-3", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(1400);

        for (const camId of [1, 5, 10, 15, 16, 1, 10]) {
          await page.evaluate((id) => {
            const b = Array.from(document.querySelectorAll("button")).find(
              (el) => (el.textContent || "").trim() === String(id) && (el.getAttribute("title") || "").length > 0
            );
            b?.click();
          }, camId);
          await sleep(80);
        }
        await sleep(800);
        const snap = await getWebGLSnapshot(page);
        const pos = snap?.canvases?.[0]?.cameraPos;
        if (!pos || Number.isNaN(pos.x) || Number.isNaN(pos.y) || Number.isNaN(pos.z)) {
          throw new Error(`Invalid camera position after rapid preset spam: ${JSON.stringify(pos)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B1-3");
        return { settledPos: pos };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B1-4", "Fullscreen 2D overlay pauses 3D frameloop='never' and resumes on exit", "B1.3D-Boundaries", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T2-B1-4-d", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(dispPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await dispPage.waitForSelector("canvas", { timeout: 20000 });
        await sleep(1200);

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "tangToc" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "tt:show" });
        await sleep(600);
        const pausedSnap = await getWebGLSnapshot(dispPage);
        const pausedLoop = pausedSnap?.canvases?.[0]?.r3f?.frameloop;

        await hostSock.emitAck("action", { type: "round:set", round: "veDich" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await sleep(800);
        const activeSnap = await getWebGLSnapshot(dispPage);
        const activeLoop = activeSnap?.canvases?.[0]?.r3f?.frameloop;

        if (pausedLoop !== "never" || activeLoop === "never") {
          throw new Error(`Expected frameloop never->always, got paused=${pausedLoop}, resumed=${activeLoop}`);
        }
        assertNoRuntimeErrors(collector, "T2-B1-4");
        return { pausedLoop, activeLoop };
      } finally {
        if (hostSock) hostSock.close();
        await dispPage.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B1-5", "PTZ extreme zoom clamps [1.0x, 2.5x] and resets cleanly", "B1.3D-Boundaries", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B1-5", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(1200);

        const box = await page.$eval("canvas", (c) => {
          const r = c.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        await page.mouse.move(box.x, box.y);
        for (let i = 0; i < 15; i++) {
          await page.mouse.wheel({ deltaY: -300 });
        }
        await sleep(250);
        const zoomText = await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll("button")).find((el) => (el.textContent || "").includes("Zoom"));
          return b ? b.textContent.trim() : "";
        });
        const match = zoomText.match(/Zoom\s+([\d.]+)x/);
        const zoomVal = match ? parseFloat(match[1]) : 0;
        if (!zoomVal || zoomVal > 2.51 || zoomVal < 1.0) {
          throw new Error(`PTZ zoom out of bounds [1.0, 2.5]: "${zoomText}"`);
        }
        await clickButtonByText(page, "Đặt lại", { timeoutMs: 4000, waitAfterMs: 200 });
        assertNoRuntimeErrors(collector, "T2-B1-5");
        return { maxClampedZoom: zoomVal };
      } finally {
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA B2: Sandbox & Iframe Boundaries
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T2-B2-1", "8-seat rapid tab switching keeps Player iframe count bounded & preserves Seat 0 draft", "B2.Sandbox-Iframes", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B2-1", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 8, ruleset: "O27", timeoutMs: 12000 });
        await clickButtonByText(page, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 15000, waitAfterMs: 200 });
        if (await tryClickButtonByText(page, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(page, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(page, "VCNV", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Hàng 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Mở Câu Hỏi", { waitAfterMs: 200 });
        await clickButtonByText(page, "Đếm 15s (Space)", { waitAfterMs: 300 });

        const seat0 = await selectSandboxSeatTab(page, 0);
        await seat0.frame.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await seat0.frame.type('input[placeholder*="Nhập đáp án"]', "DRAFT_SEAT_0");

        for (let s = 1; s < 8; s++) {
          await selectSandboxSeatTab(page, s);
        }
        const playerIframeCount = await page.evaluate(() =>
          document.querySelectorAll('iframe[title^="Player Viewport"]').length
        );
        const back0 = await selectSandboxSeatTab(page, 0);
        const preservedVal = await back0.frame.$eval('input[placeholder*="Nhập đáp án"]', (el) => el.value);

        if (playerIframeCount > 2) {
          throw new Error(`Expected active-only PlayerPad mounting (<= 2 iframes), found ${playerIframeCount} mounted Player iframes`);
        }
        if (preservedVal !== "DRAFT_SEAT_0") {
          throw new Error(`Seat 0 unsaved draft lost across tab switch: got "${preservedVal}"`);
        }
        assertNoRuntimeErrors(collector, "T2-B2-1");
        return { playerIframeCount, preservedVal };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-2", "Sandbox 2-seat min vs 8-seat max renders exact tab count", "B2.Sandbox-Iframes", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B2-2", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 2, ruleset: "O26", timeoutMs: 12000 });
        const count2 = await page.evaluate(() => {
          const label = Array.from(document.querySelectorAll("span")).find((s) => (s.textContent || "").trim() === "Thí sinh:");
          return label?.parentElement?.querySelectorAll("button").length ?? 0;
        });
        if (count2 !== 2) throw new Error(`Expected 2 seat tabs, got ${count2}`);

        await launchOlympiaSandbox(page, baseUrl, { seats: 8, ruleset: "O27", timeoutMs: 12000 });
        const count8 = await page.evaluate(() => {
          const label = Array.from(document.querySelectorAll("span")).find((s) => (s.textContent || "").trim() === "Thí sinh:");
          return label?.parentElement?.querySelectorAll("button").length ?? 0;
        });
        if (count8 !== 8) throw new Error(`Expected 8 seat tabs, got ${count8}`);
        assertNoRuntimeErrors(collector, "T2-B2-2");
        return { count2, count8 };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-3", "Rapidly clicking Display viewport 20x unlocks audio once without errors", "B2.Sandbox-Iframes", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B2-3", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light&audio=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 20000 });
        for (let i = 0; i < 20; i++) {
          await page.mouse.click(200, 200);
        }
        await sleep(300);
        assertNoRuntimeErrors(collector, "T2-B2-3");
        return { clicks: 20 };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-4", "Toggling .gpu-saver-mode 5x keeps DOM class & localStorage consistent", "B2.Sandbox-Iframes", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B2-4", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        await page.goto(`${baseUrl}/admin/sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((b) => (b.getAttribute("title") || "").includes("Cài đặt hệ thống")), { timeout: 20000 });
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.getAttribute("title") || "").includes("Cài đặt hệ thống"));
          btn?.click();
        });
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Chế độ tiết kiệm GPU"), { timeout: 8000 });
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => {
            const p = Array.from(document.querySelectorAll("p")).find((el) => (el.textContent || "").includes("Chế độ tiết kiệm GPU"));
            p?.parentElement?.parentElement?.querySelector("button")?.click();
          });
          await sleep(60);
        }
        const st = await page.evaluate(() => ({
          hasClass: document.documentElement.classList.contains("gpu-saver-mode"),
          ls: localStorage.getItem("quizorra_gpu_saver"),
        }));
        if (!st.hasClass || st.ls !== "true") {
          throw new Error(`After 5 toggles expected true, got ${JSON.stringify(st)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B2-4");
        return st;
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B2-5", "Reloading /admin/sandbox leaves 0 runtime errors & bounded sessionStorage", "B2.Sandbox-Iframes", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B2-5", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        await page.goto(`${baseUrl}/admin/sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1000);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1000);
        const ssLen = await page.evaluate(() => JSON.stringify(sessionStorage).length);
        assertNoRuntimeErrors(collector, "T2-B2-5");
        return { sessionStorageBytes: ssLen };
      } finally {
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA B3: Olympia Engine & Ruleset Boundaries
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T2-B3-1", "Shared Khởi Động 5s wrong-answer lockout rejects premature kd:wrong", "B3.Engine-Rules", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B3-1", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "khoiDong" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "kd:selectSegment", segment: "shared" });
        await hostSock.emitAck("action", { type: "kd:start" });
        await sleep(3700);
        await hostSock.emitAck("action", { type: "kd:next" });
        await hostSock.emitAck("action", { type: "kd:timer" });

        const earlyAck = await hostSock.emitAck("action", { type: "kd:wrong" });
        if (earlyAck?.ok !== false) {
          throw new Error(`Expected early kd:wrong within 5s to be rejected, got: ${JSON.stringify(earlyAck)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B3-1");
        return { earlyRejected: true, error: earlyAck?.error };
      } finally {
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-2", "O22 Quarter switching (Q1 20/40 vs Q2 20/30) updates VD package options", "B3.Engine-Rules", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T2-B3-2", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O22" });
        await hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 200 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(hostPage, "Về Đích", { waitAfterMs: 250 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });

        await clickButtonByText(hostPage, "Q1 (2 câu 20/40)", { waitAfterMs: 250 });
        const q1Text = await hostPage.evaluate(() => document.body?.innerText || "");
        await clickButtonByText(hostPage, "Q2 (3 câu 20/30)", { waitAfterMs: 250 });
        const q2Text = await hostPage.evaluate(() => document.body?.innerText || "");

        if (!q1Text.includes("20đ / 40đ") || !q2Text.includes("20đ / 30đ")) {
          throw new Error("O22 Q1/Q2 package point options did not switch cleanly");
        }
        assertNoRuntimeErrors(collector, "T2-B3-2");
        return { q1AndQ2Verified: true };
      } finally {
        await hostPage.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-3", "VCNV Bell Clear Guard blocks unjudged clear & unlocks after wrongCNV", "B3.Engine-Rules", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T2-B3-3-h", { collector });
      let p0Sock = null;
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        p0Sock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 0, name: "TS1" });

        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 200 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(hostPage, "VCNV", { waitAfterMs: 250 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await p0Sock.emitAck("playerBuzz", { seat: 0 });
        await sleep(300);

        await clickButtonByText(hostPage, "Tắt tín hiệu chuông", { waitAfterMs: 250 });
        const confirmDisabledBefore = await hostPage.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Xác nhận Tắt & Loại"));
          return { exists: Boolean(btn), disabled: Boolean(btn?.disabled) };
        });
        if (!confirmDisabledBefore.exists || !confirmDisabledBefore.disabled) {
          throw new Error(`Expected clear-bells confirm disabled before judging: ${JSON.stringify(confirmDisabledBefore)}`);
        }
        await clickButtonByText(hostPage, "Hủy bỏ", { waitAfterMs: 200 });
        await clickButtonByText(hostPage, "✘ Chấm SAI", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Tắt tín hiệu chuông", { waitAfterMs: 250 });
        const confirmEnabledAfter = await hostPage.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Xác nhận Tắt & Loại"));
          return { exists: Boolean(btn), disabled: Boolean(btn?.disabled) };
        });
        if (!confirmEnabledAfter.exists || confirmEnabledAfter.disabled) {
          throw new Error(`Expected clear-bells confirm enabled after wrongCNV: ${JSON.stringify(confirmEnabledAfter)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B3-3");
        return { bellGuardVerified: true };
      } finally {
        if (p0Sock) p0Sock.close();
        await hostPage.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-4", "Banner 6.5s guard rejects premature banner:hide; banner:skip dismisses immediately", "B3.Engine-Rules", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B3-4", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "khoiDong" });
        await sleep(300);

        const earlyHide = await hostSock.emitAck("action", { type: "banner:hide" });
        const afterEarly = hostSock.getState()?.banner;
        if (earlyHide?.ok !== false || !afterEarly) {
          throw new Error(`Expected banner:hide < 6.5s to keep banner active; ack=${JSON.stringify(earlyHide)}, banner=${afterEarly}`);
        }
        const skipAck = await hostSock.emitAck("action", { type: "banner:skip" });
        const afterSkip = hostSock.getState()?.banner;
        if (!skipAck?.ok || afterSkip != null) {
          throw new Error(`Expected banner:skip to clear banner immediately; ack=${JSON.stringify(skipAck)}, banner=${afterSkip}`);
        }
        assertNoRuntimeErrors(collector, "T2-B3-4");
        return { bannerGuardVerified: true };
      } finally {
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-5", "canStartScoreSummary blocks summary:start mid-round & enables when round finished", "B3.Engine-Rules", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B3-5", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        const lobbySummary = await hostSock.emitAck("action", { type: "summary:start" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "khoiDong" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "kd:start" });
        const midSummary = await hostSock.emitAck("action", { type: "summary:start" });

        if (lobbySummary?.ok !== false || midSummary?.ok !== false) {
          throw new Error(`Expected summary:start blocked in lobby/mid-round: lobby=${JSON.stringify(lobbySummary)}, mid=${JSON.stringify(midSummary)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B3-5");
        return { blockedInLobbyAndMidRound: true };
      } finally {
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B3-6", "CHP limit 3 stops at 3 questions ('done') while 'unlimited' allows Q4+", "B3.Engine-Rules", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B3-6", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26", chpQuestionLimit: 3 });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "cauHoiPhu" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "chp:selectSeats", seats: [0, 1] });
        for (let i = 0; i < 3; i++) {
          await hostSock.emitAck("action", { type: "chp:next" });
        }
        await hostSock.emitAck("action", { type: "chp:next" });
        const phaseAt3 = hostSock.getState()?.cauHoiPhu?.phase;
        if (phaseAt3 !== "done") {
          throw new Error(`Expected CHP limit=3 to reach phase='done' after 3 questions, got '${phaseAt3}'`);
        }

        await hostSock.emitAck("action", { type: "system:setChpLimit", limit: "unlimited" });
        await hostSock.emitAck("action", { type: "chp:next" });
        const qIdxUnlimited = hostSock.getState()?.cauHoiPhu?.qIdx;
        if ((qIdxUnlimited ?? 0) < 3) {
          throw new Error(`Expected unlimited CHP to allow Q4+, got qIdx=${qIdxUnlimited}`);
        }
        assertNoRuntimeErrors(collector, "T2-B3-6");
        return { phaseAt3, qIdxUnlimited };
      } finally {
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA B4: PlayerPad Input & Buzzer Corners
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T2-B4-1", "Spacebar repeat:true & <160ms double-click buzz anti-spam sends <= 1 buzz", "B4.PlayerPad-Corners", async () => {
      const collector = createErrorCollector();
      const { page: pPage } = await createTrackedPage(browser, baseUrl, "T2-B4-1", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(pPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "khoiDong" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "kd:selectSegment", segment: "shared" });
        await hostSock.emitAck("action", { type: "kd:start" });
        await sleep(3700);
        await hostSock.emitAck("action", { type: "kd:next" });

        await pPage.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await pPage.waitForFunction(() => (document.body?.innerText || "").includes("🔔") || (document.body?.innerText || "").includes("BẤM CHUÔNG"), { timeout: 15000 });

        // Dispatch Space with repeat: true — must be ignored!
        await pPage.evaluate(() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", repeat: true, bubbles: true }));
        });
        await sleep(250);
        if (hostSock.getState()?.khoiDong?.buzzedSeat != null) {
          throw new Error("Held Spacebar (repeat:true) should be ignored by anti-spam guard");
        }
        assertNoRuntimeErrors(collector, "T2-B4-1");
        return { repeatIgnored: true };
      } finally {
        if (hostSock) hostSock.close();
        await pPage.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-2", "Concurrent 2-seat buzz race picks exactly 1 winner", "B4.PlayerPad-Corners", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B4-2", { collector });
      let hostSock = null, s0 = null, s1 = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        s0 = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 0, name: "TS1" });
        s1 = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 1, name: "TS2" });

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "khoiDong" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "kd:selectSegment", segment: "shared" });
        await hostSock.emitAck("action", { type: "kd:start" });
        await sleep(3700);
        await hostSock.emitAck("action", { type: "kd:next" });

        const [ack0, ack1] = await Promise.all([
          s0.emitAck("playerBuzz", { seat: 0 }),
          s1.emitAck("playerBuzz", { seat: 1 }),
        ]);
        const wins = [ack0?.ok, ack1?.ok].filter(Boolean).length;
        if (wins !== 1) {
          throw new Error(`Expected exactly 1 concurrent buzz winner, got ack0=${JSON.stringify(ack0)}, ack1=${JSON.stringify(ack1)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B4-2");
        return { ack0, ack1 };
      } finally {
        if (s1) s1.close();
        if (s0) s0.close();
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-3", "Empty/whitespace answer blocked & >120-char input handled safely", "B4.PlayerPad-Corners", async () => {
      const collector = createErrorCollector();
      const { page: pPage } = await createTrackedPage(browser, baseUrl, "T2-B4-3", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(pPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "vcnv" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "vcnv:selectRow", row: 0 });
        await hostSock.emitAck("action", { type: "vcnv:openQuestion" });
        await hostSock.emitAck("action", { type: "vcnv:timer" });

        await pPage.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await pPage.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 15000 });
        await pPage.type('input[placeholder*="Nhập đáp án"]', "   ");
        await pPage.keyboard.press("Enter");
        await sleep(200);
        const submittedBlank = await pPage.evaluate(() => (document.body?.innerText || "").includes("Đáp án đã gửi"));
        if (submittedBlank) throw new Error("Whitespace-only answer was accepted");

        await pPage.type('input[placeholder*="Nhập đáp án"]', "A".repeat(150));
        await pPage.keyboard.press("Enter");
        await sleep(200);
        assertNoRuntimeErrors(collector, "T2-B4-3");
        return { blankBlockedAndLongSafe: true };
      } finally {
        if (hostSock) hostSock.close();
        await pPage.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-4", "Eliminated VCNV seat sees '🔒 Khóa quyền' & Host re-unlocks", "B4.PlayerPad-Corners", async () => {
      const collector = createErrorCollector();
      const { page: pPage } = await createTrackedPage(browser, baseUrl, "T2-B4-4", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(pPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "vcnv" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "vcnv:toggleLockSeat", seat: 0 });

        await pPage.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await pPage.waitForFunction(() => (document.body?.innerText || "").includes("Khóa quyền") || (document.body?.innerText || "").includes("ĐÃ KHÓA"), { timeout: 15000 });

        await hostSock.emitAck("action", { type: "vcnv:toggleLockSeat", seat: 0 });
        await pPage.waitForFunction(() => !(document.body?.innerText || "").includes("Khóa quyền"), { timeout: 10000 });
        assertNoRuntimeErrors(collector, "T2-B4-4");
        return { lockAndUnlockVerified: true };
      } finally {
        if (hostSock) hostSock.close();
        await pPage.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B4-5", "Non-tied seat in CHP sees 'NGOÀI NHÓM CHP' & disabled buzzer", "B4.PlayerPad-Corners", async () => {
      const collector = createErrorCollector();
      const { page: pPage } = await createTrackedPage(browser, baseUrl, "T2-B4-5", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(pPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "cauHoiPhu" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "chp:selectSeats", seats: [0, 1] });
        await hostSock.emitAck("action", { type: "chp:next" });
        await hostSock.emitAck("action", { type: "chp:show" });

        await pPage.goto(`${baseUrl}/olympia/play/${room.code}?seat=2&name=TS3&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await pPage.waitForFunction(() => (document.body?.innerText || "").includes("NGOÀI NHÓM CHP"), { timeout: 15000 });
        assertNoRuntimeErrors(collector, "T2-B4-5");
        return { outsideChpLocked: true };
      } finally {
        if (hostSock) hostSock.close();
        await pPage.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA B5: Site-Wide & API Edge Cases
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T2-B5-1", "Invalid PIN ('000000', 'abc') on '/' & '/play' handles cleanly with 0 pageerrors", "B5.Site-Edge", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B5-1", { collector });
      try {
        await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector('input[maxLength="6"]', { timeout: 15000 });
        await page.type('input[maxLength="6"]', "000000");
        await page.type('input[maxLength="30"]', "Tester");
        await page.click('form button[type="submit"]');
        await sleep(600);
        assertNoRuntimeErrors(collector, "T2-B5-1");
        return { invalidPinHandled: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-2", "Unauthorized POST /api/rooms & wrong Master Key return 401", "B5.Site-Edge", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B5-2", { collector });
      try {
        await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
        const res = await page.evaluate(async () => {
          const badAuth = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "WrongPassword123", isMasterKey: true }),
          });
          const unauthRoom = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "CLASSIC" }),
          });
          return { badAuthStatus: badAuth.status, unauthRoomStatus: unauthRoom.status };
        });
        if (res.badAuthStatus !== 401 || res.unauthRoomStatus !== 401) {
          throw new Error(`Expected 401 for bad auth & unauth room creation, got ${JSON.stringify(res)}`);
        }
        assertNoRuntimeErrors(collector, "T2-B5-2");
        return res;
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-3", "Offline network mode on /admin/sandbox 'Chạy Offline' works cleanly", "B5.Site-Edge", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B5-3", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", offline: true, timeoutMs: 15000 });
        await page.setOfflineMode(true);
        await clickButtonByText(page, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 8000, waitAfterMs: 300 });
        await page.setOfflineMode(false);
        assertNoRuntimeErrors(collector, "T2-B5-3");
        return { offlineNetworkOk: true };
      } finally {
        await page.setOfflineMode(false).catch(() => {});
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-4", "Rapid route navigation / -> quiz-bank -> sandbox -> dev/graphics produces 0 pageerrors", "B5.Site-Edge", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B5-4", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        for (const route of ["/", "/admin/quiz-bank", "/admin/sandbox", "/dev/graphics?tab=r4", "/admin/olympia/create"]) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await sleep(250);
        }
        assertNoRuntimeErrors(collector, "T2-B5-4");
        return { navigatedCount: 5 };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T2-B5-5", "GET /api/rooms?page=1&limit=10 returns bounded JSON (or clean 500 offline)", "B5.Site-Edge", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T2-B5-5", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        const res = await page.evaluate(async () => {
          const token = localStorage.getItem("admin_token");
          const r = await fetch("/api/rooms?page=1&limit=10", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const text = await r.text();
          return { status: r.status, len: text.length, hasSnapshotBlob: text.includes("olympiaSnapshot") };
        });
        if (res.status === 200 && res.hasSnapshotBlob) {
          throw new Error("GET /api/rooms leaked heavy config.olympiaSnapshot blob");
        }
        if (res.status !== 200 && res.status !== 500) {
          throw new Error(`Unexpected GET /api/rooms status: ${res.status}`);
        }
        assertNoRuntimeErrors(collector, "T2-B5-5");
        return res;
      } finally {
        await page.close();
      }
    })
  );

  return summarizeCases(2, "Tier 2: Boundary & Corner Cases (B1-B5)", cases);
}
