import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const INTRO_DIR = path.join(ROOT_DIR, "public", "olympia-intro");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const TEST_FILES = [
  "khoi_dong.mp4",
  "khoi_dong.webm",
  "vuot_chuong_ngai_vat.mp4",
  "vuot_chuong_ngai_vat.webm",
  "tang_toc.mp4",
  "tang_toc.webm",
  "ve_dich.mp4",
  "ve_dich.webm",
];

async function main() {
  console.log("============================================================");
  console.log("Browser Video Playback In-Depth Verification");
  console.log(`Browser: ${BROWSER_PATH}`);
  console.log("============================================================");

  // Start lightweight local HTTP server with Range request support for media streaming
  const server = http.createServer((req, res) => {
    const filename = decodeURIComponent(req.url?.slice(1) || "");
    const filePath = path.join(INTRO_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    const contentType = filename.endsWith(".mp4") ? "video/mp4" : "video/webm";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  await new Promise((resolve) => server.listen(9876, "127.0.0.1", resolve));
  console.log("Local HTTP media server running on http://127.0.0.1:9876");

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=default",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  let allPass = true;

  try {
    for (const filename of TEST_FILES) {
      const mediaUrl = `http://127.0.0.1:9876/${filename}`;

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      let pageError = null;
      page.on("pageerror", (err) => { pageError = err; });

      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
            <video id="v" src="${mediaUrl}" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
          </body>
        </html>
      `);

      // Evaluate playback status
      const playbackResult = await page.evaluate(async () => {
        const v = document.getElementById("v");
        return new Promise((resolve) => {
          let hasPlayed = false;
          let playTime = 0;

          v.addEventListener("error", () => {
            const err = v.error;
            resolve({
              ok: false,
              errorCode: err ? err.code : -1,
              errorMessage: err ? err.message : "Video error event",
              currentTime: v.currentTime,
            });
          });

          v.addEventListener("playing", () => {
            hasPlayed = true;
          });

          v.addEventListener("timeupdate", () => {
            playTime = v.currentTime;
            if (playTime >= 1.5) {
              resolve({
                ok: true,
                duration: v.duration,
                currentTime: v.currentTime,
                videoWidth: v.videoWidth,
                videoHeight: v.videoHeight,
              });
            }
          });

          // Timeout after 8 seconds
          setTimeout(() => {
            resolve({
              ok: hasPlayed && playTime > 0.5,
              duration: v.duration,
              currentTime: v.currentTime,
              videoWidth: v.videoWidth,
              videoHeight: v.videoHeight,
              timeout: true,
            });
          }, 8000);
        });
      });

      if (playbackResult.ok && !pageError) {
        console.log(`  [PASS] ${filename}: Played smoothly (${playbackResult.currentTime.toFixed(2)}s / ${playbackResult.duration.toFixed(2)}s, ${playbackResult.videoWidth}x${playbackResult.videoHeight})`);
      } else {
        console.error(`  [FAIL] ${filename}: Error code ${playbackResult.errorCode} (${playbackResult.errorMessage}) at t=${playbackResult.currentTime}s`);
        allPass = false;
      }

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (!allPass) {
    console.error("\n❌ Browser playback verification failed!");
    process.exit(1);
  } else {
    console.log("\n============================================================");
    console.log("✅ All intro videos verified playing flawlessly in Chromium!");
    console.log("============================================================");
  }
}

main().catch((err) => {
  console.error("FATAL in verify-browser-playback:", err);
  process.exit(1);
});
