import fs from "node:fs";
import path from "node:path";
import {
  assertNoRuntimeErrors,
  clickButtonByText,
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
import {
  evaluateProfilingBudgets,
  getCdpMetrics,
  loadBaselineMetrics,
  sampleContext,
} from "./lib/cdp-profiler.mjs";
import { analyzeRegions, compareImages, decodePng } from "./lib/visual-parity.mjs";

export async function runTier(ctx) {
  const { browser, baseUrl, baselineDir } = ctx;
  const cases = [];

  // ═══════════════════════════════════════════════════════════════════════
  // SCENARIO 1: T4-Match — Full Multi-Round Olympia Sandbox Match (O26, 4 Seats)
  // ═══════════════════════════════════════════════════════════════════════
  cases.push(
    await runCase("T4-Match", "Full 5-Round Olympia Match in /admin/sandbox with exact score propagation", "T4.Full-Match", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T4-Match", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, {
          seats: 4,
          ruleset: "O26",
          teamNames: ["Minh Anh", "Quốc Bảo", "Gia Hân", "Thái Dương"],
          useUiLogin: true,
          timeoutMs: 12000,
        });

        const dispFrame = await getDisplayFrame(page, 10000);
        await dispFrame.waitForSelector("canvas", { timeout: 20000 });

        // Start Match -> Entrance -> Khởi Động
        await clickButtonByText(page, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { timeoutMs: 15000, waitAfterMs: 250 });
        if (await tryClickButtonByText(page, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(page, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(page, "Chào & Giới thiệu", { timeoutMs: 10000, waitAfterMs: 200 });
        await clickButtonByText(page, "Thí sinh tiếp theo", { waitAfterMs: 200 });
        await clickButtonByText(page, "Kết thúc màn chào", { waitAfterMs: 200 });
        await clickButtonByText(page, "Vào Vòng KHỞI ĐỘNG", { waitAfterMs: 300 });

        // Round 1: Khởi Động (Solo + Shared)
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Lượt Riêng", { waitAfterMs: 200 });
        await clickButtonByText(page, "BẮT ĐẦU", { waitAfterMs: 3800 });
        await clickButtonByText(page, "CÂU TIẾP", { waitAfterMs: 250 });
        await clickButtonByText(page, "TÍNH GIỜ (Space)", { waitAfterMs: 200 });
        await clickButtonByText(page, "ĐÚNG (Enter)", { waitAfterMs: 250 }); // Seat 0: +10

        await clickButtonByText(page, "Lượt Chung", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "BẮT ĐẦU", { waitAfterMs: 3800 });
        await clickButtonByText(page, "CÂU TIẾP", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "TÍNH GIỜ (Space)", { waitAfterMs: 200 });
        const p1Tab = await selectSandboxSeatTab(page, 1);
        const kdBuzz = await triggerPointerDownBuzzer(p1Tab.frame, 5000);
        if (!kdBuzz.triggered) throw new Error("Shared KD buzz failed for Seat 1");
        await sleep(200);
        await clickButtonByText(page, "ĐÚNG (Enter)", { waitAfterMs: 250 }); // Seat 1: +10

        // Round 2: VCNV
        await clickButtonByText(page, "VCNV", { waitAfterMs: 300 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Mở Các Hàng Ngang", { waitAfterMs: 200 });
        await clickButtonByText(page, "Hàng 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Mở Câu Hỏi", { waitAfterMs: 200 });
        await clickButtonByText(page, "Đếm 15s (Space)", { waitAfterMs: 300 });
        const p0Tab = await selectSandboxSeatTab(page, 0);
        await p0Tab.frame.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await p0Tab.frame.type('input[placeholder*="Nhập đáp án"]', "DAP AN");
        await clickButtonByText(p0Tab.frame, "GỬI", { waitAfterMs: 250 });
        await clickButtonByText(page, "Hiện ĐA (R)", { waitAfterMs: 200 });
        await clickButtonByText(page, "Cộng điểm HN", { waitAfterMs: 200 });
        await clickButtonByText(page, "Lật mở miếng ghép", { waitAfterMs: 200 });
        const p0Bell = await triggerPointerDownBuzzer(p0Tab.frame, 4000);
        if (!p0Bell.triggered) throw new Error("VCNV bell failed for Seat 0");
        await sleep(250);
        await clickButtonByText(page, "✔ Chấm ĐÚNG", { waitAfterMs: 300 });

        // Round 3: Tăng Tốc
        await clickButtonByText(page, "Tăng Tốc", { waitAfterMs: 300 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Câu 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Hiện Câu Hỏi", { waitAfterMs: 200 });
        await clickButtonByText(page, "Bắt đầu đếm giờ (Space)", { waitAfterMs: 250 });
        const p0Tt = await selectSandboxSeatTab(page, 0);
        await p0Tt.frame.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await p0Tt.frame.type('input[placeholder*="Nhập đáp án"]', "TT1");
        await clickButtonByText(p0Tt.frame, "GỬI", { waitAfterMs: 200 });
        await clickButtonByText(page, "Hiện ĐA TS (R)", { waitAfterMs: 250 });
        await page.evaluate(() => {
          const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          if (cbs[0] && !cbs[0].checked) cbs[0].click();
        });
        await clickButtonByText(page, "Chấm Điểm (Enter)", { waitAfterMs: 250 }); // Seat 0: +40

        // Round 4: Về Đích (Hope Star + Steal)
        await clickButtonByText(page, "Về Đích", { waitAfterMs: 300 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Lên sân khấu", { waitAfterMs: 200 });
        await clickButtonByText(page, "Mở bảng chọn gói đồ họa", { waitAfterMs: 200 });
        await clickButtonByText(page, "Xác nhận gói", { waitAfterMs: 200 });
        await clickButtonByText(page, "Ngôi Sao Hy Vọng", { waitAfterMs: 200 });
        await clickButtonByText(page, "Bắt đầu Câu 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Tính Giờ Thi", { waitAfterMs: 200 });
        await clickButtonByText(page, "ĐÚNG (Enter)", { waitAfterMs: 250 }); // Seat 0: +40
        await clickButtonByText(page, "Câu tiếp (N)", { waitAfterMs: 200 });
        await clickButtonByText(page, "Tính Giờ Thi", { waitAfterMs: 200 });
        await clickButtonByText(page, "SAI & MỞ CƯỚP 5S", { waitAfterMs: 200 });
        const p1Steal = await selectSandboxSeatTab(page, 1);
        const stealBuzz = await triggerPointerDownBuzzer(p1Steal.frame, 4000);
        if (!stealBuzz.triggered) throw new Error("Về Đích 5s steal failed");
        await sleep(250);
        await clickButtonByText(page, "✔ Cướp Đúng", { waitAfterMs: 250 }); // Seat 1: +20 -> 30

        // Summary & verify scores
        await clickButtonByText(page, "Trở về vị trí", { waitAfterMs: 200 });
        await tryClickButtonByText(page, "TỔNG KẾT ĐIỂM (B)", { waitAfterMs: 300 });

        const hostBody = await page.evaluate(() => document.body?.innerText || "");
        const padFrame = await getPlayerFrame(page, 1, 5000);
        const padBody = await padFrame.evaluate(() => document.body?.innerText || "");
        if (!hostBody.includes("Minh Anh") || !padBody.includes("30")) {
          throw new Error(`Expected propagated scores on Host & Pad (TS2=30), got padBody=${padBody.slice(0, 200)}`);
        }
        assertNoRuntimeErrors(collector, "T4-Match");
        return { fullMatchPassed: true };
      } finally {
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCENARIO 2: T4-Profile — Automated Before/After CDP Profiling vs Baseline
  // ═══════════════════════════════════════════════════════════════════════
  cases.push(
    await runCase("T4-Profile", "Automated CDP Profiling on /admin/sandbox + HQ + /dev/graphics?tab=kd vs baseline_metrics.json", "T4.CDP-Profile", async () => {
      const baseline = loadBaselineMetrics(baselineDir);
      const collector = createErrorCollector();
      const measured = { phases: {}, network: {} };

      // 1. Measure Home '/'
      const { page: homePage } = await createTrackedPage(browser, baseUrl, "T4-Profile-home", { collector });
      try {
        await homePage.goto(`${baseUrl}/`, { waitUntil: "networkidle2", timeout: 30000 });
        const homeSample = await sampleContext(homePage, 2500);
        measured.home = {
          audioRequestCount: collector.audioVideoAssets.filter((a) => a.page === "T4-Profile-home").length,
          ...homeSample,
        };
      } finally {
        await homePage.close();
      }

      // 2. Measure /admin/sandbox Online Olympia across Lobby, KD, VeDich Blue, VeDich 5s Steal
      const { page: sbPage, cdp: sbCdp } = await createTrackedPage(browser, baseUrl, "T4-Profile-sandbox", { collector });
      try {
        await launchOlympiaSandbox(sbPage, baseUrl, { seats: 4, ruleset: "O26", timeoutMs: 12000 });
        const dispFrame = await getDisplayFrame(sbPage, 10000);
        await dispFrame.waitForSelector("canvas", { timeout: 20000 });

        const rootWsCount = collector.webSocketsCreated.filter(
          (w) => w.page === "T4-Profile-sandbox" && w.url.includes("sandbox=1")
        ).length;
        const olympiaWsCount = collector.webSocketsCreated.filter(
          (w) => w.page === "T4-Profile-sandbox" && w.url.includes("/socket.io/?EIO=4")
        ).length;

        measured.sandboxLaunch = {
          hasDisplayIframe: true,
          hasHostConsoleStartBtn: true,
          rootWsCount,
          olympiaHostWsCount: Math.max(0, olympiaWsCount - 2), // minus display + active player
        };

        await sleep(1500);
        measured.phases.lobby = await sampleContext(dispFrame, 4000);

        await clickButtonByText(sbPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { waitAfterMs: 250 });
        if (await tryClickButtonByText(sbPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(sbPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(sbPage, "Khởi Động", { waitAfterMs: 250 });
        await tryClickButtonByText(sbPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(sbPage, "Lượt Riêng", { waitAfterMs: 200 });
        await clickButtonByText(sbPage, "BẮT ĐẦU", { waitAfterMs: 3800 });
        await clickButtonByText(sbPage, "CÂU TIẾP", { waitAfterMs: 200 });
        await clickButtonByText(sbPage, "TÍNH GIỜ (Space)", { waitAfterMs: 300 });
        measured.phases.khoidongSolo = await sampleContext(dispFrame, 4000);

        await clickButtonByText(sbPage, "Về Đích", { waitAfterMs: 250 });
        await tryClickButtonByText(sbPage, "Bỏ qua Intro", { waitAfterMs: 250 });
        await sleep(800);
        measured.phases.veDichBlue = await sampleContext(dispFrame, 3500);

        await clickButtonByText(sbPage, "Lên sân khấu", { waitAfterMs: 200 });
        await clickButtonByText(sbPage, "Mở bảng chọn gói đồ họa", { waitAfterMs: 200 });
        await clickButtonByText(sbPage, "Xác nhận gói", { waitAfterMs: 200 });
        await clickButtonByText(sbPage, "Bắt đầu Câu 1", { waitAfterMs: 200 });
        await clickButtonByText(sbPage, "Tính Giờ Thi", { waitAfterMs: 250 });
        await clickButtonByText(sbPage, "SAI & MỞ CƯỚP 5S", { waitAfterMs: 200 });
        measured.phases.veDich5sChase = await sampleContext(dispFrame, 3500);
        measured.sandboxCdp = await getCdpMetrics(sbCdp);
      } finally {
        await sbPage.close();
      }

      // 3. Standalone HQ Display
      const { page: hqPage } = await createTrackedPage(browser, baseUrl, "T4-Profile-hq", { collector });
      try {
        const room = await createSandboxRoomApi(hqPage, baseUrl, { rulesetId: "O26" });
        await hqPage.goto(`${baseUrl}/olympia/display/${room.code}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await hqPage.waitForSelector("canvas", { timeout: 25000 });
        await sleep(2000);
        measured.phases.standaloneDisplayHQ = await sampleContext(hqPage, 3500);
      } finally {
        await hqPage.close();
      }

      // 4. /dev/graphics?tab=kd
      const { page: kdPage } = await createTrackedPage(browser, baseUrl, "T4-Profile-kd", { collector });
      try {
        await kdPage.goto(`${baseUrl}/dev/graphics?tab=kd`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await kdPage.waitForSelector("#graphic-studio-3d canvas", { timeout: 25000 });
        await sleep(2000);
        measured.phases.devGraphicsKd = await sampleContext(kdPage, 3500);
      } finally {
        await kdPage.close();
      }

      measured.network = {
        audioVideoCount: collector.audioVideoAssets.length,
        audioVideoBytes: collector.audioVideoAssets.reduce((s, a) => s + (a.encodedBytes || 0), 0),
      };

      const budget = evaluateProfilingBudgets(measured, baseline);
      assertNoRuntimeErrors(collector, "T4-Profile");
      if (!budget.passed) {
        throw new Error(`CDP Profiling budget failed:\n - ${budget.failures.join("\n - ")}`);
      }
      return budget.summary;
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCENARIO 3: T4-Parity — Baseline Visual & Functional Parity (R2)
  // ═══════════════════════════════════════════════════════════════════════
  cases.push(
    await runCase("T4-Parity", "Visual & Structural Parity against baseline/screenshots/ (BLUE/RED, Vitrine, LED Wall, 2D)", "T4.Visual-Parity", async () => {
      const screenshotsDir = baselineDir ? path.join(baselineDir, "screenshots") : null;
      if (!screenshotsDir || !fs.existsSync(screenshotsDir)) {
        throw new Error(`Baseline screenshots directory not found: ${screenshotsDir}`);
      }

      const collector = createErrorCollector();
      const { page: dispPage } = await createTrackedPage(browser, baseUrl, "T4-Parity-disp", { collector });
      const { page: hostPage } = await createTrackedPage(browser, baseUrl, "T4-Parity-host", { collector });
      const { page: gfxPage } = await createTrackedPage(browser, baseUrl, "T4-Parity-gfx", { collector });
      try {
        const room = await createSandboxRoomApi(hostPage, baseUrl, { rulesetId: "O26", playIntroOnCreate: true });
        await Promise.all([
          dispPage.goto(`${baseUrl}/olympia/display/${room.code}?sandbox=1&perf=light&audio=1`, { waitUntil: "domcontentloaded", timeout: 30000 }),
          hostPage.goto(`${baseUrl}/olympia/host/${room.code}?key=${encodeURIComponent(room.hostKey || "sandbox")}`, { waitUntil: "domcontentloaded", timeout: 30000 }),
        ]);
        await dispPage.waitForSelector("canvas", { timeout: 25000 });
        await hostPage.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("BẮT ĐẦU TRẬN ĐẤU OLYMPIA")), { timeout: 25000 });
        await sleep(2200);

        const comparisons = {};
        const checkShot = async (page, baselineName, opts = {}) => {
          const buf = await page.screenshot();
          const basePath = path.join(screenshotsDir, baselineName);
          const res = compareImages(buf, basePath, { maxRmse: opts.maxRmse ?? 0.28, maxMae: opts.maxMae ?? 0.18 });
          comparisons[baselineName] = res;
          if (!res.ok) throw new Error(`${baselineName}: ${res.reason}`);
          return decodePng(buf);
        };

        // 1. Lobby (BLUE)
        const lobbyPng = await checkShot(dispPage, "01_display_lobby.png");
        const lobbyRegions = analyzeRegions(lobbyPng, { centerWall: [0.25, 0.12, 0.75, 0.55], floor: [0.15, 0.55, 0.85, 0.9] });
        if (lobbyRegions.centerWall.blueDominantRatio < 0.2) {
          throw new Error(`01_display_lobby.png lost BLUE/sapphire central wall hue: ${JSON.stringify(lobbyRegions.centerWall)}`);
        }

        // 2. Vitrine
        await clickButtonByText(hostPage, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { waitAfterMs: 250 });
        if (await tryClickButtonByText(hostPage, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(hostPage, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 300 });
        }
        await clickButtonByText(hostPage, "TRƯỜNG QUAY 3D", { waitAfterMs: 1200 });
        const vitrinePng = await checkShot(dispPage, "02b_display_vitrine.png", { maxRmse: 0.34, maxMae: 0.22 });
        const vitrineRegions = analyzeRegions(vitrinePng, { full: [0, 0, 1, 1] });
        if (vitrineRegions.full.luminousRatio < 0.1) {
          throw new Error(`02b_display_vitrine.png too dark/stripped: ${JSON.stringify(vitrineRegions.full)}`);
        }
        await tryClickButtonByText(hostPage, "TRƯỜNG QUAY 3D: BẬT", { waitAfterMs: 250 });

        // 3. Về Đích Blue vs Về Đích Red vs 5s Chase
        await clickButtonByText(hostPage, "Về Đích", { waitAfterMs: 300 });
        await tryClickButtonByText(hostPage, "Bỏ qua Intro", { waitAfterMs: 300 });
        await sleep(900);
        const vdBluePng = await checkShot(dispPage, "06a_display_vedich_blue.png", { maxRmse: 0.34, maxMae: 0.22 });
        const vdBlueReg = analyzeRegions(vdBluePng, { full: [0, 0, 1, 1] });

        await clickButtonByText(hostPage, "Lên sân khấu", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Mở bảng chọn gói đồ họa", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Xác nhận gói", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Bắt đầu Câu 1", { waitAfterMs: 250 });
        await clickButtonByText(hostPage, "Tính Giờ Thi", { waitAfterMs: 900 });
        const vdRedPng = await checkShot(dispPage, "06b_display_vedich_red.png", { maxRmse: 0.34, maxMae: 0.22 });
        const vdRedReg = analyzeRegions(vdRedPng, { full: [0, 0, 1, 1], floor: [0.15, 0.55, 0.85, 0.9] });

        if (vdRedReg.full.redDominantRatio <= vdBlueReg.full.redDominantRatio) {
          throw new Error(
            `BLUE->RED lighting transition missing: blue.red=${vdBlueReg.full.redDominantRatio}, red.red=${vdRedReg.full.redDominantRatio}`
          );
        }

        // 4. /dev/graphics?tab=kd & ?tab=r4
        await gfxPage.goto(`${baseUrl}/dev/graphics?tab=kd`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await gfxPage.waitForSelector("#graphic-studio-3d canvas", { timeout: 25000 });
        await sleep(1800);
        await checkShot(gfxPage, "08_dev_graphics_kd.png", { maxRmse: 0.30, maxMae: 0.20 });

        await gfxPage.goto(`${baseUrl}/dev/graphics?tab=r4`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await gfxPage.waitForSelector("#screenshot-r4-vcnv-reveal", { timeout: 20000 });
        await sleep(1000);
        await checkShot(gfxPage, "08b_dev_graphics_r4.png", { maxRmse: 0.24, maxMae: 0.16 });

        assertNoRuntimeErrors(collector, "T4-Parity");
        return comparisons;
      } finally {
        await Promise.allSettled([gfxPage.close(), hostPage.close(), dispPage.close()]);
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCENARIO 4: T4-Stress-8Seats — 8-Contestant Concurrent Stress & Drafts
  // ═══════════════════════════════════════════════════════════════════════
  cases.push(
    await runCase("T4-Stress-8Seats", "8-seat O27 + unlimited CHP + rapid tab drafts + 5s steal chase stability", "T4.8Seat-Stress", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T4-Stress-8Seats", { collector });
      try {
        await launchOlympiaSandbox(page, baseUrl, {
          seats: 8,
          ruleset: "O27",
          chpLimit: "unlimited",
          timeoutMs: 12000,
        });
        const dispFrame = await getDisplayFrame(page, 10000);
        await dispFrame.waitForSelector("canvas", { timeout: 20000 });

        await clickButtonByText(page, "BẮT ĐẦU TRẬN ĐẤU OLYMPIA", { waitAfterMs: 250 });
        if (await tryClickButtonByText(page, "Có, tiếp tục", { waitAfterMs: 200 })) {
          await tryClickButtonByText(page, "XÁC NHẬN BẮT ĐẦU", { waitAfterMs: 250 });
        }
        await clickButtonByText(page, "VCNV", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Hàng 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Mở Câu Hỏi", { waitAfterMs: 200 });
        await clickButtonByText(page, "Đếm 15s (Space)", { waitAfterMs: 250 });

        const switchLatencies = [];
        const s0 = await selectSandboxSeatTab(page, 0);
        await s0.frame.waitForSelector('input[placeholder*="Nhập đáp án"]', { timeout: 8000 });
        await s0.frame.type('input[placeholder*="Nhập đáp án"]', "STRESS_DRAFT_0");
        for (let s = 1; s < 8; s++) {
          const sw = await selectSandboxSeatTab(page, s);
          switchLatencies.push(sw.latencyMs);
        }
        const back0 = await selectSandboxSeatTab(page, 0);
        switchLatencies.push(back0.latencyMs);
        const draftVal = await back0.frame.$eval('input[placeholder*="Nhập đáp án"]', (el) => el.value);
        if (draftVal !== "STRESS_DRAFT_0") throw new Error(`8-seat draft lost: "${draftVal}"`);

        await clickButtonByText(page, "Về Đích", { waitAfterMs: 250 });
        await tryClickButtonByText(page, "Bỏ qua Intro", { waitAfterMs: 250 });
        await clickButtonByText(page, "Lên sân khấu", { waitAfterMs: 200 });
        await clickButtonByText(page, "Mở bảng chọn gói đồ họa", { waitAfterMs: 200 });
        await clickButtonByText(page, "Xác nhận gói", { waitAfterMs: 200 });
        await clickButtonByText(page, "Bắt đầu Câu 1", { waitAfterMs: 200 });
        await clickButtonByText(page, "Tính Giờ Thi", { waitAfterMs: 200 });
        await clickButtonByText(page, "SAI & MỞ CƯỚP 5S", { waitAfterMs: 200 });

        const stressSample = await sampleContext(dispFrame, 3000);
        const pl = stressSample.webgl?.canvases?.[0]?.sceneLights?.activePointLights ?? null;
        if (pl != null && pl > 18) {
          throw new Error(`8-seat 5s steal activePointLights=${pl} exceeds <= 18`);
        }
        assertNoRuntimeErrors(collector, "T4-Stress-8Seats");
        return {
          maxSwitchLatencyMs: Math.max(...switchLatencies),
          fps: stressSample.perf?.fps,
          activePointLights: pl,
        };
      } finally {
        await page.close();
      }
    })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCENARIO 5: T4-SiteJourney — Site-Wide User Journey & .gpu-saver-mode
  // ═══════════════════════════════════════════════════════════════════════
  cases.push(
    await runCase("T4-SiteJourney", "Site-Wide Journey (/ -> /admin -> quiz-bank -> olympia/create -> rooms -> sandbox Offline + gpu-saver)", "T4.Site-Journey", async () => {
      const collector = createErrorCollector();
      const { page } = await createTrackedPage(browser, baseUrl, "T4-SiteJourney", { collector });
      try {
        await page.goto(`${baseUrl}/`, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(800);
        const homeAudioCount = collector.audioVideoAssets.length;
        if (homeAudioCount > 4) {
          throw new Error(`SiteJourney: '/' triggered ${homeAudioCount} eager audio requests (expected <= 4)`);
        }

        await loginAdminViaUi(page, baseUrl, "/admin");
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Sandbox Studio"), { timeout: 15000 });

        await page.goto(`${baseUrl}/admin/quiz-bank`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1000);

        await page.goto(`${baseUrl}/admin/olympia/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(800);

        await page.goto(`${baseUrl}/admin/rooms`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(800);

        await launchOlympiaSandbox(page, baseUrl, { seats: 4, ruleset: "O26", offline: true, timeoutMs: 15000 });
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) =>
            (b.getAttribute("title") || "").includes("Cài đặt hệ thống") || (b.textContent || "").includes("Cài đặt")
          );
          btn?.click();
        });
        await page.waitForFunction(() => (document.body?.innerText || "").includes("Chế độ tiết kiệm GPU"), { timeout: 8000 });
        await page.evaluate(() => {
          const p = Array.from(document.querySelectorAll("p")).find((el) => (el.textContent || "").includes("Chế độ tiết kiệm GPU"));
          p?.parentElement?.parentElement?.querySelector("button")?.click();
        });
        const gpuOn = await page.evaluate(() => document.documentElement.classList.contains("gpu-saver-mode"));
        if (!gpuOn) throw new Error("Failed enabling .gpu-saver-mode during SiteJourney");

        assertNoRuntimeErrors(collector, "T4-SiteJourney");
        return { homeAudioCount, gpuSaverEnabled: gpuOn };
      } finally {
        await page.close();
      }
    })
  );

  return summarizeCases(4, "Tier 4: Real-World E2E, CDP Profiling & Visual Parity", cases);
}
