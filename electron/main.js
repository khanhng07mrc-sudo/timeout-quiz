const { app, BrowserWindow, globalShortcut, Menu } = require("electron");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// ── CHROMIUM HARDWARE ACCELERATION & GPU OPTIMIZATION FLAGS ──
// Bỏ qua giới hạn background throttling và mở khóa hiệu năng tối đa của GPU
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("high-dpi-support", "1");

let mainWindow = null;
let serverProcess = null;

function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", proc.pid.toString(), "/T", "/F"], { stdio: "ignore" });
    } else {
      proc.kill("SIGKILL");
    }
  } catch (_) {}
}

function startBackendServerIfNeeded(url) {
  return new Promise((resolve) => {
    const appRoot = path.resolve(__dirname, "..");
    const serverJs = path.join(appRoot, "server.js");
    const logFile = path.join(appRoot, "electron-debug.log");
    const serverLog = path.join(appRoot, "server-runtime.log");
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] startBackendServerIfNeeded started. appRoot=${appRoot}, serverJs=${serverJs}, exists=${fs.existsSync(serverJs)}\n`, { flag: "a" });

    const testReq = http.get(url, (res) => {
      res.resume(); // Tiêu thụ stream để giải phóng socket
      fs.writeFileSync(logFile, `[${new Date().toISOString()}] Server already running on ${url} (status: ${res.statusCode})\n`, { flag: "a" });
      resolve(true);
    });
    testReq.on("error", (reqErr) => {
      fs.writeFileSync(logFile, `[${new Date().toISOString()}] testReq error: ${reqErr.message}. Attempting spawn...\n`, { flag: "a" });
      if (fs.existsSync(serverJs)) {
        const prodEnv = { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1", NODE_ENV: "production" };
        try {
          const outStream = fs.openSync(serverLog, "a");
          const errStream = fs.openSync(serverLog, "a");
          serverProcess = spawn("node", ["server.js"], {
            cwd: appRoot,
            env: prodEnv,
            shell: process.platform === "win32",
            windowsHide: true,
            stdio: ["ignore", outStream, errStream],
          });
          fs.writeFileSync(logFile, `[${new Date().toISOString()}] Spawned serverProcess with PID: ${serverProcess ? serverProcess.pid : "null"}\n`, { flag: "a" });
          serverProcess.on("error", (err) => {
            fs.writeFileSync(logFile, `[${new Date().toISOString()}] serverProcess error event: ${err.message}\n`, { flag: "a" });
          });
          serverProcess.on("exit", (code, signal) => {
            fs.writeFileSync(logFile, `[${new Date().toISOString()}] serverProcess exit: code=${code}, signal=${signal}\n`, { flag: "a" });
          });
        } catch (err) {
          fs.writeFileSync(logFile, `[${new Date().toISOString()}] Spawn exception: ${err.message}\n`, { flag: "a" });
        }
      } else {
        fs.writeFileSync(logFile, `[${new Date().toISOString()}] serverJs NOT FOUND at ${serverJs}!\n`, { flag: "a" });
      }
      resolve(false);
    });
    testReq.setTimeout(1200, () => {
      testReq.destroy();
    });
  });
}

function checkServerReady(url, timeoutMs = 35000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    let done = false;
    const interval = setInterval(() => {
      if (done) return;
      const req = http.get(url, (res) => {
        res.resume(); // Luôn tiêu thụ body để đóng socket đúng cách, chống FIN_WAIT_1
        if (res.statusCode && res.statusCode < 500) {
          done = true;
          clearInterval(interval);
          resolve(true);
        }
      });
      req.on("error", () => {
        if (Date.now() - startTime > timeoutMs) {
          done = true;
          clearInterval(interval);
          resolve(false);
        }
      });
      req.setTimeout(1200, () => {
        req.destroy();
      });
    }, 400); // 400ms polling êm dịu, không nghẽn backlog
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: "Quizorra Studio 3D (Desktop Edition)",
    icon: path.join(__dirname, "../public/brand/icon.png"),
    backgroundColor: "#030712",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Ngăn Three.js bị hạ fps khi mất focus
      webSecurity: true,
    },
  });

  // Tùy chỉnh Menu trống để giao diện gọn gàng chuẩn TV
  Menu.setApplicationMenu(null);

  // Bỏ định danh "Electron" khỏi User-Agent để Google OAuth cho phép đăng nhập mượt mà không chặn
  const originalUA = mainWindow.webContents.userAgent;
  mainWindow.webContents.userAgent = originalUA.replace(/Electron\/\S*\s?/i, "");

  const targetUrl = process.env.APP_URL || "http://127.0.0.1:3000";

  // Hiển thị Splash Screen với Holographic 3D Gyroscope Quizorra Logo
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quizorra Studio 3D</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: radial-gradient(circle at center, #0f172a 0%, #060b18 55%, #020610 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
            user-select: none;
          }
          .gyro-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .glow-orb {
            position: absolute;
            width: 240px;
            height: 240px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, rgba(168, 85, 247, 0.15) 45%, transparent 70%);
            filter: blur(24px);
            animation: orbBreathe 3s ease-in-out infinite;
          }
          .gyro-container {
            position: relative;
            width: 140px;
            height: 140px;
            perspective: 800px;
            transform-style: preserve-3d;
          }
          .gyro-outer {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid rgba(6, 182, 212, 0.6);
            border-top-color: rgba(168, 85, 247, 0.95);
            border-bottom-color: rgba(6, 182, 212, 0.95);
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.6);
            animation: gyroOrbitOuter 8s linear infinite;
            transform-style: preserve-3d;
            will-change: transform;
          }
          .star-dot-outer {
            position: absolute;
            top: -3px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #e0f2fe;
            box-shadow: 0 0 10px #38bdf8;
          }
          .gyro-inner {
            position: absolute;
            inset: 12px;
            border-radius: 50%;
            border: 2px solid rgba(168, 85, 247, 0.6);
            border-left-color: rgba(192, 132, 252, 0.95);
            border-right-color: rgba(56, 189, 248, 0.95);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
            animation: gyroOrbitInner 5s linear infinite;
            transform-style: preserve-3d;
            will-change: transform;
          }
          .star-dot-inner {
            position: absolute;
            bottom: -3px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #f3e8ff;
            box-shadow: 0 0 10px #c084fc;
          }
          .gyro-core {
            position: absolute;
            inset: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: gyroCorePulse 3s ease-in-out infinite;
            transform-style: preserve-3d;
            will-change: transform, filter;
          }
          @keyframes gyroOrbitOuter {
            0% { transform: rotateX(65deg) rotateY(15deg) rotateZ(0deg); }
            100% { transform: rotateX(65deg) rotateY(15deg) rotateZ(360deg); }
          }
          @keyframes gyroOrbitInner {
            0% { transform: rotateX(45deg) rotateY(-35deg) rotateZ(360deg); }
            100% { transform: rotateX(45deg) rotateY(-35deg) rotateZ(0deg); }
          }
          @keyframes gyroCorePulse {
            0%, 100% {
              transform: scale(1) translateZ(10px);
              filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.65));
            }
            50% {
              transform: scale(1.08) translateZ(16px);
              filter: drop-shadow(0 0 28px rgba(6, 182, 212, 0.85));
            }
          }
          @keyframes orbBreathe {
            0%, 100% { transform: scale(0.92); opacity: 0.7; }
            50% { transform: scale(1.12); opacity: 1; }
          }
        </style>
      </head>
      <body>
        <div class="gyro-wrapper">
          <div class="glow-orb"></div>
          <div class="gyro-container">
            <div class="gyro-outer">
              <div class="star-dot-outer"></div>
            </div>
            <div class="gyro-inner">
              <div class="star-dot-inner"></div>
            </div>
            <div class="gyro-core">
              <svg viewBox="0 0 200 200" fill="none" style="width: 100%; height: 100%;">
                <defs>
                  <linearGradient id="gyroQGrad" x1="40" y1="30" x2="160" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#f5d0fe" />
                    <stop offset="25%" stop-color="#c084fc" />
                    <stop offset="60%" stop-color="#38bdf8" />
                    <stop offset="100%" stop-color="#00f2fe" />
                  </linearGradient>
                  <linearGradient id="gyroTailGrad" x1="100" y1="90" x2="160" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#38bdf8" />
                    <stop offset="60%" stop-color="#06b6d4" />
                    <stop offset="100%" stop-color="#0284c7" />
                  </linearGradient>
                </defs>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z" transform="translate(0, 4)" fill="#1e103d" />
                <path fill-rule="evenodd" clip-rule="evenodd" d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z" fill="url(#gyroQGrad)" />
                <path d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z" transform="translate(0, 4)" fill="#09223d" />
                <path d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z" transform="translate(0, 4)" fill="#09223d" />
                <path d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z" transform="translate(0, 4)" fill="url(#gyroTailGrad)" />
              </svg>
            </div>
          </div>
        </div>
      </body>
    </html>
  `)}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Đảm bảo server backend đang chạy (nếu chưa thì tự động khởi chạy ngầm)
  await startBackendServerIfNeeded(targetUrl);

  // Kiểm tra kết nối tới server
  const isReady = await checkServerReady(targetUrl, 25000);
  if (mainWindow && mainWindow.webContents && mainWindow.webContents.session) {
    try {
      await mainWindow.webContents.session.clearCache();
    } catch (_) {}
  }
  if (isReady && mainWindow) {
    mainWindow.loadURL(targetUrl);
  } else if (mainWindow) {
    mainWindow.loadURL(targetUrl); // Thử tải trực tiếp
  }

  // Phím tắt F11 Fullscreen chuẩn trường quay
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11" && input.type === "keyDown") {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  killProcessTree(serverProcess);
});

app.on("will-quit", () => {
  killProcessTree(serverProcess);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
