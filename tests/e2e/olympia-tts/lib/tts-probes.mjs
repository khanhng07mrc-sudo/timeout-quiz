import { setTimeout as sleep } from "node:timers/promises";

/**
 * Returns the self-contained browser instrumentation script injected via
 * `page.evaluateOnNewDocument(...)`. Installs automatically in top-level pages
 * and nested iframes (e.g., sandbox Display Viewport / Player frames).
 */
export function getTtsProbeScript() {
  return `(() => {
    if (window.__TTS_PROBE_INSTALLED__) return;
    window.__TTS_PROBE_INSTALLED__ = true;

    const MAX_LOG = 500;
    const state = {
      fetchCalls: [],
      speechCalls: [],
      audioPlays: [],
      audioBufferSources: [],
      gainEvents: [],
      speakerTransitions: [],
      decodeAudioCalls: 0,
      lastSpeakerSeen: undefined,
    };

    function pushBounded(arr, item) {
      arr.push(item);
      if (arr.length > MAX_LOG) arr.shift();
    }

    function nowTs() {
      return Date.now();
    }

    // ── 1. window.__olympiaTtsSpeaker & olympia:tts-speaker event spy ──
    function recordSpeaker(speaker, source) {
      const normalized = speaker === "khanh_vy" || speaker === "ngoc_huy" ? speaker : null;
      state.lastSpeakerSeen = normalized;
      pushBounded(state.speakerTransitions, {
        ts: nowTs(),
        speaker: normalized,
        rawSpeaker: speaker ?? null,
        source,
      });
    }

    window.addEventListener("olympia:tts-speaker", (ev) => {
      const sp = ev && ev.detail ? ev.detail.speaker : null;
      recordSpeaker(sp, "event");
    });

    // Poll window.__olympiaTtsSpeaker lightly in case it is mutated without event or before listener
    setInterval(() => {
      try {
        const cur = window.__olympiaTtsSpeaker;
        if (cur !== undefined && cur !== state.lastSpeakerSeen) {
          recordSpeaker(cur, "poll");
        }
      } catch {
        // ignore
      }
    }, 40);

    // ── 2. window.fetch spy + window.__TTS_FORCE_503__ fault injector ──
    const origFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
    if (origFetch) {
      window.fetch = async function wrappedFetch(input, init) {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        const isTts = url.includes("/api/olympia/tts");
        if (!isTts) {
          return origFetch(input, init);
        }

        let reqBody = {};
        try {
          const rawBody = init && init.body ? init.body : (input && typeof input.text === "function" ? null : null);
          if (typeof rawBody === "string") {
            reqBody = JSON.parse(rawBody);
          }
        } catch {
          reqBody = {};
        }

        const entry = {
          ts: nowTs(),
          url,
          text: typeof reqBody.text === "string" ? reqBody.text : "",
          role: reqBody.role || null,
          lang: reqBody.lang || null,
          rate: reqBody.rate ?? null,
          pitch: reqBody.pitch ?? null,
          status: 0,
          engine: null,
          voice: null,
          respLang: null,
          contentType: null,
          bytes: 0,
          forced503: Boolean(window.__TTS_FORCE_503__),
        };

        if (window.__TTS_FORCE_503__) {
          entry.status = 503;
          entry.contentType = "application/json";
          pushBounded(state.fetchCalls, entry);
          return new Response(
            JSON.stringify({ error: "forced_offline", fallback: "webspeech" }),
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        try {
          const res = await origFetch(input, init);
          entry.status = res.status;
          entry.engine = res.headers.get("X-TTS-Engine");
          entry.voice = res.headers.get("X-TTS-Voice");
          entry.respLang = res.headers.get("X-TTS-Lang");
          entry.contentType = res.headers.get("Content-Type");
          try {
            const clone = res.clone();
            const buf = await clone.arrayBuffer();
            entry.bytes = buf.byteLength;
          } catch {
            // ignore clone errors
          }
          pushBounded(state.fetchCalls, entry);
          return res;
        } catch (err) {
          entry.status = -1;
          entry.error = String(err && err.message ? err.message : err);
          pushBounded(state.fetchCalls, entry);
          throw err;
        }
      };
    }

    // ── 3. window.speechSynthesis spy + optional headless onend fallback ──
    if (window.speechSynthesis && typeof window.speechSynthesis.speak === "function") {
      const synth = window.speechSynthesis;
      const origSpeak = synth.speak.bind(synth);
      const origCancel = typeof synth.cancel === "function" ? synth.cancel.bind(synth) : null;
      let activeSyntheticTimer = null;

      synth.speak = function wrappedSpeak(utterance) {
        const rec = {
          ts: nowTs(),
          type: "speak",
          text: utterance && utterance.text ? String(utterance.text) : "",
          lang: utterance && utterance.lang ? String(utterance.lang) : "",
          rate: utterance && typeof utterance.rate === "number" ? utterance.rate : null,
          pitch: utterance && typeof utterance.pitch === "number" ? utterance.pitch : null,
          voiceName: utterance && utterance.voice && utterance.voice.name ? String(utterance.voice.name) : null,
        };
        pushBounded(state.speechCalls, rec);

        // Track if native speechSynthesis finishes on its own
        let finished = false;
        if (utterance && typeof utterance.addEventListener === "function") {
          utterance.addEventListener("end", () => {
            finished = true;
          }, { once: true });
          utterance.addEventListener("error", () => {
            finished = true;
          }, { once: true });
        }

        const origOnEnd = utterance && typeof utterance.onend === "function" ? utterance.onend : null;
        if (utterance) {
          utterance.onend = function wrappedOnEnd(ev) {
            finished = true;
            if (origOnEnd) return origOnEnd.call(this, ev);
          };
        }

        try {
          origSpeak(utterance);
        } catch {
          // ignore headless speechSynthesis internal errors
        }

        // In headless Chromium without OS TTS voices, utterance.onend may never fire,
        // which would deadlock completion callbacks (e.g. VCNV CNV reveal).
        // If no native voice exists (or synthetic mode requested), fire onend cleanly if not finished.
        const useSynthetic =
          window.__TTS_SYNTHETIC_SPEECH_END__ !== false &&
          (typeof synth.getVoices !== "function" || synth.getVoices().length === 0 || window.__TTS_SYNTHETIC_SPEECH_END__ === true);

        if (useSynthetic && utterance) {
          if (activeSyntheticTimer) clearTimeout(activeSyntheticTimer);
          activeSyntheticTimer = setTimeout(() => {
            if (finished) return;
            finished = true;
            try {
              if (typeof utterance.onend === "function") {
                utterance.onend(new Event("end"));
              }
              if (typeof utterance.dispatchEvent === "function") {
                utterance.dispatchEvent(new Event("end"));
              }
            } catch {
              // ignore
            }
          }, 140);
        }
      };

      if (origCancel) {
        synth.cancel = function wrappedCancel() {
          if (activeSyntheticTimer) {
            clearTimeout(activeSyntheticTimer);
            activeSyntheticTimer = null;
          }
          pushBounded(state.speechCalls, {
            ts: nowTs(),
            type: "cancel",
            text: "",
            lang: "",
            rate: null,
            pitch: null,
            voiceName: null,
          });
          try {
            return origCancel();
          } catch {
            return undefined;
          }
        };
      }
    }

    // ── 4. HTMLAudioElement & window.Audio spy ──
    const origPlay = HTMLAudioElement.prototype.play;
    const origPause = HTMLAudioElement.prototype.pause;

    function snapshotAudioEl(el, action) {
      let src = "";
      try {
        src = el.currentSrc || el.src || el.getAttribute("src") || "";
      } catch {
        src = "";
      }
      return {
        ts: nowTs(),
        action,
        src,
        playbackRate: typeof el.playbackRate === "number" ? el.playbackRate : 1,
        preservesPitch:
          typeof el.preservesPitch === "boolean"
            ? el.preservesPitch
            : typeof el.mozPreservesPitch === "boolean"
            ? el.mozPreservesPitch
            : typeof el.webkitPreservesPitch === "boolean"
            ? el.webkitPreservesPitch
            : true,
        volume: typeof el.volume === "number" ? el.volume : 1,
      };
    }

    HTMLAudioElement.prototype.play = function wrappedPlay(...args) {
      pushBounded(state.audioPlays, snapshotAudioEl(this, "play"));
      try {
        const res = origPlay.apply(this, args);
        if (res && typeof res.catch === "function") {
          return res.catch(() => undefined);
        }
        return res;
      } catch {
        return Promise.resolve();
      }
    };

    HTMLAudioElement.prototype.pause = function wrappedPause(...args) {
      pushBounded(state.audioPlays, snapshotAudioEl(this, "pause"));
      return origPause.apply(this, args);
    };

    const OrigAudio = window.Audio;
    if (typeof OrigAudio === "function") {
      const WrappedAudio = function AudioProxy(src) {
        const el = src !== undefined ? new OrigAudio(src) : new OrigAudio();
        pushBounded(state.audioPlays, snapshotAudioEl(el, "create"));
        el.addEventListener("ended", () => {
          pushBounded(state.audioPlays, snapshotAudioEl(el, "ended"));
        });
        return el;
      };
      WrappedAudio.prototype = OrigAudio.prototype;
      Object.setPrototypeOf(WrappedAudio, OrigAudio);
      window.Audio = WrappedAudio;
    }

    // ── 5. AudioContext / GainNode / AudioBufferSourceNode spy ──
    function wrapAudioContextCtor(Ctor) {
      if (typeof Ctor !== "function" || Ctor.__ttsWrapped) return Ctor;
      const proto = Ctor.prototype;

      const origDecode = proto.decodeAudioData;
      if (typeof origDecode === "function") {
        proto.decodeAudioData = function wrappedDecode(...args) {
          state.decodeAudioCalls += 1;
          return origDecode.apply(this, args);
        };
      }

      const origCreateBufferSource = proto.createBufferSource;
      if (typeof origCreateBufferSource === "function") {
        proto.createBufferSource = function wrappedCreateBufferSource(...args) {
          const srcNode = origCreateBufferSource.apply(this, args);
          const rec = {
            ts: nowTs(),
            playbackRate: 1,
            startedAt: null,
            stoppedAt: null,
            gainEvents: [],
          };
          pushBounded(state.audioBufferSources, rec);

          const origStart = srcNode.start ? srcNode.start.bind(srcNode) : null;
          const origStop = srcNode.stop ? srcNode.stop.bind(srcNode) : null;

          if (origStart) {
            srcNode.start = function wrappedStart(...sArgs) {
              rec.startedAt = nowTs();
              try {
                rec.playbackRate = srcNode.playbackRate ? srcNode.playbackRate.value : 1;
              } catch {}
              return origStart(...sArgs);
            };
          }
          if (origStop) {
            srcNode.stop = function wrappedStop(...sArgs) {
              rec.stoppedAt = nowTs();
              return origStop(...sArgs);
            };
          }
          return srcNode;
        };
      }

      const origCreateGain = proto.createGain;
      if (typeof origCreateGain === "function") {
        proto.createGain = function wrappedCreateGain(...args) {
          const gainNode = origCreateGain.apply(this, args);
          if (gainNode && gainNode.gain) {
            const param = gainNode.gain;
            const wrapMethod = (name) => {
              if (typeof param[name] === "function") {
                const origFn = param[name].bind(param);
                param[name] = function wrappedGainParam(...gArgs) {
                  pushBounded(state.gainEvents, {
                    ts: nowTs(),
                    method: name,
                    args: gArgs.slice(0, 3),
                  });
                  return origFn(...gArgs);
                };
              }
            };
            wrapMethod("setValueAtTime");
            wrapMethod("linearRampToValueAtTime");
            wrapMethod("exponentialRampToValueAtTime");
            wrapMethod("cancelScheduledValues");
          }
          return gainNode;
        };
      }

      Ctor.__ttsWrapped = true;
      return Ctor;
    }

    if (window.AudioContext) wrapAudioContextCtor(window.AudioContext);
    if (window.webkitAudioContext) wrapAudioContextCtor(window.webkitAudioContext);

    // ── 6. Public probe API ──
    window.__TTS_PROBE__ = {
      getSnapshot() {
        return {
          fetchCalls: state.fetchCalls.slice(),
          speechCalls: state.speechCalls.slice(),
          audioPlays: state.audioPlays.slice(),
          audioBufferSources: state.audioBufferSources.slice(),
          gainEvents: state.gainEvents.slice(),
          speakerTransitions: state.speakerTransitions.slice(),
          decodeAudioCalls: state.decodeAudioCalls,
          currentSpeaker: window.__olympiaTtsSpeaker ?? null,
          force503: Boolean(window.__TTS_FORCE_503__),
        };
      },
      clear() {
        state.fetchCalls.length = 0;
        state.speechCalls.length = 0;
        state.audioPlays.length = 0;
        state.audioBufferSources.length = 0;
        state.gainEvents.length = 0;
        state.speakerTransitions.length = 0;
        state.decodeAudioCalls = 0;
      },
      setForce503(flag) {
        window.__TTS_FORCE_503__ = Boolean(flag);
      },
      setSyntheticSpeechEnd(flag) {
        window.__TTS_SYNTHETIC_SPEECH_END__ = Boolean(flag);
      },
    };
  })();`;
}

