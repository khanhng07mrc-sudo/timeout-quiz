# BRIEFING — 2026-11-11T09:25:00Z

## Mission
Investigate Ve Dich state machine, transition flows, and Host controls for Timeout Quiz (Requirement R1, R2, R3). Analyze code paths for round activation, "Về đích" click, "Lên sân khấu" button, package selection trigger, arrow animations, and question leak to diagnose root causes and propose clean state machine and socket event architecture.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigation, code & geometry analysis, architectural survey
- Working directory: d:\Timeout Quiz\.agents\teamwork\explorer_survey_1
- Original parent: 89bbb983-455a-463b-9e0e-8a3d1887ba4b
- Milestone: Survey Phase (Dais Platform & Cove Lighting)
- Current Milestone: Ve Dich State Machine, Transition Flows & Host Controls (Requirement R1)
- Dispatch Parent: 47820d92-4889-4395-abf8-ed65add978a1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or edit source code
- DO NOT touch or inspect anything outside `d:\Timeout Quiz` (Keep `d:\Olympia 26` completely untouched)
- DO NOT touch `d:\Timeout Quiz\AGENTS.md`
- Write only inside working directory `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1`
- Read-only exploration mode. Do not modify any source code files.

## Current Parent
- Conversation ID: 47820d92-4889-4395-abf8-ed65add978a1
- Updated: 2026-11-11T09:25:00Z

## Investigation State
- **Explored paths**:
  - `src/lib/olympia/types.ts` (`VeDichState`, `OlympiaState`, `ROUND_ORDER`)
  - `src/lib/olympia/engine.ts` (`beginRound`, `vdAction`, `setPackage`, `view()`)
  - `src/lib/olympia/socket-olympia.ts` (action & state broadcast flow)
  - `src/components/olympia/HostConsole.tsx` (Host buttons: `round:force`, `vd:setSeat`, `vd:onStage`, `vd:showPackageGraphic`, `vd:confirmPackage`, `vd:startQuestion`)
  - `src/components/olympia/DisplayScreen.tsx` (`hasActiveRoundContent`, `VeDich`, `isPackageIntroTime`)
  - `src/components/olympia/Vtv3BroadcastGraphics.tsx` (`VeDichSlantedGridGraphic`, `EconovaLowerThirdV3`)
  - `src/components/olympia/V3ArrowShell.tsx` & `v3Geometry.ts` (`dcConverge` formula, keyframe animations)
  - `src/components/olympia/PlayerPad.tsx` (`PackagePicker`, question view)
  - `src/components/olympia/hooks.ts` (`useOlympiaSocket`, `useOlympiaAudio`)
  - `src/components/olympia/studio/useOlympiaCamera.ts` & `useOlympiaLightingState.ts`
- **Key findings**:
  - R1: `engine.ts` dòng 765 gán `vd.phase = "choosing"` ngay tại `beginRound("veDich")` và đè `choose_package` lên `start_round`.
  - R2: `V3ArrowShell.tsx` dòng 159 dùng `canvasW/2 - startX/2` thay vì `W/2`, gây lệch tâm 64px; CSS thiếu `scale()`.
  - R3: `DisplayScreen.tsx` dòng 772 có timer ngầm 2000ms `isPackageIntroTime`, hết 2s tự unmount bảng gói và ép render `EconovaLowerThirdV3` khi chưa bấm câu 1.
- **Unexplored areas**: None. Toàn bộ chuỗi bằng chứng đã được kiểm chứng bằng thực nghiệm và code inspection.

## Key Decisions Made
- Kiến trúc hóa 5 trạng thái FSM: 1) Intro vòng -> 2) Lên sân khấu -> 3) Mở bảng chọn gói -> 4) Đã chọn gói -> 5) Bắt đầu câu hỏi 1.
- Sửa công thức `dcConverge = shell.W / 2` để triệt tiêu hoàn toàn sai số lệch tâm.
- Duy trì `VeDichSlantedGridGraphic` trong suốt pha `packageReady` cho đến khi `vd:startQuestion` kích hoạt câu 1.

## Artifact Index
- `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\DISPATCH.md` — Inbound dispatches
- `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\BRIEFING.md` — Situational awareness
- `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\progress.md` — Heartbeat / progress log
- `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\test_arrows.cjs` — Script chứng minh toán học lệch tâm 64px
- `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\analysis.md` — Báo cáo kỹ thuật chi tiết
- `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1\handoff.md` — Handoff report 5 thành phần
