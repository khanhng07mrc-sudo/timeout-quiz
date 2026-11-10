# Project: Timeout Quiz — Olympia Broadcast & Gameplay Refinements

## Architecture
- **3D Broadcast Studio (`src/components/olympia/studio/Podiums.tsx`)**:
  - `SingleContestantEntranceWalkingFigure`: 60 FPS Three.js entrance animation with 3-stage anti-clipping trajectory (wide outer sweep $\to$ rear walkway arc at $R=7.75\text{m} \to$ radial entry from behind into standing spot at $R=7.02\text{m}$).
  - `ContestantEntranceWalkingFigures`: Concurrent pipelined rendering of walking figures with functional per-contestant screen mode synchronization (`screenMode = isApproachingOrArrived ? "name_school" : "logo"`).
- **Olympia Game Engine (`src/lib/olympia/engine.ts`)**:
  - Entrance ticker with pipelined 4000ms staggered step (`advanceThreshold = isLast ? 6800 : 4000`), reducing 4-contestant entrance from 27.2s to 18.8s.
  - Question reveal buzzer lockout with 3000ms (O22) / 5000ms (O23+) `noBuzzWrongUnlockAt`.
  - Immediate clearance `kd.noBuzzWrongUnlockAt = undefined;` on buzzer press.
- **Host Console & Sandbox Controls (`src/components/olympia/HostConsole.tsx` & `OlympiaSandboxStudio.tsx`)**:
  - Animated countdown badge and disabled lock for MC "Sai" button during buzzer lockout.
  - Hotkey Backspace blocked during lockout.
  - 100% UI and timer parity between Online Host Console and Sandbox MC controls.
- **Node Production Server (`server.js`)**:
  - Re-bundled via Next.js + esbuild.
- **Live VPS Deployment (`deploy-vps.sh`)**:
  - Pulls `origin/main` into `/var/www/quizorra`, runs migrations, rebuilds, and restarts PM2.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Anti-Clipping Rear Walkway | Contestants walk along rear corridor arc ($R=7.75\text{m}$) behind podiums and enter desk strictly from behind | M1 | R1 (Survey Exp 1) |
| F2 | Pipelined Staggered Entrance | Contestant $N$ emerges as Contestant $N-1$ clears lower stairs (4000ms threshold); no waiting for desk arrival | M2 | R2 (Survey Exp 2) |
| F3 | Multi-Contestant Screen Mode | Podium screens functionally switch to `"name_school"` at 5.2s elapsed without state conflicts | M2 | R2 (Survey Exp 2) |
| F4 | Host Wrong Button Lock | "Sai" button locked with countdown for 3s (O22) or 5s (O23+) before buzzer; unlocks instantly on buzz | M3 | R3 (Survey Exp 3) |
| F5 | Sandbox MC Wrong Button Parity | `OlympiaSandboxStudio.tsx` disabled state and countdown badge matching `HostConsole.tsx` | M3 | R3 (Survey Exp 3) |
| F6 | Engine & E2E Test Suite | Passing test suites covering 4000ms pipelining, instant buzzer unlock, and 3D studio regression | M4 | R5 (Survey Exp 2 & 3) |
| F7 | Production Build & VPS Deploy | Clean Next.js + esbuild bundle, git commit/push, and live VPS deployment verification at `/var/www/quizorra` | M4 | R5 (Survey Exp 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Anti-Clipping Podium Walkway | `src/components/olympia/studio/Podiums.tsx` (Phase 5A, 5B, 5C) | none | DONE |
| M2 | Pipelined Entrance & Screen Sync | `src/lib/olympia/engine.ts`, `src/components/olympia/studio/Podiums.tsx` | M1 | DONE |
| M3 | Host Wrong Button Lock & Parity | `src/lib/olympia/engine.ts`, `HostConsole.tsx`, `OlympiaSandboxStudio.tsx` | M2 | DONE |
| M4 | Test, Build & VPS Deployment | `engine.test.ts`, `server.js`, local build, git push & VPS verification | M1, M2, M3 | DONE |

## Code Layout
- `src/components/olympia/studio/Podiums.tsx`: 3D contestant walking animation and podium displays.
- `src/lib/olympia/engine.ts`: Core Olympia game engine and state machine.
- `src/lib/olympia/engine.test.ts`: Automated unit test suite for Olympia game engine.
- `src/components/olympia/HostConsole.tsx`: Online Host Console MC interface.
- `src/components/olympia/OlympiaSandboxStudio.tsx`: Sandbox MC interface.
- `deploy-vps.sh`: VPS automated deployment script.
