# Handoff Report: Về Đích Question 1 Display Isolation, Automated Tests, Visual Screenshot Automation, and VPS Deployment

**Agent**: Explorer 3 (`explorer_survey_3`)  
**Parent / Recipient**: `47820d92-4889-4395-abf8-ed65add978a1`  
**Status**: Hard Handoff (Investigation Complete)  
**Deliverable Document**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\analysis.md`  

---

## 1. Observation

### Obs 1: Về Đích Package Confirmation Triggers Auto-Start Timer Prematurely
- **File**: `D:\Timeout Quiz\src\lib\olympia\engine.ts`
- **Lines**: 2928–2936
- **Code**:
  ```ts
  case "vd:confirmPackage": {
    const pts = ((a.points as number[]) ?? []).map(Number);
    const res = this.setPackage(pts, now);
    if (!res.ok) return res;
    this.cue("4_VeDich/open_question");
    st.vdPackageTimer = mkTimer(1800);
    startTimer(st.vdPackageTimer, now);
    return OK;
  }
  ```
- **Finding**: Calling `vd:confirmPackage` immediately triggers `4_VeDich/open_question` (premature audio) and starts `st.vdPackageTimer = mkTimer(1800)`.

### Obs 2: Main Timer Loop Auto-Advances to Question 1 Without Host Action
- **File**: `D:\Timeout Quiz\src\lib\olympia\engine.ts`
- **Lines**: 551–570
- **Code**:
  ```ts
  if (st.vdPackageTimer && expired(st.vdPackageTimer)) {
    st.vdPackageTimer = null;
    changed = true;
    if (st.veDich) {
      const vd = st.veDich;
      const owner = this.vdSeat(vd);
      const pkg = vd.packages[owner];
      if (pkg && pkg.length > 0) {
        vd.qIdx = 0;
        vd.current = pkg[0];
        if (vd.current?.q) {
          vd.current.q.used = true;
          this.recordOpenedQuestion(vd.current.q.q);
        }
        vd.phase = "thinking";
        const rs = this.ruleset.veDich;
        vd.timer = mkTimer(rs.thinkMs[String(vd.current.points)] ?? 15000);
        this.cue("4_VeDich/open_question");
      }
    }
  }
  ```
- **Finding**: Exactly 1.8 seconds after package confirmation, the server auto-populates `vd.qIdx = 0`, `vd.current = pkg[0]`, sets `vd.phase = "thinking"`, starts countdown timer, and plays `open_question`. This completely bypasses Host/MC control.

### Obs 3: DisplayScreen Enforces 2-Second Cutoff to Question Frame
- **File**: `D:\Timeout Quiz\src\components\olympia\DisplayScreen.tsx`
- **Lines**: 771–791
- **Code**:
  ```tsx
  const isPackageIntroTime = Boolean(
    hasPkg && !cur && pkgTimer?.startedAt && serverNow() - pkgTimer.startedAt < 2000
  );
  ...
  {vd.phase !== "result" && (isChoosing || isPackageIntroTime) && (
    <VeDichSlantedGridGraphic state={state} />
  )}
  ...
  ) : cur || (hasPkg && !isPackageIntroTime) ? (
    <EconovaLowerThirdV3 ... />
  )
  ```
- **Finding**: `DisplayScreen` limits package summary visibility to < 2000ms. As soon as 2s passes or `cur` is set by the 1.8s timer, it unconditionally switches to the question lower-third frame.

### Obs 4: HostConsole Hotkey Discrepancy on Key `N`
- **File**: `D:\Timeout Quiz\src\components\olympia\HostConsole.tsx`
- **Lines**: 261 & 3295
- **Code**:
  - Line 261: `else if (state?.currentRound === "veDich") call("vd:nextSeat");`
  - Line 3295: `<button type="button" onClick={() => call("vd:startQuestion")}><span>Câu tiếp (N)</span></button>`
- **Finding**: The UI button says "Câu tiếp (N)" and calls `vd:startQuestion`, but pressing key `N` triggers `vd:nextSeat`, which would prematurely end the contestant's turn and move to the next contestant.

### Obs 5: Server Masking Protects Question Text When `vd.current === null`
- **File**: `D:\Timeout Quiz\src\lib\olympia\engine.ts`
- **Lines**: 3668–3675
- **Code**:
  ```ts
  Object.values(vd.packages).forEach((pkg) => pkg.forEach((p) => (p.q = { ...p.q, q: "", media: undefined })));
  ```
- **Finding**: In `getPublicState`, when `vd.current === null`, all questions in `vd.packages` have `q: ""` and `media: undefined`. Keeping `vd.current === null` during package confirmation mathematically guarantees that question 1 cannot leak over the network.

### Obs 6: Automated Test Suites and Build Status
- **Commands & Results**:
  1. `npm run test:olympia`: **64 / 64 passing** (441ms).
  2. `npm run test:olympia-3d`: **584 / 584 passing** (853ms).
  3. `npx tsc --noEmit`: **0 errors** (Clean exit code 0).
  4. `npm run build`: **Compiled 33/33 static pages** and bundled `server.js` (4.0mb) in 2.78s.
  5. `curl.exe -s -k https://quizorra.ddns.net/api/health`: **HTTP 200 OK**, payload: `{"status":"ok","commit":"e2352a9",...}`.
  6. Git status: Clean working tree on branch `main` at commit `e2352a9`.
  7. SSH to `103.161.180.142`: `Permission denied (publickey,password)` — SSH key not present on subagent, delegating remote VPS deploy to orchestrator as required by prompt.

---

## 2. Logic Chain

