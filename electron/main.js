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
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] startBackendServerIfNeeded started. appRoot=${appRoot}, serverJs=${serverJs}, exists=${fs.existsSync(serverJs)}\n`, { flag: "a" });

    const testReq = http.get(url, (res) => {
      fs.writeFileSync(logFile, `[${new Date().toISOString()}] Server already running on ${url} (status: ${res.statusCode})\n`, { flag: "a" });
      resolve(true); // Server is already running
    });
    testReq.on("error", (reqErr) => {
      fs.writeFileSync(logFile, `[${new Date().toISOString()}] testReq error: ${reqErr.message}. Attempting spawn...\n`, { flag: "a" });
      if (fs.existsSync(serverJs)) {
        const prodEnv = { ...process.env, PORT: "3000", NODE_ENV: "production" };
        try {
          serverProcess = spawn("node", ["server.js"], {
            cwd: appRoot,
            env: prodEnv,
            shell: process.platform === "win32",
            windowsHide: true,
            stdio: "ignore",
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
    testReq.setTimeout(600, () => {
      testReq.destroy();
    });
  });
}

function checkServerReady(url, timeoutMs = 25000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          clearInterval(interval);
          resolve(true);
        }
      });
      req.on("error", () => {
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      });
      req.setTimeout(600, () => {
        req.destroy();
      });
    }, 150);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: "Timeout Quiz Studio 3D (Desktop Edition)",
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

  const targetUrl = process.env.APP_URL || "http://localhost:3000";

  // Hiển thị Splash Screen trong lúc chờ server Next.js sẵn sàng
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Loading Studio 3D...</title>
        <style>
          body {
            margin: 0;
            background: radial-gradient(circle at center, #0f172a 0%, #030712 100%);
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(245, 158, 11, 0.2);
            border-top-color: #f59e0b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          h2 { margin: 0 0 8px 0; font-size: 22px; color: #fbbf24; }
          p { margin: 0; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Timeout Quiz Studio 3D</h2>
        <p>Đang kết nối hệ thống đồ họa tăng tốc GPU...</p>
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
