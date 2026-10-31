# Handoff Report — Reviewer 2 (Milestone M5: Gate Verification)

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Audit**: **PASSED** (Zero integrity violations; genuine implementation with no hardcoded test mocks, facades, or bypassed logic)  
**Target Scope**: Dynamic Lighting & Buzzer System (`useOlympiaLightingState.ts`, `StudioLighting.tsx`, `Podiums.tsx`, `CentralLedWall.tsx`, and test suites)

---

## 1. Observation

### 1.1 Compilation and Automated Test Execution
1. **TypeScript Type Check**:
   - Command: `cd "d:\Timeout Quiz"; npm run type-check` (`tsc --noEmit`)
   - Result: Exited with code `0`, zero compiler errors or type mismatches.
2. **3D Olympia Comprehensive E2E Suite (97 tests)**:
   - Command: `cd "d:\Timeout Quiz"; npm run test:olympia-3d`
   - Output:
     ```
     ================================================================================
     TEST EXECUTION SUMMARY
     ================================================================================
       Tier 1 (Feature Coverage):        41 / 41 passed (Threshold: >= 35)
       Tier 2 (Boundary & Corner Cases): 43 / 43 passed (Threshold: >= 35)
       Tier 3 (Cross-Feature Combos):    8 / 8  passed (Threshold: >= 7)
       Tier 4 (Real-World Scenarios):    5 / 5  passed (Threshold: >= 5)
     --------------------------------------------------------------------------------
       TOTAL TESTS EXECUTED:             97 / 97 passed (100% Pass Rate)
     ================================================================================
     ```
   - Result: All 97 tests passed cleanly in < 150ms.
3. **Engine Integration Test Suite (40 tests)**:
   - Command: `cd "d:\Timeout Quiz"; npm run test:olympia`
   - Result: 40/40 tests passed cleanly.
4. **Lighting & Buzzer Unit Tests (10 tests)**:
   - Command: `cd "d:\Timeout Quiz"; npx esbuild src/lib/olympia/lighting-buzzer.test.ts --bundle --platform=node --target=node20 --outfile=scratch/lighting-test.cjs; node scratch/lighting-test.cjs`
   - Result: 10/10 tests passed cleanly.

### 1.2 Lighting State Machine (`useOlympiaLightingState.ts:39-108`)
- **Khởi động**:
  Lines 48–56:
  ```typescript
  case "khoiDong": {
    const kd = state.khoiDong;
    if (!kd) return "BLUE";
    if (kd.started && kd.phase !== "segmentDone" && kd.phase !== "idle") {
      return "RED";
    }
    return "BLUE";
  }
  ```
  Transitions to `RED` when `started === true` and actively in `intro`, `question`, or `result`. Reverts to `BLUE` when `phase === "segmentDone"` or `phase === "idle"`.
- **VCNV & Tăng tốc**:
  Lines 58–84:
  ```typescript
  case "vcnv": {
    const v = state.vcnv;
    if (!v || v.phase !== "question") return "BLUE";
    const startedAt = v.timer?.startedAt;
    if (startedAt != null) {
      const elapsedSec = Math.max(0, nowMs - startedAt) / 1000;
      if (elapsedSec >= 2.5) {
        return "RED";
      }
    }
    return "BLUE";
  }
  case "tangToc": {
    const tt = state.tangToc;
    if (!tt || tt.phase !== "question") return "BLUE";
    const startedAt = tt.timer?.startedAt;
    if (startedAt != null) {
      const elapsedSec = Math.max(0, nowMs - startedAt) / 1000;
      if (elapsedSec >= 2.5) {
        return "RED";
      }
    }
    return "BLUE";
  }
  ```
  Both rounds start in `BLUE`. Upon timer launch (`startedAt != null`), they wait exactly 2.5s before transitioning to `RED`. In VCNV, returning to `grid` or revealing answers (`phase = "answers"` set by `engine.ts:1360`) reverts lighting to `BLUE`. In Tăng tốc, moving to `ranking` or `graded` reverts lighting to `BLUE`.
- **Về đích**:
  Lines 86–95:
  ```typescript
  case "veDich": {
    const vd = state.veDich;
    if (!vd) return "BLUE";
    if (vd.phase !== "idle" && vd.phase !== "seatDone") {
      return "RED";
    }
    return "BLUE";
  }
  ```
  Turns `RED` when a contestant is on stage across all active phases (`choosing`, `packageReady`, `thinking`, `stealing`, `result`). Reverts to `BLUE` immediately on `seatDone` (turn finish) or `idle`.
- **Câu hỏi phụ**:
  Lines 97–103: Turns `RED` on `phase === "question"`; reverts to `BLUE` on `done` or `result`.

### 1.3 Multi-Zone Staggered Fade & Hermite Smoothstep Easing
- **Hermite Smoothstep Formula (`useOlympiaLightingState.ts:113-116`)**:
  ```typescript
  export function hermiteSmoothstep(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
  }
  ```
  Implements standard cubic Hermite polynomial $S(t) = 3t^2 - 2t^3$ with boundary clamping $c \in [0, 1]$.
