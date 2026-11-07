# Original User Request

## Initial Request — 2026-11-06T10:50:42Z

Revamp the Olympia Khởi Động start and question reveal flow with accurate audio sequencing, scale the Econova lower-third graphics and unroll animation on the display screen for broadcast television readiness, and refine 3D character human anatomy for MCs and contestants.

Working directory: D:\Timeout Quiz
Integrity mode: development

## Reference Material
- User screenshot: `media_1793961396413_0f330e8d.png` at https://quizorra.ddns.net/olympia/display/547250
- Display route: `/olympia/display/[pin]`
- MC & Contestant 3D components: `src/components/olympia/studio/Podiums.tsx`

## Requirements

### R1. Khởi Động Start and Question Reveal Flow & Audio Sequencing
When "BẮT ĐẦU" (kd:start) is triggered:
- Only open/unroll the lower-third Econova hexagonal graphic frame at t=0.
- Do NOT reveal the question yet: the question text remains hidden, and the question counter stays at 0/6 (not advancing to question 1).
- Audio: play only "1_KhoiDong/ready". Strictly do NOT play "1_KhoiDong/open_question" and do NOT play "1_KhoiDong/kd_bgm_1" at this stage.

When "CÂU TIẾP" (kd:next) is clicked for the first time:
- Advance the counter to 1/6 and reveal question 1 content.
- Trigger audio sound effect "1_KhoiDong/open_question".
- Trigger background music "1_KhoiDong/kd_bgm_1".
- Subsequent questions continue with normal question reveal and audio playback.

### R2. Broadcast-Ready Sizing and Typography for Econova Lower-Third Graphics
Overhaul the lower-third graphics on the display screen (`/olympia/display/[pin]`):
- Expand graphics coverage to span ~90-95% of screen width, removing cramped container constraints (such as max-w-6xl / 1200px limit).
- Substantially enlarge font sizes for question text, contestant names, and scores to ensure high legibility and broadcast readiness.
- Maintain balanced television broadcast proportions for contestant podiums and score displays.

### R3. Smooth Econova Unroll Animation
- Implement a smooth entrance unroll animation for the hexagonal Econova lower-third graphic frame when "BẮT ĐẦU" is triggered (t=0) using Framer Motion / CSS keyframes.
- Ensure question content remains blank/hidden until "CÂU TIẾP" is pressed, at which point the question content enters cleanly.

### R4. Realistic 3D Human Anatomy Refinements for Characters
Redesign the 3D human anatomy of MC and contestant character models in `src/components/olympia/studio/Podiums.tsx`:
- Natural human body proportions: soft rounded head structure, natural neck and shoulders, and seamlessly jointed arms.
- Refined East Asian facial features with distinct eyes, nose, and mouth.
- Multi-layered 3D hair and authentically tailored Vietnamese clothing silhouettes.

### R5. Strict Workspace Boundary Constraint
All modifications, file creations, and edits must be STRICTLY confined to `D:\Timeout Quiz`. NEVER touch, modify, or delete any file in `D:\Olympia 26` or anywhere outside `D:\Timeout Quiz`.

## Acceptance Criteria

### Khởi Động Flow & Audio Sequencing
- [ ] Clicking "BẮT ĐẦU" (kd:start) opens the lower-third graphic frame with counter at 0/6, without revealing question 1
- [ ] At "BẮT ĐẦU", audio plays only "1_KhoiDong/ready"; neither "1_KhoiDong/open_question" nor "1_KhoiDong/kd_bgm_1" plays
- [ ] Clicking "CÂU TIẾP" (kd:next) for the first time advances counter to 1/6, displays question 1, plays "1_KhoiDong/open_question", and starts "1_KhoiDong/kd_bgm_1"
- [ ] Subsequent questions progress with timer and audio logic intact

### Lower-Third Display Sizing & Animation
- [ ] Lower-third graphic on the display screen spans ~90-95% of viewport width without 1200px / max-w-6xl constraint
- [ ] Question text, contestant names, and podium scores are prominently sized and legible at television broadcast viewing distance
- [ ] Hexagonal Econova graphic frame unrolls smoothly at t=0 upon clicking "BẮT ĐẦU"

### 3D Character Anatomy
- [ ] MC and contestant 3D character models exhibit natural East Asian facial anatomy (eyes, nose, mouth) and soft rounded head proportions
- [ ] Characters have natural shoulder/neck transitions, smooth arm articulation, multi-layer hair, and proper Vietnamese clothing fits

### Verification & Workspace Integrity
- [ ] All automated test suites pass: `npm run test:olympia`, `npm run test:olympia-3d`, `npm run type-check`, `npm run build`
- [ ] Display page (`/olympia/display/[pin]`) visual layout and animation verified
- [ ] Zero files in `D:\Olympia 26` or outside `D:\Timeout Quiz` are modified, added, or deleted

---
## Orchestrator Directives
- Your working directory: D:\Timeout Quiz\.agents\teamwork\orchestrator_1\
- Original request file: D:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md
- Project root: D:\Timeout Quiz
- Maintain plan.md and progress.md in your working directory.
- Dispatch specialists to analyze, implement, and verify all requirements.
- Strictly adhere to the workspace boundary: NEVER touch D:\Olympia 26.

## Follow-up — 2026-11-06T10:50:53Z

