# Handoff Report: Investigation of MC Area Lighting (R3), Intro Audio Looping (R5), and Screenshot Verification Setup (R6)

**From**: `explorer_survey_3`  
**To**: Orchestrator (`92bc7ea3-6992-4337-87ba-6322ebaf6868`)  
**Workspace**: `d:\Timeout Quiz`  
**Working Directory**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\`  
**Date**: 2026-11-10  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

### R3 Observations (MC Area Lighting & Figure Visibility):
1. **MC Desk & Figures Definition**:
   - `d:\Timeout Quiz\src\components\olympia\studio\Podiums.tsx`:
     - Line 1843: `export function CenterMcDesk({ ... })` defines the origami faceted desk at position `[3.00, 0.08, -6.70]`, with rotation `MC_DESK_ROT_Y = -0.25 rad` (lines 2030–2033).
     - Line 2060: `export function McPresenters({ ... })` animates and renders Khánh Vy and Ngọc Huy.
     - Line 2031: `KV_DESK_POS: [3.35, 0.14, -7.11]` (Khánh Vy).
     - Line 2032: `NH_DESK_POS: [2.89, 0.14, -7.22]` (Ngọc Huy).
2. **MC Lighting Configuration**:
   - `d:\Timeout Quiz\src\components\olympia\studio\StudioLighting.tsx`:
     - Lines 3048–3085:
       - MC Key Light: `TargetedSpotLight` at `[4.60, 5.20, -3.40]`, targeting `[3.10, 1.35, -6.85]`, color `#fffaf0`, intensity `mcKeyIntensity` (lerp 4.5 to 8.5), angle 0.52, penumbra 0.45, distance 14, decay 1.5.
       - MC Fill Light: `TargetedSpotLight` at `[1.40, 4.80, -3.60]`, targeting `[3.10, 1.35, -6.85]`, color `#f0f7ff`, intensity `mcFillIntensity` (lerp 2.5 to 4.8), distance 13, decay 1.5.
       - MC Rim Light: `TargetedSpotLight` at `[3.10, 5.60, -8.80]`, targeting `[3.10, 1.45, -6.85]`, color `#ffffff`, intensity `mcRimIntensity` (lerp 1.5 to 3.2), distance 10, decay 1.8.
     - Lines 2975–2981: Ambient light is `#162848` (navy blue), intensity 0.25–0.26.
     - Lines 3024–3045: Directional key (`[4.5, 12, 7.5]`) and front flood (`[0, 5.5, 7.5]`) lights have default target `(0, 0, 0)` (Center Stage Dais).
3. **MC Material Settings**:
   - `d:\Timeout Quiz\src\components\olympia\studio\Podiums.tsx`:
     - Line 1902: `createWarmPeachSkinMaterial(color = "#f4cba5", roughness = 0.58)`: `metalness: 0.02`, `emissive: #000000`, `emissiveIntensity: 0.0`.
     - Lines 2604–2606: Khánh Vy blazer: `color="#831843"`, `roughness={0.38}`, `metalness={0.05}`, no emissive.
     - Lines 2805–2806: Ngọc Huy blazer: `color="#b88a44"`, `roughness={0.42}`, `metalness={0.12}`, no emissive.

### R5 Observations (Contestant Intro Audio Engine & Timings):
1. **Audio Engine**:
   - `d:\Timeout Quiz\src\components\olympia\hooks.ts`:
     - Line 274: `export function useOlympiaAudio(...)` manages client playback using HTML5 `Audio` elements with Web Audio `AudioContext` stereo panners.
     - Line 239: `isIntroOrMusicTrack` recognizes `contest_intro`.
     - Line 236: `isLoopingBgm` matches only `/kd_bgm_[12]$/` or `/loop/`.
     - Line 689: `const looping = isBgmCue && !isCountdown && isLoopingBgm(cue.sound);` => `looping = false` for `contest_intro`!
     - Line 737: `a.loop = looping;` sets `a.loop = false`.
2. **Audio Asset Duration**:
   - File: `d:\Timeout Quiz\public\olympia-audio\O26\6_NhacKhac\contest_intro.mp3`.
   - File size: 296,142 bytes.
   - Exact length: 710 MP3 frames at 44.1 kHz = **18.55 seconds**.
3. **Presentation Duration Logic**:
   - `d:\Timeout Quiz\src\lib\olympia\engine.ts`:
     - Lines 480–495: Contestants 0 to $N-2$ advance every 4.0s (`advanceThreshold = 4000`), and contestant $N-1$ takes 6.8s (`advanceThreshold = 6800`).
     - Formula: $T = (N - 1) \times 4.0\,\text{s} + 6.8\,\text{s}$.
     - For 6 contestants: $(5 \times 4.0) + 6.8 = \mathbf{26.8\,\text{s}}$ (18.55s track leaves 8.25s silence).
     - For 8 contestants: $(7 \times 4.0) + 6.8 = \mathbf{34.8\,\text{s}}$ (18.55s track leaves 16.25s silence).