- **Stagger Configuration (`useOlympiaLightingState.ts:124-128`)**:
  ```typescript
  export const STAGGER_CONFIG = {
    screen: { delay: 0.0, duration: 0.9 },
    stage: { delay: 0.5, duration: 1.2 },
    audience: { delay: 0.7, duration: 1.2 },
  };
  ```
  Screen zone initiates at $t=0.0s$; Stage back zone initiates at $t=0.5s$; Audience zone initiates at $t=0.7s$.
- **Per-Zone Calculation (`useOlympiaLightingState.ts:133-146`)**:
  ```typescript
  export function calculateZoneFade(
    fromVal: number,
    toVal: number,
    elapsedSec: number,
    delaySec: number,
    durationSec: number
  ): number {
    if (elapsedSec <= delaySec) {
      return fromVal;
    }
    const rawProgress = (elapsedSec - delaySec) / Math.max(0.001, durationSec);
    const smoothed = hermiteSmoothstep(rawProgress);
    return fromVal + (toVal - fromVal) * smoothed;
  }
  ```
  Continuous evaluation from `fromVal` to `toVal`, avoiding visual pop on mid-transition state flips.
- **Lighting Rig Consumption (`StudioLighting.tsx:231-262`)**:
  - `screenWashColor`: `#0a2663` lerped to `#d90429` via `screenFadeProgress`.
  - `stageBackColor`: `#081a44` lerped to `#b80320` via `stageFadeProgress`.
  - `stageRimColor`: `#00e5ff` lerped to `#ff2244` via `stageFadeProgress`.
  - `audienceWashColor`: `#05102a` lerped to `#7a0215` via `audienceFadeProgress`.
  - Also feeds into `StudioFloor` ring tracks, `StudioWalls` neon fins, `CentralLedWall` gradient canvas texture, and `Podiums` edge trims.

### 1.4 Buzzer Reaction System (`useOlympiaLightingState.ts:18-33` & `Podiums.tsx:260-305`)
- **Reaction Predicate**:
  ```typescript
  export function isSeatBuzzedIn3D(seatId: number, state: OlympiaState | null | undefined): boolean {
    if (!state) return false;
    switch (state.currentRound) {
      case "khoiDong":
        return state.khoiDong?.buzzedSeat === seatId;
      case "vcnv":
        return state.vcnv?.bells?.[0]?.seat === seatId;
      case "veDich":
        return state.veDich?.steal?.buzzedSeat === seatId;
      case "cauHoiPhu":
        return state.cauHoiPhu?.buzzedSeat === seatId;
      default:
        return false;
    }
  }
  ```
  - In Khởi động, Về đích, and Câu hỏi phụ: Any candidate who buzzed has their seat ID matched and lights up red.
  - In VCNV: Strictly index `0` of `state.vcnv.bells` is checked (`v.bells?.[0]?.seat === seatId`). Any subsequent buzzers at indices `1..N` evaluate to `false` and remain unlit.
- **Visual FX in `Podiums.tsx`**:
  - Dome button scales to $1.15\times$ via `Vector3.lerp`.
  - Dome material switches to intense red (`color="#ff0033"`, `emissive="#ff0022"`, `emissiveIntensity=9.0`).
  - Desk halo ring opacity lerps to 0.9 red (`#ff0033`).
  - Dual pointLights mount at the buzzer position: primary at intensity 14.0 (distance 4.5), secondary fill at intensity 10.0 (distance 2.5).
  - Desk front edge and front digital score screen flash red.

---

## 2. Logic Chain

1. **Requirement R2 Compliance (Lighting State Machine & Multi-Zone Fade)**:
   - Observation 1.2 demonstrates that `computeTargetLightingMode` implements the exact round-based triggers required: Khởi động goes RED on start and reverts to BLUE on turn/segment end; VCNV & Tăng tốc remain BLUE during the first 2.5s of timer running and then switch to RED; Về đích turns RED when onStage and reverts to BLUE on `seatDone` or `idle`.
   - Observation 1.3 confirms the staggered delays (Screen $t=0.0s$, Stage $t=0.5s$, Audience $t=0.7s$) and uses Hermite cubic smoothstep interpolation ($3t^2 - 2t^3$).
   - `transitionRef` snapshots `currentValsRef` on target switches, ensuring mathematical $C^0$ continuity (no discontinuities or pops) if lighting flips mid-fade.

2. **Requirement R3 Compliance (Buzzer Reaction System)**:
   - Observation 1.4 confirms that `isSeatBuzzedIn3D` strictly checks `v.bells?.[0]?.seat === seatId` in VCNV, guaranteeing that subsequent bell presses cannot trigger buzzer visual effects.
   - For Khởi động, Về đích, and Câu hỏi phụ, the predicate evaluates `kd.buzzedSeat`, `vd.steal.buzzedSeat`, and `chp.buzzedSeat`, correctly illuminating any buzzed contestant.
   - Visual FX (dome scale $1.15\times$, red emissive intensity 9.0, dual pointLights, desk halo) deliver broadcast-quality feedback.

