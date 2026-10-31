# Challenger Handoff Report — Milestone M5 (Gate Verification: Track 1)

## 1. Observation
1. **Adversarial Stress Harness Execution**:
   - Implemented a 6-suite empirical stress-test harness in `d:\Timeout Quiz\scratch\challenger1-stress.ts` importing directly from `src/components/olympia/studio/useOlympiaLightingState.ts`.
   - Bundled and executed via command:
     ```powershell
     cd "d:\Timeout Quiz"; npx esbuild scratch/challenger1-stress.ts --bundle --platform=node --target=node20 --outfile=scratch/challenger1-stress.cjs; node scratch/challenger1-stress.cjs
     ```
   - Execution output:
     ```text
     ================================================================================
     CHALLENGER 1: ADVERSARIAL EMPIRICAL STRESS TEST SUITE
     ================================================================================

     --- SUITE 1: Rapid State Toggles & Timer Boundary Stress ---
       [PASS] ST1.1: Rapid start/stop Khởi động toggle (10,000 rapid cycles)
       [PASS] ST1.2: Rapid Khởi động segmentDone transitions without starting flag reset
       [PASS] ST1.3: VCNV 2.5s timer boundary micro-stepping: 2490ms vs 2500ms vs 2510ms
       [PASS] ST1.4: Tăng tốc 2.5s timer boundary micro-stepping: 2490ms vs 2500ms vs 2510ms
       [PASS] ST1.5: VCNV paused timer right at boundary (startedAt is null)
       [PASS] ST1.6: VCNV answersRevealed vs phase question evaluation check

     --- SUITE 2: Buzzer Concurrency & Contention Stress ---
       [PASS] ST2.1: 4 contestants buzzing within 1 millisecond in VCNV
       [PASS] ST2.2: 4 contestants buzzing at IDENTICAL millisecond timestamp in VCNV
       [PASS] ST2.3: All 24 permutations of 4 contestant seats buzzing
       [PASS] ST2.4: VCNV bell array with repeated / duplicate buzzers from same seat

     --- SUITE 3: Staggered Fade Math & Numerical Stability ---
       [PASS] ST3.1: Hermite smoothstep strictly monotonic progression (50,000 subdivisions)
       [PASS] ST3.2: Hermite smoothstep boundary clamping & extreme limits
       [PASS] ST3.3: Negative time offset handling in calculateZoneFade
       [PASS] ST3.4: Zero and negative durationSec protection
       [PASS] ST3.5: Zone separation invariant during Blue -> Red forward fade
       [PASS] ST3.6: Zone separation invariant during Red -> Blue reverse fade

     --- SUITE 4: Abnormal States, Malformed Data & Seat Boundaries ---
       [PASS] ST4.1: computeTargetLightingMode with null and undefined state
       [PASS] ST4.2: computeTargetLightingMode with empty object or missing stage
       [PASS] ST4.3: Missing sub-states during playing rounds
       [PASS] ST4.4: Malformed VCNV timer objects
       [PASS] ST4.5: isSeatBuzzedIn3D with null and undefined state
       [PASS] ST4.6: isSeatBuzzedIn3D with empty bells array in VCNV
       [PASS] ST4.7: isSeatBuzzedIn3D with missing bells property in VCNV
       [PASS] ST4.8: isSeatBuzzedIn3D with invalid seat IDs (-1, 4, 99, NaN, float)
       [PASS] ST4.9: ADVERSARIAL EDGE CASE: uninitialized / sentinel buzzedSeat (-1) in state
       [PASS] ST4.10: ADVERSARIAL EDGE CASE: undefined seatId with unbuzzed state

     --- SUITE 5: Dynamic Animation Loop & Mid-Transition Interruption ---
       [PASS] ST5.1: Simulated 60 FPS animation loop with severe frame drops (up to 2000ms)
       [PASS] ST5.2: Mid-flight rapid reversal (Blue -> Red at t=0, Red -> Blue at t=0.3s)

     --- SUITE 6: Fuzz Testing (50,000 Randomized Invocations) ---
       [PASS] ST6.1: Fuzz testing computeTargetLightingMode & isSeatBuzzedIn3D (50,000 iterations)

     ================================================================================
     STRESS TEST SUMMARY: 29 / 29 PASSED (0 FAILED)
     ================================================================================
     ```

2. **Buzzer Concurrency & Reaction Contention (R3 Contract)**:
   - In `src/components/olympia/studio/useOlympiaLightingState.ts` lines 23-25:
     ```typescript
     case "vcnv":
       // Strictly the fastest (first) bell rings red:
       return state.vcnv?.bells?.[0]?.seat === seatId;
     ```
   - When 4 contestants buzz with sub-millisecond deltas ($0.2$ms, $0.7$ms, $1.0$ms) or at the identical millisecond timestamp, only `bells[0].seat` returns `true`; all other contestant seats `bells[1..3]` strictly return `false`.
   - Verified across all 24 permutations ($4!$) of contestant buzz sequences.