### R6 Observations (Build, Port & Screenshot Pipeline):
1. **Application Build & Dev**:
   - `package.json`:
     - `npm run dev`: `ts-node --project tsconfig.server.json server.ts`.
     - `npm run build`: `next build --webpack && esbuild server.ts ...`. **Verified: Build succeeds with code 0!**
     - `npm run type-check`: `tsc --noEmit`. **Verified: 0 errors!**
     - `npm run test:olympia-3d`: **Verified: 489 / 489 tests pass!**
2. **Port**:
   - `server.ts` line 65: `const port = parseInt(process.env.PORT ?? "3000", 10);`. Defaults to 3000.
3. **Screenshot Automation**:
   - `puppeteer-core` version `^25.15.0` is present in devDependencies.
   - Microsoft Edge is installed at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
   - Google Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
   - Proven script `src/lib/olympia/capture-r6-screenshots.ts` uses `puppeteer-core` with WebGL ANGLE flags to capture 3D studio canvases cleanly.

---

## 2. Logic Chain

1. **R3 (MC Lighting)**:
   - Three.js v0.186 enforces physically-correct distance decay.
   - At a 5.4m distance with `decay={1.5}`, spotlight intensity arriving at the MCs drops to ~0.45 lux.
   - Directional lights focus on `(0, 0, 0)` rather than the MC desk at `[3.0, 0.08, -6.7]`.
   - The studio ambient color is navy blue (`#162848`), which does not reflect off warm peach skin, deep burgundy, or black hair.
   - The materials have zero emissive values.
   - Therefore, from wide shots (CAM 10, CAM 1), high foreground stage brightness creates an extreme contrast ratio, turning the unlit MC figures into dark silhouettes ("ghosts").
   - *Solution*: Add local warm-white `#fff5e6` lighting at the MC desk (`pointLight` at `[3.12, 2.40, -6.40]` and desk console uplight at `Y=1.20m`), decrease spotlight decay to `0.0`–`0.5` with elevated intensity, and calibrate skin/wardrobe materials with subtle broadcast emissive baseline (0.12–0.16).

2. **R5 (Audio Looping)**:
   - The audio file `contest_intro.mp3` is 18.55s long.
   - The presentation time for 6 contestants is 26.8s, and for 8 contestants is 34.8s.
   - `isLoopingBgm` returns `false` for `contest_intro`, so `a.loop = false`.
   - When the track reaches 18.55s, it terminates and remains silent for the remainder of the entrance sequence.
   - *Solution*: Implement predictive dual-instance crossfade looping in `useOlympiaAudio` triggered 2.0s before track completion ($t \approx 16.55\text{s}$), recurring until the Host begins Khởi Động (where existing `fadeOutAndStopBgm(1000)` smoothly takes over).

3. **R6 (Screenshot Setup)**:
   - `npm run build` succeeds cleanly.
   - `puppeteer-core` with Edge (`msedge.exe`) and WebGL flags (`--enable-webgl`, `--use-gl=angle`) reliably captures Three.js 3D studio views without GPU stalls.
   - Test harness routes like `/dev/graphics?tab=r6` allow automated capture of 6, 7, and 8 contestant layouts and CAM 10/CAM 3 framings.

---

## 3. Caveats

- In headless Chromium environments without physical GPU acceleration, WebGL relies on ANGLE software rasterization (SwiftShader/D3D11). `capture-r6-screenshots.ts` requires `--use-gl=angle` and `--use-angle=default` to render Three.js canvases accurately.
- `contest_intro.mp3` has a natural crescendo ending at 18.0–18.5s. A 2.0s crossfade window ($t=16.55\text{s}$) cleanly overlaps the crescendo into the opening beat of the looped track.

---

## 4. Conclusion

All three investigation areas (R3, R5, R6) have clear, actionable, and low-risk implementation paths:
1. **R3**: Update `StudioLighting.tsx` with warm white `#fff5e6` key/fill lighting focused on `[3.10, 1.35, -6.85]`, add local desk fill `pointLight`, and calibrate MC skin/fabric emissive values in `Podiums.tsx`.
2. **R5**: In `hooks.ts`, add predictive dual-instance crossfade looping for `contest_intro` triggered at 16.55s with a 2.0s crossfade overlap.
3. **R6**: Utilize `puppeteer-core` with Edge to capture visual proof of 6, 7, and 8 contestant stage layouts, CAM 10 coverage, and brightly lit MCs.

---

## 5. Verification Method

1. **Build Integrity**:
   ```bash
   npm run build
   ```
   Must exit with code 0.
2. **Contract Test Suite**:
   ```bash
   npm run test:olympia-3d
   ```
   All 489 tests must pass with 100% pass rate.
3. **Audio Duration Test**:
   ```bash
   node -e "const fs = require('fs'); const b = fs.readFileSync('public/olympia-audio/O26/6_NhacKhac/contest_intro.mp3'); console.log('Size:', b.length);"
   ```
4. **Visual Proof Screenshot Execution**:
   Launch dev server (`PORT=3005 npm run dev`) and execute headless screenshot capture script. Inspect output PNG files for proper illumination and framing.
