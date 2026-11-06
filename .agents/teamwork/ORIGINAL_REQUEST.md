# Original User Request

## Initial Request — 2026-11-05T14:19:48Z

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


## Follow-up — 2026-11-05T16:28:41Z

Use a small, focused team. Execute the complete studio enhancement plan: redesign 3D human models (MCs and contestants) with authentic anatomy, skin tones, hair, and wardrobe, enable reliable audio and tab-switch persistence in the embedded sandbox, optimize 2-vCPU rendering performance, synchronize question reveal with lower-third, correct opening chevron animations, remove the "ĐÁP ÁN:" prefix on the answer bar, and provide resilient VPS deployment instructions.

Working directory: D:\Timeout Quiz
Integrity mode: development

## Reference Material
- User screenshot of current primitive models: `media_1793895222890_dd3c1772.png`
- Real broadcast photo reference (Khánh Vy & Ngọc Huy): `media_1793877853393_1f21bf17.jpg`
- User screenshot of answer text overlap: `media_1793895773041_197f2609.png`
- Target components in `D:\Timeout Quiz`:
  - 3D Human models & podiums: `src/components/olympia/studio/Podiums.tsx` (functions `McPresenters`, `ContestantFigure`, `ContestantEntranceWalkingFigures`)
  - Audio & sandbox embedding: `src/app/admin/sandbox/page.tsx`, `src/components/olympia/OlympiaStudio3DScene.tsx`, `src/components/olympia/DisplayScreen.tsx`
  - Display screen & question reveal synchronization: `src/components/olympia/DisplayScreen.tsx` and related stage graphics
  - Arrow entrance animation: `src/components/olympia/V3ArrowShell.tsx` or related round transition/entrance components
  - Lower-third answer bar: `src/components/olympia/Vtv3BroadcastGraphics.tsx`, `DisplayScreen.tsx`, or related answer display components
- Local test URL: `http://localhost:3000/admin/sandbox`
- Live VPS URL: `https://quizorra.ddns.net/admin/sandbox?code=463275`

## Requirements

### R1. Reliable Audio and Contestant Session Persistence in Sandbox
- Ensure audio cues and background music play reliably in the embedded sandbox view (`/admin/sandbox`) without requiring the user to switch to the full tab display (`/olympia/display/<code>`), addressing browser iframe/AudioContext initialization restrictions.
- Ensure contestant presence and session state persist seamlessly when switching browser tabs, preventing contestants from being kicked out or disconnected during match operations.

### R2. 2-vCPU Performance Optimization for Sandbox 3D Scene
Optimize rendering and resource consumption of the 3D scene in the embedded sandbox view so that it runs smoothly without lag, thermal throttling, or dropped frames on a standard 2-vCPU server/client environment.