3. **Lighting State Automation & Boundary Timers (R2 Contract)**:
   - In `useOlympiaLightingState.ts` lines 58-70:
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
     ```
   - Boundary tests at 2490ms, 2499ms, 2500ms, 2501ms, and 2510ms confirm:
     - $t < 2500$ms ($2490$ms, $2499$ms) returns `"BLUE"`.
     - $t \ge 2500$ms ($2500$ms, $2501$ms, $2510$ms) returns `"RED"`.
   - When paused, `v.timer.startedAt` is set to `null` by `engine.ts` (`pauseTimer`), cleanly causing `computeTargetLightingMode` to return `"BLUE"`.

4. **Staggered Multi-Zone Fade Math**:
   - In `useOlympiaLightingState.ts` lines 113-146:
     - `hermiteSmoothstep(t)` evaluates $S(t) = 3t^2 - 2t^3$ with $c = \max(0, \min(1, t))$.
     - Monotonicity verified across 50,000 sub-steps: $S(t + \Delta t) \ge S(t)$ strictly holds.
     - Clamp limits verified at $\pm\infty$ and $\pm 10^9$.
     - Zone sequencing invariant holds: $\text{Screen} \ge \text{Stage} \ge \text{Audience}$ throughout forward fade (Screen: $0.0$s delay, Stage: $0.5$s delay, Audience: $0.7$s delay).
     - Survives frame freezes up to 2000ms and mid-transition target reversals without NaN or value discontinuity.

5. **Existing Verification Suites**:
   - `npm run test:olympia-3d`: 97 / 97 passing (100%).
   - `scratch/lighting-test.cjs`: 10 / 10 passing (100%).
   - Fuzz testing: 50,000 randomized state combinations executed with 0 exceptions.

---

## 2. Logic Chain
1. Under adversarial scrutiny, the core concern was whether race conditions (multiple buzzers in sub-millisecond windows) could violate the single-buzzer VCNV contract or cause visual glitches in the 3D studio.
   - Observation 1 (ST2.1, ST2.2, ST2.3) directly disproved this: because `isSeatBuzzedIn3D` strictly checks `state.vcnv?.bells?.[0]?.seat === seatId`, only index 0 in the ordered bell array can ever evaluate to `true`. All other seats evaluate to `false` regardless of timestamp proximity, identical timestamps, or arrival order across all 24 permutations.
2. The second concern was whether rapid toggles (starting/stopping Khởi động, pausing/resuming VCNV timers at the 2.5s boundary) could produce stale state, flicker, or NaN in transition math.
   - Observation 1 (ST1.1 - ST1.5, ST5.1 - ST5.2) proved that 10,000 rapid toggle cycles and erratic frame drops (up to 2000ms freezes) maintain continuous mathematical progression bounded in $[0.0, 1.0]$. `calculateZoneFade` clamps negative time offsets to `fromVal` and guards against division by zero via `Math.max(0.001, durationSec)`.
3. The third concern was numerical stability and zone synchronization of the Hermite cubic smoothstep.
   - Observation 1 (ST3.1 - ST3.6) confirmed that $S'(t) = 6t(1-t) \ge 0$ over $[0, 1]$, and numerical evaluation across 50,000 steps confirmed strict monotonicity, continuous zone staggering (Screen leading Stage leading Audience), and clean saturation at 1.0.
4. The fourth concern was abnormal states (missing sub-states, empty bells array, null states, invalid seat IDs).
   - Observation 1 (ST4.1 - ST4.8, ST6.1) proved that all null/undefined and empty states default safely to `BLUE` and `false` without crashing across 50,000 randomized fuzz cycles.

---

## 3. Caveats
- `isSeatBuzzedIn3D(seatId, state)` in `useOlympiaLightingState.ts` does not contain explicit type guards for invalid `seatId` types (e.g. `seatId: undefined` or `seatId: -1`). In the 3D scene (`Podiums.tsx`), `seatId` is strictly hardcoded to `0, 1, 2, 3`, so this does not impact 3D rendering. However, adding defensive bounds `if (typeof seatId !== "number" || seatId < 0 || seatId > 3) return false;` is recommended for maximum defensive hygiene if the function is ever reused outside `Podiums.tsx`.
- In VCNV, if a timer is paused mid-question and then resumed, `engine.ts` sets `startedAt = now`, which causes the 2.5s delay to count from the resumption moment rather than accumulated time. In live broadcast gameplay, questions are rarely paused; if paused, the studio gracefully switches to BLUE and re-transitions to RED 2.5s after resumption.

---

## 4. Conclusion
**Verdict: `APPROVE`**

The lighting state transition engine and contestant buzzer reaction contracts are mathematically robust, thread-safe within the JavaScript event model, resilient against rapid toggles, strictly compliant with round rules (R2, R3), and survive extreme fuzzing and frame lag spikes with zero errors.

---

## 5. Verification Method
To independently verify this empirical evaluation:

1. Run the Challenger 1 adversarial stress-test harness:
   ```powershell
   cd "d:\Timeout Quiz"; npx esbuild scratch/challenger1-stress.ts --bundle --platform=node --target=node20 --outfile=scratch/challenger1-stress.cjs; node scratch/challenger1-stress.cjs
   ```
   *Expected result: 29 / 29 PASSED (100% pass rate).*

2. Run the full 97-test E2E suite:
   ```powershell
   cd "d:\Timeout Quiz"; npm run test:olympia-3d
   ```
   *Expected result: 97 / 97 passing.*

3. Run the unit test suite:
   ```powershell
   cd "d:\Timeout Quiz"; node scratch/lighting-test.cjs
   ```
   *Expected result: 10 / 10 passing.*