1. **Premature Revelation Mechanism**:
   - From **Obs 1**, when package selection is confirmed, `vd:confirmPackage` creates a 1.8s timer `st.vdPackageTimer` and immediately emits `open_question`.
   - From **Obs 2**, when `vdPackageTimer` expires after 1.8s, `updateTimers` forces `vd.qIdx = 0`, attaches `vd.current = pkg[0]`, and transitions to `phase: "thinking"`.
   - From **Obs 3**, `DisplayScreen` drops `VeDichSlantedGridGraphic` after 2s and renders `EconovaLowerThirdV3` or chalkboard whenever `cur` or `!isPackageIntroTime` is true.
   - Therefore, the early display of Question 1 is entirely caused by the automated 1.8s timer handoff in `engine.ts` and the 2.0s timeout in `DisplayScreen.tsx`.

2. **Decoupling Strategy**:
   - By eliminating `st.vdPackageTimer` from `vd:confirmPackage` in `engine.ts`, the state remains stably in `vd.phase = "packageReady"`, `vd.qIdx = -1`, and `vd.current = null`.
   - From **Obs 5**, keeping `vd.current = null` ensures that `getPublicState` masks all question text (`q: ""`), guaranteeing anti-leakage over WebSocket broadcast.
   - By updating `DisplayScreen.tsx` to display `VeDichSlantedGridGraphic` (or package chips pill) continuously while `vd.phase === "packageReady"` and `vd.current === null`, the display holds the package information without revealing question content.
   - By updating `HostConsole.tsx` (Obs 4), the Host is provided with a dedicated button `▶ Bắt đầu Câu 1 (N)` calling `vd:startQuestion`, and hotkey `N` is mapped to `vd:startQuestion` while in `packageReady` or `result`.
   - When Host triggers `vd:startQuestion`, `engine.ts` sets `vd.qIdx = 0`, `vd.current = pkg[0]`, `vd.phase = "thinking"`, starting the countdown and revealing Question 1 text.

3. **5-State Visual Screenshot Automation**:
   - The project already has Puppeteer and Edge/Chrome automation scripts (`scripts/capture-r6-m5.mjs`, `scripts/verify-screenshots.mjs`) navigating to `/dev/graphics?tab=...`.
   - We map the 5 required states to distinct tabs/DOM IDs in `src/app/dev/graphics/client.tsx` or a dedicated runner `scripts/capture-vedich-5states.mjs`, capturing `state_1_intro.png`, `state_2_onstage.png`, `state_3_arrows_package.png`, `state_4_package_confirmed.png`, and `state_5_question1_active.png`.

4. **Production Deployment Execution**:
   - All tests pass (Obs 6), TypeScript check is clean, build succeeds.
   - Git remote is `origin/main`.
   - Since subagent lacks SSH credentials to `103.161.180.142`, preparing clean commit on `origin/main` and handing off to orchestrator for VPS deployment satisfies R6 and the security constraint.

---

## 3. Caveats

1. **Sound Cue in Package Confirmation**: When removing `this.cue("4_VeDich/open_question")` from `vd:confirmPackage`, the system should play `4_VeDich/choose_package` so the audio confirms package locking without signaling a question opening.
2. **Preset vs Custom Package Modes**: In O13–O19, packages are fixed (e.g. 40, 60, 80), whereas in O20–O27 packages are custom combinations (e.g. 20-20-20, 20-30-30). The package display in State 4 must handle both modes cleanly.
3. **SSH Access**: As verified by command execution, direct passwordless SSH to `root@103.161.180.142` is not available in the subagent environment. This is expected and handled via the orchestrator handoff protocol.

---

## 4. Conclusion

1. **Question 1 Display Isolation (R3)**:
   - **Root Cause Identified**: Auto-start timer `st.vdPackageTimer` (1800ms) in `engine.ts:2933` and `engine.ts:551` forces question 1 revelation without Host action.
   - **Decoupling Action**: Remove `st.vdPackageTimer` auto-start. Maintain `phase = "packageReady"`, `qIdx = -1`, `current = null`.
   - **Host Action**: Implement `▶ Bắt đầu Câu 1 (N)` button and bind hotkey `N` to `vd:startQuestion`.
   - **Screen Action**: Render package grid/chips during `packageReady`; withhold question lower third until `vd.phase === "thinking"`.
2. **Automated Tests**:
   - 64 engine tests and 584 3D studio tests are passing (100%).
   - Specified 3 new unit tests in `src/lib/olympia/engine.test.ts` verifying package isolation, public state censoring, and explicit host trigger.
3. **Visual Screenshots (R5)**:
   - Formulated concrete Puppeteer plan for all 5 states using `/dev/graphics` tabs and PNG validation.
4. **VPS Deployment (R6)**:
   - Build verified, healthcheck verified live on `https://quizorra.ddns.net/api/health`.

---

## 5. Verification Method

To independently verify all findings and test suites:

1. **Run Olympia Engine Test Suite**:
   ```bash
   cd "d:\Timeout Quiz"
   npm run test:olympia
   ```
   *Expected*: 64 passed, 0 failed.

2. **Run 3D Studio Test Suite**:
   ```bash
   npm run test:olympia-3d
   ```
   *Expected*: 584 passed, 0 failed.

3. **Run TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Clean exit code 0, 0 errors.

4. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Static page generation 33/33, server.js bundled (4.0mb), exit code 0.

5. **Verify Public Production Health**:
   ```bash
   curl -s -k https://quizorra.ddns.net/api/health
   ```
   *Expected*: HTTP 200 with JSON payload `{"status":"ok",...}`.
