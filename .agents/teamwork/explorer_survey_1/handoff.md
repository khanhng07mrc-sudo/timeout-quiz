# Handoff Report: 3D Stage Layout & Camera Framing for 6-8 Contestants (R1)

**From**: Teamwork Explorer (Survey 1)  
**To**: Orchestrator / Implementer  
**Date**: 2026-11-10  
**Status**: Task Complete (Hard Handoff)  
**Working Directory**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\`  
**Detailed Report**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\analysis.md`  

---

## 1. Observation

1. **Podium Dimensions**:
   In `src/components/olympia/studio/Podiums.tsx` (lines 1696–1698):
   ```tsx
   <mesh position={[0, 0.04, 0]}>
     <boxGeometry args={[1.20, 0.08, 0.88]} />
     <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.18} />
   </mesh>
   ```
   Direct measurement: Each contestant podium base plinth is **$1.20\text{ m}$ wide** ($X$) and $0.88\text{ m}$ deep ($Z$).

2. **Podium Arc Layout Formula**:
   In `src/components/olympia/studio/Podiums.tsx` (lines 4912–4924) and `src/components/olympia/studio/CameraController.tsx` (lines 34–41, lines 48–55):
   ```typescript
   const radius = 6.6;
   const startPhi = activeCount > 4 ? 0.26 : 0.38; // 15° or 21.8°
   const endPhi = activeCount > 4 ? 1.31 : 1.13;   // 75° or 64.7°
   for (let i = 0; i < activeCount; i++) {
     const frac = activeCount === 1 ? 0.5 : i / (activeCount - 1);
     const phi = startPhi + frac * (endPhi - startPhi);
     const x = -radius * Math.cos(phi);
     const z = -0.5 - radius * Math.sin(phi);
     const rotY = Math.PI / 2 - phi;
   ...
   ```
   For all `activeCount > 4` (whether 5, 6, 7, or 8), `startPhi` is fixed at $0.26\text{ rad}$ ($14.90^\circ$) and `endPhi` at $1.31\text{ rad}$ ($75.06^\circ$), creating an invariant angular span of $1.05\text{ rad}$ ($60.16^\circ$).

3. **Center-to-Center Distances & Overlaps**:
   Running numerical geometry analysis (`node -e "..."`):
   - $N=4$: Chord distance $= 1.645\text{ m} \implies \text{Clearance} = +0.445\text{ m}$ (+44.5 cm gap).
   - $N=6$: Chord distance $= 1.383\text{ m} \implies \text{Clearance} = +0.183\text{ m}$ (+18.3 cm gap).
   - $N=7$: Chord distance $= 1.153\text{ m} \implies \text{Clearance} = \mathbf{-0.047\text{ m}}$ (**-4.7 cm physical overlap**).
   - $N=8$: Chord distance $= 0.989\text{ m} \implies \text{Clearance} = \mathbf{-0.211\text{ m}}$ (**-21.1 cm severe collision**).

4. **Static CAM 10 & Camera Resolution**:
   In `src/components/olympia/studio/CameraController.tsx`:
   - Line 114–120:
     ```typescript
     10: {
       id: 10,
       label: "Toàn Cảnh Bục Thí Sinh",
       pos: [0.85, 2.45, 0.45],
       target: [-4.40, 1.25, -4.60],
     }
     ```
   - Line 248–253:
     ```typescript
     const isContestantCam =
       (camAngle >= 5 && camAngle <= 8) ||
       (camAngle >= 25 && camAngle <= 28);
     const targetPreset = isContestantCam
       ? getContestantCameraPreset(
           camAngle >= 25 ? camAngle - 25 + 4 : camAngle - 5,
           effectiveTotalSeats
         )
       : (OLYMPIA_CAM_PRESETS[camAngle] || OLYMPIA_CAM_PRESETS[1]);
     ```
   CAM 10 is static, locked to target `[-4.40, 1.25, -4.60]` (4-podium cluster center). When podiums expand to 8 seats, the cluster center moves to `[-2.67, 1.15, -3.98]` ($+1.64\text{m}$ in X). If the arc is expanded without moving CAM 10, Three.js camera projection reveals the rightmost podium reaches NDC X $= \mathbf{+1.668}$, severely clipping out of view.

