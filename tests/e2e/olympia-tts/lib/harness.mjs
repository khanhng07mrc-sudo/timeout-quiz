import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { installTtsProbes } from "./tts-probes.mjs";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const { io } = require("socket.io-client");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const WORKSPACE_DIR = path.resolve(__dirname, "../../../..");
export const MASTER_KEY = "Quizorra@Admin2026";
export const ALL_AUDIO_SEASONS = ["O13-21", "O20", "O22", "O23", "O24-25", "O26"];

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

export function createErrorCollector(opts = {}) {
  return {
    pageErrors: [],
    consoleErrors: [],
    expectedOfflineDbErrors: [],
    unexpectedHttpErrors: [],
    missingAudio404s: [],
    forcedTts503s: [],
    audioAssetResponses: [],
    ttsApiResponses: [],
    allowTts503: Boolean(opts.allowTts503),
    allowOfflineDbErrors: Boolean(opts.allowOfflineDbErrors),
    lastDb500At: 0,
    lastForcedTts503At: 0,
    dialogsAccepted: [],
  };
}

export async function createTrackedPage(browserOrContext, baseUrl, label, opts = {}) {
  const page = await browserOrContext.newPage();
  const collector = opts.collector || createErrorCollector(opts);
  const viewport = opts.viewport || { width: 1920, height: 1080 };

  await page.setBypassServiceWorker(true);
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });

  if (opts.installTtsProbe !== false) {
    await installTtsProbes(page);
  }

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
    const urlStr = ev.response.url || m.url || "";
    const shortUrl = urlStr.replace(baseUrl, "");
    const status = ev.response.status;

    if (shortUrl.startsWith("/olympia-audio/")) {
      collector.audioAssetResponses.push({ page: label, url: shortUrl, status });
    }
    if (shortUrl.startsWith("/api/olympia/tts")) {
      collector.ttsApiResponses.push({
        page: label,
        url: shortUrl,
        status,
        engine: ev.response.headers?.["x-tts-engine"] || ev.response.headers?.["X-TTS-Engine"] || null,
        voice: ev.response.headers?.["x-tts-voice"] || ev.response.headers?.["X-TTS-Voice"] || null,
        lang: ev.response.headers?.["x-tts-lang"] || ev.response.headers?.["X-TTS-Lang"] || null,
      });
    }

    if (status >= 400) {
      // Strictly track /olympia-audio/ 404s (never swallow)
      if (shortUrl.startsWith("/olympia-audio/") && status === 404) {
        collector.missingAudio404s.push({ page: label, url: shortUrl, status });
      } else if (
        shortUrl.startsWith("/api/olympia/tts") &&
        status === 503 &&
        collector.allowTts503
      ) {
        collector.lastForcedTts503At = Date.now();
        collector.forcedTts503s.push({ page: label, url: shortUrl, status });
      } else if (
        collector.allowOfflineDbErrors &&
        (shortUrl.startsWith("/api/quiz-bank") || shortUrl.startsWith("/api/rooms")) &&
        status === 500
      ) {
        collector.lastDb500At = Date.now();
        collector.expectedOfflineDbErrors.push({ page: label, url: shortUrl, status });
      } else {
        collector.unexpectedHttpErrors.push({ page: label, url: shortUrl, status });
      }
    }
  });

  page.on("pageerror", (err) => {
    collector.pageErrors.push({ page: label, message: err?.message || String(err) });
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text() || "";
      const locUrl = msg.location()?.url || "";
      const isAllowedTts503Console =
        collector.allowTts503 &&
        (locUrl.includes("/api/olympia/tts") ||
          (text.includes("503") && Date.now() - collector.lastForcedTts503At < 2500));
      const isAllowedOfflineDbConsole =
        collector.allowOfflineDbErrors &&
        text.includes("500") &&
        (locUrl.includes("/api/quiz-bank") || locUrl.includes("/api/rooms") || Date.now() - collector.lastDb500At < 1500);

      if (!isAllowedTts503Console && !isAllowedOfflineDbConsole) {
        collector.consoleErrors.push({ page: label, message: text.slice(0, 500), url: locUrl });
      }
    }
  });

  if (opts.autoAcceptDialogs !== false) {
    page.on("dialog", async (dialog) => {
      collector.dialogsAccepted.push({ page: label, type: dialog.type(), message: dialog.message() });
      try {
        await dialog.accept();
      } catch {
        // ignore
      }
    });
  }

  return { page, cdp, collector };
}

