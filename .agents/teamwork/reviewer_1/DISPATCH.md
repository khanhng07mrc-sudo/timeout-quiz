# Dispatch for reviewer_1

Your working directory is: D:\Timeout Quiz\.agents\teamwork\reviewer_1\
Target repository: D:\Timeout Quiz
Strict constraint: Do not modify or touch D:\Olympia 26.

<original_task>
This is a single self-contained fix; keep it small and focused. Fix audio playback in the embedded sandbox view, resolve display and performance parity issues with the full tab view, and provide clear VPS deployment instructions to update the live environment.

Working directory: D:\Timeout Quiz
Integrity mode: development

## Reference Material
- Live VPS sandbox URL: https://quizorra.ddns.net/admin/sandbox?code=463275
- Relevant files in `D:\Timeout Quiz`: `src/app/admin/sandbox/page.tsx`, `src/components/olympia/OlympiaStudio3DScene.tsx`, `src/components/olympia/DisplayScreen.tsx`, `src/components/olympia/studio/CameraController.tsx`, `src/components/olympia/studio/StudioLighting.tsx`
- Previous local commit: 82600eb

## Requirements

### R1. Enable Reliable Audio in Embedded Sandbox View
Ensure audio cues and background music play directly within the embedded 3D view on `/admin/sandbox` without requiring the user to open the full tab display (`/olympia/display/<code>`). Address browser iframe autoplay restrictions and ensure AudioContext initializes and resumes properly upon user interaction.

### R2. Resolve Discrepancies Between Embedded Sandbox and Full Tab Display
Inspect how the 3D scene is rendered in `/admin/sandbox` (embedded component vs iframe) versus `/olympia/display/<code>`. Ensure the embedded view reflects the updated pre-match dark idle lighting, stable camera choreography without abrupt view snaps, and smooth rendering performance without lag or stutter.

### R3. Provide Clear VPS Deployment Commands and Script
Investigate why recent local commits (such as 82600eb) are not reflected on the live VPS (`https://quizorra.ddns.net`). Provide a verified, self-contained deployment script and clear step-by-step shell commands for pulling changes, resolving any git credential or conflict issues, rebuilding the Next.js application (`npm run build`), and restarting PM2 on the VPS.

### R4. Strict Workspace Boundary Constraint
All modifications, file creations, and edits must strictly stay within the main repository folder `D:\Timeout Quiz`. Under no circumstances modify, touch, or delete any files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz`.

## Acceptance Criteria

### Audio Playback
- [ ] Sound cues and background music play reliably in the embedded sandbox view on `/admin/sandbox` without needing to open `/olympia/display/<code>`
- [ ] AudioContext resumes properly without being blocked by browser autoplay policy

### Embedded Sandbox Parity & Performance
- [ ] Embedded 3D sandbox view reflects the dark idle lighting preset and holds stable camera position at the MC podium without sudden jump cuts
- [ ] Embedded 3D scene renders smoothly without lag or frame stuttering

### VPS Deployment Instructions
- [ ] A dedicated deployment script and clear instructions are provided detailing exact steps to pull, build, and restart the service on the VPS
- [ ] Deployment steps resolve git synchronization blocks so changes take effect on `https://quizorra.ddns.net/admin/sandbox?code=463275`

### Workspace Integrity
- [ ] No files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz` are modified or deleted

## Verification Resources
- Local sandbox route: `http://localhost:3000/admin/sandbox`
- Live VPS sandbox URL: `https://quizorra.ddns.net/admin/sandbox?code=463275`
</original_task>

<prior_attempt>
> [!WARNING] **Skepticism Disclaimer**
> I am moderately confident that audio unlock and camera stability are fixed locally and that the deployment script resolves synchronization blocks, but live VPS behavior on quizorra.ddns.net cannot be guaranteed until the local commits are pushed to GitHub and executed on the remote server.

## 1. What I changed
- `src/components/olympia/hooks.ts`:
  - Added `pendingCueRef` to capture sound cues and BGM tracks blocked by browser autoplay policies (`NotAllowedError`).
  - Enhanced `unlockAudio` to resume `AudioContext`, play `bgm.current`, warm up Web Audio with an empty buffer source, and immediately replay any pending blocked sound cues.
  - Exposed `window.__OLYMPIA_UNLOCK_AUDIO__` for synchronous activation from the parent frame during user interaction.
  - Added autoplay error interceptors in `play()` and `crossfadeToBgm()` to queue pending cues rather than dropping them silently.
- `src/app/admin/sandbox/page.tsx`:
  - Updated `forwardUnlock` to synchronously invoke `displayIframeRef.current.contentWindow.__OLYMPIA_UNLOCK_AUDIO__()` within the active user gesture context in addition to sending `postMessage({ type: "UNLOCK_AUDIO" })`.
  - Added `click` event listener alongside `pointerdown` and `keydown` for user activation capture.
- `src/components/olympia/DisplayScreen.tsx`:
  - Added `handleUserUnlock` callback and attached `onPointerDown={handleUserUnlock}` to the root viewport `div`.
  - Updated message listener to synchronously execute `__OLYMPIA_UNLOCK_AUDIO__` upon receiving `UNLOCK_AUDIO`.
- `src/components/olympia/ScaledDisplayFrame.tsx`:
  - Added `willChange: "transform"` on the scaled viewport wrapper and iframe to leverage GPU hardware compositing and eliminate repaint stutter during CSS downscaling.
  - Updated iframe permissions policy to `allow="autoplay *; fullscreen *; camera; microphone; display-capture"`.
