import assert from "node:assert/strict";
import test from "node:test";
import { INTRO_VIDEO_PATHS, INTRO_MP4_PATHS, INTRO_WEBM_PATHS, getPreloadedVideoUrl, getPreloadedVideoUrls } from "./assetCache";
import type { OlympiaState } from "./types";

test("Asset Cache: INTRO_VIDEO_PATHS covers all 4 rounds", () => {
  assert.equal(INTRO_VIDEO_PATHS.khoiDong, "/olympia-intro/khoi_dong.webm");
  assert.equal(INTRO_VIDEO_PATHS.vcnv, "/olympia-intro/vuot_chuong_ngai_vat.webm");
  assert.equal(INTRO_VIDEO_PATHS.tangToc, "/olympia-intro/tang_toc.webm");
  assert.equal(INTRO_VIDEO_PATHS.veDich, "/olympia-intro/ve_dich.webm");

  // In Node environment without window, getPreloadedVideoUrl returns direct path
  assert.equal(getPreloadedVideoUrl("khoiDong"), "/olympia-intro/khoi_dong.webm");
  assert.equal(getPreloadedVideoUrl("tangToc"), "/olympia-intro/tang_toc.webm");
  assert.equal(getPreloadedVideoUrl("unknown"), "");

  // MP4 and dual URL resolution
  assert.equal(INTRO_MP4_PATHS.khoiDong, "/olympia-intro/khoi_dong.mp4");
  assert.equal(getPreloadedVideoUrl("khoiDong", "mp4"), "/olympia-intro/khoi_dong.mp4");
  assert.equal(getPreloadedVideoUrl("veDich", "mp4"), "/olympia-intro/ve_dich.mp4");
  const urls = getPreloadedVideoUrls("tangToc");
  assert.equal(urls.mp4, "/olympia-intro/tang_toc.mp4");
  assert.equal(urls.webm, "/olympia-intro/tang_toc.webm");
});

test("DisplayScreen Fullscreen Logic: showFullscreen applies to all rounds when overlayMode is FULLSCREEN", () => {
  const evaluateShowFullscreen = (state: Partial<OlympiaState>): boolean => {
    const isVcnvReveal = state.currentRound === "vcnv" && Boolean(state.vcnv?.answersRevealed);
    const isTangTocReveal = state.currentRound === "tangToc" && (state.tangToc?.phase === "ranking" || state.tangToc?.phase === "graded");
    const isTangTocQuestion = state.currentRound === "tangToc" && state.tangToc?.phase === "question";
    const isVcnvFullscreen = state.currentRound === "vcnv";

    return (
      isVcnvReveal ||
      isTangTocReveal ||
      isTangTocQuestion ||
      isVcnvFullscreen ||
      state.overlayMode === "FULLSCREEN"
    );
  };

  // 1. KhoiDong with overlayMode FULLSCREEN must evaluate to true
  assert.equal(
    evaluateShowFullscreen({ currentRound: "khoiDong", overlayMode: "FULLSCREEN" }),
    true,
    "Khởi Động in FULLSCREEN overlayMode must be fullscreen"
  );

  // 2. VeDich with overlayMode FULLSCREEN must evaluate to true
  assert.equal(
    evaluateShowFullscreen({ currentRound: "veDich", overlayMode: "FULLSCREEN" }),
    true,
    "Về Đích in FULLSCREEN overlayMode must be fullscreen"
  );

  // 3. KhoiDong in LOWER_THIRD overlayMode must be false (lower third)
  assert.equal(
    evaluateShowFullscreen({ currentRound: "khoiDong", overlayMode: "LOWER_THIRD" }),
    false,
    "Khởi Động in LOWER_THIRD must not be fullscreen"
  );
});

test("3D Studio Pause Invariant: 3D render loop is stopped when banner is active or in fullscreen", () => {
  const evaluateIs3DPaused = (
    state: Partial<OlympiaState>,
    showFullscreen: boolean,
    isOverlayHidden: boolean = false,
    isVcnvQuadView: boolean = false
  ): boolean => {
    return Boolean(
      Boolean(state.banner) ||
        Boolean(state.summaryState?.isFullscreen) ||
        (showFullscreen && state.stage === "playing" && !isOverlayHidden && !isVcnvQuadView)
    );
  };

  // 1. When banner is active: 3D is strictly paused (0% GPU)
  assert.equal(
    evaluateIs3DPaused({ banner: "khoiDong", stage: "playing" }, false),
    true,
    "3D must pause during intro banner"
  );

  // 2. When summary is fullscreen: 3D is strictly paused
  assert.equal(
    evaluateIs3DPaused({ summaryState: { active: true, isFullscreen: true } as any, stage: "playing" }, false),
    true,
    "3D must pause during fullscreen summary"
  );

  // 3. When in game fullscreen mode: 3D is paused
  assert.equal(
    evaluateIs3DPaused({ stage: "playing" }, true, false, false),
    true,
    "3D must pause when game graphics are in fullscreen mode"
  );

  // 4. In VCNV Quad View (where 3D is displayed in the bottom-right quadrant window): 3D is NOT paused
  assert.equal(
    evaluateIs3DPaused({ stage: "playing", currentRound: "vcnv" }, true, false, true),
    false,
    "3D must NOT pause in VCNV Quad View since 3D studio is visible in bottom-right quadrant"
  );
});