export function assertNoRuntimeErrors(collector, contextLabel = "test", opts = {}) {
  const { failOnAllConsoleErrors = true, failOnUnexpectedHttp = true } = opts;
  if (collector.pageErrors.length > 0) {
    throw new Error(
      `[${contextLabel}] Uncaught pageerror(s): ${collector.pageErrors.map((e) => `${e.page}: ${e.message}`).join(" | ")}`
    );
  }
  if (collector.missingAudio404s.length > 0) {
    throw new Error(
      `[${contextLabel}] Missing /olympia-audio/ asset 404(s): ${collector.missingAudio404s.map((e) => `${e.page}: ${e.url}`).join(" | ")}`
    );
  }
  if (failOnUnexpectedHttp && collector.unexpectedHttpErrors.length > 0) {
    throw new Error(
      `[${contextLabel}] Unexpected HTTP >=400 error(s): ${collector.unexpectedHttpErrors.map((e) => `${e.page}: ${e.status} ${e.url}`).join(" | ")}`
    );
  }
  if (failOnAllConsoleErrors && collector.consoleErrors.length > 0) {
    throw new Error(
      `[${contextLabel}] console.error(s): ${collector.consoleErrors.map((e) => `${e.page}: ${e.message}`).join(" | ")}`
    );
  }
}

/**
 * Connects to Socket.IO namespace `/olympia` and explicitly emits `"join"`
 * after `"connect"` (fixing the missing `"join"` bug in perf-remediation/lib/browser.mjs).
 */
export function connectOlympiaSocket(baseUrl, joinPayload, opts = {}) {
  const { timeoutMs = 10000, allowJoinError = false } = opts;
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/olympia`, {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: false,
      timeout: timeoutMs,
    });

    let latestState = null;
    const stateListeners = new Set();

    socket.on("state", (s) => {
      latestState = s;
      for (const cb of stateListeners) {
        try {
          cb(s);
        } catch {
          // ignore listener errors
        }
      }
    });

    const timer = setTimeout(() => {
      try {
        socket.disconnect();
      } catch {}
      reject(new Error(`Olympia socket connect/join timeout (${JSON.stringify(joinPayload)})`));
    }, timeoutMs);

    socket.on("connect", () => {
      socket.emit("join", joinPayload, (ack) => {
        clearTimeout(timer);
        if (ack?.state) {
          latestState = ack.state;
        }
        if (!allowJoinError && !ack?.ok) {
          try {
            socket.disconnect();
          } catch {}
          reject(new Error(`Olympia socket join failed: ${JSON.stringify(ack)} (payload=${JSON.stringify(joinPayload)})`));
          return;
        }

        const emitAck = (ev, payload, ackTimeoutMs = 8000) =>
          new Promise((res, rej) => {
            const t = setTimeout(() => {
              rej(new Error(`Socket emitAck('${ev}') timed out after ${ackTimeoutMs}ms`));
            }, ackTimeoutMs);
            socket.emit(ev, payload, (ackRes) => {
              clearTimeout(t);
              if (ackRes?.state) latestState = ackRes.state;
              res(ackRes);
            });
          });

        const waitForState = (predicate, waitMs = 10000) =>
          new Promise((res, rej) => {
            if (latestState && predicate(latestState)) {
              res(latestState);
              return;
            }
            let done = false;
            const wt = setTimeout(() => {
              if (done) return;
              done = true;
              stateListeners.delete(onState);
              rej(
                new Error(
                  `waitForState timed out after ${waitMs}ms (stage=${latestState?.stage}, round=${latestState?.currentRound}, version=${latestState?.version})`
                )
              );
            }, waitMs);
            function onState(s) {
              if (done) return;
              if (predicate(s)) {
                done = true;
                clearTimeout(wt);
                stateListeners.delete(onState);
                res(s);
              }
            }
            stateListeners.add(onState);
          });

        resolve({
          socket,
          joinAck: ack,
          getState: () => latestState,
          emitAck,
          action: (payload) => emitAck("action", payload),
          buzz: (payload = {}) => emitAck("buzz", payload),
          answer: (text) => emitAck("answer", { text }),
          waitForState,
          close: () => {
            stateListeners.clear();
            try {
              socket.disconnect();
            } catch {}
          },
        });
      });
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function adminAuth(baseUrl, password = MASTER_KEY) {
  const res = await fetch(`${baseUrl}/api/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) {
    throw new Error(`POST /api/admin/auth failed (${res.status}): ${JSON.stringify(body)}`);
  }
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
  return { token: body.token || null, cookieHeader, user: body.user || null };
}

