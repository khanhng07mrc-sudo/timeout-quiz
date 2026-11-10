# Handoff Report — Explorer Survey Agent 2 (R2 & R4)

**Working Directory**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_2\`
**Date**: 2026-11-10T13:30:00Z
**Type**: Hard Handoff (Investigation & Synthesis Complete)

---

## 1. Observation

### Observation 1: Contestant Walk Path & Rotation in `Podiums.tsx`
- **File**: `d:\Timeout Quiz\src\components\olympia\studio\Podiums.tsx`
- **Lines 3326–3375**:
  ```ts
  3326:     } else if (t < 4.0) {
  3327:       // Phase 4 (3.0 -> 4.0s): Walks down lower stairs to dais floor (1.0s, arrives at dais floor Z = 6.20m, Y = 0.22m at exactly t = 4.0s)
  3328:       g.visible = true;
  3329:       const p = (t - 3.0) / 1.0;
  3330:       curX = 0;
  3331:       curZ = THREE.MathUtils.lerp(10.20, 6.20, p);
  3332:       curY = getGrandstandStairY(curZ);
  3333:       curRotY = Math.PI;
  3334:     } else if (t < 5.0) {
  3335:       // Phase 5A (4.0 -> 5.0s): Sweeps wide outward across dais to the outer left corridor entrance (1.0s)
  3336:       g.visible = true;
  3337:       const p = (t - 4.0) / 1.0;
  3338:       const easeP = p * p * (3 - 2 * p);
  3339:       const u = 1 - easeP;
  3340:       curX = u * u * 0 + 2 * u * easeP * daisSweepX + easeP * easeP * entryAisleX;
  3341:       curY = 0.22;
  3342:       curZ = u * u * 6.20 + 2 * u * easeP * daisSweepZ + easeP * easeP * entryAisleZ;
  3343:       const dx = 2 * u * (daisSweepX - 0) + 2 * easeP * (entryAisleX - daisSweepX);
  3344:       const dz = 2 * u * (daisSweepZ - 6.20) + 2 * easeP * (entryAisleZ - daisSweepZ);
  3345:       curRotY = Math.atan2(dx, dz);
  3346:     } else if (t < 6.1) {
  3347:       // Phase 5B (5.0 -> 6.1s): Walks along the rear corridor arc behind all podiums to target desk (1.1s)
  3348:       g.visible = true;
  3349:       const p = (t - 5.0) / 1.1;
  3350:       const easeP = p * p * (3 - 2 * p);
  3351:       const curPhi = THREE.MathUtils.lerp(entryPhi, targetPhi, easeP);
  3352:       curX = -aisleRadius * Math.cos(curPhi);
  3353:       curY = 0.22;
  3354:       curZ = -0.5 - aisleRadius * Math.sin(curPhi);
  3355:       // Tangent heading along rear corridor arc
  3356:       curRotY = Math.PI - curPhi;
  3357:     } else if (t < 6.5) {
  3358:       // Phase 5C (6.1 -> 6.5s): Steps forward radially from rear corridor into desk standing spot (0.4s)
  3359:       g.visible = true;
  3360:       const p = (t - 6.1) / 0.4;
  3361:       const easeP = p * p * (3 - 2 * p);
  3362:       curX = THREE.MathUtils.lerp(targetAisleX, deskX, easeP);
  3363:       curY = deskY;
  3364:       curZ = THREE.MathUtils.lerp(targetAisleZ, deskZ, easeP);
  3365:       curRotY = THREE.MathUtils.lerp(Math.PI - targetPhi, deskRotY, easeP);
  3366:     } else {
  ```
- **Lines 3385–3389**:
  ```ts
  3385:     // Natural energetic walking bounce (3.5cm) synced with brisk stride
  3386:     const bounce = walkingNow ? Math.abs(Math.sin((t - 0.4) * 10.0)) * 0.035 : 0;
  3387:     g.position.set(curX, curY + bounce, curZ);
  3388:     g.rotation.y = curRotY;
  3389:   });
  ```
- **Lines 1117–1121** (Inside `ContestantFigure`):
  ```ts
  1117:     if (isWalking) {
  1118:       const stride = Math.sin(t * 8.0) * 0.35;
  1119:       const armStride = Math.sin(t * 8.0) * 0.25;
  1120:       if (leftLegRef.current) { leftLegRef.current.rotation.x = stride; leftLegRef.current.rotation.z = 0; }
  1121:       if (rightLegRef.current) { rightLegRef.current.rotation.x = -stride; rightLegRef.current.rotation.z = 0; }
  ```
  Where `t` in line 1114 is `clock.getElapsedTime()` (global scene time).

### Observation 2: CAM 11 Transition Timing in `useOlympiaCamera.ts`
- **File**: `d:\Timeout Quiz\src\components\olympia\studio\useOlympiaCamera.ts`
- **Lines 148–166**:
  ```ts
  148:       // For Contestant N > 0:
  149:       // - 0.0s -> 1.8s (held for 2.0s total since previous contestant's 3.8s): CAM 10 (Wide view while previous contestant settles and new contestant descends upper stairs)
  150:       // - 1.8s -> 3.8s: CAM 11 (MCU direct greeting on center landing, with push zoom 0.25 during pose)
  151:       // - >= 3.8s:
  152:       //     If !isLastSeat: CAM 10 (continues wide view until next contestant reaches landing)
  153:       //     If isLastSeat: CAM 10 from 3.8s -> 6.2s, then targetCam (desk close-up) from 6.2s -> 6.8s
  154:       const isCam11Phase = isFirstSeat
  155:         ? elapsedSec < 3.8
  156:         : elapsedSec >= 1.8 && elapsedSec < 3.8;
  157: 
  158:       if (isCam11Phase) {
  159:         // Optical zoom push (0.25) during pose greeting on center landing (1.8s -> 3.0s)
  160:         const pushInProgress = elapsedSec < 1.8 ? 0.0 : Math.min(1.0, (elapsedSec - 1.8) / 1.2) * 0.25;
  161:         return {
  162:           camAngle: 11,
  163:           transitionMode: "CUT",
  164:           isOverlayHidden: false,
  165:           pushInProgress,
  166:         };
  167:       }
  ```

### Observation 3: Stair Descent Kinematics in `Podiums.tsx`
- Upper stair flight: $t \in [0.6\text{s}, 1.8\text{s}]$ ($\Delta t = 1.2\text{s}$, $Z \in [11.90\text{m}, 10.20\text{m}]$).
- At $t = 1.2\text{s}$: $p = \frac{1.2 - 0.6}{1.2} = 0.50$, $Z = 11.05\text{m}$ (descending Steps 5 & 6, the last 2 steps before the landing platform).
- At $t = 1.8\text{s}$: $Z = 10.20\text{m}$, contestant is already stationary on Bục Giữa.

### Observation 4: Test Suite Status
- Commands executed:
  - `cd "d:\Timeout Quiz"; npm run test:olympia` -> **51 / 51 tests passed**.
  - `cd "d:\Timeout Quiz"; npm run test:olympia-3d` -> **489 / 489 tests passed**.
- No tests currently assert the numerical value `1.8` for CAM 11 entrance.

---

## 2. Logic Chain

1. **Abrupt Slowdown Mechanism (from Obs 1)**:
   - In Phase 4, the contestant has constant forward velocity down the lower stairs: $v_z = -4.0\text{ m/s}$.
   - In Phase 5A, the trajectory uses $easeP = 3p^2 - 2p^3$ where $p = \frac{t - 4.0}{1.0}$.
   - The derivative $\frac{d(easeP)}{dp} = 6p(1-p)$ is exactly $0$ at $p = 0$.
   - Therefore, velocity instantaneously collapses from $-4.0\text{ m/s}$ to $0.0\text{ m/s}$ at $t = 4.0\text{s}$.
   - The same zero-derivative property applies at $t = 5.0\text{s}$ (end of 5A) and $t = 6.1\text{s}$ (end of 5B), causing the character to halt to a complete dead stop three consecutive times.

2. **Rotational Snaps & 90° Turn Mechanism (from Obs 1)**:
   - At $t = 4.0\text{s}$, Phase 4 ends at $\text{curRotY} = \pi$ ($180^\circ$). Phase 5A starts with $\text{curRotY} = \text{atan2}(-10.40, -7.40) \approx -2.188\text{ rad}$ ($234.6^\circ$). This creates an instantaneous $54.6^\circ$ snap.
   - At $t = 6.1\text{s}$, Phase 5B travels tangentially along the rear circle ($\vec{v}_{\text{tangent}} = (\sin \phi_i, -\cos \phi_i)$), while Phase 5C moves radially inward toward the stage center ($\vec{v}_{\text{radial}} = (\cos \phi_i, \sin \phi_i)$).
   - Because $\vec{v}_{\text{tangent}} \cdot \vec{v}_{\text{radial}} = 0$, the angle between them is identically $90^\circ$. This forces the contestant to make a sudden, unnatural $90^\circ$ right turn.

3. **Footstep Cadence Desynchronization (from Obs 1)**:
   - Leg stride frequency uses global Three.js time `clock.getElapsedTime()` at $\omega = 8.0\text{ rad/s}$.
   - Body bounce uses local seat entrance elapsed time at $\omega = 10.0\text{ rad/s}$.
   - This frequency mismatch causes the vertical bounce and leg positions to drift in and out of phase, and the legs continue swinging at full speed while the character is stopped during smootherstep slowdowns.

4. **CAM 11 Timing Calculation & Earlier Cut (from Obs 2 & 3)**:
   - In `useOlympiaCamera.ts:156`, CAM 11 is guarded by `elapsedSec >= 1.8 && elapsedSec < 3.8`.
   - At $t = 1.8\text{s}$, the contestant has already finished the stair descent and is stationary.
   - At $t = 1.2\text{s}$, the contestant is at $Z = 11.05\text{m}$, stepping on the final two steps of the upper stairs.
   - Changing the threshold to `elapsedSec >= 1.2 && elapsedSec < 3.8` cuts to CAM 11 exactly $0.6\text{s}$ earlier, capturing the dynamic descent into the center landing.
   - Optical push zoom (`pushInProgress`) should remain clamped at $0.0$ for $t < 1.8\text{s}$ and ramp $0.0 \to 0.25$ during the greeting pose ($1.8\text{s} \to 3.0\text{s}$).

---

## 3. Caveats

- **Podium Geometry Dependencies (R1)**: Podiums in `Podiums.tsx` currently use radius $R = 6.6\text{m}$ with $\phi \in [0.26, 1.31]$ for 6–8 contestants. If another agent updates the podium coordinates for Requirement R1, the spline control waypoints $P_2, P_3, P_4$ should read dynamically from `targetCfg` (which already receives the calculated podium position and angle), ensuring automatic compatibility.
- **Contestant 0 vs Contestant $N > 0$**: Contestant 0 currently shows CAM 11 from $t = 0.0\text{s}$. If director choreography prefers Contestant 0 to also begin on CAM 10/CAM 1 and cut to CAM 11 at $t = 1.2\text{s}$, this can be applied uniformly by using `elapsedSec >= 1.2 && elapsedSec < 3.8` for all seats.

---

## 4. Conclusion

1. **R2 Root Cause & Fix**:
   - The abrupt slowdowns and sharp 90-degree turns stem from segmenting the dais floor traversal into 3 piecewise sub-phases (5A, 5B, 5C) with separate Hermite smootherstep functions and orthogonal coordinate lerping.
   - Replace lines 3326–3375 in `Podiums.tsx` with a unified $C^1$-continuous parametric curve that sets start tangent vector $P_1 - P_0 = [0, 0, -2.0]$ (matching the $180^\circ$ stair heading) and arrival tangent $P_4 - P_3 = 0.65 \vec{n}_{\text{desk}}$ (matching the desk facing angle).
   - Align rotation via analytical velocity derivative $\text{rotY} = \text{atan2}(v_x, v_z)$, and synchronize leg strides and hip bounce with a single phase variable $\theta_{\text{walk}} = 8.5 \cdot t$.
2. **R4 Root Cause & Fix**:
   - The delayed CAM 11 cut is caused by line 156 of `useOlympiaCamera.ts` waiting until `elapsedSec >= 1.8`.
   - Update line 156 to `elapsedSec >= 1.2 && elapsedSec < 3.8`, cutting to CAM 11 $0.6\text{s}$ earlier while the contestant is descending the last 2 steps ($Z = 11.05\text{m}$). Keep optical zoom push starting at $t = 1.8\text{s}$.

---

## 5. Verification Method

1. **Unit & Regression Testing**:
   - Execute `cd "d:\Timeout Quiz"; npm run test:olympia`
   - Execute `cd "d:\Timeout Quiz"; npm run test:olympia-3d`
   - Expect: 100% pass rate across all 540 tests.
2. **Kinematic Invariants Inspection**:
   - Verify that $\text{curRotY}(t = 4.0001\text{s}) \approx \pi$ ($180^\circ$).
   - Verify that no intermediate velocity reaches $0\text{ m/s}$ during $t \in [4.0\text{s}, 6.2\text{s}]$.
   - Verify that $\text{curRotY}$ at arrival ($t = 6.5\text{s}$) equals $\text{deskRotY}$.
3. **Interactive Visual Proof**:
   - Start dev server: `npm run dev` in `d:\Timeout Quiz`.
   - Open browser at `http://localhost:3005/dev/graphics?tab=r6` or run an entrance sequence.
   - Confirm CAM 11 triggers at $t \approx 1.2\text{s}$ catching the contestant stepping onto the landing, followed by a smooth, uninterrupted curve into their podium desk without 90-degree snaps.
