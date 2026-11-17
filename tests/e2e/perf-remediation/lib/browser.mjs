import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getInstrumentationScript } from "./cdp-profiler.mjs";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const { io } = require("socket.io-client");

export const MASTER_KEY = "Quizorra@Admin2026";

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function findBrowserExecutable() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`No supported browser executable found. Checked: ${candidates.join(", ")}`);
}

export async function launchBrowser(opts = {}) {
  const executablePath = opts.executablePath || findBrowserExecutable();
  const browser = await puppeteer.launch({
    executablePath,
    headless: opts.headless ?? true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=default",
      "--ignore-gpu-blocklist",
      "--high-dpi-support=1",
      "--force-device-scale-factor=1",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      ...(opts.extraArgs || []),
    ],
  });
  return browser;
}

export function createErrorCollector() {
  return {
    pageErrors: [],
    consoleErrors: [],
    expectedOfflineDbErrors: [],
    unexpectedHttpErrors: [],
    missingAudio404s: [],
    webSocketsCreated: [],
    webSocketFramesReceived: [],
    audioVideoAssets: [],
    totalRequests: 0,
    totalEncodedBytes: 0,
    lastDb500At: 0,
  };
}

export async function createTrackedPage(browserOrContext, baseUrl, label, opts = {}) {
  const page = await browserOrContext.newPage();
  const collector = opts.collector || createErrorCollector();
  const viewport = opts.viewport || { width: 1920, height: 1080 };

  await page.setBypassServiceWorker(true);
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(getInstrumentationScript());

  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  const reqMeta = new Map();

  cdp.on("Network.requestWillBeSent", (ev) => {
    reqMeta.set(ev.requestId, {
      url: ev.request.url,
      type: ev.type || "Other",
      method: ev.request.method,
    });
  });

  cdp.on("Network.responseReceived", (ev) => {
    const m = reqMeta.get(ev.requestId) || { url: ev.response.url, type: ev.type || "Other" };
    m.status = ev.response.status;
    m.mimeType = ev.response.mimeType;
    reqMeta.set(ev.requestId, m);

    const urlStr = ev.response.url || "";
    const shortUrl = urlStr.replace(baseUrl, "");
    if (ev.response.status >= 400) {
      if ((shortUrl.startsWith("/api/quiz-bank") || shortUrl.startsWith("/api/rooms")) && ev.response.status === 500) {
        collector.lastDb500At = Date.now();
        collector.expectedOfflineDbErrors.push({ page: label, url: shortUrl, status: ev.response.status });
      } else if (shortUrl.startsWith("/olympia-audio/") && ev.response.status === 404) {
        collector.missingAudio404s.push({ page: label, url: shortUrl, status: 404 });
      } else {
        collector.unexpectedHttpErrors.push({ page: label, url: shortUrl, status: ev.response.status });
      }
    }
  });

  cdp.on("Network.loadingFinished", (ev) => {
    const m = reqMeta.get(ev.requestId);
    const bytes = ev.encodedDataLength || 0;
    collector.totalRequests += 1;
    collector.totalEncodedBytes += bytes;
    if (m) {
      const isMedia =
        m.type === "Media" ||
        /\.(mp3|wav|ogg|webm|mp4|m4a)(\?|$)/i.test(m.url) ||
        (m.mimeType && (m.mimeType.startsWith("audio/") || m.mimeType.startsWith("video/")));
      if (isMedia) {
        collector.audioVideoAssets.push({
          page: label,
          url: m.url.replace(baseUrl, ""),
          mimeType: m.mimeType || m.type,
          encodedBytes: bytes,
          status: m.status || null,
        });
      }
    }
  });

  cdp.on("Network.webSocketCreated", (ev) => {
    collector.webSocketsCreated.push({
      page: label,
      requestId: ev.requestId,
      url: ev.url,
    });
  });

  cdp.on("Network.webSocketFrameReceived", (ev) => {
    const data = ev.response?.payloadData || "";
    collector.webSocketFramesReceived.push({
      page: label,
      payload: data.slice(0, 500),
    });
    if (collector.webSocketFramesReceived.length > 500) {
      collector.webSocketFramesReceived.shift();
    }
  });

  page.on("pageerror", (err) => {
    collector.pageErrors.push({ page: label, message: err?.message || String(err) });
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text() || "";
      const locUrl = msg.location()?.url || "";
      const isExpectedOffline500Console =
        text.includes("Failed to load resource: the server responded with a status of 500") &&
        (locUrl.includes("/api/quiz-bank") || locUrl.includes("/api/rooms") || Date.now() - collector.lastDb500At < 1500);
      const isExpectedMissingAudio404 =
        text.includes("Failed to load resource: the server responded with a status of 404") &&
        locUrl.includes("/olympia-audio/");
      if (!isExpectedOffline500Console && !isExpectedMissingAudio404) {
        collector.consoleErrors.push({ page: label, message: text.slice(0, 400), url: locUrl });
      }
    }
  });

  page.on("dialog", async (dialog) => {
    try {
      await dialog.accept();
    } catch {
      // ignore
    }
  });

  return { page, cdp, collector };
}

