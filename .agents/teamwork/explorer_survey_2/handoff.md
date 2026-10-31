# Handoff Report — Explorer Survey 2: Game State, Round Progression & Buzzer Systems

**Date**: 2026-10-31T01:43:30Z  
**Agent**: teamwork_explorer (instance 2)  
**Parent**: orchestrator (`29c0daaf-06fc-45bd-8731-a373118d9533`)  
**Status**: Hard Handoff (Investigation & Survey Complete)  

---

## 1. Observation

1. **Project Architecture & Dependencies**:
   - `d:\Timeout Quiz\package.json` specifies:
     - `"next": "16.3.7"`, `"react": "19.2.8"`, `"three": "^0.186.1"`, `"@react-three/fiber": "^9.8.2"`, `"@react-three/drei": "^10.7.9"`, `"socket.io": "^4.8.4"`.
     - No external state managers like Redux or Zustand are installed or used; client state is strictly handled by React hooks (`useState`, `useRef`, `useCallback`, `useMemo`) and Socket.IO real-time stream.
2. **Olympia Engine & Types**:
   - `d:\Timeout Quiz\src\lib\olympia\types.ts` defines `OlympiaState`, `RoundId = "khoiDong" | "vcnv" | "tangToc" | "veDich" | "cauHoiPhu"`, and round-specific sub-states:
     - Khởi Động: `KhoiDongState` with `started`, `segIdx`, `qIdx`, `phase`, `buzzedSeat`, `buzzOpen`, `kdIntroTimer`.
     - VCNV: `VcnvState` with `rows`, `currentRow`, `phase`, `timer`, `bells: { seat: number; before: boolean; atMs?: number }[]`.
     - Tăng Tốc: `TangTocState` with `qIdx`, `phase`, `timer`, `submissions`, `ranking`.
     - Về Đích: `VeDichState` with `order`, `turnIdx`, `phase`, `packages`, `timer`, `steal: { timer: TimerState; open: boolean; buzzedSeat: number | null } | null`.
     - Câu Hỏi Phụ: `CauHoiPhuState` with `tied`, `qIdx`, `phase`, `timer`, `buzzOpen`, `buzzedSeat`.
3. **Buzzer Execution Mechanics in Engine**:
   - In `d:\Timeout Quiz\src\lib\olympia\engine.ts` (lines 2293–2349, `playerBuzz` method):
     - `khoiDong`: `kd.buzzedSeat = seatId; kd.buzzOpen = false; pauseTimer(kd.timer, now);`
     - `vcnv`: `v.bells.push({ seat: seatId, before: !v.answersRevealed });` (multiple contestants can ring; stored in order).
     - `veDich`: `vd.steal.buzzedSeat = seatId; vd.steal.open = false; pauseTimer(vd.steal.timer, now);`
     - `cauHoiPhu`: `cp.buzzedSeat = seatId; cp.buzzedThisQuestion.push(seatId); cp.buzzOpen = false; pauseTimer(cp.timer, now);`
4. **Existing 2D Buzzer Display Logic**:
   - In `d:\Timeout Quiz\src\components\olympia\ui.tsx` (lines 107–120, `ScoreStrip` component):
     ```typescript
     const currentBuzzedSeat =
       buzzedSeat !== undefined
         ? buzzedSeat
         : state.currentRound === "khoiDong"
         ? state.khoiDong?.buzzedSeat
         : state.currentRound === "vcnv"
         ? (state.vcnv?.bells?.[0]?.seat ?? null)
         : state.currentRound === "veDich"
         ? state.veDich?.steal?.buzzedSeat
         : state.currentRound === "cauHoiPhu"
         ? state.cauHoiPhu?.buzzedSeat
         : null;
     ```
   - In VCNV, only the first element `bells?.[0]?.seat` is highlighted as the buzzed contestant.
5. **Existing 3D Studio Buzzer Implementation**:
   - In `d:\Timeout Quiz\src\components\modes\WheelStudio3DScene.tsx` (lines 2172–2208):
     - Mechanical dome buzzer with chrome base cylinder (`cylinderGeometry args={[0.055, 0.07, 0.03, 16]}`).
     - Sphere dome (`sphereGeometry args={[0.052, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]}`) changing color from `#fbbf24` (idle) to `#ff0000` (buzzed) with `emissiveIntensity: 8.5` and `scale: [1.15, 1.15, 1.15]`.
     - Push button on top (`color: #ffffff`, `emissive: #ff0000`, `emissiveIntensity: 9.5`).
     - Dual red point lights (`intensity: 14.0` at Y=0.14 and `intensity: 10.0` at Y=1.20).
     - Floor neon glow ring (`ringGeometry args={[0.08, 0.22, 32]}`) with `#ef4444` basic material.
6. **Engine Test Suite Status**:
   - Command `npm run test:olympia` in `d:\Timeout Quiz` ran:
     `esbuild src/lib/olympia/engine.test.ts --bundle --platform=node --target=node20 --outfile=scratch/olympia-test.cjs && node scratch/olympia-test.cjs`
   - Result: All 40 tests passed cleanly (`40 tests passed`).
7. **Brand Logo File Path Verification**:
   - File `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` checked via `Test-Path` command: returned `True`.

---

## 2. Logic Chain

1. **State Architecture Derivation**:
   - From Observation 1 and 2, the application operates on a single authoritative engine model without Redux/Zustand. All real-time synchronization between the host, display screen, and player pads flows through Socket.IO emitting `OlympiaState`.
   - Therefore, the 3D Olympia Studio Scene can seamlessly receive `state: OlympiaState` as a direct React prop without requiring complex middleware or store subscriptions.