User clarification received on workspace constraints:
"hoàn toàn có thể phân tích, xem file bên ngoài, thậm chí xem mạng, nhưng không can thiệp sửa xoá"
(You and your team are permitted to inspect, read, and analyze outside files and search the web for reference, but strictly CANNOT modify, create, edit, or delete any files outside D:\Timeout Quiz. All file writes and modifications must be confined to D:\Timeout Quiz).


## Follow-up — 2026-11-07T02:54:15Z

Re-plan studio broadcast camera IDs, implement the 5-phase television cut entrance sequence, restore the grandstand audience and cyclorama in all display modes, and evaluate the realistic 3D human model replacement architecture in Timeout Quiz.

Working directory: d:\Timeout Quiz
Integrity mode: development

## Reference Material
- Existing implementation plan artifact: `C:\Users\khanh\.gemini\antigravity\brain\aac021ca-ce70-48a4-b3be-d09545e52c3f\plan_entrance_camera_and_audience_backdrop.md`
- Scope constraint: Strictly modify or delete code within `d:\Timeout Quiz\src` only. Do not modify or delete any files outside `src` (reading, inspecting, and referencing files outside `src` is permitted). External online references and models may be surveyed with captured screenshots.

## Requirements

### R1. Grandstand, Audience & AI Cyclorama Restoration
Restore 100% of the AI Cyclorama curved backdrop, grandstand spotlights, tiered seating, and 3D audience across all quality levels and runtime modes (including Sandbox/Light mode and iframe embedding). The grandstand and backdrop must never render as a black void or empty space; in Light quality, display a distributed cohort of audience members across all 7 rows with cheering banners.

### R2. Studio Camera Planning & Non-Overlapping ID Mapping
Establish fixed studio camera IDs: Studio fixed cams (CAM 1..4, CAM 9 Egripment Jib, CAM 10 Podiums Wide, CAM 11 Frontal Entrance Robocam at [0.0, 2.05, 6.20] targeting [0.0, 1.65, 10.50], CAM 12 3/4 Diagonal at [-2.80, 2.10, 6.50] targeting [0.0, 1.40, 10.20], CAM 13 Arch & Peak, CAM 14 Low Angle, CAM 15 Finish Podium). Map contestant close-up cameras TS 1..4 to CAM 5..8 and TS 5..8 to non-overlapping safe ID range CAM 25..28. Implement the 5-phase contestant entrance sequence using 100% television-standard cuts:
- 0.0s - 4.5s: CAM 11 (CUT, frontal robocam tracking entrance down stairs)
- 4.5s - 6.5s: CAM 11 push 0.15 (optical push on center podium pose/greeting)
- 6.5s - 8.0s: CAM 12 (CUT, 3/4 diagonal grandstand view)
- 8.0s - 10.5s: CAM 10 (CUT, wide view of contestant podiums as candidate walks to seat)
- 10.5s+: CAM TS (CUT, locked close-up on contestant's podium)

### R3. Physical Broadcast Cameras & Crew Rendering
Render physical broadcast equipment models on the studio floor in all display quality modes: Pedestal A (stage left), Pedestal B (stage right), standing cameramen, and the Egripment Jib crane.

### R4. 3D Human Avatar Replacement Architecture & Procedural Kinematics
Update the implementation plan artifact (`plan_entrance_camera_and_audience_backdrop.md`) with a comprehensive architectural evaluation and roadmap for replacing all 3D human figures (MC Khanh Vy, Ngoc Huy, contestants, and audience) with realistic rigged GLTF/PBR Asian human avatars and standard walking/gesturing animation clips. Within current procedural models, upgrade walking kinematics for natural motion (hip swing amplitude ~30°, knee flexion up to 42°, arm swing counter-balance, and vertical center-of-mass bobbing).

### R5. Visual Screenshot Verification & Test Validation
Automate capturing screenshots of all camera angles (including CAM 11 frontal entrance, CAM 12 diagonal, grandstand in Light/Sandbox mode, and physical studio cameras) into artifact image files for visual inspection. Verify that all repository test suites pass without regression.

## Acceptance Criteria

### Grandstand & Environment
- [ ] AI Cyclorama backdrop, grandstand lighting, tiered seats, and audience remain visible with no black void in Light quality and iframe embedding.
- [ ] Pedestal A, Pedestal B, cameramen, and Egripment Jib crane appear physically on the studio floor across all quality levels.

### Camera Choreography & IDs
- [ ] Contestant close-ups TS 5..8 are assigned CAM IDs 25..28 and do not conflict with fixed studio cameras (CAM 11..15).
- [ ] The 5-phase entrance camera sequence switches cleanly via cuts across the defined timeline (0-4.5s CAM 11 -> 4.5-6.5s CAM 11 push -> 6.5-8.0s CAM 12 -> 8.0-10.5s CAM 10 -> 10.5s+ CAM TS).

### 3D Human Avatar Model Architecture & Kinematics
- [ ] The plan artifact at `plan_entrance_camera_and_audience_backdrop.md` contains an updated section detailing realistic rigged PBR 3D human avatar specifications, candidate asset sources, and animation clip integration.
- [ ] Procedural walking motion incorporates knee flexion, thigh swing, arm counterbalance, and vertical bounce.

### Scope & Verification
- [ ] No files outside `d:\Timeout Quiz\src` are modified or deleted.
- [ ] `npm run type-check`, `npm run test:olympia`, `npm run test:olympia-3d`, and `npm run build` pass without error.
- [ ] Visual screenshot artifacts covering CAM 11, CAM 12, the grandstand in Light mode, and physical cameras are generated and verified.
