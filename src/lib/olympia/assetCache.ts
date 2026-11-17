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
let preloadInitiated = false;

/**
 * Fetch a single media URL and store as a local blob URL
 */
async function cacheAndCreateBlobUrl(path: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    let response: Response | undefined;

    // 1. Check browser CacheStorage first
    if ("caches" in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const matched = await cache.match(path);
        if (matched) {
          response = matched;
        } else {
          // Fetch and store in CacheStorage
          const netRes = await fetch(path, { cache: "force-cache" });
          if (netRes.ok) {
            await cache.put(path, netRes.clone());
            response = netRes;
          }
        }
      } catch {
        // CacheStorage might fail on private browsing or quota limits
      }
    }

    // 2. Direct fetch fallback if cache API unavailable
    if (!response) {
      const netRes = await fetch(path, { cache: "force-cache" });
      if (netRes.ok) response = netRes;
    }

    if (!response) return null;

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    memoryBlobUrls.set(path, blobUrl);
    return blobUrl;
  } catch (err) {
    console.warn(`[OlympiaAssetCache] Failed to preload asset ${path}:`, err);
    return null;
  }
}

/**
 * Preload round intro videos into local memory sequentially for the preferred format.
 * Prevents bandwidth exhaustion from downloading 8 full-HD videos simultaneously.
 */
export async function preloadOlympiaIntroVideos(): Promise<void> {
  if (typeof window === "undefined" || preloadInitiated) return;
  preloadInitiated = true;

  try {
    const testVideo = document.createElement("video");
    const canPlayWebm = testVideo.canPlayType && testVideo.canPlayType('video/webm; codecs="vp9, opus"') !== "";
    const primaryFormat: "webm" | "mp4" = canPlayWebm ? "webm" : "mp4";
    const primaryEntries = primaryFormat === "webm" ? Object.entries(INTRO_WEBM_PATHS) : Object.entries(INTRO_MP4_PATHS);

    // Load sequentially in game round progression order (khoiDong -> vcnv -> tangToc -> veDich)
    const roundOrder = ["khoiDong", "vcnv", "tangToc", "veDich"];
    primaryEntries.sort(([a], [b]) => roundOrder.indexOf(a) - roundOrder.indexOf(b));

    for (const [round, path] of primaryEntries) {
      const blobUrl = await cacheAndCreateBlobUrl(path);
      if (blobUrl) {
        if (primaryFormat === "webm") {
          memoryBlobUrls.set(round, blobUrl);
        } else {
          memoryBlobUrls.set(`${round}:mp4`, blobUrl);
        }
      }
    }
  } catch (err) {
    console.warn("[OlympiaAssetCache] Sequential video preload error:", err);
  }
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
export function getPreloadedVideoUrls(roundId: string): { mp4: string; webm: string } {
  return {
    mp4: getPreloadedVideoUrl(roundId, "mp4"),
    webm: getPreloadedVideoUrl(roundId, "webm"),
  };
}
