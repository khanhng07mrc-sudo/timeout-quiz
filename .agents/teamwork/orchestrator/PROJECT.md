# Project: Timeout Quiz — Persistent Olympia Studio & Deployment Architecture

## Architecture
- **Framework**: Next.js 14 (App Router & Pages Router), React 18, Three.js / @react-three/fiber / @react-three/drei, Tailwind CSS.
- **Game Engine**: Authoritative TypeScript state machine (`src/lib/olympia/engine.ts`, `types.ts`, `socket-olympia.ts`) with deterministic tick evaluation and action dispatching.
- **3D Studio**: Centralized in `src/components/olympia/studio/` (`Podiums.tsx`, `CentralLedWall.tsx`, `StudioLighting.tsx`, `CameraController.tsx`, `useOlympiaCamera.ts`).
- **Host Console**: Real-time broadcast controller (`src/components/olympia/HostConsole.tsx`).
- **Deployment & VPS**: Git repository deployment with Next.js production build (`deploy-vps.sh`, `ecosystem.config.cjs`) hosted via PM2 and Nginx reverse proxy on `quizorra.ddns.net`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Pipelined Concurrent Entrance Timing | Calibrate stair descent phases so contestant N reaches dais floor (Z=6.20m) at t = 4.0s; contestant N+1 immediately emerges and descends stairs; decoupled multi-figure rendering from socket lag. | M1 | Survey R1 |
| F2 | Rear Corridor Arc Anti-Clipping Walkway | Route contestants via dais sweep P1=(-5.20, 0.22, 2.50), rear corridor entry P2=(-7.60, 0.22, -2.04), rear arc R=7.75m (>0.7m clearance behind desks, >0.8m inside science wall) entering podiums radially from behind. | M1 | Survey R3 |
| F3 | Contestant Arm Fluidity & Greeting Pose | Add wrist joint refs, eliminate phase-boundary snap (15.2° jump in 16ms) using C2 Hermite smootherstep / SLERP, replace useState re-render bottleneck with ref-based gesture progress, natural wave pose. | M2 | Survey R2 |
| F4 | MC Presenter Biomechanical Kinematics | Add missing forearm/elbow and wrist joint refs, implement natural resting posture (18-24° flex), organic micro-breathing sway, and smooth conversational gestures towards contestants and LED wall. | M2 | Survey R2 |
| F5 | Stage Flow Intro Standby & LED Wall Sync | Ensure system cleanly halts at introStandby upon entrance completion, locking scoring and awaiting Host start button; update CentralLedWall to explicitly recognize state.introStandby. | M3 | Survey R4 |
| F6 | Production Build Freshness & PM2 Hardening | Update deploy-vps.sh to purge `.next/cache` and prevent PM2 port 3000 collision between `quizorra` and `timeout-quiz`; expose git commit hash / build ID via `/api/health`. | M4 | Survey R5 |
| F7 | Full Test Suite & Live VPS Verification | Run automated test suites (test:olympia, test:olympia-3d, test, tsc --noEmit) achieving 100% pass rate; verify live VPS endpoint https://quizorra.ddns.net. | M4 | Survey R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 3D Entrance Pipelining & Rear Corridor Anti-Clipping | Features F1, F2: Synchronize stair descent timing to 4.0s, implement 3-stage rear corridor arc R=7.75m. | none | **DONE** (Podiums.tsx, 0 collisions, 100% pass) |
| M2 | Arm Animation Fluidity & Natural Kinematics | Features F3, F4: Biomechanical joint hierarchy, ref-based gesture progress, C2 easing, MC natural arm flex. | none | **DONE** (Podiums.tsx, delta<15°/frame, 100% pass) |
| M3 | Stage Flow Intro Standby & Studio Display Sync | Feature F5: introStandby state preservation, HostConsole trigger, CentralLedWall display synchronization. | M1 | **DONE** (CentralLedWall.tsx, engine.ts, 100% pass) |
| M4 | Production Build, Deploy Script & VPS Verification | Features F6, F7: deploy-vps.sh cache purging, PM2 fix, /api/health commit hash, 100% test pass, live VPS check. | M1, M2, M3 | **DONE** (deploy-vps.sh, route.ts, 746/746 tests pass) |

## Interface Contracts
### Engine ↔ 3D Studio (`engine.ts` ↔ `Podiums.tsx`)
- `entranceState`: `{ active: boolean, startedAt: number, currentSeatIdx: number, seatStartedAt: number, seatStartTimes: number[] }`
- At `elapsedForSeat >= 4000ms`, `currentSeatIdx` increments and `seatStartTimes[nextIdx] = now`.
- In `Podiums.tsx`: `SingleContestantEntranceWalkingFigure` calculates `t = (currentTime - seatStartTime) / 1000`.
- Phase 1 (0.0–0.6s): Door opens, emerges.
- Phase 2 (0.6–1.8s): Descends upper stairs to mid-platform ($Z = 10.20\text{ m}$).
- Phase 3 (1.8–3.0s): Stands on mid-platform, signature greeting pose ($1.2\text{ s}$).
- Phase 4 (3.0–4.0s): Descends lower stairs to dais floor ($Z = 6.20\text{ m}$). At $t = 4.0\text{ s}$, contestant reaches floor!
- Phase 5 (4.0–6.8s): Walks along rear corridor arc ($R = 7.75\text{ m}$) into podium.

### Kinematic Rigs (`Podiums.tsx`)
- Contestant: `leftArmRef`, `leftForearmRef`, `leftWristRef`, `rightArmRef`, `rightForearmRef`, `rightWristRef`.
- MC Presenters: `kvLeftArmRef`, `kvLeftForearmRef`, `kvRightArmRef`, `kvRightForearmRef`, `nhLeftArmRef`, `nhLeftForearmRef`, `nhRightArmRef`, `nhRightForearmRef`.

### Engine ↔ Host Console (`engine.ts` ↔ `HostConsole.tsx`)
- On entrance completion: `st.entranceState = null; st.entranceCompleted = true; st.introStandby = true;`.
- Host console presents "⭐ Vào Vòng KHỞI ĐỘNG" button dispatching `round:force`.

### Deployment & Health API (`deploy-vps.sh` ↔ `route.ts`)
- `deploy-vps.sh` executes `rm -rf .next/cache .next/standalone .next/server .next` before `npm run build`.
- PM2 processes: `pm2 delete quizorra; pm2 restart timeout-quiz --update-env || pm2 start ecosystem.config.cjs --only timeout-quiz`.
- `/api/health` returns `{ status: "ok", commit: "<git_hash>", buildTime: "<iso_string>", uptime: number }`.

## Code Layout
- `src/lib/olympia/engine.ts`: State machine, entrance timing, round transitions.
- `src/lib/olympia/types.ts`: State interfaces, entrance state.
- `src/components/olympia/studio/Podiums.tsx`: 3D contestant and MC models, entrance animations, waypoints.
- `src/components/olympia/studio/CentralLedWall.tsx`: Studio LED screen display modes.
- `src/components/olympia/studio/useOlympiaCamera.ts`: Camera broadcast angles during entrance and standby.
- `src/components/olympia/HostConsole.tsx`: Host controls, round start buttons.
- `src/app/api/health/route.ts`: Production health and build identification endpoint.
- `deploy-vps.sh`: VPS deployment automation script.
- `tests/e2e/runner-olympia-fixes.js`: Automated E2E verification suite.