5. **Raised Dais Capacity**:
   In `src/components/olympia/studio/StudioLighting.tsx` (lines 622–633, lines 913–933):
   `daisGeometry` is an annular sector with $r_{\text{in}} = 5.2\text{ m}, r_{\text{out}} = 7.6\text{ m}$, covering polar angles from $-18^\circ$ to $+90^\circ$ ($108^\circ$ total). The current podium arc ($14.9^\circ$ to $75^\circ$) only utilizes $60^\circ$, leaving $48^\circ$ of unutilized platform space.

6. **Workspace State**:
   - `d:\Olympia 26` has not been accessed, modified, or touched in any command or tool call.
   - `d:\Timeout Quiz\AGENTS.md` is completely untouched.
   - Project tests (`npm run test:olympia-3d` [489 tests] and `npm run test:olympia` [51 tests]) and `npm run type-check` pass with zero errors.

---

## 2. Logic Chain

1. **Step 1 (Physical Collision)**:
   From Observation 1, each podium plinth base is $1.20\text{ m}$ wide. From Observation 2, when $N > 4$, all seat configurations are forced into a fixed $1.05\text{ rad}$ ($60.16^\circ$) arc at $R = 6.6\text{ m}$. Dividing this fixed arc by $(N - 1)$ intervals yields chord distances of $1.153\text{ m}$ for $N=7$ and $0.989\text{ m}$ for $N=8$. Because $0.989 < 1.20$ and $1.153 < 1.20$, adjacent podiums physically interpenetrate (by 4.7 cm at $N=7$ and 21.1 cm at $N=8$).

2. **Step 2 (Camera Framing Failure)**:
   From Observation 4, CAM 10 has hardcoded coordinates `pos: [0.85, 2.45, 0.45]` and `target: [-4.40, 1.25, -4.60]`, calibrated strictly for the 4-podium center `[-4.31, 1.15, -4.56]`. When $N$ increases to 6, 7, 8, the podium arc spans further towards the stage center, shifting the true cluster center up to $1.64\text{ m}$ along $+X$ and widening the bounding box from $4.07\text{m}$ to $7.91\text{m}$. Because `CameraController` treats CAM 10 as static, the camera remains aimed at the old 4-seat center, causing the right half of the 6–8 podium array to shift off-screen (NDC X $= +1.668$).

3. **Step 3 (Feasibility on Raised Dais)**:
   From Observation 5, the physical dais platform extends across $108^\circ$ (from $-18^\circ$ to $+90^\circ$). Expanding the podium angular span to $72^\circ$ ($N=6$), $82^\circ$ ($N=7$), and $90^\circ$ ($N=8$) at radius $R = 6.7 - 6.8\text{ m}$ fits entirely within the dais platform with $\ge 36\text{ cm}$ of clearance to the rear dais edge and $\ge 53\text{ cm}$ of clearance to the rear walking corridor.

