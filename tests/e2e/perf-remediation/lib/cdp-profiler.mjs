import fs from "node:fs";
import path from "node:path";

/**
 * Returns the self-contained browser instrumentation script injected via
 * `page.evaluateOnNewDocument(...)`. It automatically installs inside both
 * top-level pages and nested iframes so WebGL, R3F, Long Task, rAF FPS,
 * WebSocket, and <audio> probes work identically everywhere.
 */
export function getInstrumentationScript() {
  return `(() => {
    if (window.__PERF_REMEDIATION_PROBES_INSTALLED__) return;
    window.__PERF_REMEDIATION_PROBES_INSTALLED__ = true;

    // ── 1. WebSocket tracking (per-frame) ─────────────────────────
    const wsStats = {
      created: 0,
      open: 0,
      closed: 0,
      urls: [],
      rootNsCount: 0,
      olympiaNsCount: 0,
    };
    const NativeWebSocket = window.WebSocket;
    if (typeof NativeWebSocket === "function") {
      const WrappedWebSocket = function(url, protocols) {
        const ws = protocols !== undefined
          ? new NativeWebSocket(url, protocols)
          : new NativeWebSocket(url);
        const urlStr = String(url);
        wsStats.created += 1;
        wsStats.urls.push(urlStr);
        if (urlStr.includes("/socket.io/") && urlStr.includes("sandbox=1")) {
          wsStats.rootNsCount += 1;
        }
        ws.addEventListener("open", () => { wsStats.open += 1; });
        ws.addEventListener("close", () => {
          wsStats.open = Math.max(0, wsStats.open - 1);
          wsStats.closed += 1;
        });
        return ws;
      };
      WrappedWebSocket.prototype = NativeWebSocket.prototype;
      Object.setPrototypeOf(WrappedWebSocket, NativeWebSocket);
      for (const k of ["CONNECTING", "OPEN", "CLOSING", "CLOSED"]) {
        WrappedWebSocket[k] = NativeWebSocket[k];
      }
      window.WebSocket = WrappedWebSocket;
    }

    // ── 2. PerformanceObserver("longtask") + rAF FPS probe ────────
    const longTasks = [];
    let totalLongTaskMs = 0;
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          totalLongTaskMs += entry.duration;
          longTasks.push({
            startTime: Math.round(entry.startTime * 100) / 100,
            duration: Math.round(entry.duration * 100) / 100,
            name: entry.name,
          });
          if (longTasks.length > 5000) longTasks.shift();
        }
      });
      po.observe({ type: "longtask", buffered: true });
    } catch {
      // longtask observer not supported in this context
    }

    let samplingRaf = false;
    let rafHandle = 0;
    let frameDeltas = [];
    let lastRafTs = 0;

    function rafTick(ts) {
      if (lastRafTs > 0) {
        frameDeltas.push(ts - lastRafTs);
      }
      lastRafTs = ts;
      if (samplingRaf) {
        rafHandle = window.requestAnimationFrame(rafTick);
      }
    }

    function getAudioElementSummary() {
      const els = Array.from(document.querySelectorAll("audio"));
      const byPreload = {};
      for (const a of els) {
        const p = a.preload || "(unset)";
        byPreload[p] = (byPreload[p] || 0) + 1;
      }
      return {
        audioElementsTotal: els.length,
        audioPreloadCounts: byPreload,
        audioReadyCount: els.filter((a) => a.readyState >= 2).length,
      };
    }

    window.__PERF_PROBE__ = {
      startSample() {
        frameDeltas = [];
        lastRafTs = 0;
        samplingRaf = true;
        rafHandle = window.requestAnimationFrame(rafTick);
        return {
          ltCountAtStart: longTasks.length,
          ltMsAtStart: totalLongTaskMs,
          startTs: performance.now(),
        };
      },
      stopSample(mark) {
        samplingRaf = false;
        if (rafHandle) cancelAnimationFrame(rafHandle);
        const endTs = performance.now();
        const elapsedMs = mark ? (endTs - mark.startTs) : frameDeltas.reduce((a, b) => a + b, 0);
        const sorted = [...frameDeltas].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = count > 0 ? sum / count : 0;
        const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
        const p95 = count > 0 ? sorted[Math.min(count - 1, Math.floor(count * 0.95))] : 0;
        const max = count > 0 ? sorted[count - 1] : 0;
        const fps = sum > 0 ? (count * 1000) / sum : 0;
        const droppedGt50ms = sorted.filter((d) => d > 50).length;
        const droppedGt100ms = sorted.filter((d) => d > 100).length;
        const ltDeltaCount = mark ? Math.max(0, longTasks.length - mark.ltCountAtStart) : longTasks.length;
        const ltDeltaMs = mark ? Math.max(0, totalLongTaskMs - mark.ltMsAtStart) : totalLongTaskMs;
        const maxLtDeltaMs = mark
          ? longTasks.slice(mark.ltCountAtStart).reduce((m, e) => Math.max(m, e.duration), 0)
          : longTasks.reduce((m, e) => Math.max(m, e.duration), 0);

        return {
          elapsedMs: Math.round(elapsedMs * 100) / 100,
          frames: count,
          fps: Math.round(fps * 100) / 100,
          avgFrameMs: Math.round(avg * 100) / 100,
          p50FrameMs: Math.round(p50 * 100) / 100,
          p95FrameMs: Math.round(p95 * 100) / 100,
          maxFrameMs: Math.round(max * 100) / 100,
          droppedGt50ms,
          droppedGt100ms,
          longTasksDeltaCount: ltDeltaCount,
          longTasksDeltaMs: Math.round(ltDeltaMs * 100) / 100,
          maxLongTaskDeltaMs: Math.round(maxLtDeltaMs * 100) / 100,
          cumulativeLongTasksCount: longTasks.length,
          cumulativeLongTasksMs: Math.round(totalLongTaskMs * 100) / 100,
          heapUsedMB: performance.memory ? Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100 : null,
          heapTotalMB: performance.memory ? Math.round((performance.memory.totalJSHeapSize / (1024 * 1024)) * 100) / 100 : null,
          domNodes: document.querySelectorAll("*").length,
          audio: getAudioElementSummary(),
          wsStats: { ...wsStats, urls: [...new Set(wsStats.urls)] },
        };
      },
      getSummary() {
        return {
          cumulativeLongTasksCount: longTasks.length,
          cumulativeLongTasksMs: Math.round(totalLongTaskMs * 100) / 100,
          maxLongTaskMs: longTasks.reduce((m, e) => Math.max(m, e.duration), 0),
          heapUsedMB: performance.memory ? Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100 : null,
          domNodes: document.querySelectorAll("*").length,
          audio: getAudioElementSummary(),
          wsStats: { ...wsStats, urls: [...new Set(wsStats.urls)] },
        };
      },
    };

    // ── 3. WebGL2 / WebGL + R3F renderer.info + Light probe ───────
    const glProbeState = {
      frameCalls: 0,
      frameTriangles: 0,
      totalCalls: 0,
      totalTriangles: 0,
      liveTextures: 0,
      liveBuffers: 0,
      livePrograms: 0,
      renderers: [],
      unmaskedRenderers: [],
      lastCompletedFrameCalls: 0,
      lastCompletedFrameTriangles: 0,
      sampledFrames: [],
      isSampling: false,
    };

    function recordFrameFlush() {
      if (glProbeState.frameCalls > 0 || glProbeState.frameTriangles > 0) {
        glProbeState.lastCompletedFrameCalls = glProbeState.frameCalls;
        glProbeState.lastCompletedFrameTriangles = glProbeState.frameTriangles;
        if (glProbeState.isSampling) {
          glProbeState.sampledFrames.push({
            calls: glProbeState.frameCalls,
            triangles: glProbeState.frameTriangles,
          });
        }
        glProbeState.frameCalls = 0;
        glProbeState.frameTriangles = 0;
      }
      window.requestAnimationFrame(recordFrameFlush);
    }
    window.requestAnimationFrame(recordFrameFlush);

    function calcTriangles(mode, count) {
      if (mode === 4) return Math.floor(count / 3);
      if (mode === 5 || mode === 6) return Math.max(0, count - 2);
      return 0;
    }

    function hookWebGLProto(proto) {
      if (!proto || proto.__PERF_HOOKED__) return;
      proto.__PERF_HOOKED__ = true;

      const origGetContextParam = proto.getParameter;
      const origGetExtension = proto.getExtension;
      const origDrawElements = proto.drawElements;
      const origDrawArrays = proto.drawArrays;
      const origDrawElementsInstanced = proto.drawElementsInstanced;
      const origDrawArraysInstanced = proto.drawArraysInstanced;
      const origCreateTexture = proto.createTexture;
      const origDeleteTexture = proto.deleteTexture;
      const origCreateBuffer = proto.createBuffer;
      const origDeleteBuffer = proto.deleteBuffer;
      const origCreateProgram = proto.createProgram;
      const origDeleteProgram = proto.deleteProgram;

      function captureRenderer(gl) {
        try {
          if (gl.__PERF_RENDERER_CAPTURED__) return;
          gl.__PERF_RENDERER_CAPTURED__ = true;
          const r = origGetContextParam.call(gl, gl.RENDERER);
          if (r && !glProbeState.renderers.includes(String(r))) {
            glProbeState.renderers.push(String(r));
          }
          const dbg = origGetExtension ? origGetExtension.call(gl, "WEBGL_debug_renderer_info") : null;
          if (dbg) {
            const ur = origGetContextParam.call(gl, dbg.UNMASKED_RENDERER_WEBGL);
            if (ur && !glProbeState.unmaskedRenderers.includes(String(ur))) {
              glProbeState.unmaskedRenderers.push(String(ur));
            }
          }
        } catch {}
      }

      if (origDrawElements) {
        proto.drawElements = function(mode, count, type, offset) {
          captureRenderer(this);
          const tris = calcTriangles(mode, count);
          glProbeState.frameCalls += 1;
          glProbeState.frameTriangles += tris;
          glProbeState.totalCalls += 1;
          glProbeState.totalTriangles += tris;
          return origDrawElements.call(this, mode, count, type, offset);
        };
      }
      if (origDrawArrays) {
        proto.drawArrays = function(mode, first, count) {
          captureRenderer(this);
          const tris = calcTriangles(mode, count);
          glProbeState.frameCalls += 1;
          glProbeState.frameTriangles += tris;
          glProbeState.totalCalls += 1;
          glProbeState.totalTriangles += tris;
          return origDrawArrays.call(this, mode, first, count);
        };
      }
      if (origDrawElementsInstanced) {
        proto.drawElementsInstanced = function(mode, count, type, offset, instanceCount) {
          captureRenderer(this);
          const tris = calcTriangles(mode, count) * (instanceCount || 0);
          glProbeState.frameCalls += 1;
          glProbeState.frameTriangles += tris;
          glProbeState.totalCalls += 1;
          glProbeState.totalTriangles += tris;
          return origDrawElementsInstanced.call(this, mode, count, type, offset, instanceCount);
        };
      }
      if (origDrawArraysInstanced) {
        proto.drawArraysInstanced = function(mode, first, count, instanceCount) {
          captureRenderer(this);
          const tris = calcTriangles(mode, count) * (instanceCount || 0);
          glProbeState.frameCalls += 1;
          glProbeState.frameTriangles += tris;
          glProbeState.totalCalls += 1;
          glProbeState.totalTriangles += tris;
          return origDrawArraysInstanced.call(this, mode, first, count, instanceCount);
        };
      }
      if (origCreateTexture) {
        proto.createTexture = function() {
          glProbeState.liveTextures += 1;
          return origCreateTexture.call(this);
        };
      }
      if (origDeleteTexture) {
        proto.deleteTexture = function(t) {
          if (t) glProbeState.liveTextures = Math.max(0, glProbeState.liveTextures - 1);
          return origDeleteTexture.call(this, t);
        };
      }
      if (origCreateBuffer) {
        proto.createBuffer = function() {
          glProbeState.liveBuffers += 1;
          return origCreateBuffer.call(this);
        };
      }
      if (origDeleteBuffer) {
        proto.deleteBuffer = function(b) {
          if (b) glProbeState.liveBuffers = Math.max(0, glProbeState.liveBuffers - 1);
          return origDeleteBuffer.call(this, b);
        };
      }
      if (origCreateProgram) {
        proto.createProgram = function() {
          glProbeState.livePrograms += 1;
          return origCreateProgram.call(this);
        };
      }
      if (origDeleteProgram) {
        proto.deleteProgram = function(p) {
          if (p) glProbeState.livePrograms = Math.max(0, glProbeState.livePrograms - 1);
          return origDeleteProgram.call(this, p);
        };
      }
    }

    if (typeof WebGL2RenderingContext !== "undefined") hookWebGLProto(WebGL2RenderingContext.prototype);
    if (typeof WebGLRenderingContext !== "undefined") hookWebGLProto(WebGLRenderingContext.prototype);

    function inspectR3FCanvases() {
      const canvases = Array.from(document.querySelectorAll("canvas"));
      const results = [];
      for (const canvas of canvases) {
        const entry = {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          r3f: null,
          sceneLights: null,
          cameraPos: null,
        };
        try {
          const fiberKey = Object.keys(canvas).find((k) => k.startsWith("__reactFiber$"));
          if (fiberKey) {
            let fiber = canvas[fiberKey];
            for (let depth = 0; depth < 25 && fiber; depth++) {
              let ms = fiber.memoizedState;
              while (ms) {
                const st = ms.memoizedState;
                if (st && typeof st === "object" && st.current) {
                  const r3fState = typeof st.current.getState === "function" ? st.current.getState() : st.current;
                  if (r3fState && r3fState.gl && r3fState.gl.info) {
                    const info = r3fState.gl.info;
                    const glCtx = typeof r3fState.gl.getContext === "function" ? r3fState.gl.getContext() : null;
                    let glRenderer = null;
                    if (glCtx) {
                      try { glRenderer = glCtx.getParameter(glCtx.RENDERER); } catch {}
                    }
                    entry.r3f = {
                      calls: info.render?.calls ?? null,
                      triangles: info.render?.triangles ?? null,
                      points: info.render?.points ?? null,
                      lines: info.render?.lines ?? null,
                      frame: info.render?.frame ?? null,
                      geometries: info.memory?.geometries ?? null,
                      textures: info.memory?.textures ?? null,
                      programs: Array.isArray(info.programs) ? info.programs.length : null,
                      pixelRatio: typeof r3fState.gl.getPixelRatio === "function" ? r3fState.gl.getPixelRatio() : null,
                      glRenderer,
                      frameloop: r3fState.frameloop ?? null,
                    };
                    if (r3fState.camera && r3fState.camera.position) {
                      entry.cameraPos = {
                        x: Math.round(r3fState.camera.position.x * 1000) / 1000,
                        y: Math.round(r3fState.camera.position.y * 1000) / 1000,
                        z: Math.round(r3fState.camera.position.z * 1000) / 1000,
                      };
                    }
                    if (r3fState.scene && typeof r3fState.scene.traverse === "function") {
                      let totalPointLights = 0;
                      let activePointLights = 0;
                      let totalSpotLights = 0;
                      let activeSpotLights = 0;
                      let shadowCastingLights = 0;
                      let totalMeshes = 0;
                      let instancedMeshes = 0;
                      let totalInstances = 0;
                      r3fState.scene.traverse((obj) => {
                        if (obj.isPointLight) {
                          totalPointLights += 1;
                          if (obj.visible && obj.intensity > 0) activePointLights += 1;
                          if (obj.castShadow) shadowCastingLights += 1;
                        } else if (obj.isSpotLight) {
                          totalSpotLights += 1;
                          if (obj.visible && obj.intensity > 0) activeSpotLights += 1;
                          if (obj.castShadow) shadowCastingLights += 1;
                        } else if (obj.isDirectionalLight) {
                          if (obj.castShadow) shadowCastingLights += 1;
                        } else if (obj.isInstancedMesh) {
                          instancedMeshes += 1;
                          totalInstances += (obj.count || 0);
                        } else if (obj.isMesh) {
                          totalMeshes += 1;
                        }
                      });
                      entry.sceneLights = {
                        totalPointLights,
                        activePointLights,
                        totalSpotLights,
                        activeSpotLights,
                        shadowCastingLights,
                        totalMeshes,
                        instancedMeshes,
                        totalInstances,
                      };
                    }
                    break;
                  }
                }
                ms = ms.next;
              }
              if (entry.r3f) break;
              fiber = fiber.return;
            }
          }
        } catch {}
        results.push(entry);
      }
      return results;
    }

    window.__WEBGL_PROBE__ = {
      startSample() {
        glProbeState.sampledFrames = [];
        glProbeState.isSampling = true;
      },
      stopSample() {
        glProbeState.isSampling = false;
        const frames = glProbeState.sampledFrames;
        const count = frames.length;
        const avgCalls = count > 0 ? frames.reduce((s, f) => s + f.calls, 0) / count : glProbeState.lastCompletedFrameCalls;
        const maxCalls = count > 0 ? frames.reduce((s, f) => Math.max(s, f.calls), 0) : glProbeState.lastCompletedFrameCalls;
        const avgTris = count > 0 ? frames.reduce((s, f) => s + f.triangles, 0) / count : glProbeState.lastCompletedFrameTriangles;
        const maxTris = count > 0 ? frames.reduce((s, f) => Math.max(s, f.triangles), 0) : glProbeState.lastCompletedFrameTriangles;
        return {
          sampledRenderFrames: count,
          avgCallsPerFrame: Math.round(avgCalls * 100) / 100,
          maxCallsPerFrame: maxCalls,
          avgTrianglesPerFrame: Math.round(avgTris * 100) / 100,
          maxTrianglesPerFrame: maxTris,
          lastFrameCalls: glProbeState.lastCompletedFrameCalls,
          lastFrameTriangles: glProbeState.lastCompletedFrameTriangles,
          liveTextures: glProbeState.liveTextures,
          liveBuffers: glProbeState.liveBuffers,
          livePrograms: glProbeState.livePrograms,
          renderers: [...glProbeState.renderers],
          unmaskedRenderers: [...glProbeState.unmaskedRenderers],
          canvases: inspectR3FCanvases(),
        };
      },
      snapshot() {
        return {
          lastFrameCalls: glProbeState.lastCompletedFrameCalls,
          lastFrameTriangles: glProbeState.lastCompletedFrameTriangles,
          totalCalls: glProbeState.totalCalls,
          totalTriangles: glProbeState.totalTriangles,
          liveTextures: glProbeState.liveTextures,
          liveBuffers: glProbeState.liveBuffers,
          livePrograms: glProbeState.livePrograms,
          renderers: [...glProbeState.renderers],
          unmaskedRenderers: [...glProbeState.unmaskedRenderers],
          canvases: inspectR3FCanvases(),
        };
      },
    };
  })();`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function sampleContext(ctx, durationMs = 3000) {
  if (typeof ctx.bringToFront === "function") {
    await ctx.bringToFront();
  }
  const mark = await ctx.evaluate(() => {
    window.__WEBGL_PROBE__?.startSample();
    return window.__PERF_PROBE__?.startSample();
  });
  await sleep(durationMs);
  return ctx.evaluate((m) => ({
    perf: window.__PERF_PROBE__?.stopSample(m) || null,
    webgl: window.__WEBGL_PROBE__?.stopSample() || null,
  }), mark);
}

export async function getWebGLSnapshot(ctx) {
  return ctx.evaluate(() => window.__WEBGL_PROBE__?.snapshot() || null);
}

export async function getPerfSummary(ctx) {
  return ctx.evaluate(() => window.__PERF_PROBE__?.getSummary() || null);
}

export async function getCdpMetrics(cdp) {
  if (!cdp) return null;
  try {
    await cdp.send("Performance.enable");
    const res = await cdp.send("Performance.getMetrics");
    const out = {};
    for (const m of res.metrics || []) {
      out[m.name] = m.value;
    }
    return {
      jsHeapUsedMB: out.JSHeapUsedSize != null ? Math.round((out.JSHeapUsedSize / (1024 * 1024)) * 100) / 100 : null,
      nodes: out.Nodes ?? null,
      layoutCount: out.LayoutCount ?? null,
      recalcStyleCount: out.RecalcStyleCount ?? null,
      scriptDurationSec: out.ScriptDuration ?? null,
      taskDurationSec: out.TaskDuration ?? null,
    };
  } catch {
    return null;
  }
}

export function loadBaselineMetrics(baselineDir) {
  if (!baselineDir) return null;
  const p = path.join(baselineDir, "baseline_metrics.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/**
 * Evaluates live CDP + WebGL + Network profiling results against PROJECT.md #1-#14
 * and TEST_INFRA.md quantitative targets and baseline_metrics.json.
 */
export function evaluateProfilingBudgets(measured, baseline) {
  const failures = [];
  const summary = {};

  // 1. /admin/sandbox Online launch & WS hygiene
  if (measured.sandboxLaunch) {
    const sl = measured.sandboxLaunch;
    summary.sandboxLaunch = sl;
    if (!sl.hasDisplayIframe || !sl.hasHostConsoleStartBtn) {
      failures.push(
        `Sandbox Online launch failed to stay mounted (hasDisplayIframe=${sl.hasDisplayIframe}, hasHostConsoleStartBtn=${sl.hasHostConsoleStartBtn})`
      );
    }
    if (sl.rootWsCount > 0) {
      failures.push(`OLYMPIA Sandbox opened ${sl.rootWsCount} '/' namespace WebSocket(s); expected 0`);
    }
    if (sl.olympiaHostWsCount > 1) {
      failures.push(`OLYMPIA Sandbox opened ${sl.olympiaHostWsCount} host '/olympia' sockets; expected <= 1`);
    }
  }

  // 2. Home lazy audio check
  if (measured.home) {
    const h = measured.home;
    const baseHomeAudio = baseline?.networkSummary?.audioVideoAssets?.filter((a) => a.page === "home").length ?? 36;
    summary.home = { ...h, baselineAudioCount: baseHomeAudio };
    if (h.audioRequestCount > 4) {
      failures.push(`Home '/' triggered ${h.audioRequestCount} eager audio/video requests (baseline=${baseHomeAudio}; target <= 4 lazy)`);
    }
    if ((h.perf?.longTasksDeltaMs ?? 0) > 250) {
      failures.push(`Home '/' longTasksDeltaMs=${h.perf.longTasksDeltaMs}ms exceeds 250ms`);
    }
  }

  // 3. Sandbox Display LIGHT Studio phases
  const studioPhases = ["lobby", "khoidongSolo", "veDichBlue", "veDich5sChase"];
  for (const key of studioPhases) {
    const m = measured.phases?.[key];
    if (!m) continue;
    const perf = m.perf || {};
    const c0 = m.webgl?.canvases?.[0];
    const pl = c0?.sceneLights?.activePointLights ?? null;
    const tris = c0?.r3f?.triangles ?? m.webgl?.avgTrianglesPerFrame ?? 0;
    const calls = c0?.r3f?.calls ?? m.webgl?.avgCallsPerFrame ?? 0;
    const instanced = c0?.sceneLights?.instancedMeshes ?? 0;
    const basePhase = baseline?.phases?.[key];
    const baseFps = basePhase?.display?.perf?.fps ?? basePhase?.perf?.fps ?? null;

    summary[key] = {
      fps: perf.fps,
      baselineFps: baseFps,
      p95FrameMs: perf.p95FrameMs,
      maxLongTaskDeltaMs: perf.maxLongTaskDeltaMs,
      activePointLights: pl,
      instancedMeshes: instanced,
      calls,
      tris,
    };

    if (pl != null && pl > 18) {
      failures.push(`Phase ${key}: activePointLights=${pl} exceeds budget <= 18`);
    }
    if (instanced <= 0) {
      failures.push(`Phase ${key}: instancedMeshes=${instanced} (expected > 0 after M1 instancing)`);
    }
    if (tris > 120000) {
      failures.push(`Phase ${key}: triangles=${tris} exceeds maxTotalSceneTriangles <= 120000`);
    }
    if (calls > 400) {
      failures.push(`Phase ${key}: drawCalls=${calls} exceeds Sandbox LIGHT budget <= 400`);
    }
    if (key === "veDich5sChase") {
      if ((perf.fps ?? 0) < 25) {
        failures.push(`Phase veDich5sChase: FPS=${perf.fps} (stalled on baseline=0; target >= 25 FPS)`);
      }
    } else if ((perf.fps ?? 0) < 30) {
      failures.push(`Phase ${key}: FPS=${perf.fps} below LIGHT target >= 30 FPS (baseline=${baseFps})`);
    }
    if ((perf.maxLongTaskDeltaMs ?? 0) > 150) {
      failures.push(`Phase ${key}: maxLongTaskDeltaMs=${perf.maxLongTaskDeltaMs}ms exceeds 150ms`);
    }
  }

  // 4. Standalone HQ Display
  if (measured.phases?.standaloneDisplayHQ) {
    const m = measured.phases.standaloneDisplayHQ;
    const perf = m.perf || {};
    const c0 = m.webgl?.canvases?.[0];
    const pl = c0?.sceneLights?.activePointLights ?? null;
    const instanced = c0?.sceneLights?.instancedMeshes ?? 0;
    const baseFps = baseline?.phases?.standaloneDisplayHQ?.perf?.fps ?? 4.58;
    summary.standaloneDisplayHQ = { fps: perf.fps, baselineFps: baseFps, activePointLights: pl, instancedMeshes: instanced };

    if (pl != null && pl > 18) {
      failures.push(`standaloneDisplayHQ: activePointLights=${pl} exceeds budget <= 18`);
    }
    if (instanced <= 0) {
      failures.push(`standaloneDisplayHQ: instancedMeshes=${instanced} (expected > 0)`);
    }
    if ((perf.fps ?? 0) < 20) {
      failures.push(`standaloneDisplayHQ: FPS=${perf.fps} below target >= 20 FPS (baseline=${baseFps})`);
    }
  }

  // 5. /dev/graphics?tab=kd
  if (measured.phases?.devGraphicsKd) {
    const m = measured.phases.devGraphicsKd;
    const perf = m.perf || {};
    const c0 = m.webgl?.canvases?.[0];
    const pl = c0?.sceneLights?.activePointLights ?? null;
    const baseFps = baseline?.phases?.devGraphicsKd?.perf?.fps ?? 0.91;
    summary.devGraphicsKd = { fps: perf.fps, baselineFps: baseFps, activePointLights: pl };

    if (pl != null && pl > 18) {
      failures.push(`devGraphicsKd: activePointLights=${pl} exceeds budget <= 18`);
    }
    if ((perf.fps ?? 0) < 12) {
      failures.push(`devGraphicsKd: FPS=${perf.fps} below target >= 12 FPS (baseline=${baseFps})`);
    }
  }

  // 6. Media & Error Hygiene
  if (measured.network) {
    const baseMediaBytes = baseline?.networkSummary?.totalAudioVideoBytes ?? 40294773;
    summary.network = {
      audioVideoAssets: measured.network.audioVideoCount,
      audioVideoBytes: measured.network.audioVideoBytes,
      baselineAudioVideoBytes: baseMediaBytes,
    };
    if (measured.network.audioVideoBytes > baseMediaBytes * 0.6) {
      failures.push(
        `Session media transfer ${Math.round(measured.network.audioVideoBytes / 1024)} KB exceeds 60% of baseline (${Math.round(baseMediaBytes / 1024)} KB)`
      );
    }
  }

  return { passed: failures.length === 0, failures, summary };
}
