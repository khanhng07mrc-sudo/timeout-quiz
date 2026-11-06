# BRIEFING — 2026-11-06T02:46:00Z

## Mission
Orchestrate redesign of authentic Vietnamese 3D human models (MCs Khánh Vy & Ngọc Huy, 4 contestants) and fix MC/contestant stage lighting during active match states in D:\Timeout Quiz.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: D:/Timeout Quiz/.agents/teamwork
- Orchestrator: 08d8ee8d-2e18-414a-926d-210d93944a6b (teamwork_orchestrator, orchestrator_3)
- Victory Auditor: d2fb1d01-3542-4d3e-b7d1-7d0d4818edb9 (teamwork_victory_auditor, victory_auditor_sentinel_2)
- Cron 1 (Progress): 2b063eb9-8472-43a1-ab6d-0c150efd7723/task-30
- Cron 2 (Liveness): 2b063eb9-8472-43a1-ab6d-0c150efd7723/task-31

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Route: SWE Light (teamwork_swe)
- Strict boundary constraint: All modifications strictly in D:\Timeout Quiz; DO NOT touch D:\Olympia 26
- Single self-contained fix; keep small and focused
- Route: General (teamwork_orchestrator)
- Multi-part studio enhancement: R1 (audio/persistence), R2 (2-vCPU perf), R3 (3D realistic MCs & contestants), R4 (question reveal sync), R5 (chevron arrows), R6 (remove "ĐÁP ÁN:" prefix), R7 (VPS deployment script)
- Strict boundary: D:\Timeout Quiz only, strictly DO NOT touch D:\Olympia 26
- Scope addition: R7-R9 buzzer non-blocking latency, label truncation removal, guidance text; R10 Khởi Động V3 countdown timer display; R11 host SAI (Bksp) on no buzz without error.
- Scope addition: R12 Score Summary lower-third vs fullscreen mode toggle (bottom 1/3 position, transparent background, toggle fix).
- Scope addition: R15–R20 HostConsole answer cards wrap, "Nền chờ ĐA" camera/backdrop without audio bug, scaled up VCNV/TT answer graphics (68-74px), 4 VCNV circle dot states, progressive 15s timer bar (0%->100%), and CNV Sai eliminating all buzzed contestants.
- Scope addition: R21 CNV bell signals complete clearing upon CNV Sai, race condition guard (`lastJudgedWrongAt`), and no arbitrary clearing without verdict.
- User Correction: CNV Sai eliminates ONLY the evaluated contestant seat; all other contestants who buzzed remain active in `v.bells` on Host Console for subsequent evaluation.
- Approved Task Prompt Constraints:
  - Route: General (`teamwork_orchestrator`)
  - Strict workspace boundary: All modifications strictly stay in `D:\Timeout Quiz`. NEVER touch `D:\Olympia 26`.
  - R1: Pre-execution git backup in `D:\Timeout Quiz`
  - R2: Authentic Vietnamese 3D character models for MCs (Khánh Vy, Ngọc Huy) and 4 contestants (warm East Asian skin tones, hair, clothes, eliminate blocky/dark robot shapes)
  - R3: Stage lighting for MC & contestant podiums (spotlights turn on during match start / active rounds)
  - Verification: `npm run test:olympia`, `npm run test:olympia-3d`, `npm run type-check`, `npm run build`, and visual `/admin/sandbox`.

## User Context
- **Last user request**: Approved task prompt received and confirmed.
- **Pending clarifications**: none
- **Delivered results**: Starting teamwork_orchestrator.

## Project Status
- **Phase**: auditing

## Victory Audit Status
- **Triggered**: yes
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- D:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user request


