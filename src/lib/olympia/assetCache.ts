/**
 * Olympia Client Asset Cache Manager (Zero-Network Playback)
 * Preloads and caches high-bitrate WebM & MP4 intro videos and audio into CacheStorage
 * and in-memory Blob object URLs to guarantee 0ms instant playback and eliminate
 * network streaming latency / buffering across VPS DDNS links.
 */

const CACHE_NAME = "olympia-assets-v1";

export const INTRO_WEBM_PATHS: Record<string, string> = {
  khoiDong: "/olympia-intro/khoi_dong.webm",
  vcnv: "/olympia-intro/vuot_chuong_ngai_vat.webm",
  tangToc: "/olympia-intro/tang_toc.webm",
  veDich: "/olympia-intro/ve_dich.webm",
};

export const INTRO_MP4_PATHS: Record<string, string> = {
  khoiDong: "/olympia-intro/khoi_dong.mp4",
  vcnv: "/olympia-intro/vuot_chuong_ngai_vat.mp4",
  tangToc: "/olympia-intro/tang_toc.mp4",
  veDich: "/olympia-intro/ve_dich.mp4",
};

// Backwards-compatible export defaulting to WebM paths
export const INTRO_VIDEO_PATHS: Record<string, string> = INTRO_WEBM_PATHS;

// In-memory Blob URL cache for instantaneous 0ms synchronous access
const memoryBlobUrls = new Map<string, string>();
const inFlightBlobLoads = new Map<string, Promise<string | null>>();
let activePreloadPromise: Promise<void> | null = null;
let preloadCompleted = false;

function isAbortError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      ("name" in err ? (err as { name?: string }).name === "AbortError" : false)
  );
}

function waitYieldAbortable(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (idleId !== null && typeof window !== "undefined" && typeof (window as any).cancelIdleCallback === "function") {
        try {
          (window as any).cancelIdleCallback(idleId);
        } catch {}
        idleId = null;
      }
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };

    const onAbort = () => finish(false);
    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    timerId = setTimeout(() => {
      timerId = null;
      if (signal?.aborted) {
        finish(false);
        return;
      }
      if (typeof window !== "undefined" && typeof (window as any).requestIdleCallback === "function") {
        idleId = (window as any).requestIdleCallback(
          () => {
            idleId = null;
            finish(!signal?.aborted);
          },
          { timeout: 800 }
        );
      } else {
        finish(true);
      }
    }, Math.max(0, ms));
  });
}

/**
 * Fetch a single media URL and store as a local blob URL (deduplicated in-flight)
 */
async function cacheAndCreateBlobUrl(path: string, signal?: AbortSignal): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (signal?.aborted) return null;

  const existingBlob = memoryBlobUrls.get(path);
  if (existingBlob) return existingBlob;

  const inFlight = inFlightBlobLoads.get(path);
  if (inFlight) return inFlight;

  const task = (async (): Promise<string | null> => {
    try {
      if (signal?.aborted) return null;
      let response: Response | undefined;

      // 1. Check browser CacheStorage first
      if ("caches" in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const matched = await cache.match(path);
          if (matched) {
            response = matched;
          } else {
            if (signal?.aborted) return null;
            // Fetch and store in CacheStorage
            const netRes = await fetch(path, { cache: "force-cache", signal });
            if (netRes.ok) {
              await cache.put(path, netRes.clone());
              response = netRes;
            }
          }
        } catch (err) {
          if (isAbortError(err) || signal?.aborted) return null;
          // CacheStorage might fail on private browsing or quota limits
        }
      }

      // 2. Direct fetch fallback if cache API unavailable
      if (!response) {
        if (signal?.aborted) return null;
        const netRes = await fetch(path, { cache: "force-cache", signal });
        if (netRes.ok) response = netRes;
      }

      if (!response || signal?.aborted) return null;

      const blob = await response.blob();
      if (signal?.aborted) return null;
      const blobUrl = URL.createObjectURL(blob);
      memoryBlobUrls.set(path, blobUrl);
      return blobUrl;
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return null;
      }
      console.warn(`[OlympiaAssetCache] Failed to preload asset ${path}:`, err);
      return null;
    } finally {
      inFlightBlobLoads.delete(path);
    }
  })();

  inFlightBlobLoads.set(path, task);
  return task;
}

/**
 * Preload round intro videos into local memory sequentially for the preferred format.
 * Prevents bandwidth exhaustion from downloading 8 full-HD videos simultaneously.
 */