export async function createOfficialRoom(baseUrl, opts = {}) {
  const {
    name = `Olympia E2E ${Date.now()}`,
    rulesetId = "O26",
    o22Quarter,
    chpQuestionLimit = 3,
    seatCount = 4,
    rounds = ["khoiDong", "vcnv", "tangToc", "veDich"],
    questionSet,
    playIntroOnCreate = false,
    password = MASTER_KEY,
    teams = [],
  } = opts;

  const auth = await adminAuth(baseUrl, password);
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
  if (auth.cookieHeader) headers["Cookie"] = auth.cookieHeader;

  const res = await fetch(`${baseUrl}/api/rooms`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      mode: "OLYMPIA",
      teamMode: "INDIVIDUAL",
      hostId: auth.user?.id || "demo-host-id",
      teams,
      config: {
        powerupEnabled: false,
        allowedPowerups: [],
        olympia: {
          rulesetId,
          ...(o22Quarter ? { o22Quarter } : {}),
          chpQuestionLimit,
          rounds,
          ...(questionSet ? { questionSet } : {}),
          seatCount,
          playIntroOnCreate,
        },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 201 || !data?.room?.code) {
    throw new Error(`POST /api/rooms failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return {
    code: data.room.code,
    hostKey: data.hostKey,
    room: data.room,
    auth,
  };
}

export async function deleteRoom(baseUrl, code, auth = null) {
  if (!code) return false;
  const headers = {};
  if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
  if (auth?.cookieHeader) headers["Cookie"] = auth.cookieHeader;
  const res = await fetch(`${baseUrl}/api/rooms/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers,
  }).catch(() => null);
  return Boolean(res && res.ok);
}

export function createSandboxCode(seats = 4, tag = "") {
  const clamped = Math.max(2, Math.min(8, Number(seats) || 4));
  const suffix = tag || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return `sandbox${clamped}_${suffix}`;
}

export async function createSandboxRoomApi(baseUrl, opts = {}) {
  const {
    teams,
    rulesetId = "O26",
    o22Quarter,
    chpQuestionLimit = 3,
    playIntroOnCreate = false,
    questionSet,
  } = opts;
  const res = await fetch(`${baseUrl}/api/sandbox/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "OLYMPIA",
      ...(teams ? { teams } : {}),
      config: {
        olympia: {
          rulesetId,
          ...(o22Quarter ? { o22Quarter } : {}),
          chpQuestionLimit,
          playIntroOnCreate,
          ...(questionSet ? { questionSet } : {}),
        },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success || !data?.code) {
    throw new Error(`POST /api/sandbox/create failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

function serializeMatcher(matcher) {
  if (matcher instanceof RegExp) {
    return { kind: "regex", source: matcher.source, flags: matcher.flags };
  }
  return { kind: "text", value: String(matcher) };
}

export async function findButtonByText(ctx, matcher, opts = {}) {
  const { exact = false, onlyEnabled = false, scopeSelector = null } = opts;
  const spec = serializeMatcher(matcher);
  return ctx.evaluate(
    ({ mSpec, exactMatch, requireEnabled, scope }) => {
      const root = scope ? document.querySelector(scope) : document;
      if (!root) return { found: false };
      const re = mSpec.kind === "regex" ? new RegExp(mSpec.source, mSpec.flags) : null;
      const buttons = Array.from(root.querySelectorAll("button"));
      for (const b of buttons) {
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (requireEnabled && b.disabled) continue;
        const rawTxt = (b.textContent || "").replace(/\s+/g, " ").trim();
        const visTxt = (b.innerText || "").replace(/\s+/g, " ").trim();
        const title = (b.getAttribute("title") || "").trim();
        let match = false;
        if (re) {
          match = re.test(rawTxt) || re.test(visTxt) || re.test(title);
        } else if (exactMatch) {
          match = rawTxt === mSpec.value || visTxt === mSpec.value;
        } else {
          match = rawTxt.includes(mSpec.value) || visTxt.includes(mSpec.value) || title.includes(mSpec.value);
        }
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
    { mSpec: spec, exactMatch: exact, requireEnabled: onlyEnabled, scope: scopeSelector }
  );
}

export async function clickButtonByText(ctx, matcher, opts = {}) {
  const { timeoutMs = 10000, exact = false, onlyEnabled = true, waitAfterMs = 150, scopeSelector = null, realMouse = false } = opts;
  const startWait = Date.now();
  let info = { found: false };
  while (Date.now() - startWait < timeoutMs) {
    info = await findButtonByText(ctx, matcher, { exact, onlyEnabled, scopeSelector });
    if (info.found) break;
    await sleep(120);
  }
  if (!info.found) {
    throw new Error(`Button matching ${String(matcher)} not found (onlyEnabled=${onlyEnabled}) within ${timeoutMs}ms`);
  }

  if (realMouse && typeof ctx.mouse === "object") {
    await ctx.mouse.move(info.x, info.y);
    await ctx.mouse.down();
    await ctx.mouse.up();
  } else {
    const spec = serializeMatcher(matcher);
    const clicked = await ctx.evaluate(
      ({ mSpec, exactMatch, requireEnabled, scope }) => {
        const root = scope ? document.querySelector(scope) : document;
        if (!root) return false;
        const re = mSpec.kind === "regex" ? new RegExp(mSpec.source, mSpec.flags) : null;
        const buttons = Array.from(root.querySelectorAll("button"));
        for (const b of buttons) {
          const rect = b.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (requireEnabled && b.disabled) continue;
          const rawTxt = (b.textContent || "").replace(/\s+/g, " ").trim();
          const visTxt = (b.innerText || "").replace(/\s+/g, " ").trim();
          const title = (b.getAttribute("title") || "").trim();
          const match = re
            ? re.test(rawTxt) || re.test(visTxt) || re.test(title)
            : exactMatch
            ? rawTxt === mSpec.value || visTxt === mSpec.value
            : rawTxt.includes(mSpec.value) || visTxt.includes(mSpec.value) || title.includes(mSpec.value);
          if (match) {
            b.click();
            return true;
          }
        }
        return false;
      },
      { mSpec: spec, exactMatch: exact, requireEnabled: onlyEnabled, scope: scopeSelector }
    );
    if (!clicked) throw new Error(`Failed clicking button matching ${String(matcher)}`);
  }

  if (waitAfterMs > 0) await sleep(waitAfterMs);
  return { text: info.text, x: info.x, y: info.y };
}

export async function tryClickButtonByText(ctx, matcher, opts = {}) {
  try {
    return await clickButtonByText(ctx, matcher, { timeoutMs: 1800, ...opts });
  } catch {
    return null;
  }
}

export async function clickSidebarRound(page, roundMatcher, opts = {}) {
  return clickButtonByText(page, roundMatcher, {
    scopeSelector: "aside",
    exact: false,
    onlyEnabled: true,
    ...opts,
  });
}

export async function handleStartMatchModals(hostPage, opts = {}) {
  const { waitAfterMs = 300 } = opts;
  await clickButtonByText(hostPage, /BẮT ĐẦU TRẬN ĐẤU OLYMPIA/i, { timeoutMs: 12000, waitAfterMs: 300 });
  const step1 = await tryClickButtonByText(hostPage, /Có,\s*tiếp tục/i, { timeoutMs: 1500, waitAfterMs: 250 });
  if (step1) {
    await clickButtonByText(hostPage, /XÁC NHẬN BẮT ĐẦU/i, { timeoutMs: 4000, waitAfterMs: 250 });
  }
  if (waitAfterMs > 0) await sleep(waitAfterMs);
}

/**
 * Triggers CircularBuzzer3D or VCNV CNV buzzer using real Puppeteer pointer/mouse events
 * or Keyboard `Space` (NEVER DOM `el.click()`, because `CircularBuzzer3D` calls `e.preventDefault()` in `onClick`).
 */
export async function triggerBuzzerPointer(page, selectorOrRegex = /BẤM CHUÔNG|CƯỚP ĐIỂM|CHUÔNG CNV|THỬ CHUÔNG/i, opts = {}) {
  const { timeoutMs = 8000, useSpace = false } = opts;
  if (typeof page.bringToFront === "function") {
    await page.bringToFront();
  }

  if (useSpace) {
    await page.keyboard.press("Space");
    await sleep(80);
    return { triggered: true, method: "Space" };
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let target = null;
    if (typeof selectorOrRegex === "string" && (selectorOrRegex.startsWith(".") || selectorOrRegex.startsWith("#") || selectorOrRegex.startsWith("["))) {
      target = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el || el.disabled) return null;
        el.scrollIntoView({ block: "center", inline: "center" });
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (el.textContent || "").trim() };
      }, selectorOrRegex);
    } else {
      const info = await findButtonByText(page, selectorOrRegex, { onlyEnabled: true });
      if (info.found) {
        target = { x: info.x, y: info.y, text: info.text };
      }
    }

    if (target) {
      await page.mouse.move(target.x, target.y);
      await page.mouse.down();
      await sleep(30);
      await page.mouse.up();
      await sleep(80);
      return { triggered: true, method: "mouse", ...target };
    }
    await sleep(100);
  }
  throw new Error(`Enabled buzzer matching ${String(selectorOrRegex)} not found within ${timeoutMs}ms`);
}

export async function unlockDisplayAudio(displayPage) {
  try {
    await displayPage.mouse.click(20, 20);
  } catch {}
  await displayPage.evaluate(() => {
    try {
      window.postMessage({ type: "UNLOCK_AUDIO" }, "*");
    } catch {}
  });
  await sleep(150);
}

export async function getDisplayFrame(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const f of page.frames()) {
      if (f.url().includes("/olympia/display/")) return f;
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
        if (seatIdx == null || u.includes(`seat=${seatIdx}`)) return f;
      }
    }
    await sleep(150);
  }
  throw new Error(`Player iframe (/olympia/play/${seatIdx != null ? `?seat=${seatIdx}` : ""}) not found`);
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
  return {
    tier,
    name,
    passed,
    failed,
    skipped,
    total: cases.length,
    cases,
  };
}

