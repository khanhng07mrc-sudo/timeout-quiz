# Dispatch for reviewer_2

Your working directory is: D:\Timeout Quiz\.agents\teamwork\reviewer_2\
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
> High confidence in the local audio unlock mechanics, camera choreography alignment, and deployment script resilience, but actual live updates on quizorra.ddns.net cannot take effect until the local git commit is pushed to GitHub origin and executed on the VPS.

## 1. What the prior attempt got wrong

1. **Permission Policy Property Shadowing in Embedded Display:**
   - **Input:** Rendering `<ScaledDisplayFrame>` inside `src/app/admin/sandbox/page.tsx` line 12035.
   - **Expected:** The iframe should receive the expanded permissions policy `allow="autoplay *; fullscreen *; camera; microphone; display-capture"`.
   - **Actual:** Line 12039 explicitly passed `allow="autoplay; camera; microphone; display-capture"`, overriding the component's default prop and stripping `*` wildcard delegations.
   - **Root Cause:** The implementer modified the default parameter in `ScaledDisplayFrame.tsx` without noticing that `page.tsx` was passing an explicit prop that shadowed it.

2. **Missed Audio Unlock on Iframe Load & Missing Click Listener in Display View:**
   - **Input:** User already clicked/interacted with the Sandbox admin page before the 3D display iframe completed loading, or user clicked directly on the display screen.
   - **Expected:** Audio should unlock immediately once the iframe mounts without requiring an extra interaction, and clicks within the display screen should also trigger unlock.
   - **Actual:** `ScaledDisplayFrame` had no `onLoad` handler to notify the parent to trigger `forwardUnlock()`. Furthermore, `DisplayScreen.tsx` only listened to `onPointerDown`, missing `onClick` interactions in synthetic mouse/touch environments.
   - **Root Cause:** Lack of lifecycle binding between the scaled iframe mount event and the parent unlock coordinator.

3. **VPS Deployment Script Stash & Git Reset Fragility:**
   - **Input:** VPS working directory contains untracked temporary files without tracked file modifications, or is checked out on a detached HEAD / non-main branch.
   - **Expected:** `deploy-vps.sh` should reliably stash any dirty state, ensure branch `main` tracks `origin/main`, clean build debris, and preserve all `.env*` configurations.
   - **Actual:** `! git diff --quiet || ! git diff --cached --quiet` only checked tracked files, failing to stash untracked clutter. Also, `git clean -fd -e .env -e .env.production -e .env.local` could delete `.env.development` or custom `.env.*` files. Missing `.gitattributes` also risked Git converting shell scripts to CRLF on Windows checkouts, breaking bash execution on Linux VPS with `\r: command not found`.
   - **Root Cause:** Incomplete git status evaluation and lack of `.gitattributes` line-ending enforcement for shell scripts.

## 2. What I changed

- `src/app/admin/sandbox/page.tsx`:
  - Extracted `forwardUnlock` into a memoized `useCallback`.
  - Updated both `ScaledDisplayFrame` (line 12035) and fallback display iframe (line 12192) to use `allow="autoplay *; fullscreen *; camera; microphone; display-capture"`.
  - Attached `onLoad={forwardUnlock}` to `ScaledDisplayFrame` and the standard display iframe so existing user activation tokens are propagated the moment the frame completes loading.
- `src/components/olympia/ScaledDisplayFrame.tsx`:
  - Added optional `onLoad?: () => void;` prop to `ScaledDisplayFrame` interface and attached it to `<iframe onLoad={onLoad} ... />`.
- `src/components/olympia/DisplayScreen.tsx`:
  - Added `onClick={handleUserUnlock}` alongside `onPointerDown={handleUserUnlock}` on the root container div.
- `deploy-vps.sh`:
  - Upgraded stash check to `if [ -n "$(git status --porcelain)" ]` to reliably detect all uncommitted and untracked changes.
  - Added `git checkout -B main origin/main` to guarantee the local VPS branch is set to `main` tracking `origin/main`.
  - Broadened environment file exclusion in `git clean` to `-e ".env*"`.