- `src/components/olympia/studio/CameraController.tsx`:
  - Synchronized opening intro dolly (`introStartedAt`) coordinates directly with `OLYMPIA_CAM_PRESETS[1]` and `OLYMPIA_CAM_PRESETS[3]` (`pos: [2.50, 1.30, -4.50]`, `target: [3.00, 1.15, -6.70]`), eliminating the abrupt snap between Phase 2 dolly-in, Phase 3 breathing hold, and post-intro CAM 3.
  - Aligned CAM 14 preset and Khởi Động sweep start position to `[-0.95, 0.40, 4.20]`, resolving the Laurel Vitrine offset and passing studio refactor invariants.
- `deploy-vps.sh`:
  - Rewrote deployment script to safely handle VPS divergence: fetches `origin/main`, auto-stashes untracked/uncommitted changes, hard resets to `origin/main`, cleans build debris while preserving `.env*` files.
  - Added fallback from `npm ci` to `npm install --legacy-peer-deps`.
  - Added Prisma generation, Next.js + esbuild server build (`npm run build`), PM2 restart (`timeout-quiz` / `ecosystem.config.cjs`), and an automated HTTP health check probe (`/api/health`).

## 2. Why
- **R1 (Audio Playback):** In modern browsers, an iframe without prior user gesture blocks `HTMLAudioElement.play()` and suspends `AudioContext`. Asynchronous `postMessage` handlers lose the parent's user activation token. Synchronous invocation of `__OLYMPIA_UNLOCK_AUDIO__` during parent click/pointerdown events preserves the activation context, while `pendingCueRef` ensures that opening intro audio or cues triggered prior to first click are not dropped permanently.
- **R2 (Sandbox Parity & Performance):** Camera 3's target coordinate in `introStartedAt` differed from `OLYMPIA_CAM_PRESETS[3]`, causing an abrupt camera jump when the 16s intro ended. Linking `introStartedAt` and `kdStartCooldownUntil` directly to preset constants ensures continuous cinematic transitions. Adding GPU `willChange: "transform"` on the 1920x1080 scaled iframe container removes browser repaint stutter.
- **R3 (VPS Deployment Sync):** Local commit `82600eb` had never been pushed to `origin/main` on GitHub (`Your branch is ahead of 'origin/main' by 1 commit`), causing `git pull` on the VPS to report "Already up to date" while continuing to run outdated code. Furthermore, standard `git pull` on VPS often aborts due to untracked build artifacts or modified lockfiles.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npm run test:olympia` — 48 / 48 tests passed (engine invariants, rounds, scoring, rulesets).
  - Ran `npm run test:olympia-3d` — 181 / 181 tests passed (100% pass rate across Tier 1 through Tier 4, and 0 audit defects identified).
  - Ran `npm run type-check` (`tsc --noEmit`) — Passed with 0 TypeScript compiler errors.
  - Ran `npm run build` — Passed with 0 errors (Next.js compiled all 33 routes, bundled `server.js` 4.0MB).
- **Shallow Verification (manual run only):**
  - Eyeballed math vector derivations in `CameraController.tsx` for CAM 1 (`[0.0, 4.4, 13.0]` -> `[-0.6, 1.8, -3.8]`), CAM 3 (`[2.50, 1.30, -4.50]` -> `[3.00, 1.15, -6.70]`), and CAM 14 (`[-0.95, 0.40, 4.20]`).
- **Unverified aspects:**
  - Remote VPS execution: I cannot push to GitHub (`git push origin main`) or SSH into `quizorra.ddns.net` directly from this subagent session; deployment commands must be executed by the operator or host.
  - Multi-speaker audio hardware panning: Stereo panner node was verified structurally, but physical left/right channel separation requires human ears on physical headphones.

## 4. Known Issues
- `Shallow Verification`: AudioContext auto-unlock relies on user interaction either within the sandbox host console (parent) or display screen (iframe). Initial autoplay before any user gesture remains restricted by browser security policies until the first click/pointerdown event occurs.
- `Minor Robustness Risk`: If the live VPS has unstaged changes in a detached HEAD state or on a branch other than `main`, `git reset --hard origin/main` will force HEAD to `main`. The deployment script uses `git stash` before resetting to safeguard uncommitted files.

## 5. Untested Edge Cases & Next Step
- **Next Step 1 (Push Commits):**
  From local development environment:
  ```bash
  cd "D:\Timeout Quiz"
  git add deploy-vps.sh src/
  git commit -m "fix(sandbox): audio autoplay unlock, stable camera presets, and robust VPS deployment script"
  git push origin main
  ```
- **Next Step 2 (Deploy on VPS):**
  SSH into the VPS (`ssh root@quizorra.ddns.net` or operator shell) and execute:
  ```bash
  cd /path/to/timeout-quiz  # or working directory on VPS
  bash deploy-vps.sh
  ```
  Or step-by-step:
  ```bash
  git fetch origin main
  git stash --include-untracked
  git reset --hard origin/main
  npm install --legacy-peer-deps
  npx prisma generate
  npm run build
  pm2 reload ecosystem.config.cjs || pm2 restart timeout-quiz
  pm2 save
  ```
- **Reviewer check:** Load `https://quizorra.ddns.net/admin/sandbox?code=463275`, click anywhere on the page, and verify that opening background music and round audio cues play directly inside the embedded 3D frame without opening `/olympia/display/463275`.
</prior_attempt>