/**
 * Builds a deterministic, schema-valid OlympiaQuestionSet for opaque-box E2E runs.
 * Includes Vietnamese + English questions, shortened-answer forms, explanations/hints,
 * VCNV 4 rows + center, 4 Tăng Tốc questions, Về Đích 10/20/30/40 pools, and Câu Hỏi Phụ.
 */
export function buildCustomQuestionSet(overrides = {}) {
  const solo = {};
  for (let s = 1; s <= 8; s++) {
    solo[String(s)] = [
      {
        subject: "Toán",
        kdZone: "MATH_IT",
        q: `Số nguyên tố chẵn duy nhất là số nào? (Thí sinh ${s})`,
        a: "2 (số chẵn duy nhất)",
        explanation: "Số 2 là số nguyên tố chẵn duy nhất trong tập hợp số tự nhiên.",
      },
      {
        subject: "Tiếng Anh",
        kdZone: "FOREIGN_LANG",
        q: "What is the capital city of France?",
        a: "Paris; Paris city",
        explanation: "Paris is the capital and most populous city of France.",
      },
      {
        subject: "Lý",
        kdZone: "NATURAL_SCI",
        q: "Đơn vị đo cường độ dòng điện trong hệ SI là gì?",
        a: "Ampe",
        hint: "Ký hiệu là chữ A.",
      },
      {
        subject: "Sử",
        kdZone: "SOCIAL_SCI",
        q: "Chiến thắng Điện Biên Phủ diễn ra vào năm nào?",
        a: "1954",
      },
    ];
  }

  const shared = [
    {
      subject: "Văn",
      kdZone: "SOCIAL_SCI",
      q: "Tác giả của Truyện Kiều là đại thi hào nào?",
      a: "Nguyễn Du (Tố Như)",
      explanation: "Nguyễn Du tên chữ là Tố Như, hiệu là Thanh Hiên.",
    },
    {
      subject: "Tiếng Anh",
      kdZone: "FOREIGN_LANG",
      q: "Which planet is known as the Red Planet in our solar system?",
      a: "Mars / Sao Hỏa",
      explanation: "Iron oxide on its surface gives Mars its reddish appearance.",
    },
    {
      subject: "Địa",
      kdZone: "SOCIAL_SCI",
      q: "Đỉnh núi nào cao nhất Việt Nam?",
      a: "Fansipan",
    },
    {
      subject: "Hóa",
      kdZone: "NATURAL_SCI",
      q: "Ký hiệu hóa học của nguyên tố Vàng là gì?",
      a: "Au",
    },
  ];

  const base = {
    id: `e2e_olympia_tts_${Date.now()}`,
    name: "Bộ đề E2E Olympia TTS",
    balancedRandom: false,
    khoiDong: { solo, shared },
    vcnv: {
      answer: "HÒA BÌNH",
      rows: [
        { hint: "Tên một đại dương lớn nhất thế giới", answer: "THÁI BÌNH DƯƠNG" },
        { hint: "Loài chim biểu tượng cho hòa bình", answer: "BỒ CÂU" },
        { hint: "Màu sắc của bầu trời quang đãng", answer: "XANH" },
        { hint: "Thành phố mang tên Bác trước đây gọi là gì?", answer: "SÀI GÒN" },
      ],
      centerQuestion: {
        q: "Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là thành phố nào?",
        a: "Hà Nội",
        explanation: "Hà Nội được chọn làm thủ đô từ năm 1945.",
      },
    },
    tangToc: [
      { q: "Số tiếp theo của dãy 2, 4, 8, 16 là số nào?", answer: "32", category: "iq", duration: 20 },
      { q: "What is the chemical symbol for Water?", answer: "H2O", category: "data", duration: 20 },
      { q: "Thủ đô của Nhật Bản là thành phố nào?", answer: "Tokyo", category: "arrange", duration: 30 },
      { q: "Sông nào dài nhất Việt Nam chảy qua đồng bằng sông Cửu Long?", answer: "Sông Mê Kông", category: "data", duration: 30 },
    ],
    veDich: {
      "10": Array.from({ length: 12 }, (_, i) => ({
        q: `Câu 10 điểm số ${i + 1}: 10 cộng 5 bằng bao nhiêu?`,
        a: "15",
        explanation: "Phép cộng cơ bản 10 + 5 = 15.",
      })),
      "20": Array.from({ length: 16 }, (_, i) => ({
        q: `Câu 20 điểm số ${i + 1}: Kim loại nào dẫn điện tốt nhất ở nhiệt độ thường?`,
        a: "Bạc (Ag); Silver",
        explanation: "Bạc có độ dẫn điện cao nhất trong tất cả các kim loại.",
      })),
      "30": Array.from({ length: 12 }, (_, i) => ({
        q: `Câu 30 điểm số ${i + 1}: In physics, what is the SI unit of force?`,
        a: "Newton",
        explanation: "Named after Sir Isaac Newton.",
      })),
      "40": Array.from({ length: 8 }, (_, i) => ({
        q: `Câu 40 điểm số ${i + 1}: Nguyên tố nào nhẹ nhất trong bảng tuần hoàn?`,
        a: "Hydro",
      })),
    },
    cauHoiPhu: [
      { q: "Câu hỏi phụ 1: Tác giả Quốc ca Việt Nam Tiến quân ca là nhạc sĩ nào?", a: "Văn Cao" },
      { q: "Câu hỏi phụ 2: What is the largest mammal on Earth?", a: "Blue whale" },
      { q: "Câu hỏi phụ 3: Hành tinh nào gần Mặt Trời nhất?", a: "Sao Thủy" },
    ],
  };

  return { ...base, ...overrides };
}

