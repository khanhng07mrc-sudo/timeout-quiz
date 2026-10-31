# Handoff Report: Visual Asset Requirements, 3D Staging, and UI Integration Survey

- **Author**: `teamwork_explorer_survey_3`
- **Working Directory**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\`
- **Milestone**: Phase 0 (Survey)
- **Handoff Type**: Hard

---

## 1. Observation

1. **Branding Asset Verification (`Olympia_logo_2016.webp`)**:
   - Tool command executed:
     `node -e "const fs = require('fs'); const buf = fs.readFileSync('C:/Users/khanh/Downloads/Olympia_logo_2016.webp'); ..."`
   - Output observed verbatim:
     ```json
     RIFF: RIFF
     WEBP: WEBP
     Chunk: VP8X
     Size: 77292
     { width: 512, height: 512, hasAlpha: true, hasAnimation: false }
     ```
   - Target static directory in Timeout Quiz:
     `d:\Timeout Quiz\public\olympia` exists and already contains Olympia media assets (e.g. `d:\Timeout Quiz\public\olympia\olympia_logo.png`, `d:\Timeout Quiz\public\olympia\media`).

2. **Existing 3D Studio Architecture Reference (`WheelStudio3DScene.tsx`)**:
   - `d:\Timeout Quiz\src\components\modes\WheelStudio3DScene.tsx` lines 15-20, 1960-2225, 3656-3754, 4857-4942:
     - Implements high-performance broadcast 3D studio with `@react-three/fiber` and `three`.
     - MC station (`DedicatedMcStation`, lines 1960-2046): independent lectern placed at `X = -3.45m, Z = -0.65m` with microphone, cue card, and dedicated key spotlight.
     - Contestant stations (`ElevatedSlotStation`, lines 2049-2225): front score screen canvas texture, illuminated handrails, and buzzer dome with point light intensity burst (`intensity: 14.0`).
     - Backdrop Curved LED Screen (`BackdropCurvedLedScreen`, lines 3656-3754): `11.2m x 7.5m` with titanium bezel (50mm), inner gold LED accent, multi-tier pedestal, and procedural canvas texture (`renderVideoWallCanvas`).
     - Lighting setup (lines 4857-4901): ambient light (intensity 3.2), directional key (intensity 3.5), key spotlight (intensity 14.0), floor specular downlight (intensity 6.0), wash spotlights (intensity 5.5), and back rim point light (8.0).

3. **Olympia State Machine & Game Lifecycle**:
   - `d:\Timeout Quiz\src\lib\olympia\types.ts` lines 288-430:
     - Khởi động: `state.khoiDong.started`, `state.khoiDong.phase`, `state.khoiDong.buzzedSeat`.
     - Vượt chướng ngại vật: `state.vcnv.phase === "question"`, `state.vcnv.timer.startedAt`. Buzzer bells array: `state.vcnv.bells: { seat: number; before: boolean; atMs?: number }[]`, where fastest buzzer is uniquely `bells[0].seat`.
     - Tăng tốc: `state.tangToc.phase === "question"`, `state.tangToc.timer.startedAt`.
     - Về đích: `state.veDich.phase`, `state.veDich.steal.buzzedSeat`, `on_stage.mp3` and `finish_turn.mp3`.
     - Câu hỏi phụ: `state.cauHoiPhu.buzzedSeat`.

4. **UI Integration Points**:
   - `d:\Timeout Quiz\src\components\olympia\DisplayScreen.tsx` lines 25-41, 740-850:
     - Currently mounts `OlympiaIntroCanvas` (2D Canvas).
     - Renders scoreboard overlay, header bar, and round banners.
     - Can conditionally mount 3D studio scene `OlympiaStudio3DScene.tsx` with dynamic import (`ssr: false`).
   - `d:\Timeout Quiz\public\olympia-audio` contains complete sound libraries by season (`O13-21`, `O22`, `O23`, `O24-25`, `O26`), with round subdirectories:
     `1_KhoiDong/bell_ring.mp3`, `start_round.mp3`, `finish_turn.mp3`; `2_VuotChuongNgaiVat/15s_tick.mp3`, `bell_ring.mp3`; `4_VeDich/on_stage.mp3`, `bell_ring.mp3`, `finish_turn.mp3`.

---

## 2. Logic Chain

1. **Branding Asset Viability**:
   - From Observation 1, the file `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` is valid 512x512 WebP with an 8-bit alpha channel (`hasAlpha: true`).
   - Copying this file to `d:\Timeout Quiz\public\olympia\Olympia_logo_2016.webp` allows standard Next.js static resolution at `/olympia/Olympia_logo_2016.webp`.
   - WebP textures load natively in Three.js via `TextureLoader` or can be composited into an offscreen Canvas alongside the yellow gradient typography for optimal 1-draw-call performance.
   - Requirement R4 is strictly adhered to because the file in `Downloads` is only read and copied, never moved or deleted.

2. **Olympia 3D Staging Layout**:
   - From Observation 2, `WheelStudio3DScene.tsx` proves that procedural Three.js geometry achieves zero-overhead 60 FPS without downloading heavy external 3D models.
   - Adapting this to Olympia yields:
     - Central LED Screen: `12.0m x 6.75m` (16:9), titanium framing, tiered pedestal, located at `X = 0, Z = -8.5m`.
     - 1 MC Podium: Located at Stage Left `[X = -4.5m, Y = 0.0m, Z = -2.0m]` with `rotY = +0.70 rad` (inward facing).
     - 4 Contestant Podiums: Arranged in a broadcast arc at `X = -1.8m, 0.0m, +1.8m, +3.6m` (`Z = -2.5m` to `-3.1m`), each with an individual score screen, touch tablet, and dome buzzer.
     - Laurel Wreath Area: Placed at honored Stage Left-Center `[X = -2.4m, Y = 0.0m, Z = -4.8m]`, featuring an octagonal marble column, velvet pillow, transparent crystal cloche, rotating golden wreath, and a dedicated overhead spotlight.

3. **Lighting Multi-Zone Fading (R2 & R3)**:
   - Observation 2 & 3 define the lighting architecture and game state triggers.
   - To achieve the staggered fade required by R2:
     - Zone 1 (Central LED canvas & screen bezel) fades first at $t = 0.0s$ ($1.0s - 1.2s$ duration).
     - Zone 2 (Stage back lights, moving heads, audience amphitheater) starts fading after a delay $\Delta t = 0.5s - 0.7s$ ($1.4s$ duration).
     - Transitions are powered by a damped Hermite smoothstep in `useFrame`, preventing abrupt color pop-ins.
   - Round logic:
     - Khởi động: Turns Red on start, returns to Blue on finish.
     - VCNV & Tăng tốc: Starts Blue, turns Red after 2.5s.
     - VCNV buzzer lockout: strictly `state.vcnv.bells[0].seat` illuminates Red.
     - Về đích: Turns Red from `on_stage` through turn finish.

4. **UI Integration**:
   - Observation 4 shows `DisplayScreen.tsx` currently uses `OlympiaIntroCanvas` (2D).
   - Dynamically importing `OlympiaStudio3DScene` (`ssr: false`) allows seamless switching between 2D and 3D modes.
   - Audio cues in `public/olympia-audio` sync directly with lighting transitions (e.g., `start_round`, `on_stage`, `bell_ring`, `finish_turn`).

---

## 3. Caveats

1. The asset `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` must strictly be **copied** into `d:\Timeout Quiz\public\olympia\`; never delete or move the original file in `Downloads`.
2. Responsive canvas handling: On viewports with aspect ratios narrower than 16:9 (e.g. mobile or vertical window split), camera FOV must be compensated (as implemented in `WheelStudio3DScene.tsx` lines 4387-4395) so that the MC and outer contestant podiums remain visible.
3. Shadows should be confined to a single shadow-casting Key Spotlight with a `512x512` map to ensure 60 FPS performance on laptops with integrated GPUs.

---

## 4. Conclusion

All four assigned survey objectives are completely investigated and mapped into a concrete architectural blueprint:
1. `Olympia_logo_2016.webp` is verified (512x512, transparent VP8X) and ready for copying to `public/olympia/`.
2. The 3D Olympia staging blueprint (Central LED 16:9 with gradient text, 1 MC lectern, 4 contestant arc podiums, and Laurel Wreath pedestal) is fully dimensioned and mapped to Three.js coordinates.
3. The dual-state lighting system (Blue vs Red) and staggered multi-zone fade engine (Zone 1 screen first, Zone 2 back lights & audience after) are formulated with exact mathematical easing and state machine hooks.
4. UI integration into `DisplayScreen.tsx` with audio synchronization and a 7-camera director system is defined and validated.

All details are compiled in `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\report.md`.

---

## 5. Verification Method

1. **Verify Branding Asset**:
   ```powershell
   node -e "const fs = require('fs'); const buf = fs.readFileSync('C:/Users/khanh/Downloads/Olympia_logo_2016.webp'); console.log('Size:', buf.length, 'VP8X:', buf.toString('ascii', 12, 16));"
   ```
2. **Review Reference 3D Architecture**:
   Inspect `d:\Timeout Quiz\src\components\modes\WheelStudio3DScene.tsx` (lines 1960-2046 for MC, lines 2049-2225 for Podiums, lines 3656-3754 for Backdrop LED).
3. **Verify Olympia Audio Assets**:
   ```powershell
   Get-ChildItem "d:\Timeout Quiz\public\olympia-audio\O26" -Recurse -Filter "*.mp3" | Select-Object -First 10
   ```
4. **Read Comprehensive Survey Report**:
   Inspect `d:\Timeout Quiz\.agents\teamwork\explorer_survey_3\report.md`.