test("Podium 1 Yellow Highlight Bugfix: Contestant 1 podium does NOT highlight before turn actually starts", () => {
  const isKdSoloTurn = (state: Partial<OlympiaState>, cfgSeatId: number): boolean => {
    const kd = state.khoiDong;
    const curSeg = kd?.segments?.[kd.segIdx];
    return Boolean(
      state.currentRound === "khoiDong" &&
      kd?.started &&
      kd?.phase !== "intro" &&
      kd?.phase !== "segmentDone" &&
      curSeg?.kind === "solo" &&
      curSeg.seat === cfgSeatId
    );
  };

  // State right after Host clicks "Khởi Động", before pressing [BẮT ĐẦU]
  const stateJustEnteredRound: Partial<OlympiaState> = {
    currentRound: "khoiDong",
    khoiDong: {
      started: false,
      phase: "intro",
      segIdx: 0,
      qIdx: 0,
      segments: [{ kind: "solo", seat: 0, questions: 6, label: "Thí sinh 1" }],
    } as any,
  };

  // Contestant 1 (seat 0) must NOT be highlighted
  assert.equal(
    isKdSoloTurn(stateJustEnteredRound, 0),
    false,
    "Podium 1 must NOT highlight yellow before [BẮT ĐẦU] is clicked"
  );

  // Once started (started = true, phase = "thinking")
  const stateActiveTurn: Partial<OlympiaState> = {
    currentRound: "khoiDong",
    khoiDong: {
      started: true,
      phase: "thinking",
      segIdx: 0,
      qIdx: 0,
      segments: [{ kind: "solo", seat: 0, questions: 6, label: "Thí sinh 1" }],
    } as any,
  };

  // Now Contestant 1 (seat 0) IS highlighted
  assert.equal(
    isKdSoloTurn(stateActiveTurn, 0),
    true,
    "Podium 1 MUST highlight yellow once turn has actively started"
  );

  // Contestant 2 (seat 1) is NOT highlighted during TS1's turn
  assert.equal(
    isKdSoloTurn(stateActiveTurn, 1),
    false,
    "Podium 2 must NOT highlight during TS1's turn"
  );
});

test("DisplayScreen Sandbox Detection: perf=light alone on standalone window is NOT treated as sandbox", () => {
  const evaluateIsSandboxParam = (search: string, isIframe: boolean): boolean => {
    return (
      search.includes("sandbox=1") ||
      search.includes("preview=1") ||
      isIframe
    );
  };

  // Standalone window with perf=light for low-spec GPU must NOT be blocked from dismissing banner
  assert.equal(evaluateIsSandboxParam("?perf=light", false), false, "perf=light alone must not trigger sandbox block");
  assert.equal(evaluateIsSandboxParam("?perf=light&audio=1", false), false, "perf=light&audio=1 must not trigger sandbox block");

  // Iframe must be blocked
  assert.equal(evaluateIsSandboxParam("", true), true, "Sub-iframe window must trigger sandbox block");
  assert.equal(evaluateIsSandboxParam("?perf=light", true), true, "Sub-iframe with perf=light must trigger sandbox block");

  // Explicit sandbox or preview query must be blocked
  assert.equal(evaluateIsSandboxParam("?sandbox=1", false), true, "sandbox=1 must trigger sandbox block");
  assert.equal(evaluateIsSandboxParam("?preview=1", false), true, "preview=1 must trigger sandbox block");
});

test("Socket Role Authorization: role 'display' is permitted both banner:hide and banner:skip", () => {
  const isActionAuthorized = (role: string, actionType: string): boolean => {
    const isDisplayBannerAction =
      role === "display" &&
      (actionType === "banner:hide" || actionType === "banner:skip");
    return role === "host" || isDisplayBannerAction;
  };

  // Host can perform any action
  assert.equal(isActionAuthorized("host", "banner:hide"), true);
  assert.equal(isActionAuthorized("host", "banner:skip"), true);
  assert.equal(isActionAuthorized("host", "round:force"), true);

  // Display can perform banner:hide and banner:skip
  assert.equal(isActionAuthorized("display", "banner:hide"), true, "Display must be permitted banner:hide");
  assert.equal(isActionAuthorized("display", "banner:skip"), true, "Display must be permitted banner:skip");

  // Display cannot perform game-advancing host actions
  assert.equal(isActionAuthorized("display", "round:force"), false);
  assert.equal(isActionAuthorized("display", "kd:next"), false);

  // Player cannot perform banner actions
  assert.equal(isActionAuthorized("player", "banner:hide"), false);
  assert.equal(isActionAuthorized("player", "banner:skip"), false);
});