4. **Step 4 (Mathematical Solution)**:
   By establishing a centralized parametric function `getContestantArcParams(totalSeats)`:
   - $N=4$: $R=6.60\text{m}, \phi \in [0.380, 1.130] \implies \text{Clearance} = +44.5\text{ cm}$
   - $N=6$: $R=6.70\text{m}, \phi \in [0.209, 1.466] \implies \text{Clearance} = +47.9\text{ cm}$
   - $N=7$: $R=6.80\text{m}, \phi \in [0.175, 1.606] \implies \text{Clearance} = +41.8\text{ cm}$
   - $N=8$: $R=6.80\text{m}, \phi \in [0.140, 1.710] \implies \text{Clearance} = +32.3\text{ cm}$
   And pairing it with dynamic wide camera preset `getWidePodiumsCameraPreset(totalSeats)`:
   - $N=4$: `pos: [0.86, 2.45, 0.31]`, `target: [-4.31, 1.15, -4.56]`, NDC bounds `[-0.57, +0.57]`
   - $N=6$: `pos: [2.03, 2.69, 1.75]`, `target: [-3.39, 1.15, -4.27]`, NDC bounds `[-0.75, +0.75]`
   - $N=7$: `pos: [2.42, 2.81, 2.47]`, `target: [-2.98, 1.15, -4.20]`, NDC bounds `[-0.79, +0.79]`
   - $N=8$: `pos: [2.83, 2.93, 3.17]`, `target: [-2.64, 1.15, -4.09]`, NDC bounds `[-0.81, +0.79]`
   Every seat count achieves $> 32\text{ cm}$ clearance, zero physical overlap, and perfectly centered 20% safe broadcast margins under CAM 10.

---

## 3. Caveats

1. **Entrance Corridor Entry Point**: When $N=8$, $\text{startPhi}$ reaches $0.140\text{ rad}$ ($8.0^\circ$). The hardcoded constant `entryPhi = 0.20` in `SingleContestantEntranceWalkingFigure` (`Podiums.tsx` line 3258) must be updated to `Math.min(0.20, startPhi - 0.06)` so that the contestant descending the stairs enters the rear corridor outside Podium 0.
2. **Director Bar & Static CAM Dictionary**: In `OLYMPIA_CAM_PRESETS`, presets 5..8 and 25..28 are pre-evaluated at file load time. The dynamic resolution in `CameraController` (line 248) already resolves individual cameras dynamically at runtime. Adding dynamic resolution for CAM 10 inside `CameraController` ensures live gameplay and director transitions remain 100% accurate.

---

## 4. Conclusion

Requirement R1 is completely scoped and solved:
1. **Root cause identified**: Fixed 60° arc ternary `activeCount > 4 ? 0.26 : 0.38` directly produces mesh interpenetration of 4.7 cm ($N=7$) and 21.1 cm ($N=8$), while static CAM 10 target `[-4.40, 1.25, -4.60]` causes extreme $+1.668$ NDC clipping for wider layouts.
2. **Actionable fix**:
   - In `CameraController.tsx`: Add `getContestantArcParams(totalSeats)` and `getWidePodiumsCameraPreset(totalSeats)`. Update `getContestantPodiumWorldPos` and `getContestantCameraPreset` to delegate to `getContestantArcParams`. Update `CameraController` to resolve CAM 10 dynamically.
   - In `Podiums.tsx`: Import `getContestantArcParams` to compute `contestantConfigs` (lines 4912–4924). Update `entryPhi` at line 3258.
   - `StudioLighting.tsx` and `BroadcastCameras.tsx` call `getContestantPodiumWorldPos` and will automatically inherit the updated positions without modifications.

---

## 5. Verification Method

To independently verify the findings and any proposed changes:
1. **Mathematical Verification Script**:
   Run in Node.js from `d:\Timeout Quiz`:
   ```powershell
   node -e "
   const THREE = require('d:/Timeout Quiz/node_modules/three');
   // Run projection script documented in analysis.md Section 6.2
   "
   ```
   Assert that for $N \in \{4, 6, 7, 8\}$:
   - $\text{minDistance} \ge 1.52\text{ m}$ ($\text{clearance} \ge +32\text{ cm}$).
   - $\text{NDC minX} \ge -0.85$ and $\text{NDC maxX} \le +0.85$ under CAM 10 (zero clipping).
2. **Test Suites**:
   ```powershell
   cd "d:\Timeout Quiz"
   npm run test:olympia-3d
   npm run test:olympia
   npm run type-check
   ```
   All existing 489 3D tests and 51 engine tests must pass with 0 errors.
3. **Workspace Safety Check**:
   ```powershell
   cd "d:\Timeout Quiz"
   git status --short
   ```
   Confirm zero files modified outside `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\`.
