/**
 * Olympia Client Asset Cache Manager (Zero-Network Playback)
 * Preloads and caches high-bitrate WebM intro videos and audio into CacheStorage
 * and in-memory Blob object URLs to guarantee 0ms instant playback and eliminate
 * network streaming latency / buffering across VPS DDNS links.
 */

const CACHE_NAME = "olympia-assets-v1";

export const INTRO_VIDEO_PATHS: Record<string, string> = {
  khoiDong: "/olympia-intro/khoi_dong.webm",
  vcnv: "/olympia-intro/vuot_chuong_ngai_vat.webm",
  tangToc: "/olympia-intro/tang_toc.webm",
  veDich: "/olympia-intro/ve_dich.webm",
};

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
 * Preload all round intro WebM videos into local memory
 */
export async function preloadOlympiaIntroVideos(): Promise<void> {
  if (typeof window === "undefined" || preloadInitiated) return;
  preloadInitiated = true;

  const entries = Object.entries(INTRO_VIDEO_PATHS);
  await Promise.all(
    entries.map(async ([round, path]) => {
      const blobUrl = await cacheAndCreateBlobUrl(path);
      if (blobUrl) {
        memoryBlobUrls.set(round, blobUrl);
      }
    })
  );
}

/**
 * Get synchronous preloaded video URL for a round
 * Returns local blob: URL if already buffered, or original path as fallback
 */
export function getPreloadedVideoUrl(roundId: string): string {
  const directPath = INTRO_VIDEO_PATHS[roundId];
  if (!directPath) return "";

  // Check if we have an in-memory blob for this round or path
  const cachedBlob = memoryBlobUrls.get(roundId) || memoryBlobUrls.get(directPath);
  if (cachedBlob) return cachedBlob;

  // Trigger background caching if not loaded yet
  if (typeof window !== "undefined") {
    cacheAndCreateBlobUrl(directPath).then((bUrl) => {
      if (bUrl) memoryBlobUrls.set(roundId, bUrl);
    });
  }

  return directPath;
}
