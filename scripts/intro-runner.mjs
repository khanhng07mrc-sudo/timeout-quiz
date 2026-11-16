import { OlympiaIntroScene, ROUND_CONFIGS } from "./intro-scene-builder.mjs";

let currentScene = null;
let currentCanvas = null;

window.initIntroScene = function (roundKey, fontBase64, laurelBase64) {
  currentCanvas = document.getElementById("c");
  if (!currentCanvas) {
    throw new Error("Canvas #c not found");
  }

  // Convert fontBase64 to ArrayBuffer
  const fontBinary = atob(fontBase64);
  const fontBytes = new Uint8Array(fontBinary.length);
  for (let i = 0; i < fontBinary.length; i++) {
    fontBytes[i] = fontBinary.charCodeAt(i);
  }
  const fontBuffer = fontBytes.buffer;

  // Laurel image data URL
  const laurelDataUrl = laurelBase64 ? `data:image/webp;base64,${laurelBase64}` : null;

  currentScene = new OlympiaIntroScene(currentCanvas, fontBuffer, laurelDataUrl, roundKey);
  console.log(`Olympia intro scene initialized for round: ${roundKey}`);
  return currentScene.readyPromise;
};

window.renderIntroFrame = function (frameIndex, fps = 30) {
  if (!currentScene) {
    throw new Error("Scene not initialized. Call initIntroScene() first.");
  }
  const timeSec = frameIndex / fps;
  currentScene.render(timeSec);
  return currentCanvas.toDataURL("image/jpeg", 0.90);
};

window.__READY__ = true;