2. **Round-Based Lighting Automation Derivation**:
   - From Observation 2 and `ORIGINAL_REQUEST.md` (R2):
     - In **Khởi động**: `kd.started === true && kd.phase !== "intro" && kd.phase !== "segmentDone"` directly identifies the active round window requiring RED lighting; setting `kd.started = false` or finishing turn reverts to BLUE.
     - In **Vượt chướng ngại vật & Tăng tốc**: `timerRunning(v.timer)` / `timerRunning(tt.timer)` combined with `serverNow() - timer.startedAt >= 2500` accurately signals the 2-3s delay before fading to RED.
     - In **Về đích**: `vd.phase !== "idle" && vd.phase !== "seatDone"` (or detecting `vd:onStage`) marks the contestant standing on stage until `vd:finishTurn` / `vd:nextSeat`, maintaining RED throughout.
   - The phased fade effect (Inner screens -> Backstage lights -> Audience area) can be executed using three staggered interpolation clocks ($t_0 = 0\text{s}$, $t_1 = 0.4\text{s}$, $t_2 = 0.8\text{s}$) in an `r3f useFrame` hook.
3. **Buzzer Reaction Rule Derivation**:
   - From Observation 3 and 4, in Khởi động, Về đích, and Câu hỏi phụ, the engine stores the single active buzzer in `buzzedSeat`.
   - In VCNV, the engine collects every buzzer into the `v.bells` array. To fulfill Requirement R3 ("chỉ duy nhất bục của thí sinh bấm nhanh nhất mới phát sáng màu đỏ"), the 3D scene must evaluate `v.bells[0]?.seat === seatId`. Any other contestant at index $\ge 1$ in `v.bells` must NOT trigger the red glow.
4. **Visual Geometry Derivation**:
   - From Observation 5, the geometry, material properties, scale-up animation, and light fixtures of the buzzer in `WheelStudio3DScene.tsx` provide the exact implementation pattern required for the 4 contestant podiums in the Olympia 3D studio.
5. **Brand Asset Integration Derivation**:
   - From Observation 7, `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` exists and can be imported into `public/brand/Olympia_logo_2016.webp` to be loaded as a WebGL CanvasTexture, with golden gradient text `"ĐƯỜNG LÊN ĐỈNH OLYMPIA"` rendered directly below on the central LED screen.

---

## 3. Caveats

1. **Image Access in WebGL**: Three.js WebGL textures running in the browser cannot read directly from Windows absolute file system paths like `C:\Users\khanh\Downloads\`. The file must be made accessible under the Next.js `public/` directory or bundled.
2. **Audio Cue Panning**: The sound manager supports left/right stereo panning (`state.kdFinishTurnPan`). The 3D audio listener position was not mapped to Three.js positional audio (standard stereo audio is currently used across the app).
3. **Number of Contestants**: While the engine technically supports 2 to 8 seats, official Đường lên đỉnh Olympia broadcasts strictly feature 4 contestants. The 3D layout should be optimized for 4 podiums (with dynamic spacing if 2-8 are ever passed).

---

## 4. Conclusion

1. **Feasibility**: High. The existing Olympia game engine (`OlympiaGame`), socket communication layer, and 3D studio architecture in `WheelStudio3DScene.tsx` provide all the necessary building blocks.
2. **Buzzer Logic Contract**:
   - Function `isSeatBuzzed(seatId, state)`:
     - `khoiDong`: `state.khoiDong?.buzzedSeat === seatId`
     - `vcnv`: `state.vcnv?.bells?.[0]?.seat === seatId` (Fastest only)
     - `veDich`: `state.veDich?.steal?.buzzedSeat === seatId`
     - `cauHoiPhu`: `state.cauHoiPhu?.buzzedSeat === seatId`
3. **Lighting Automation Contract**:
   - Target color is `"RED"` during active question in Khởi động, 2.5s into VCNV / Tăng tốc timers, and during active Về đích turns. Target color is `"BLUE"` during all idle, banner, grid, and transition states.
   - Staged fade uses 3-tiered timing: Screen Wall ($0.8\text{s}$ at $t=0$), Stage Lights ($1.0\text{s}$ at $t=0.4\text{s}$), Audience ($1.2\text{s}$ at $t=0.8\text{s}$).
4. **Deliverables Created**:
   - Comprehensive technical survey report in `d:\Timeout Quiz\.agents\teamwork\explorer_survey_2\report.md`.
   - Structured handoff report in `d:\Timeout Quiz\.agents\teamwork\explorer_survey_2\handoff.md`.

---

## 5. Verification Method

To independently verify the observations, logic, and conclusions of this survey:
1. **Engine Test Verification**:
   Run the following terminal command from `d:\Timeout Quiz`:
   ```powershell
   cd "d:\Timeout Quiz"
   npm run test:olympia
   ```
   *Expected result*: All 40 tests pass with exit code 0.
2. **File & Line Inspections**:
   - Inspect `d:\Timeout Quiz\src\lib\olympia\types.ts` (lines 358–377) to confirm `VcnvState.bells` array type.
   - Inspect `d:\Timeout Quiz\src\lib\olympia\engine.ts` (lines 2311–2319) to confirm `v.bells.push(...)` behavior.
   - Inspect `d:\Timeout Quiz\src\components\olympia\ui.tsx` (lines 107–120) to confirm `currentBuzzedSeat` logic selecting `state.vcnv?.bells?.[0]?.seat`.
   - Inspect `d:\Timeout Quiz\src\components\modes\WheelStudio3DScene.tsx` (lines 2172–2208) to confirm buzzer 3D meshes, red emissive material, and dual point lights.
3. **Invalidation Conditions**:
   - If `v.bells[0]` is not used as the sole trigger for VCNV buzzer red illumination, requirement R3 is violated.
   - If Red lighting transitions in VCNV or Tăng tốc occur immediately without the 2–3s delay, requirement R2 is violated.