export async function preloadOlympiaIntroVideos(options?: {
  signal?: AbortSignal;
  yieldMs?: number;
}): Promise<void> {
  if (typeof window === "undefined" || preloadCompleted) return;
  if (options?.signal?.aborted) return;
  if (activePreloadPromise) return activePreloadPromise;

  const yieldMs = options?.yieldMs ?? 200;

  let run: Promise<void> | null = null;
  run = (async () => {
    try {
      const primaryFormat = getPreferredIntroFormat();
      const primaryEntries = primaryFormat === "webm" ? Object.entries(INTRO_WEBM_PATHS) : Object.entries(INTRO_MP4_PATHS);

      // Load sequentially in game round progression order (khoiDong -> vcnv -> tangToc -> veDich)
      const roundOrder = ["khoiDong", "vcnv", "tangToc", "veDich"];
      primaryEntries.sort(([a], [b]) => roundOrder.indexOf(a) - roundOrder.indexOf(b));

      let completedAll = true;
      for (let i = 0; i < primaryEntries.length; i++) {
        if (options?.signal?.aborted) {
          completedAll = false;
          break;
        }
        const [round, path] = primaryEntries[i];
        const roundKey = primaryFormat === "webm" ? round : `${round}:mp4`;

        if (!memoryBlobUrls.has(roundKey) && !memoryBlobUrls.has(path)) {
          const blobUrl = await cacheAndCreateBlobUrl(path, options?.signal);
          if (blobUrl) {
            memoryBlobUrls.set(roundKey, blobUrl);
          }
        } else {
          const existing = memoryBlobUrls.get(path);
          if (existing && !memoryBlobUrls.has(roundKey)) {
            memoryBlobUrls.set(roundKey, existing);
          }
        }

        if (options?.signal?.aborted) {
          completedAll = false;
          break;
        }

        if (i < primaryEntries.length - 1) {
          const ok = await waitYieldAbortable(yieldMs, options?.signal);
          if (!ok) {
            completedAll = false;
            break;
          }
        }
      }

      if (completedAll && !options?.signal?.aborted) {
        preloadCompleted = true;
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.warn("[OlympiaAssetCache] Sequential video preload error:", err);
      }
    } finally {
      if (activePreloadPromise === run) {
        activePreloadPromise = null;
      }
    }
  })();

  activePreloadPromise = run;
  return run;
}

/**
 * Get synchronous preloaded video URL for a round and format.
 * Returns local blob: URL if already buffered, or original path as fallback.
 * Default format is "webm" to preserve backward compatibility.
 */
export function getPreloadedVideoUrl(roundId: string, format: "webm" | "mp4" = "webm"): string {
  const table = format === "mp4" ? INTRO_MP4_PATHS : INTRO_VIDEO_PATHS;
  const directPath = table[roundId];
  if (!directPath) return "";

  // Check if we have an in-memory blob for this round or path
  const roundKey = format === "mp4" ? `${roundId}:mp4` : roundId;
  const cachedBlob = memoryBlobUrls.get(roundKey) || memoryBlobUrls.get(directPath);
  if (cachedBlob) return cachedBlob;

  // Trigger background caching if not loaded yet
  if (typeof window !== "undefined") {
    cacheAndCreateBlobUrl(directPath).then((bUrl) => {
      if (bUrl) memoryBlobUrls.set(roundKey, bUrl);
    });
  }

  return directPath;
}

/**
 * Helper to retrieve both preloaded MP4 and WebM URLs for multi-source video playback
 */
export function getPreferredIntroFormat(): "webm" | "mp4" {
  if (typeof document === "undefined") return "webm";
  try {
    const testVideo = document.createElement("video");
    const canPlayWebm =
      testVideo.canPlayType && testVideo.canPlayType('video/webm; codecs="vp9, opus"') !== "";
    return canPlayWebm ? "webm" : "mp4";
  } catch {
    return "webm";
  }
}

export function isPreloadedVideoReady(roundId: string, format: "webm" | "mp4" = "webm"): boolean {
  const table = format === "mp4" ? INTRO_MP4_PATHS : INTRO_VIDEO_PATHS;
  const directPath = table[roundId];
  if (!directPath) return false;
  const roundKey = format === "mp4" ? `${roundId}:mp4` : roundId;
  return Boolean(memoryBlobUrls.get(roundKey) || memoryBlobUrls.get(directPath));
}

export function getPreloadedVideoUrls(roundId: string): { mp4: string; webm: string } {
  return {
    mp4: getPreloadedVideoUrl(roundId, "mp4"),
    webm: getPreloadedVideoUrl(roundId, "webm"),
  };
}