- `.gitattributes`:
  - Created `.gitattributes` in `D:\Timeout Quiz` enforcing `*.sh text eol=lf` and `*.bash text eol=lf` to prevent Windows CRLF corruption on Linux VPS deployments.

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm run test:olympia` — 48 / 48 tests passed (engine invariants, round mechanics, scoring).
  - `npm run test:olympia-3d` — 181 / 181 tests passed (100% pass rate across Tier 1 through Tier 4 and Conformance Audit).
  - `npm test` (`tests/e2e/runner.js`) — 97 / 97 passed (100% pass rate across Econova broadcast and performance hardening).
  - `npm run type-check` (`tsc --noEmit`) — Passed with 0 TypeScript compiler errors.
  - `npm run build` (`next build --webpack && esbuild server.ts ...`) — Passed with 0 errors (all 33 routes prerendered/compiled, `server.js` 4.0MB bundled).
  - Shell script line endings: Verified `deploy-vps.sh` has LF only (`\n`) without CRLF (`\r\n`).
- **Shallow Verification (manual only):**
  - Inspected permission policy strings in `src/app/admin/sandbox/page.tsx`.
  - Checked `liveFactor` and `isPreMatchIdle` calculations across `StudioLighting.tsx`, `CentralLedWall.tsx`, and `Podiums.tsx`.
- **Unverified aspects:**
  - Remote VPS execution: Cannot push to GitHub or SSH into `quizorra.ddns.net` directly from subagent session; deployment commands must be executed by operator.
  - End-to-end browser hardware audio output on physical multi-channel sound card.

## 4. Known Issues

- `Minor Robustness Risk`: The host console and display iframe share the same origin, but browser autoplay policies still require at least one user gesture anywhere on the window before audio begins playing. Initial autoplay prior to any interaction remains blocked by browser security standards.
- `Shallow Verification`: Remote VPS git pull requires commit `82600eb` and the current uncommitted changes to be pushed to GitHub `origin/main` first.

## 5. Remaining risk & next step

### Root Cause of VPS Divergence
Commit `82600eb` (and the current uncommitted working directory changes) were created locally but have not yet been pushed to GitHub (`origin/main`). When `deploy-vps.sh` or `git pull` was executed on the VPS, git fetched `origin/main`, which was still pointing to commit `c1e6207`, reporting "Already up to date" while running outdated code.

### Execution Plan to Update Live VPS

**Step 1: Commit and push changes from `D:\Timeout Quiz`:**
```bash
cd "D:\Timeout Quiz"
git add .gitattributes deploy-vps.sh src/
git commit -m "fix(sandbox): audio autoplay unlock, camera choreography parity, and robust VPS deployment script"
git push origin main
```

**Step 2: SSH into VPS and deploy:**
```bash
ssh root@quizorra.ddns.net
cd /path/to/timeout-quiz  # or project folder on VPS
bash deploy-vps.sh
```
Or manually run the exact sequence:
```bash
git fetch origin main
if [ -n "$(git status --porcelain)" ]; then git stash --include-untracked; fi
git checkout -B main origin/main
git reset --hard origin/main
git clean -fd -e ".env*"
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy || npx prisma db push --accept-data-loss || true
npm run build
pm2 reload ecosystem.config.cjs || pm2 restart timeout-quiz || pm2 start ecosystem.config.cjs
pm2 save
```

**Step 3: Verification on Live VPS:**
Open `https://quizorra.ddns.net/admin/sandbox?code=463275`. Click anywhere on the sandbox page and verify that:
1. Audio cues and background music play directly inside the embedded 3D view.
2. The embedded 3D studio shows the dark idle lighting preset and holds stable camera position at the MC podium without view snaps.
</prior_attempt>
