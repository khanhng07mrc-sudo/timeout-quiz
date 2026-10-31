# Test Infrastructure: 3D Đường lên đỉnh Olympia Studio Set

## 1. Test Philosophy & Methodology

The 3D Đường lên đỉnh Olympia Studio Set testing infrastructure follows an **opaque-box, requirement-driven, contract-based verification methodology**. 

Because Three.js / WebGL rendering environments in Next.js/React 19 involve both client-side canvas rendering and time-sensitive broadcast show automation, testing is architected into two complementary layers:
1. **Contract & State Automation Oracles**: High-speed, deterministic headless evaluation of all lighting triggers, multi-zone staggered fades, buzzer reactions, and camera math against the formal interface contracts defined in `PROJECT.md`.
2. **Asset, Coordinate & Geometry Invariants**: Verification of physical layout specifications (1 MC podium, 4 contestant podiums, Laurel wreath showcase vitrine, 16:9 central LED display), asset resolution, and safety boundaries.

### 4-Tier Test Classification
- **Tier 1: Feature Coverage (Core Functional Requirements)**
  Direct verification of each requirement from `ORIGINAL_REQUEST.md` (R1–R4) and features from `PROJECT.md` (F1–F6). Every lighting state transition (Khởi động, VCNV, Tăng tốc, Về đích, Câu hỏi phụ), buzzer glow rule, staggered multi-zone delay, brand asset check, and 3D stage coordinate is tested directly.
- **Tier 2: Boundary & Corner Cases**
  Rigorous examination of exact millisecond thresholds (2499ms vs 2500ms delay in VCNV/Tăng tốc), zero/negative timers, empty bell queues, simultaneous buzzers, invalid contestant seat indices (-1, 4, 8, NaN), uninitialized/null round sub-states, and non-standard viewport aspect ratios (1:1, 4:3, 9:16 vertical, 21:9 ultrawide) for FOV adaptation.
- **Tier 3: Cross-Feature Combinations**
  Pairwise and multi-variable integration testing: concurrent round phase changes with buzzer locks, camera transitions during lighting fade progress, steal buzzers in Về đích with countdown clocks, VCNV bell rings before vs after 2.5s lighting transition, and sudden-death tiebreakers.
- **Tier 4: Real-World Scenarios**
  End-to-end simulated match flows:
  - Scenario 1: Complete Khởi động individual & shared turns with lighting & buzzer cycles.
  - Scenario 2: VCNV row selection, 2.5s lighting delay, fastest bell lock, correct answer reveal, and return to blue.
  - Scenario 3: Tăng tốc 4-question pipeline with rapid submissions, countdown transitions, and ranking reveals.
  - Scenario 4: Về đích tactical turn, hope star activation, steal buzz reaction, and score resolution.
  - Scenario 5: Full tournament victory ceremony, camera pan to Laurel wreath vitrine, and golden lighting presentation.

---

## 2. Feature Inventory Mapping

| Feature ID | Feature Name | Requirement Ref | Test Tier | Test Case Scope |
|------------|--------------|-----------------|-----------|-----------------|
| **F1** | Brand Asset & Media Setup | R1, R4, AC | Tier 1, Tier 2 | `public/olympia/Olympia_logo_2016.webp` presence, format integrity, no modification/deletion outside project dir (R4). |
| **F2** | Central LED Screen & Typography | R1, AC | Tier 1, Tier 2 | 16:9 aspect ratio (`12.0m x 6.75m`), titanium frame, gold neon trim, gradient text "ĐƯỜNG LÊN ĐỈNH OLYMPIA" specification. |
| **F3** | Studio Staging & Podiums Geometry | R1, AC | Tier 1, Tier 2 | 1 MC podium (`[-4.5, 0, -2.0]`, 40° inward), 4 contestant podiums (`X: [-1.8, 0, 1.8, 3.6]`, `Z: [-2.5..-3.1]`), Laurel wreath vitrine (`[-2.4, 0, -4.8]`). |
| **F4** | Staggered Lighting & Round Automation | R2, AC | Tier 1, Tier 2, Tier 3, Tier 4 | Base Blue (`#0a2663`) vs Competition Red (`#d90429`); Khởi động start/finish; VCNV & Tăng tốc 2.5s delay; Về đích onStage/finish; 3-zone staggered fade ($t=0.0s, 0.5s, 0.7s$). |
| **F5** | Buzzer Reaction Logic & Visual FX | R3, AC | Tier 1, Tier 2, Tier 3, Tier 4 | All-buzzer red glow for Khởi động / Về đích / Câu hỏi phụ; strictly fastest-only (`bells[0]`) red glow for VCNV; unlit subsequent buzzers. |
| **F6** | Camera Director & Responsive FOV | R1, AC | Tier 1, Tier 2, Tier 3 | 10 broadcast camera presets, responsive FOV auto-adaptation on portrait/ultrawide viewports, seamless camera switching. |
| **F7** | E2E Testing Suite & Integration | AC | Tier 1–4 | Automated execution via Node.js native assert, esbuild bundling, zero flakiness. |

---

## 3. Test Architecture & Runner Command

### Runner Infrastructure
Tests are written in TypeScript using native Node.js `node:assert/strict`. The suite is bundled with `esbuild` for instantaneous compilation without requiring heavyweight browser harnesses for state and mathematical verification.

### Runner Command
```bash
# Direct runner execution:
esbuild src/lib/olympia/olympia-3d-suite.test.ts --bundle --platform=node --target=node20 --outfile=scratch/olympia-3d-test.cjs && node scratch/olympia-3d-test.cjs

# Or via npm script (when added to package.json):
npm run test:olympia-3d
```

### Execution Characteristics
- **Bundle Time**: < 100ms
- **Execution Time**: < 150ms
- **External Dependencies**: None (Zero network calls, zero browser driver flakiness)
- **Output**: Clean colorized TAP-style assertion log with categorized tier summaries.

---

## 4. Coverage Thresholds & Quality Gates

| Metric | Target Threshold | Minimum Acceptable |
|--------|------------------|-------------------|
| **Tier 1 Tests (Feature Coverage)** | $\ge 35$ tests | 35 tests |
| **Tier 2 Tests (Boundary & Corner Cases)** | $\ge 35$ tests | 35 tests |
| **Tier 3 Tests (Cross-Feature Combinations)** | $\ge 7$ tests | 7 tests |
| **Tier 4 Tests (Real-World Match Scenarios)** | $\ge 5$ tests | 5 tests |
| **Total Test Count** | $\ge 82$ tests | 82 tests |
| **Pass Rate** | 100% | 100% |
| **Timer Boundary Precision** | Exact 1ms (2499ms vs 2500ms) | Verified |
| **Fade Delay Offset Precision** | Exact 0.0s, 0.5s, 0.7s | Verified |
| **Safety Constraint (R4)** | 0 deletions outside `d:\Timeout Quiz` | Enforced |