/**
 * Installs TTS probes via `evaluateOnNewDocument` (covering top-level and iframes)
 * and also evaluates immediately if the page already has a live document.
 */
export async function installTtsProbes(page) {
  const script = getTtsProbeScript();
  await page.evaluateOnNewDocument(script);
  try {
    await page.evaluate(script);
  } catch {
    // page may still be on about:blank before navigation
  }
}

export async function readTtsProbe(pageOrFrame) {
  return pageOrFrame.evaluate(() => {
    if (!window.__TTS_PROBE__) return null;
    return window.__TTS_PROBE__.getSnapshot();
  });
}

export async function clearTtsProbe(pageOrFrame) {
  await pageOrFrame.evaluate(() => {
    if (window.__TTS_PROBE__) window.__TTS_PROBE__.clear();
  });
}

export async function setForceTts503(pageOrFrame, enabled) {
  await pageOrFrame.evaluate((flag) => {
    window.__TTS_FORCE_503__ = Boolean(flag);
    if (window.__TTS_PROBE__) window.__TTS_PROBE__.setForce503(Boolean(flag));
  }, Boolean(enabled));
}

export async function assertHostPageSilent(hostPage, label = "HostConsole") {
  const snap = await readTtsProbe(hostPage);
  if (!snap) {
    throw new Error(`[${label}] TTS probe not installed on host page`);
  }
  const speechSpeaks = snap.speechCalls.filter((c) => c.type === "speak");
  const audioPlayActions = snap.audioPlays.filter((a) => a.action === "play");
  const bufferStarts = snap.audioBufferSources.filter((b) => b.startedAt != null);

  if (snap.fetchCalls.length > 0) {
    throw new Error(
      `[${label}] HostConsole illegally called /api/olympia/tts (${snap.fetchCalls.length}x): ${JSON.stringify(snap.fetchCalls[0])}`
    );
  }
  if (speechSpeaks.length > 0) {
    throw new Error(
      `[${label}] HostConsole illegally invoked speechSynthesis.speak (${speechSpeaks.length}x): ${speechSpeaks[0].text}`
    );
  }
  if (audioPlayActions.length > 0 || bufferStarts.length > 0) {
    throw new Error(
      `[${label}] HostConsole illegally played audio (HTMLAudio=${audioPlayActions.length}, WebAudio=${bufferStarts.length})`
    );
  }

  // Also inspect any nested PiP display iframe (?mute=1) inside HostConsole
  if (typeof hostPage.frames === "function") {
    for (const f of hostPage.frames()) {
      if (f === hostPage.mainFrame()) continue;
      if (f.url().includes("/olympia/display/")) {
        const frameSnap = await readTtsProbe(f).catch(() => null);
        if (frameSnap) {
          const fSpeaks = frameSnap.speechCalls.filter((c) => c.type === "speak");
          const fPlays = frameSnap.audioPlays.filter((a) => a.action === "play");
          if (frameSnap.fetchCalls.length > 0 || fSpeaks.length > 0 || fPlays.length > 0) {
            throw new Error(
              `[${label} PiP iframe] Muted PiP Display iframe illegally played TTS/audio: fetches=${frameSnap.fetchCalls.length}, speaks=${fSpeaks.length}, plays=${fPlays.length}`
            );
          }
        }
      }
    }
  }
  return snap;
}

export async function waitForTtsCall(pageOrFrame, predicate, timeoutMs = 8000, pollMs = 100) {
  const start = Date.now();
  let lastSnap = null;
  while (Date.now() - start < timeoutMs) {
    lastSnap = await readTtsProbe(pageOrFrame);
    if (lastSnap && predicate(lastSnap)) {
      return lastSnap;
    }
    await sleep(pollMs);
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for TTS probe predicate. Last snapshot: ${JSON.stringify({
      fetches: lastSnap?.fetchCalls?.length ?? 0,
      speeches: lastSnap?.speechCalls?.length ?? 0,
      audioPlays: lastSnap?.audioPlays?.length ?? 0,
      speakers: lastSnap?.speakerTransitions?.slice(-4) ?? [],
    })}`
  );
}
