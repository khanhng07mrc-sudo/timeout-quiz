import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const OUTPUT_DIR = path.join(ROOT_DIR, "public", "olympia", "led_titles");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TITLES = [
  { key: "olympia", text: "ĐƯỜNG LÊN ĐỈNH OLYMPIA", fontSize: 94 },
  { key: "khoidong", text: "KHỞI ĐỘNG", fontSize: 130 },
  { key: "vcnv", text: "VƯỢT CHƯỚNG NGẠI VẬT", fontSize: 104 },
  { key: "tangtoc", text: "TĂNG TỐC", fontSize: 130 },
  { key: "vedich", text: "VỀ ĐÍCH", fontSize: 130 },
  { key: "cauhoiphu", text: "CÂU HỎI PHỤ", fontSize: 120 },
];

const FONT_FILE = path.join(ROOT_DIR, "public", "fonts", "UTM_Neutra.ttf");
const fontBase64 = fs.readFileSync(FONT_FILE).toString("base64");

async function generateTitles() {
  console.log("================================================================================");
  console.log("GENERATING OLYMPIA 3D LED TITLES VIA UTM NEUTRA FONT");
  console.log("================================================================================");

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: "new",
    defaultViewport: { width: 1920, height: 1080 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  for (const item of TITLES) {
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'UTM Neutra';
    src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
    font-weight: bold;
    font-style: normal;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px;
    height: 1080px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .title-wrap {
    position: relative;
    text-align: center;
    display: inline-block;
  }
  .title-text {
    font-family: 'UTM Neutra', sans-serif;
    font-size: ${item.fontSize}px;
    font-weight: bold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #ffffff;
    /* 3D multi-tier deep extrusion shadow */
    text-shadow:
      0 1px 0 #02081f,
      0 2px 0 #02081f,
      0 3px 0 #02081f,
      0 4px 0 #02081f,
      0 5px 0 #02081f,
      0 6px 0 #02081f,
      0 7px 0 #02081f,
      0 8px 0 #02081f,
      0 9px 0 #02081f,
      0 10px 0 #02081f,
      0 11px 0 #02081f,
      0 12px 0 #02081f,
      0 14px 16px rgba(2, 8, 31, 0.85),
      0 18px 28px rgba(0, 0, 0, 0.75),
      0 0 35px rgba(56, 189, 248, 0.65);
    /* Crisp dark contour stroke */
    -webkit-text-stroke: 4px #02081f;
    paint-order: stroke fill;
  }
</style>
</head>
<body>
  <div class="title-wrap">
    <div class="title-text">${item.text}</div>
  </div>
</body>
</html>
`;

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluateHandle("document.fonts.ready");

    const outFile = path.join(OUTPUT_DIR, `led_title_${item.key}.png`);
    await page.screenshot({
      path: outFile,
      omitBackground: true,
      fullPage: false,
    });

    console.log(`  -> Generated: ${outFile} (${item.text})`);
  }

  await browser.close();
  console.log("All 6 UTM Neutra 3D titles generated successfully!");
}

generateTitles().catch((err) => {
  console.error("Error generating titles:", err);
  process.exit(1);
});
