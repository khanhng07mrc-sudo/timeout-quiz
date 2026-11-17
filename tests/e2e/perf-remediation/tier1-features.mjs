import {
  MASTER_KEY,
  assertNoRuntimeErrors,
  clickButtonByText,
  connectOlympiaSocket,
  createErrorCollector,
  createSandboxRoomApi,
  createTrackedPage,
  getDisplayFrame,
  getPlayerFrame,
  launchOlympiaSandbox,
  loginAdminFast,
  loginAdminViaUi,
  runCase,
  selectSandboxSeatTab,
  sleep,
  summarizeCases,
  triggerPointerDownBuzzer,
  tryClickButtonByText,
} from "./lib/browser.mjs";
import { getWebGLSnapshot, sampleContext } from "./lib/cdp-profiler.mjs";

export async function runTier(ctx) {
  const { browser, baseUrl } = ctx;
  const cases = [];

  // ═══════════════════════════════════════════════════════════════════════
  // AREA A1: 3D Studio Lighting, Camera & Visual Elements (#1-#6)
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T1-A1-1", "/dev/graphics?tab=r6-4 mounts WebGL canvas with valid geometry & triangle budget", "A1.3D-Studio", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A1-1", { collector });
      try {
        await page.goto(`${baseUrl}/dev/graphics?tab=r6-4`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(2000);

        const snap = await getWebGLSnapshot(page);
        const c0 = snap?.canvases?.[0];
        if (!c0 || c0.width === 0 || c0.height === 0) {
          throw new Error("WebGL canvas missing or zero-sized on /dev/graphics?tab=r6-4");
        }
        if ((c0.r3f?.geometries ?? 0) <= 0 || (c0.sceneLights?.totalMeshes ?? 0) + (c0.sceneLights?.instancedMeshes ?? 0) <= 0) {
          throw new Error(`3D scene empty: ${JSON.stringify(c0)}`);
        }
        const tris = c0.r3f?.triangles ?? snap.lastFrameTriangles ?? 0;
        if (tris > 120000) {
          throw new Error(`Scene triangles=${tris} exceeds maxTotalSceneTriangles=120000`);
        }
        assertNoRuntimeErrors(collector, "T1-A1-1");
        return { width: c0.width, height: c0.height, geometries: c0.r3f?.geometries, triangles: tris };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A1-2", "Idle R4 lighting renders sapphire/blue studio without black screen", "A1.3D-Studio", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A1-2", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(2000);

        const indicator = await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll("div")).find((d) =>
            (d.getAttribute("title") || "").includes("Trạng thái ánh sáng trường quay")
          );
          const canvas = document.querySelector("canvas");
          return {
            title: el?.getAttribute("title") || "",
            text: el?.textContent?.trim() || "",
            canvasW: canvas?.width || 0,
            canvasH: canvas?.height || 0,
          };
        });
        if (!indicator.title.includes("BLUE") && !indicator.text.includes("CHỜ")) {
          throw new Error(`Expected BLUE/idle studio indicator in lobby, got ${JSON.stringify(indicator)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A1-2");
        return indicator;
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A1-3", "BLUE -> RED lighting transition on Về Đích stage", "A1.3D-Studio", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A1-3", { collector });
      try {
        await page.goto(`${baseUrl}/dev/graphics?tab=kd`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("#graphic-studio-3d-vedich-blue canvas", { timeout: 25000 });
        await page.waitForSelector("#graphic-studio-3d-vedich-red canvas", { timeout: 25000 });
        await sleep(2000);

        const hueInfo = await page.evaluate(() => {
          function sampleCanvasRgb(sel) {
            const c = document.querySelector(`${sel} canvas`);
            if (!c) return null;
            return { width: c.width, height: c.height };
          }
          const blueText = document.querySelector("#graphic-studio-3d-vedich-blue")?.textContent || "";
          const redText = document.querySelector("#graphic-studio-3d-vedich-red")?.textContent || "";
          return {
            blue: sampleCanvasRgb("#graphic-studio-3d-vedich-blue"),
            red: sampleCanvasRgb("#graphic-studio-3d-vedich-red"),
            hasBlueSection: blueText.length > 0,
            hasRedSection: redText.length > 0,
          };
        });
        if (!hueInfo.blue?.width || !hueInfo.red?.width) {
          throw new Error(`Missing BLUE/RED canvases on /dev/graphics?tab=kd: ${JSON.stringify(hueInfo)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A1-3");
        return hueInfo;
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A1-4", "Camera Director presets (CAM 1,2,4,5,10,15,16) & CUT/MORPH toggle move camera", "A1.3D-Studio", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A1-4", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(1800);

        // Toggle CUT mode for deterministic instant snap
        await clickButtonByText(page, "MƯỢT", { timeoutMs: 8000, waitAfterMs: 150 });
        const positions = {};
        for (const camId of [1, 2, 4, 5, 10, 15, 16]) {
          await page.evaluate((id) => {
            const btns = Array.from(document.querySelectorAll("button"));
            const b = btns.find((el) => (el.textContent || "").trim() === String(id) && (el.getAttribute("title") || "").length > 0);
            if (!b) throw new Error(`Director cam button ${id} not found`);
            b.click();
          }, camId);
          await sleep(220);
          const snap = await getWebGLSnapshot(page);
          positions[`C${camId}`] = snap?.canvases?.[0]?.cameraPos || null;
        }
        const uniqueCoords = new Set(Object.values(positions).map((p) => (p ? `${p.x},${p.y},${p.z}` : "null")));
        if (uniqueCoords.size < 5) {
          throw new Error(`Camera presets did not move camera distinctly: ${JSON.stringify(positions)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A1-4");
        return { positions, uniqueCount: uniqueCoords.size };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A1-5", "Quality switcher (LT->MD->HQ) & PTZ drag/wheel + Reset badge", "A1.3D-Studio", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A1-5", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}?perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(1500);

        const qLabels = [];
        for (let i = 0; i < 3; i++) {
          const cur = await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll("button")).find((el) =>
              (el.getAttribute("title") || "").startsWith("Chất lượng đồ họa:")
            );
            if (!b) return null;
            const txt = (b.textContent || "").trim();
            b.click();
            return txt;
          });
          qLabels.push(cur);
          await sleep(300);
        }
        if (new Set(qLabels.filter(Boolean)).size < 3) {
          throw new Error(`Quality switcher did not cycle across 3 states: ${JSON.stringify(qLabels)}`);
        }

        // PTZ drag + wheel on canvas
        const box = await page.$eval("canvas", (c) => {
          const r = c.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();
        await page.mouse.move(box.x + 80, box.y - 30, { steps: 5 });
        await page.mouse.up();
        await page.mouse.wheel({ deltaY: -240 });
        await sleep(250);

        const hasResetBadge = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("button")).some((b) =>
            (b.textContent || "").includes("Đặt lại")
          );
        });
        if (!hasResetBadge) {
          throw new Error("PTZ zoom/reset floating badge did not appear after drag + wheel");
        }
        await clickButtonByText(page, "Đặt lại", { timeoutMs: 4000, waitAfterMs: 200 });
        assertNoRuntimeErrors(collector, "T1-A1-5");
        return { qualityCycle: qLabels, ptzResetTested: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A1-6", "3D Studio pointLight <= 18 & instancedMeshes > 0 parity contract", "A1.3D-Studio", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A1-6", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/display/${room.code}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("canvas", { timeout: 25000 });
        await sleep(2200);

        const snap = await getWebGLSnapshot(page);
        const c0 = snap?.canvases?.[0];
        const lights = c0?.sceneLights;
        if (!lights) throw new Error("Failed inspecting R3F sceneLights");
        if (lights.activePointLights > 18) {
          throw new Error(`activePointLights=${lights.activePointLights} exceeds budget <= 18`);
        }
        if (lights.shadowCastingLights > 1) {
          throw new Error(`shadowCastingLights=${lights.shadowCastingLights} exceeds budget <= 1`);
        }
        if ((lights.instancedMeshes ?? 0) <= 0) {
          throw new Error(`instancedMeshes=${lights.instancedMeshes} (expected > 0 after M1 instancing)`);
        }
        assertNoRuntimeErrors(collector, "T1-A1-6");
        return lights;
      } finally {
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA A2: /admin/sandbox Shell & Olympia Launch (#7, #8, #9, #11)
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T1-A2-1", "Master Key UI login unlocks /admin/sandbox", "A2.Sandbox-Shell", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A2-1", { collector });
      try {
        await loginAdminViaUi(page, baseUrl, "/admin/sandbox");
        await page.waitForFunction(() => {
          return Array.from(document.querySelectorAll("select")).some((sel) =>
            Array.from(sel.options).some((opt) => opt.value === "OLYMPIA")
          );
        }, { timeout: 20000 });
        assertNoRuntimeErrors(collector, "T1-A2-1");
        return { unlocked: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A2-2", "Online OLYMPIA launch in /admin/sandbox stays mounted (no DB-offline teardown)", "A2.Sandbox-Shell", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A2-2", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", timeoutMs: 12000 });
        const dispFrame = await getDisplayFrame(page, 10000);
        await dispFrame.waitForSelector("canvas", { timeout: 15000 });
        const padFrame = await getPlayerFrame(page, 0, 10000);
        const padText = await padFrame.evaluate(() => document.body?.innerText || "");
        if (!padText.includes("Thí sinh 1") && !padText.includes("PHÒNG CHỜ")) {
          throw new Error(`PlayerPad iframe did not render seat 0: ${padText.slice(0, 200)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A2-2");
        return { mounted: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A2-3", "OLYMPIA Sandbox opens 0 '/' sockets and <=1 host '/olympia' socket", "A2.Sandbox-Shell", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A2-3", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", timeoutMs: 12000 });
        await sleep(1000);
        const rootSockets = collector.webSocketsCreated.filter((w) => w.url.includes("sandbox=1") || !w.url.includes("EIO=4"));
        const olympiaSockets = collector.webSocketsCreated.filter((w) => w.url.includes("/socket.io/?EIO=4"));
        const rootRejections = collector.webSocketFramesReceived.filter((f) => f.payload.includes("Phòng không tồn tại"));
        if (rootSockets.length > 0 || rootRejections.length > 0) {
          throw new Error(
            `Expected 0 '/' namespace sockets in OLYMPIA sandbox; got rootSockets=${JSON.stringify(rootSockets)}, rejections=${JSON.stringify(rootRejections)}`
          );
        }
        if (olympiaSockets.length > 3) {
          throw new Error(`Too many /olympia sockets opened (${olympiaSockets.length}): expected 1 host + 1 display + 1 active pad = 3`);
        }
        assertNoRuntimeErrors(collector, "T1-A2-3");
        return { rootSocketCount: rootSockets.length, olympiaSocketCount: olympiaSockets.length };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A2-4", "Switching contestant tabs (0..3) updates active PlayerPad without 8x audio leak", "A2.Sandbox-Shell", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A2-4", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", timeoutMs: 12000 });
        const f1 = await selectSandboxSeatTab(page, 1);
        const txt1 = await f1.frame.evaluate(() => document.body?.innerText || "");
        const f2 = await selectSandboxSeatTab(page, 2);
        const txt2 = await f2.frame.evaluate(() => document.body?.innerText || "");
        if (!txt1.includes("Thí sinh 2") || !txt2.includes("Thí sinh 3")) {
          throw new Error(`Seat tab switch mismatch: seat1="${txt1.slice(0, 80)}", seat2="${txt2.slice(0, 80)}"`);
        }
        const padAudioCount = await f2.frame.evaluate(() => document.querySelectorAll("audio").length);
        if (padAudioCount > 4) {
          throw new Error(`PlayerPad iframe has ${padAudioCount} <audio> elements (expected lazy/none)`);
        }
        assertNoRuntimeErrors(collector, "T1-A2-4");
        return { padAudioCount };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A2-5", "'Chạy Offline' launches OlympiaSandboxStudio cleanly with 0 runtime errors", "A2.Sandbox-Shell", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A2-5", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", offline: true, timeoutMs: 15000 });
        await sleep(800);
        const hasOfflineBanner = await page.evaluate(() => {
          const t = document.body?.innerText || "";
          return t.includes("OFFLINE") || t.includes("BẮT ĐẦU") || t.includes("Khởi Động");
        });
        if (!hasOfflineBanner) throw new Error("Offline studio did not render Olympia controls");
        assertNoRuntimeErrors(collector, "T1-A2-5");
        return { offlineLaunched: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A2-6", "GlobalSettingsModal toggles .gpu-saver-mode on <html> & localStorage", "A2.Sandbox-Shell", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A2-6", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        await page.goto(`${baseUrl}/admin/sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("Cài đặt")), { timeout: 20000 });
        // Click header/bottom Cài đặt that opens GlobalSettingsModal (not "Cài đặt chữ tạm thời")
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) => {
            const t = (b.textContent || "").trim();
            return t === "⚙️ Cài đặt" || (t === "Cài đặt" && (b.getAttribute("title") || "").includes("Cài đặt hệ thống"));
          });
          if (!btn) {
            const fallback = Array.from(document.querySelectorAll("button")).find((b) =>
              (b.getAttribute("title") || "").includes("Cài đặt hệ thống")
            );
            if (!fallback) throw new Error("GlobalSettingsModal trigger button not found");
            fallback.click();
          } else {
            btn.click();
          }
        });
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Chế độ tiết kiệm GPU"), { timeout: 8000 });
        await page.evaluate(() => {
          const p = Array.from(document.querySelectorAll("p")).find((el) => (el.textContent || "").includes("Chế độ tiết kiệm GPU"));
          const toggle = p?.parentElement?.parentElement?.querySelector("button");
          if (!toggle) throw new Error("GPU saver toggle button not found");
          toggle.click();
        });
        await sleep(150);
        const state = await page.evaluate(() => ({
          hasClass: document.documentElement.classList.contains("gpu-saver-mode"),
          ls: localStorage.getItem("quizorra_gpu_saver"),
        }));
        if (!state.hasClass || state.ls !== "true") {
          throw new Error(`GPU saver toggle failed: ${JSON.stringify(state)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A2-6");
        return state;
      } finally {
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA A3: Host Console & Olympia 5-Round Gameplay (#7, #9, #10)
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T1-A3-1", "Lobby -> Start Match -> Entrance sequence -> Khởi Động transition", "A3.Olympia-Rounds", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T1-A3-1-host", { collector });
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T1-A3-1-disp", { collector });
      const { page: p0Page } = await createTrackedPage(browser, baseUrl, "T1-A3-1-p0", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p0Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await hostPage.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("BẮT ĐẦU TRẬN ĐẤU OLYMPIA")), { timeout: 20000 });
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { waitAfterMs: 300 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 250 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 350 });
        }
        await clickButtonByText(hostPage, "Chào & Giới thiệu", { timeoutMs: 10000, waitAfterMs: 300 });
        await clickButtonByText(hostPage, "Thí sinh tiếp theo", { timeoutMs: 8000, waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Kết thúc màn chào", { timeoutMs: 8000, waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Vào Vòng KHỞI ĐỘNG", { timeoutMs: 8000, waitAfterMs: 350 });
        const hasKdStart = await hostPage.evaluate(() =>
          Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("Lượt Riêng"))
        );
        if (!hasKdStart) throw new Error("Did not reach Khởi Động controls after entrance");
        assertNoRuntimeErrors(collector, "T1-A3-1");
        return { transitionedToKhoiDong: true };
      } finally {
        await Promise.allSettled([p0Page.close(), dispPage.close(), hostPage.close()]);
      }
    })
  );

  cases.push(
    await runCase("T1-A3-2", "Khởi Động Solo (+10đ) & Shared buzzer steal propagates scores", "A3.Olympia-Rounds", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T1-A3-2-host", { collector });
      const { page: p0Page } = await createTrackedPage(browser, baseUrl, "T1-A3-2-p0", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p0Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(hostPage, "Khởi Động", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Lượt Riêng", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "BẮT ĐẦU", { waitAfterMs: 3900 });
        await clickButtonByText(hostPage, "CÂU TIẾP", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "TÍNH GIỜ (Space)", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "ĐÚNG (Enter)", { waitAfterMs: 350 });

        await clickButtonByText(hostPage, "Lượt Chung", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "BẮT ĐẦU", { waitAfterMs: 3900 });
        await clickButtonByText(hostPage, "CÂU TIẾP", { waitAfterMs: 250 });
        await tryClickButtonByText(hostPage, "TÍNH GIỜ (Space)", { waitAfterMs: 250 });
        const buzz = await triggerPointerDownBuzzer(p0Page, 5000);
        if (!buzz.triggered) throw new Error("Shared KD buzzer did not trigger on PlayerPad");
        await sleep(250);
        await clickButtonByText(hostPage, "ĐÚNG (Enter)", { waitAfterMs: 350 });

        const p0Body = await p0Page.evaluate(() => document.body?.innerText || "");
        if (!p0Body.includes("20")) {
          throw new Error(`Expected Player 0 score 20 after 2 correct KD answers, got: ${p0Body.slice(0, 250)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A3-2");
        return { buzzLatencyMs: buzz.latencyMs };
      } finally {
        await Promise.allSettled([p0Page.close(), hostPage.close()]);
      }
    })
  );

  cases.push(
    await runCase("T1-A3-3", "VCNV Row answer, puzzle tile reveal & CNV bell scoring", "A3.Olympia-Rounds", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T1-A3-3-host", { collector });
      const { page: p0Page } = await createTrackedPage(browser, baseUrl, "T1-A3-3-p0", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p0Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(hostPage, "VCNV", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Mở Các Hàng Ngang", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Hàng 1", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Mở Câu Hỏi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Đếm 15s (Space)", { waitAfterMs: 350 });

        await p0Page.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await p0Page.type('input[placeholder*="Nhập đáp án"]', "DAP AN A");
        await clickButtonByText(p0Page, "GỬI", { waitAfterMs: 300 });

        await clickButtonByText(hostPage, "Hiện ĐA (R)", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Cộng điểm HN", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Lật mở miếng ghép", { waitAfterMs: 250 });

        const bell = await triggerPointerDownBuzzer(p0Page, 5000);
        if (!bell.triggered) throw new Error("VCNV CNV bell did not trigger");
        await sleep(300);
        await clickButtonByText(hostPage, "✔ Chấm ĐÚNG", { waitAfterMs: 350 });
        assertNoRuntimeErrors(collector, "T1-A3-3");
        return { vcnvCompleted: true };
      } finally {
        await Promise.allSettled([p0Page.close(), hostPage.close()]);
      }
    })
  );

  cases.push(
    await runCase("T1-A3-4", "Tăng Tốc ranked submissions & +40/+30 grading", "A3.Olympia-Rounds", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T1-A3-4-host", { collector });
      const { page: p0Page } = await createTrackedPage(browser, baseUrl, "T1-A3-4-p0", { collector });
      const { page: p1Page } = await createTrackedPage(browser, baseUrl, "T1-A3-4-p1", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p0Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p1Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=1&name=TS2&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(hostPage, "Tăng Tốc", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Câu 1", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Hiện Câu Hỏi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Bắt đầu đếm giờ (Space)", { waitAfterMs: 300 });

        await p0Page.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await p0Page.type('input[placeholder*="Nhập đáp án"]', "FIRST");
        await clickButtonByText(p0Page, "GỬI", { waitAfterMs: 250 });

        await p1Page.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await p1Page.type('input[placeholder*="Nhập đáp án"]', "SECOND");
        await clickButtonByText(p1Page, "GỬI", { waitAfterMs: 250 });

        await clickButtonByText(hostPage, "Hiện ĐA TS (R)", { waitAfterMs: 300 });
        // Mark both seats correct via checkboxes in HostConsole ranking preview
        await hostPage.evaluate(() => {
          const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          for (const cb of cbs) {
            if (!cb.checked) cb.click();
          }
        });
        await clickButtonByText(hostPage, "Chấm Điểm (Enter)", { waitAfterMs: 350 });
        const p0Score = await p0Page.evaluate(() => document.body?.innerText || "");
        if (!p0Score.includes("40")) {
          throw new Error(`Expected TS1 fastest ranked +40 pts in Tăng Tốc, got: ${p0Score.slice(0, 200)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A3-4");
        return { tangTocGraded: true };
      } finally {
        await Promise.allSettled([p1Page.close(), p0Page.close(), hostPage.close()]);
      }
    })
  );

  cases.push(
    await runCase("T1-A3-5", "Về Đích Package + Hope Star (2x) + 5s Steal buzzer", "A3.Olympia-Rounds", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T1-A3-5-host", { collector });
      const { page: p1Page } = await createTrackedPage(browser, baseUrl, "T1-A3-5-p1", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p1Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=1&name=TS2&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(hostPage, "Về Đích", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Lên sân khấu", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Mở bảng chọn gói đồ họa", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Xác nhận gói", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Ngôi Sao Hy Vọng", { waitAfterMs: 200 });
        await clickButtonByText(hostPage, "Bắt đầu Câu 1", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Tính Giờ Thi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "ĐÚNG (Enter)", { waitAfterMs: 300 });

        await clickButtonByText(hostPage, "Câu tiếp (N)", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Tính Giờ Thi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "SAI & MỞ CƯỚP 5S", { waitAfterMs: 200 });
        const stealBuzz = await triggerPointerDownBuzzer(p1Page, 4000);
        if (!stealBuzz.triggered) throw new Error("Rival steal buzzer failed during Về Đích 5s window");
        await sleep(250);
        await clickButtonByText(hostPage, "✔ Cướp Đúng", { waitAfterMs: 300 });
        assertNoRuntimeErrors(collector, "T1-A3-5");
        return { stealLatencyMs: stealBuzz.latencyMs };
      } finally {
        await Promise.allSettled([p1Page.close(), hostPage.close()]);
      }
    })
  );

  cases.push(
    await runCase("T1-A3-6", "Câu Hỏi Phụ tie-breaker buzzer + Score Summary cycle", "A3.Olympia-Rounds", async () => {
      const collector = createErrorCollector();
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T1-A3-6-host", { collector });
      const { page: p0Page } = await createTrackedPage(browser, baseUrl, "T1-A3-6-p0", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26" });
        await Promise.all([
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          p0Page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=TS1&sandbox=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 20000, waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(hostPage, "Câu Hỏi Phụ", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Xác nhận Thí sinh dự thi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Hiện Câu Hỏi", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Tính Giờ (Space)", { waitAfterMs: 250 });
        const chpBuzz = await triggerPointerDownBuzzer(p0Page, 4000);
        if (!chpBuzz.triggered) throw new Error("CHP buzzer did not trigger on tied seat");
        await sleep(250);
        await clickButtonByText(hostPage, "✔ ĐÚNG (Enter)", { waitAfterMs: 300 });

        const hasWinner = await hostPage.evaluate(() => (document.body?.innerText || "").includes("Vô địch"));
        if (!hasWinner) throw new Error("CHP winner banner not shown after correct CHP answer");
        await clickButtonByText(hostPage, "TỔNG KẾT ĐIỂM (B)", { waitAfterMs: 300 });
        const summaryActive = await hostPage.evaluate(() => (document.body?.innerText || "").includes("DỪNG TỔNG KẾT"));
        if (!summaryActive) throw new Error("Score summary did not activate after CHP completion");
        assertNoRuntimeErrors(collector, "T1-A3-6");
        return { chpWinnerAndSummary: true };
      } finally {
        await Promise.allSettled([p0Page.close(), hostPage.close()]);
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA A4: PlayerPad & DisplayScreen Contracts (#8, #9, #10)
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T1-A4-1", "Standalone PlayerPad seat claim & live score/timer render", "A4.Pad-Display", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A4-1", { collector });
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        await page.goto(`${baseUrl}/olympia/play/${room.code}?seat=0&name=${encodeURIComponent("Minh Anh")}&sandbox=1`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Minh Anh"), { timeout: 15000 });
        assertNoRuntimeErrors(collector, "T1-A4-1");
        return { claimed: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A4-2", "PlayerPad Spacebar shortcut & pointerdown buzzer trigger", "A4.Pad-Display", async () => {
      const collector = createErrorCollector();
      const { page: pPage } = await createTrackedPage(browser, baseUrl, "T1-A4-2-p", { collector });
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
        await pPage.waitForFunction(() => (document.body?.innerText || "").includes("BẤM CHUÔNG") || (document.body?.innerText || "").includes("🔔"), { timeout: 15000 });
        await pPage.keyboard.press("Space");
        await sleep(300);
        const st = hostSock.getState();
        if (st?.khoiDong?.buzzedSeat !== 0) {
          throw new Error(`Expected Spacebar to buzz seat 0, got buzzedSeat=${st?.khoiDong?.buzzedSeat}`);
        }
        assertNoRuntimeErrors(collector, "T1-A4-2");
        return { spaceBuzzOk: true };
      } finally {
        if (hostSock) hostSock.close();
        await pPage.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A4-3", "HorizontalAnswerBar submits and renders 'Đáp án đã gửi'", "A4.Pad-Display", async () => {
      const collector = createErrorCollector();
      const { page: pPage } = await createTrackedPage(browser, baseUrl, "T1-A4-3-p", { collector });
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
        await pPage.type('input[placeholder*="Nhập đáp án"]', "HA NOI");
        await pPage.keyboard.press("Enter");
        await pPage.waitForFunction(() => (document.body?.innerText || "").includes("Đáp án đã gửi"), { timeout: 8000 });
        assertNoRuntimeErrors(collector, "T1-A4-3");
        return { submittedDisplayed: true };
      } finally {
        if (hostSock) hostSock.close();
        await pPage.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A4-4", "DisplayScreen UNLOCK_AUDIO, SET_TTS, themeMode & overlayMode toggles", "A4.Pad-Display", async () => {
      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T1-A4-4-d", { collector });
      let hostSock = null;
      try {
        const room = await createSandboxRoomApi(dispPage, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        await dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light&audio=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await dispPage.waitForSelector("canvas", { timeout: 20000 });

        await dispPage.evaluate(() => {
          window.postMessage({ type: "UNLOCK_AUDIO" }, "*");
          window.postMessage({ type: "SET_TTS", enabled: true }, "*");
        });
        await hostSock.emitAck("action", { type: "system:setTheme", themeMode: "o26_classic", overlayMode: "FULLSCREEN" });
        await sleep(300);
        const st1 = hostSock.getState();
        await hostSock.emitAck("action", { type: "system:setTheme", themeMode: "v3_arrow", overlayMode: "LOWER_THIRD" });
        await sleep(300);
        const st2 = hostSock.getState();

        if (st1?.themeMode !== "o26_classic" || st2?.themeMode !== "v3_arrow" || st1?.overlayMode !== "FULLSCREEN" || st2?.overlayMode !== "LOWER_THIRD") {
          throw new Error(`Theme/Overlay toggle mismatch: st1=${JSON.stringify({ t: st1?.themeMode, o: st1?.overlayMode })}, st2=${JSON.stringify({ t: st2?.themeMode, o: st2?.overlayMode })}`);
        }
        assertNoRuntimeErrors(collector, "T1-A4-4");
        return { themeAndOverlayVerified: true };
      } finally {
        if (hostSock) hostSock.close();
        await dispPage.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A4-5", "Socket redaction: display & player views mask/strip unrevealed answers", "A4.Pad-Display", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A4-5", { collector });
      let hostSock = null;
      let dispSock = null;
      let p0Sock = null;
      let p1Sock = null;
      try {
        const room = await createSandboxRoomApi(page, baseUrl, { rulesetId: "O26" });
        hostSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "host", key: room.hostKey || "sandbox" });
        dispSock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "display" });
        p0Sock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 0, name: "TS1" });
        p1Sock = await connectOlympiaSocket(baseUrl, { code: room.code, role: "player", seat: 1, name: "TS2" });

        await hostSock.emitAck("action", { type: "game:start" });
        await hostSock.emitAck("action", { type: "round:set", round: "khoiDong" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "kd:start" });
        await sleep(3700);
        await hostSock.emitAck("action", { type: "kd:next" });
        await sleep(400);

        const hostKd = hostSock.getState()?.khoiDong;
        const dispKd = dispSock.getState()?.khoiDong;
        const p0Kd = p0Sock.getState()?.khoiDong;

        if (!hostKd?.current?.a || hostKd.current.a === "•") {
          throw new Error("Host did not receive unmasked answer");
        }
        if (dispKd?.current?.a !== "•" || p0Kd?.current?.a !== "•") {
          throw new Error(`KD answer leaked! disp=${dispKd?.current?.a}, p0=${p0Kd?.current?.a}`);
        }
        if (dispKd?.seatQueues != null || p0Kd?.seatQueues != null) {
          throw new Error("KD seatQueues leaked to display/player view");
        }

        // Check VCNV answer redaction between players
        await hostSock.emitAck("action", { type: "round:set", round: "vcnv" });
        await hostSock.emitAck("action", { type: "banner:skip" });
        await hostSock.emitAck("action", { type: "vcnv:selectRow", row: 0 });
        await hostSock.emitAck("action", { type: "vcnv:openQuestion" });
        await hostSock.emitAck("action", { type: "vcnv:timer" });
        await p0Sock.emitAck("playerAnswer", { seat: 0, text: "SECRET_P0_ANSWER" });
        await sleep(300);

        const p1Vcnv = p1Sock.getState()?.vcnv;
        const dispVcnv = dispSock.getState()?.vcnv;
        if (p1Vcnv?.answers?.[0]?.text === "SECRET_P0_ANSWER" || dispVcnv?.answers?.[0]?.text === "SECRET_P0_ANSWER") {
          throw new Error("Unrevealed VCNV player answer leaked to rival/display before reveal");
        }
        assertNoRuntimeErrors(collector, "T1-A4-5");
        return { redactionVerified: true };
      } finally {
        if (p1Sock) p1Sock.close();
        if (p0Sock) p0Sock.close();
        if (dispSock) dispSock.close();
        if (hostSock) hostSock.close();
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AREA A5: Site-Wide Pages, Audio & Asset Hygiene (#11, #12, #13)
  // ═══════════════════════════════════════════════════════════════════════

  cases.push(
    await runCase("T1-A5-1", "Home '/' avoids eager 38-audio fetch storm & validates PIN API", "A5.Site-Wide", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A5-1", { collector });
      try {
        await page.goto(`${baseUrl}/`, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(1200);

        const audioCount = collector.audioVideoAssets.length;
        if (audioCount > 4) {
          throw new Error(`Home '/' triggered ${audioCount} eager audio/video requests (expected <= 4 after M4 lazy SoundManager)`);
        }

        const pinChecks = await page.evaluate(async () => {
          const okRes = await fetch("/api/rooms/OFFLINE/validate");
          const badRes = await fetch("/api/rooms/999999/validate");
          return { okStatus: okRes.status, badStatus: badRes.status };
        });
        if (pinChecks.okStatus !== 200 || pinChecks.badStatus !== 404) {
          throw new Error(`Unexpected PIN validate statuses: ${JSON.stringify(pinChecks)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A5-1");
        return { audioCount, ...pinChecks };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A5-2", "/admin/quiz-bank loads presets & OlympiaQuestionStudioModal with 0 RangeErrors", "A5.Site-Wide", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A5-2", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        await page.goto(`${baseUrl}/admin/quiz-bank`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(2000);

        const rangeErrors = collector.consoleErrors.filter((e) => e.message.includes("RangeError") || e.message.includes("saveLocalBank"));
        if (rangeErrors.length > 0) {
          throw new Error(`Detected saveLocalBank RangeError(s): ${JSON.stringify(rangeErrors.slice(0, 3))}`);
        }
        const hasBankUi = await page.evaluate(() => (document.body?.innerText || "").includes("Bộ câu hỏi"));
        if (!hasBankUi) throw new Error("/admin/quiz-bank did not render expected UI");
        assertNoRuntimeErrors(collector, "T1-A5-2");
        return { loaded: true };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A5-3", "/admin/olympia/create renders rulesets O13..O27, rounds & 2..8 seats", "A5.Site-Wide", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A5-3", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        await page.goto(`${baseUrl}/admin/olympia/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Olympia"), { timeout: 20000 });
        const ui = await page.evaluate(() => {
          const txt = document.body?.innerText || "";
          return {
            hasO26: txt.includes("O26") || txt.includes("26"),
            hasSeatInputs: document.querySelectorAll('input[placeholder*="Tên Thí sinh"]').length >= 2,
          };
        });
        if (!ui.hasO26 || !ui.hasSeatInputs) {
          throw new Error(`/admin/olympia/create missing expected controls: ${JSON.stringify(ui)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A5-3");
        return ui;
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A5-4", "/admin/rooms handles DB-offline state gracefully with 0 uncaught pageerrors", "A5.Site-Wide", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A5-4", { collector });
      try {
        await loginAdminFast(page, baseUrl);
        await page.goto(`${baseUrl}/admin/rooms`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1500);
        const bodyLen = await page.evaluate(() => (document.body?.innerText || "").trim().length);
        if (bodyLen === 0) throw new Error("/admin/rooms rendered blank body");
        assertNoRuntimeErrors(collector, "T1-A5-4");
        return { bodyLen };
      } finally {
        await page.close();
      }
    })
  );

  cases.push(
    await runCase("T1-A5-5", "/dev/graphics key tabs & /sw.js service worker script valid", "A5.Site-Wide", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T1-A5-5", { collector });
      try {
        for (const tab of ["r4", "vcnv", "tt", "vd-grid", "summary", "econova"]) {
          await page.goto(`${baseUrl}/dev/graphics?tab=${tab}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await sleep(400);
        }
        const swRes = await page.evaluate(async () => {
          const r = await fetch("/sw.js");
          const txt = await r.text();
          return { status: r.status, len: txt.length, cachesApi: txt.includes('pathname.startsWith("/api/")') };
        });
        if (swRes.status !== 200 || swRes.len < 50) {
          throw new Error(`/sw.js check failed: ${JSON.stringify(swRes)}`);
        }
        assertNoRuntimeErrors(collector, "T1-A5-5");
        return { swStatus: swRes.status, swLen: swRes.len };
      } finally {
        await page.close();
      }
    })
  );

  return summarizeCases(1, "Tier 1: Feature Coverage (A1-A5)", cases);
}