export function assertNoRuntimeErrors(collector, contextLabel = "test") {
  if (collector.pageErrors.length > 0) {
    throw new Error(
      `[${contextLabel}] Uncaught pageerror(s): ${collector.pageErrors.map((e) => `${e.page}: ${e.message}`).join(" | ")}`
    );
  }
  const criticalConsole = collector.consoleErrors.filter(
    (e) =>
      e.message.includes("RangeError") ||
      e.message.includes("TypeError") ||
      e.message.includes("ReferenceError") ||
      e.message.includes("Unhandled") ||
      e.message.includes("ChunkLoadError") ||
      e.message.includes("Maximum call stack")
  );
  if (criticalConsole.length > 0) {
    throw new Error(
      `[${contextLabel}] Critical console.error(s): ${criticalConsole.map((e) => `${e.page}: ${e.message}`).join(" | ")}`
    );
  }
}

export async function loginAdminViaUi(page, baseUrl, targetPath = "/admin/sandbox") {
  await page.goto(`${baseUrl}${targetPath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const needsAuth = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("Master Key"));
  });
  if (needsAuth) {
    await clickButtonByText(page, "Master Key", { timeoutMs: 15000, waitAfterMs: 150 });
    await page.waitForSelector('input[placeholder="Nhập Master Key..."]', { timeout: 10000 });
    await page.type('input[placeholder="Nhập Master Key..."]', MASTER_KEY);
    await clickButtonByText(page, "Mở khóa Quản trị viên", { timeoutMs: 10000, waitAfterMs: 600 });
  }
}

export async function loginAdminFast(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const res = await page.evaluate(async (pw) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw, isMasterKey: true }),
    });
    const data = await r.json();
    if (data?.token) {
      try {
        localStorage.setItem("admin_token", data.token);
      } catch {}
    }
    return { status: r.status, success: Boolean(data?.success), token: data?.token || null };
  }, MASTER_KEY);
  if (res.status !== 200 || !res.success) {
    throw new Error(`Fast admin login failed: ${JSON.stringify(res)}`);
  }
  return res;
}

export async function createSandboxRoomApi(page, baseUrl, config = {}) {
  if (!page.url().startsWith(baseUrl)) {
    await loginAdminFast(page, baseUrl);
  }
  const data = await page.evaluate(async (cfg) => {
    const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/sandbox/create", {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "OLYMPIA",
        teams: cfg.teams,
        config: {
          olympia: {
            rulesetId: cfg.rulesetId || "O26",
            chpQuestionLimit: cfg.chpQuestionLimit || 3,
            playIntroOnCreate: cfg.playIntroOnCreate ?? false,
            ...(cfg.olympia || {}),
          },
        },
      }),
    });
    return { status: res.status, body: await res.json() };
  }, config);

  if (data.status !== 200 || !data.body?.success || !data.body?.code) {
    throw new Error(`POST /api/sandbox/create failed: ${JSON.stringify(data)}`);
  }
  return data.body;
}

export async function launchOlympiaSandbox(page, baseUrl, opts = {}) {
  const {
    seats = 4,
    ruleset = "O26",
    chpLimit = "3",
    teamNames = null,
    offline = false,
    playIntro = false,
    timeoutMs = 12000,
    useUiLogin = false,
  } = opts;

  if (useUiLogin) {
    await loginAdminViaUi(page, baseUrl, "/admin/sandbox");
  } else {
    await loginAdminFast(page, baseUrl);
    await page.goto(`${baseUrl}/admin/sandbox`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }

  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll("select")).some((sel) =>
      Array.from(sel.options).some((opt) => opt.value === "OLYMPIA")
    );
  }, { timeout: 25000 });

  // Select OLYMPIA mode
  await page.evaluate(() => {
    const sel = Array.from(document.querySelectorAll("select")).find((s) =>
      Array.from(s.options).some((o) => o.value === "OLYMPIA")
    );
    if (sel) sel.setAttribute("data-e2e-mode-select", "1");
  });
  await page.select('select[data-e2e-mode-select="1"]', "OLYMPIA");
  await sleep(250);

  // Set team count (2..8)
  if (seats >= 2 && seats <= 8) {
    await page.evaluate((cnt) => {
      const label = Array.from(document.querySelectorAll("span")).find((s) => (s.textContent || "").trim() === "Số đội:");
      const container = label?.parentElement;
      if (container) {
        const btn = Array.from(container.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === String(cnt));
        if (btn) btn.click();
      }
    }, seats);
    await sleep(150);
  }

  // Optional custom team names
  if (Array.isArray(teamNames) && teamNames.length > 0) {
    await page.evaluate((names) => {
      const inputs = Array.from(document.querySelectorAll('input[placeholder^="Đội "]'));
      names.forEach((name, idx) => {
        const inp = inputs[idx];
        if (!inp) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(inp, name);
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }, teamNames);
  }

  // Select Ruleset & CHP limit
  await page.evaluate((rs, chp) => {
    const rsSel = Array.from(document.querySelectorAll("select")).find((s) =>
      Array.from(s.options).some((o) => o.value === "O26")
    );
    if (rsSel) {
      rsSel.setAttribute("data-e2e-ruleset-select", "1");
    }
    const chpSel = Array.from(document.querySelectorAll("select")).find((s) =>
      Array.from(s.options).some((o) => o.value === "unlimited")
    );
    if (chpSel) {
      chpSel.setAttribute("data-e2e-chp-select", "1");
    }
  }, ruleset, chpLimit);

  if (ruleset) {
    const hasRs = await page.$('select[data-e2e-ruleset-select="1"]');
    if (hasRs) await page.select('select[data-e2e-ruleset-select="1"]', ruleset);
  }
  if (chpLimit) {
    const hasChp = await page.$('select[data-e2e-chp-select="1"]');
    if (hasChp) await page.select('select[data-e2e-chp-select="1"]', String(chpLimit));
  }

  // Toggle intro music checkbox if requested
  await page.evaluate((wantIntro) => {
    const cb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find((el) =>
      (el.parentElement?.textContent || "").includes("Nhạc mở đầu")
    );
    if (cb && cb.checked !== wantIntro) cb.click();
  }, Boolean(playIntro));

  if (offline) {
    await clickButtonByText(page, "Chạy Offline", { timeoutMs: 10000, waitAfterMs: 400 });
    await page.waitForFunction(() => {
      const txt = document.body?.innerText || "";
      return txt.includes("BẮT ĐẦU TRẬN ĐẤU OLYMPIA") || txt.includes("OFFLINE") || txt.includes("Vào Vòng KHỞI ĐỘNG");
    }, { timeout: timeoutMs });
    return { mode: "offline" };
  }

  await clickButtonByText(page, "Khởi chạy Online: OLYMPIA", { timeoutMs: 10000, waitAfterMs: 400 });

  // Wait for Display Viewport iframe AND HostConsole start button to appear & stay mounted
  const startWait = Date.now();
  while (Date.now() - startWait < timeoutMs) {
    const st = await page.evaluate(() => ({
      hasDisplayIframe: Boolean(document.querySelector('iframe[title="Display Viewport"]')),
      hasHostStart: Array.from(document.querySelectorAll("button")).some((b) => {
        const t = b.textContent || "";
        return t.includes("BẮT ĐẦU TRẬN ĐẤU OLYMPIA") || t.includes("Vào Vòng KHỞI ĐỘNG");
      }),
    }));
    if (st.hasDisplayIframe && st.hasHostStart) {
      await sleep(1200);
      // Re-verify it didn't tear down after 1.2s (e.g. from DB-offline '/' socket rejection)
      const st2 = await page.evaluate(() => ({
        hasDisplayIframe: Boolean(document.querySelector('iframe[title="Display Viewport"]')),
        hasHostStart: Array.from(document.querySelectorAll("button")).some((b) => {
          const t = b.textContent || "";
          return t.includes("BẮT ĐẦU TRẬN ĐẤU OLYMPIA") || t.includes("Vào Vòng KHỞI ĐỘNG");
        }),
      }));
      if (st2.hasDisplayIframe && st2.hasHostStart) {
        return { mode: "online" };
      }
      throw new Error("OLYMPIA Sandbox mounted briefly then tore down (likely DB-offline '/' socket rejection)");
    }
    await sleep(250);
  }

  throw new Error(`OLYMPIA Sandbox did not stay mounted within ${timeoutMs}ms (Display Viewport + HostConsole missing)`);
}

export async function getDisplayFrame(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const f of page.frames()) {
      if (f.url().includes("/olympia/display/")) {
        return f;
      }
    }
    await sleep(150);
  }
  throw new Error("Display iframe (/olympia/display/) not found");
}

export async function getPlayerFrame(page, seatIdx = null, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const f of page.frames()) {
      const u = f.url();
      if (u.includes("/olympia/play/")) {
        if (seatIdx == null || u.includes(`seat=${seatIdx}`)) {
          return f;
        }
      }
    }
    await sleep(150);
  }
  throw new Error(`Player iframe (/olympia/play/${seatIdx != null ? `?seat=${seatIdx}` : ""}) not found`);
}

export async function selectSandboxSeatTab(page, seatIdx) {
  const t0 = performance.now();
  const clicked = await page.evaluate((idx) => {
    const label = Array.from(document.querySelectorAll("span")).find((s) => (s.textContent || "").trim() === "Thí sinh:");
    const row = label?.parentElement;
    if (!row) return false;
    const btns = Array.from(row.querySelectorAll("button"));
    const target = btns[idx];
    if (!target) return false;
    target.click();
    return true;
  }, seatIdx);
  if (!clicked) throw new Error(`Sandbox seat tab ${seatIdx} not found`);
  await sleep(300);
  const frame = await getPlayerFrame(page, seatIdx, 10000);
  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
  return { frame, latencyMs };
}

export async function findButtonByText(ctx, substring, { exact = false, onlyEnabled = false } = {}) {
  return ctx.evaluate(
    ({ sub, exactMatch, requireEnabled }) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const b of buttons) {
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (requireEnabled && b.disabled) continue;
        const rawTxt = (b.textContent || "").replace(/\s+/g, " ").trim();
        const visTxt = (b.innerText || "").replace(/\s+/g, " ").trim();
        const match = exactMatch
          ? rawTxt === sub || visTxt === sub
          : rawTxt.includes(sub) || visTxt.includes(sub);
        if (match) {
          b.scrollIntoView({ block: "center", inline: "center" });
          const r2 = b.getBoundingClientRect();
          return {
            found: true,
            text: rawTxt || visTxt,
            disabled: b.disabled,
            x: r2.left + r2.width / 2,
            y: r2.top + r2.height / 2,
          };
        }
      }
      return { found: false };
    },
    { sub: substring, exactMatch: exact, requireEnabled: onlyEnabled }
  );
}

export async function clickButtonByText(ctx, substring, opts = {}) {
  const { timeoutMs = 10000, exact = false, onlyEnabled = true, waitAfterMs = 150 } = opts;
  const startWait = Date.now();
  let info = { found: false };
  while (Date.now() - startWait < timeoutMs) {
    info = await findButtonByText(ctx, substring, { exact, onlyEnabled });
    if (info.found) break;
    await sleep(150);
  }
  if (!info.found) {
    throw new Error(`Button containing "${substring}" not found (onlyEnabled=${onlyEnabled}) within ${timeoutMs}ms`);
  }
  const t0 = performance.now();
  const clicked = await ctx.evaluate(
    ({ sub, exactMatch, requireEnabled }) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const b of buttons) {
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (requireEnabled && b.disabled) continue;
        const rawTxt = (b.textContent || "").replace(/\s+/g, " ").trim();
        const visTxt = (b.innerText || "").replace(/\s+/g, " ").trim();
        if (exactMatch ? rawTxt === sub || visTxt === sub : rawTxt.includes(sub) || visTxt.includes(sub)) {
          b.click();
          return true;
        }
      }
      return false;
    },
    { sub: substring, exactMatch: exact, requireEnabled: onlyEnabled }
  );
  await ctx.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
  if (!clicked) throw new Error(`Failed clicking button "${substring}"`);
  if (waitAfterMs > 0) await sleep(waitAfterMs);
  return { text: info.text, latencyMs };
}

export async function tryClickButtonByText(ctx, substring, opts = {}) {
  try {
    return await clickButtonByText(ctx, substring, { timeoutMs: 2000, ...opts });
  } catch {
    return null;
  }
}

export async function triggerPointerDownBuzzer(ctx, timeoutMs = 8000) {
  if (typeof ctx.bringToFront === "function") {
    await ctx.bringToFront();
  }
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await ctx.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      for (const b of btns) {
        const txt = (b.textContent || b.innerText || "").trim();
        if ((txt.includes("🔔") || txt.includes("BẤM CHUÔNG") || txt.includes("CHUÔNG CNV")) && !b.disabled) {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            return { found: true, text: txt };
          }
        }
      }
      return { found: false };
    });
    if (info.found) {
      const t0 = performance.now();
      await ctx.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        for (const b of btns) {
          const txt = (b.textContent || b.innerText || "").trim();
          if ((txt.includes("🔔") || txt.includes("BẤM CHUÔNG") || txt.includes("CHUÔNG CNV")) && !b.disabled) {
            b.dispatchEvent(
              new PointerEvent("pointerdown", {
                bubbles: true,
                cancelable: true,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
              })
            );
            b.click();
            return true;
          }
        }
        return false;
      });
      await ctx.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
      return { triggered: true, text: info.text, latencyMs };
    }
    await sleep(120);
  }
  return { triggered: false, reason: "Enabled buzzer button not found before timeout" };
}

export function connectOlympiaSocket(baseUrl, query) {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/olympia`, {
      transports: ["websocket"],
      query,
      forceNew: true,
      reconnection: false,
      timeout: 8000,
    });
    let latestState = null;
    socket.on("state", (s) => {
      latestState = s;
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Olympia socket connect timeout (${JSON.stringify(query)})`));
    }, 9000);
    socket.on("connect", () => {
      clearTimeout(timer);
      resolve({
        socket,
        getState: () => latestState,
        emitAck: (ev, payload) =>
          new Promise((res) => {
            socket.emit(ev, payload, (ack) => res(ack));
          }),
        close: () => {
          try {
            socket.disconnect();
          } catch {}
        },
      });
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function runCase(id, name, area, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return {
      id,
      name,
      area,
      status: "passed",
      durationMs: Date.now() - t0,
      metrics: detail && typeof detail === "object" ? detail : undefined,
    };
  } catch (err) {
    return {
      id,
      name,
      area,
      status: "failed",
      durationMs: Date.now() - t0,
      error: err?.message || String(err),
    };
  }
}

export function summarizeCases(tier, name, cases) {
  const passed = cases.filter((c) => c.status === "passed").length;
  const failed = cases.filter((c) => c.status === "failed").length;
  const skipped = cases.filter((c) => c.status === "skipped").length;
  return { tier, name, passed, failed, skipped, cases };
}