/**
 * Provisions a room (official DB-backed or fast sandbox<N>_*) with host + N players
 * via Socket.IO `/olympia` (emitting explicit `join`), opens a tracked DisplayScreen
 * browser page with TTS probes + audio unlocked, and returns a clean teardown handle.
 */
export async function setupOlympiaMatchSession(ctx, opts = {}) {
  const {
    seats = 4,
    rulesetId = "O26",
    o22Quarter,
    chpQuestionLimit = 3,
    official = false,
    roomName = `Olympia E2E ${Date.now()}`,
    contestants = null,
    questionSet = buildCustomQuestionSet(),
    displayQuery = "perf=light",
    allowTts503 = false,
    ttsEnabled = true,
    openDisplay = true,
    tag = "e2e",
  } = opts;

  let code = null;
  let hostKey = "sandbox";
  let auth = null;

  if (official) {
    const created = await createOfficialRoom(ctx.baseUrl, {
      name: roomName,
      rulesetId,
      o22Quarter,
      chpQuestionLimit,
      seatCount: seats,
      questionSet,
    });
    code = created.code;
    hostKey = created.hostKey;
    auth = created.auth;
  } else {
    code = createSandboxCode(seats, tag);
  }

  const hostSock = await connectOlympiaSocket(ctx.baseUrl, {
    code,
    role: "host",
    key: hostKey,
  });

  if (!official) {
    if (rulesetId && rulesetId !== "O26") {
      await hostSock.action({ type: "system:setRuleset", rulesetId });
    }
    if (o22Quarter) {
      await hostSock.action({ type: "system:setO22Quarter", quarter: o22Quarter });
    }
    if (questionSet) {
      await hostSock.emitAck("olympia:change_quiz_bank", { questionSet });
    }
  }

  const playerSocks = [];
  for (let i = 0; i < seats; i++) {
    const c = contestants?.[i] || {};
    const pSock = await connectOlympiaSocket(ctx.baseUrl, {
      code,
      role: "player",
      seatId: i,
      name: c.name ?? `Thí sinh ${i + 1}`,
      school: c.school !== undefined ? c.school : `THPT E2E ${i + 1}`,
      token: `e2e_${code}_seat_${i}`,
    });
    playerSocks.push(pSock);
    if (official) {
      await hostSock.action({ type: "seat:approve", seatId: i }).catch(() => null);
    }
  }

  if (ttsEnabled !== undefined) {
    await hostSock.action({ type: "tts:setEnabled", enabled: Boolean(ttsEnabled) }).catch(() => null);
  }

  let displayPage = null;
  let displayCollector = null;
  if (openDisplay) {
    const tracked = await createTrackedPage(ctx.browser, ctx.baseUrl, `display_${code}`, {
      allowTts503,
      allowOfflineDbErrors: !official,
    });
    displayPage = tracked.page;
    displayCollector = tracked.collector;
    const qs = displayQuery ? `?${displayQuery}` : "";
    await displayPage.goto(`${ctx.baseUrl}/olympia/display/${code}${qs}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await displayPage.waitForFunction(
      () => (document.body?.innerText || "").includes("OLYMPIA") || document.querySelectorAll("*").length > 10,
      { timeout: 15000 }
    );
    await unlockDisplayAudio(displayPage);
    await sleep(300);
  }

  const cleanup = async () => {
    for (const ps of playerSocks) {
      try { ps.close(); } catch {}
    }
    try { hostSock.close(); } catch {}
    if (displayPage) {
      try { await displayPage.close(); } catch {}
    }
    if (official && auth) {
      await deleteRoom(ctx.baseUrl, code, auth);
    }
  };

  return {
    code,
    hostKey,
    auth,
    hostSock,
    playerSocks,
    displayPage,
    displayCollector,
    cleanup,
  };
}