### R3. Complete 3D Human Model Redesign (MCs and Contestants)
Replace the current primitive geometric assemblies (boxes, spheres, and cylinders) in `src/components/olympia/studio/Podiums.tsx` with high-quality realistic 3D humanoid mesh models (GLTF/GLB models).
- Apply to both MC presenters (Khánh Vy & Ngọc Huy) and the 4 contestant figures on the podiums.
- Implement authentic Vietnamese/East Asian skin materials (warm peach tones, e.g. #f8d5b8 / #fae0cc with subtle subsurface scattering or realistic PBR lighting response), eliminating any grey, muddy, unnatural, or robotic skin tones.
- Model natural facial features (expressive eyes with pupils and specular catchlights, gentle eyelids, defined nose bridge, natural lip color, and signature glasses for Khánh Vy).
- Incorporate realistic styled hair with natural volume (brunette layered hair cascading for Khánh Vy, clean styled haircut for Ngọc Huy).
- Equip characters with professional broadcast wardrobe matching television references (tailored white blazer, collared shirts, necktie, crisp cuffs) with natural textile shading.
- Maintain existing walking entrance paths and articulation animations without mesh clipping or tearing.

### R4. Synchronize Stage Screen Question Reveal with Lower-Third
Across all competition rounds, synchronize display timing so that the central LED stage screen does not reveal question text before the lower-third graphic appears on screen. The question text on the large display must reveal only concurrently with or after the lower-third graphic is displayed.

### R5. Correct Opening Chevron Arrows Animation
Across all competition rounds, fix the opening transition animation for the twin pairs of chevron arrows on the left and right sides:
- At the start of the animation, the two pairs of arrows must begin overlapping / converged together at the center of the screen.
- From this converged center state, the arrows must separate and smoothly fly outward to their respective left and right sides, rather than floating or moving in place on the sides from the start.

### R6. Eliminate Answer Label Overlap by Removing "ĐÁP ÁN:" Prefix
In the broadcast answer reveal bar (lower-third banner and stage display), remove the prefix label "ĐÁP ÁN:" completely.
- Display solely the clean answer text in pure white (`#ffffff`).
- Provide the full width of the answer bar for the text so that long answers never step on labels, collide, or overlap characters.

### R7. Buzzer Responsiveness & Zero-Latency Click/Key Event
Eliminate latency and lag when contestants press the buzzer button or press the keyboard Space key:
- Fire the buzz event dispatch immediately on `pointerdown` and keydown without blocking on synchronous Web Audio initialization.
- Provide immediate local haptic/visual feedback while socket event transmits.

### R8. Buzzer UI & Label Formatting (No Truncation / No Ellipsis "...")
Ensure text inside and beneath the buzzer button is never cut off with ellipsis `...`:
- Remove restrictive width/truncation limits (`truncate max-w-[110px]`) in `CircularBuzzer3D`.
- Render "ĐÃ BẤM CHUÔNG" completely without becoming "ĐÃ BẤM C...".
- Display cooldown and unlock countdown with 1 decimal place (e.g. "MỞ SAU 2.4s") clearly without clipping to "MỞ SAU 2. ...".

### R9. Contestant Buzzer Guidance Prompt
Replace redundant rules text with actionable contestant guidance:
- Remove redundant labels such as "Luật O23–O26: Mở chuông sau 5s" / "Luật O22: Mở chuông sau 2s".
- Replace with clear instructions: "Nhấn Space hoặc chạm nút để bấm chuông" (while waiting for unlock) and "Nhấn Space hoặc bấm nút ngay!" (when buzzer opens).

### R10. Khởi Động: V3 Theme Timer Activation & Countdown Overlay
Fix timer display and functionality for Khởi Động in Theme V3:
- Remove the condition `state.rulesetId < "O23"` in `DisplayScreen.tsx` that suppressed the question timer under O23–O26.
- Ensure clicking "TÍNH GIỜ (SPACE)" activates countdown:
  - In lượt riêng (solo): counts down 5, 4, 3, 2, 1 (5s).
  - In lượt chung (shared / turn): counts down 3, 2, 1 (3s).
  - Display the countdown number clearly right above the main lower-third graphic.

### R11. Khởi Động: Host "SAI" (Bksp) Button Functionality When No Buzz
Fix the host evaluation button "SAI (Bksp)" in Khởi Động:
- In `src/lib/olympia/engine.ts` (`kd:wrong`), remove the blocker `if (who == null) return fail("Chưa có thí sinh nào bấm chuông")`.
- When no contestant has buzzed (`who == null`), clicking SAI or pressing Backspace must cleanly mark the question as wrong / unanswered, transition `kd.phase = "result"`, pause timers, play cue `1_KhoiDong/wrong`, and allow the host to reveal the answer or proceed to the next question.

### R12. Score Summary (Tổng kết điểm): 1/3 Dưới vs Toàn Màn Layout & Toggle Fix
Fix the score summary display modes in `src/components/olympia/Vtv3BroadcastGraphics.tsx` (`SummaryLowerThirdGraphic`) and ensure switching between 1/3 Dưới and Toàn Màn works visually:
- When in 1/3 Dưới mode (`!sm.isFullscreen` / `overlayMode !== "FULLSCREEN"`):
  - Position the score graphic at the bottom 1/3 of the screen (`justify-end pb-8 sm:pb-12`).
  - Eliminate the dark blue backdrop (`bg-[#040e24]/85`) and `backdrop-blur-md` so that the 3D studio and camera behind are completely transparent and visible without any blocking background.
- When in Toàn Màn mode (`sm.isFullscreen`):
  - Retain the centered card graphic with dark background overlay (`justify-center`, dark backdrop).
- Fix the toggle: ensure clicking the toggle button in HostConsole (`summary:toggleFullscreen`) immediately and visibly switches between the bottom transparent 1/3 overlay and the full-screen centered view.

### R15. Host Console VCNV & Tăng Tốc Contestant Answer Monitoring (No Truncation)
In `src/components/olympia/HostConsole.tsx`:
- Eliminate text truncation (`...`) on contestant answer badges in VCNV and Tăng Tốc.
- Make the contestant answer cards flexible (auto-wrap / dynamic text sizing) so the host can clearly read the complete submitted answer text for all contestants along with their response times.

### R16. Fix "Nền chờ ĐA" (W) in VCNV and Tăng Tốc
In `HostConsole.tsx` and `engine.ts`:
- Currently, clicking "Nền chờ ĐA" calls `vcnv:blank` or `tt:blank` which merely plays the "blank space" audio cue (`6_NhacKhac/blank_space`).
- Fix: "Nền chờ ĐA" must switch the display/stage to the wide contestant camera view and overlay a semi-transparent / blurred backdrop for the answer reveal phase (without displaying the answer graphics yet). Separate this action completely from the "Ô TRỐNG" sound button.

### R17. Scale Up Contestant Answer Graphics Size in VCNV & Tăng Tốc
In `src/components/olympia/Vtv3BroadcastGraphics.tsx` (`VcnvAnswerRevealGraphic` and `TangTocRankedAnswersGraphic`):
- Increase the scale, height (from ~42px to 68-74px), and font size (to text-xl/2xl font-black) of the contestant answer reveal bars so they fill 75-85% of the stage screen with bold, easily readable broadcast-grade styling.

### R18. Clearly Differentiate 4 Circle Dot States in VCNV Grid
In `src/components/olympia/Vtv3BroadcastGraphics.tsx` (`GlossyBlueDomeButton`):
- Distinctly style the 4 visual states for the character dome buttons in VCNV rows:
  1. Initial state: standard deep blue glossy dome.
  2. Currently selected state: glowing amber ring (`ring-2 ring-amber-300`) with vibrant pulse.
  3. Revealed/opened state: luminous bright cyan background displaying the white character clearly.
  4. Darkened/unanswered state: darkened charcoal/slate (`#1f2937` -> `#111827`) with subdued border and no letter when no contestant answered correctly.

### R19. VCNV Timer Bar Left-to-Right Progression (0% to 100%)
In `src/components/olympia/Vtv3BroadcastGraphics.tsx` (`VcnvCountdownGraphic`):
- Change the countdown fill bar width formula from depleting (`remPct` 100% -> 0%) to progressive filling (`elapsedPct` 0% -> 100%), smoothly filling left-to-right from second 0 to second 15.

### R20. Revise VCNV CNV Judging Mechanism (Contestant-Preserving Elimination)
In `src/lib/olympia/engine.ts` (`vcnv:wrongCNV`) and `src/components/olympia/HostConsole.tsx`:
- When host clicks `✘ CNV Sai`:
  - Only the currently selected contestant being evaluated is marked wrong and eliminated from VCNV (`v.eliminatedSeats.push(targetSeat)`).
  - Only that eliminated contestant's bell signal is removed from `v.bells`.
  - The bell signals of all OTHER contestants who have buzzed MUST NOT be cleared or turned off! They remain active on the Host Console screen so the MC/host can select the next contestant who buzzed and hear their answer, preventing any unfair cancellation of other contestants' buzzers.
  - Selecting a contestant to judge is available for both `✔ CNV Đúng (+Điểm)` and `✘ CNV Sai` (or auto-targets the active/first buzzed contestant being reviewed, leaving the rest untouched).

### R21. VCNV CNV Bell Signal Protection & Foolproof Host Console UI
In `src/lib/olympia/engine.ts` and `src/components/olympia/HostConsole.tsx`:
- Redesign the CNV judging contestant selector in `HostConsole.tsx` to eliminate accidental misclicks:
  - Display active buzzers in chronological buzzer order with contestant full names (e.g. `#1: [Tên Thí Sinh] (03.4s)`).
  - Prominently highlight the currently selected contestant with active ring and radio indicator.
  - Dynamically display the target contestant's name directly on the action buttons:
    `✔ Chấm ĐÚNG: [Tên Thí Sinh] (+Điểm)`
    `✘ Chấm SAI: [Tên Thí Sinh] (Loại TS này)`
  - Clearly display any newly arriving buzzer signal that buzzed after the last wrong evaluation as a highlighted new candidate, giving the host immediate opportunity to evaluate them if valid.
  - Prevent arbitrary bell clearing: Bell signals cannot be cleared or dismissed without an explicit host verdict (`✔ CNV Đúng` or `✘ CNV Sai`).

### R22. Provide Resilient VPS Deployment Instructions
Ensure all updates are committed and a clear, verified deploy script/command is provided to pull, build, and restart PM2 on `https://quizorra.ddns.net`.

### R23. Strict Workspace Boundary Constraint
All modifications, file creations, and edits must strictly stay within the main repository folder `D:\Timeout Quiz`. Under no circumstances modify, touch, or delete any files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz`.

## Acceptance Criteria

### Audio Playback & Session Persistence
- [ ] Sound cues and background music play reliably in the embedded sandbox view on `/admin/sandbox` without needing to open `/olympia/display/<code>`
- [ ] Switching contestant tabs in sandbox preserves all 5 contestant socket sessions and never kicks contestants out

### 2-vCPU Studio Performance
- [ ] Embedded 3D scene renders smoothly without lag or frame stuttering on 2-vCPU hardware

### 3D Humanoid Models (MCs and Contestants)
- [ ] MC presenters (Khánh Vy & Ngọc Huy) and contestants are rendered as realistic humanoid models, eliminating primitive geometric box/cylinder shapes
- [ ] Skin tone displays authentic warm East Asian tones (#f8d5b8 / #fae0cc) across all characters under studio lighting without muddy or grey artifacts
- [ ] Hair models exhibit natural volume and shape corresponding to the broadcast reference photos
- [ ] Wardrobe displays professional broadcast attire (tailored white blazer, collared shirts, neckties)
- [ ] MC entrance walk and standing postures animate smoothly without mesh tearing or clipping

### Question Reveal Synchronization
- [ ] Across all competition rounds, the central LED screen does not display question text ahead of the lower-third broadcast banner
- [ ] Question reveal transitions smoothly and synchronously between the stage screen and lower-third graphics

### Chevron Arrow Animation
- [ ] In the round opening transition, twin chevron arrows start completely converged / overlapping at the center of the screen before splitting and flying outward to the left and right flanks

### Answer Display Formatting
- [ ] The prefix label "ĐÁP ÁN:" is completely removed from the answer reveal bar
- [ ] Long answers render cleanly across the full width in white (`#ffffff`) without any text overlap or collision

### Buzzer & Timer Enhancements
- [ ] Buzzer fires immediately without lag on click or keyboard Space
- [ ] Buzzer button label is never truncated with ellipsis (no "ĐÃ BẤM C..." or "MỞ SAU 2. ...")
- [ ] Buzzer countdown displays 1 decimal digit (e.g. "MỞ SAU 2.4s")
- [ ] Contestant sublabel displays helpful guidance: "Nhấn Space hoặc chạm nút để bấm chuông" instead of "Luật O23–O26: Mở chuông sau 5s"
- [ ] Khởi Động timer in theme V3 works reliably, counting down 5, 4, 3, 2, 1 (lượt riêng) and 3, 2, 1 (lượt chung), positioned above the main lower-third graphic
- [ ] In Khởi Động, pressing SAI (Bksp) when no contestant has buzzed transitions cleanly to result phase with answer reveal instead of failing with an error

### Score Summary (Tổng kết điểm) Lower-Third vs Fullscreen
- [ ] When in 1/3 Dưới mode, the score summary graphic is positioned at the bottom 1/3 of the screen with a completely transparent background (no dark backdrop / no blur), keeping the 3D studio behind fully visible
- [ ] When in Toàn Màn mode, the score summary graphic displays in the center with dark backdrop
- [ ] The toggle button in HostConsole immediately and visibly switches between the transparent bottom 1/3 overlay and the full-screen centered view

### VPS Deployment Instructions
- [ ] Clear deployment instructions and a verified deployment script are provided to pull changes, build, and restart PM2 on `https://quizorra.ddns.net`

### Workspace Integrity
- [ ] No files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz` are modified, added, or deleted

### R7. Resilient VPS Deployment Script and Instructions
Provide a verified, self-contained deployment script and clear step-by-step shell commands for pulling changes, resolving git synchronization or credential issues, building the Next.js application (`npm run build`), and restarting PM2 on the live VPS (`https://quizorra.ddns.net`) to ensure all changes take effect in production.

### R8. Strict Workspace Boundary Constraint
All modifications, file creations, and edits must strictly stay within `D:\Timeout Quiz`. Under no circumstances modify, touch, or delete any files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz`.

## Acceptance Criteria

### Audio & Session Stability
- [ ] Sound cues and background music play reliably in the embedded sandbox view (`/admin/sandbox`) upon interaction without requiring opening `/olympia/display/<code>`
- [ ] Contestants are not kicked out or disconnected when switching browser tabs or windows

### Performance Optimization
- [ ] Embedded 3D scene renders smoothly without frame stutter or excessive CPU spikes on a 2-vCPU environment

### 3D Human Anatomy & Appearance
- [ ] Both MC figures (Khánh Vy and Ngọc Huy) and all 4 contestant figures render with natural humanoid anatomy, curves, and proportions, completely replacing primitive geometric box/cylinder shapes
- [ ] Skin tone displays authentic warm East Asian tones (#f8d5b8 / #fae0cc) across all characters under studio lighting without muddy or grey artifacts
- [ ] Hair models exhibit natural volume and shape corresponding to the broadcast reference photos
- [ ] Wardrobe displays professional broadcast attire (tailored white blazer, collared shirts, neckties)
- [ ] MC entrance walk and standing postures animate smoothly without mesh tearing or clipping

### Question Reveal Synchronization
- [ ] Across all competition rounds, the central LED screen does not display question text ahead of the lower-third broadcast banner
- [ ] Question reveal transitions smoothly and synchronously between the stage screen and lower-third graphics

### Chevron Arrow Animation
- [ ] In the round opening transition, twin chevron arrows start completely converged / overlapping at the center of the screen before splitting and flying outward to the left and right flanks

### Answer Display Formatting
- [ ] The prefix label "ĐÁP ÁN:" is completely removed from the answer reveal bar
- [ ] Long answers render cleanly across the full width in white (`#ffffff`) without any text overlap or collision

### VPS Deployment Instructions
- [ ] Clear deployment instructions and a verified deployment script are provided to pull changes, build, and restart PM2 on `https://quizorra.ddns.net`

### Workspace Integrity
- [ ] No files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz` are modified, added, or deleted

## Verification Resources
- Visual sandbox preview: `http://localhost:3000/admin/sandbox`
- Live VPS sandbox URL: `https://quizorra.ddns.net/admin/sandbox?code=463275`
- Reference photos: `media_1793877853393_1f21bf17.jpg`, `media_1793895222890_dd3c1772.png`, `media_1793895773041_197f2609.png`


## Approved Task Prompt — 2026-11-06T02:46:00Z

Use a full team of agents to redesign the 3D human models (MCs and contestants) with authentic Vietnamese appearance and fix stage lighting for MC and contestant podiums.

Working directory: D:\Timeout Quiz
Integrity mode: development

## Reference Material
- User screenshot showing dark podiums and mannequin figures: `media_1793932634375_ecb859bc.png`
- MC & Contestant 3D components: `src/components/olympia/studio/Podiums.tsx`
- Stage lighting components: `src/components/olympia/studio/StudioLighting.tsx`
- Scene assembly: `src/components/olympia/OlympiaStudio3DScene.tsx`
- Local preview URL: `http://localhost:3000/admin/sandbox`

## Requirements

### R1. Pre-Execution Backup
Before modifying any files in `D:\Timeout Quiz`, create a complete git backup (commit, tag, or branch) of all current working files so that any changes can be cleanly inspected or rolled back.

### R2. Authentic Vietnamese 3D Character Models for MCs and Contestants
Replace the dark, blocky robot/mannequin meshes in `src/components/olympia/studio/Podiums.tsx` by combining external 3D humanoid models with custom refinements to fix the severely degraded original meshes:
- MC Khánh Vy: Vietnamese female presenter with natural long dark hair, signature eyeglasses, elegant broadcast blazer/attire, and warm Vietnamese skin tone.
- MC Ngọc Huy: Vietnamese male presenter with styled short dark hair, formal suit and necktie, and warm Vietnamese skin tone.
- 4 Contestants: Vietnamese high school students with standard white collared shirts, Olympia laurel wreaths, and warm Vietnamese skin tones.
- Completely eliminate black, grey, muddy, or robotic mannequin geometry and shading under all camera angles.

### R3. Stage Lighting for MC and Contestant Podiums
Fix stage lighting in `src/components/olympia/studio/StudioLighting.tsx` and related scene components so that when the match starts or during active competition rounds, balanced stage illumination (key light & fill light spotlights) automatically turns on and clearly illuminates the MC podium area and all 4 contestant podium areas.

### R4. Strict Workspace Boundary Constraint
All modifications, file creations, and edits must strictly stay within `D:\Timeout Quiz`. Under no circumstances modify, touch, or delete any files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz`.

## Acceptance Criteria

### Pre-Execution Backup
- [ ] A clean git backup (commit, tag, or branch) is created in `D:\Timeout Quiz` before modifying any files

### 3D Character Models
- [ ] Both MC figures (Khánh Vy & Ngọc Huy) and all 4 contestant figures display natural Vietnamese human anatomy and proportions, completely replacing blocky robotic shapes
- [ ] Skin tones across all characters render with warm natural East Asian/Vietnamese tones without dark, black, or grey muddy artifacts under studio lighting
- [ ] MC Khánh Vy features natural long dark hair, eyeglasses, and broadcast blazer
- [ ] MC Ngọc Huy features styled short dark hair, formal suit, and necktie
- [ ] Contestant figures wear white collared shirts and laurel wreaths

### Studio Lighting
- [ ] When the match starts or in active rounds, dedicated spotlights automatically illuminate the MC podium and contestant podiums clearly
- [ ] Neither the MC area nor the contestant area remains dark or unlit during active match states

### Verification & Workspace Integrity
- [ ] Pass automated test suite: `npm run test:olympia`, `npm run test:olympia-3d`, `npm run type-check`, `npm run build`
- [ ] Visual verification confirms character appearance and podium lighting in `/admin/sandbox`
- [ ] No files in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz` are modified, added, or deleted