3. **Integrity & Robustness Verification**:
   - Zero hardcoded test outputs or dummy facades were detected in source files.
   - Independent verification via TypeScript compilation (`tsc --noEmit`), unit test bundle execution (`scratch/lighting-test.cjs`), and the comprehensive 97-test E2E test suite passed with 100% success rate.

---

## 3. Adversarial Challenges & Findings

### Finding 1 (Minor / Defensive Quality): VCNV `answersRevealed` Guard in `useOlympiaLightingState.ts`
- **What**: In `useOlympiaLightingState.ts:60`, `case "vcnv"` checks `if (!v || v.phase !== "question") return "BLUE";`. In standard gameplay, `engine.ts:1360` sets `v.phase = "answers"` upon answer reveal, which correctly reverts the lighting to `BLUE`.
- **Adversarial Angle**: In the testing oracle `olympia-3d-suite.test.ts:136`, the specification contract is written as `if (v.phase === "question" && !v.answersRevealed && v.timer?.startedAt != null)`. If a client or test directly sets `v.answersRevealed = true` without modifying `v.phase`, `computeTargetLightingMode` would remain `RED` until phase changes.
- **Severity**: Low / Minor.
- **Recommendation**: For maximal defensive robustness, add `|| v.answersRevealed` to line 60:
  `if (!v || v.phase !== "question" || v.answersRevealed) return "BLUE";`
- **Risk Assessment**: In production, `engine.ts` always transitions `v.phase` to `"answers"` upon reveal, so real gameplay is unaffected.

### Finding 2 (Minor / Input Sanitization): Boundary Guard on `seatId` in `isSeatBuzzedIn3D`
- **What**: `isSeatBuzzedIn3D(seatId, state)` in `useOlympiaLightingState.ts:18` directly compares `buzzedSeat === seatId` without checking if `seatId` is a valid non-negative integer within `[0, maxSeats - 1]`.
- **Adversarial Angle**: If `seatId` is passed as `NaN`, `undefined`, or negative, and `buzzedSeat` happened to match or be undefined, unexpected behavior could occur.
- **Severity**: Low / Minor.
- **Recommendation**: In `Podiums.tsx`, `seatId` is strictly driven by `contestantConfigs` (`0, 1, 2, 3`), so no out-of-range indices are passed in runtime. Adding `if (typeof seatId !== "number" || !Number.isInteger(seatId) || seatId < 0 || seatId >= (state?.seatCount ?? 4)) return false;` would harden the utility for standalone consumers.

---

## 4. Caveats

- **No Caveats** affecting project delivery or functional correctness: The 3D dynamic lighting and buzzer reaction system fully complies with requirements R2 and R3.
- Performance on low-end hardware without hardware WebGL acceleration is mitigated by the 3-tier quality selector (`HIGH`, `MEDIUM`, `LIGHT`) implemented on the broadcast director dock.

---

## 5. Conclusion

- **Verdict**: **APPROVE**
- All criteria under requirements R2 and R3 have been implemented with genuine, robust logic.
- Staggered multi-zone fade cleanly executes Screen ($t=0.0s$), Stage ($t=0.5s$), and Audience ($t=0.7s$) transitions with smooth Hermite cubic easing.
- Buzzer reactions strictly enforce the single fastest bell constraint in VCNV and allow all buzzed contestants in other rounds.
- Full suite passing: TypeScript (0 errors), 3D E2E (97/97 passed), Engine (40/40 passed), Unit (10/10 passed).

---

## 6. Verification Method

To independently reproduce and verify this review:

1. **Verify TypeScript compilation**:
   ```powershell
   cd "d:\Timeout Quiz"; npm run type-check
   ```
   *Expected: Zero errors, exit code 0.*

2. **Execute comprehensive 3D Olympia E2E test suite (97 tests)**:
   ```powershell
   cd "d:\Timeout Quiz"; npm run test:olympia-3d
   ```
   *Expected: 97 / 97 passing (100% pass rate).*

3. **Execute engine test suite (40 tests)**:
   ```powershell
   cd "d:\Timeout Quiz"; npm run test:olympia
   ```
   *Expected: 40 / 40 passing.*

4. **Execute lighting and buzzer unit tests (10 tests)**:
   ```powershell
   cd "d:\Timeout Quiz"; npx esbuild src/lib/olympia/lighting-buzzer.test.ts --bundle --platform=node --target=node20 --outfile=scratch/lighting-test.cjs; node scratch/lighting-test.cjs
   ```
   *Expected: 10 / 10 passing.*

5. **Inspect source code**:
   - `src/components/olympia/studio/useOlympiaLightingState.ts`
   - `src/components/olympia/studio/StudioLighting.tsx`
   - `src/components/olympia/studio/Podiums.tsx`
   - `src/components/olympia/studio/CentralLedWall.tsx`
   - `src/components/olympia/OlympiaStudio3DScene.tsx`
