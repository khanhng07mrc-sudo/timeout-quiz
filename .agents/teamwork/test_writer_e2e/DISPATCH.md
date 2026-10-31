## 2026-10-31T01:45:39Z
You are teamwork_test_writer for the E2E Testing Track.
Your working directory is: d:\Timeout Quiz\.agents\teamwork\test_writer_e2e\
Original request path: d:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md
Project architecture & features path: d:\Timeout Quiz\.agents\teamwork\orchestrator\PROJECT.md

You MUST read d:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md and d:\Timeout Quiz\.agents\teamwork\orchestrator\PROJECT.md before starting work.

Your task:
Establish the E2E Testing Track for the 3D Đường lên đỉnh Olympia Studio Set environment.
1. Create `TEST_INFRA.md` in `d:\Timeout Quiz\.agents\teamwork\orchestrator\TEST_INFRA.md` following the template in the Project Pattern:
   - Test philosophy (opaque-box, requirement-driven, 4-tier methodology)
   - Feature Inventory mapping
   - Test architecture & runner command
   - Coverage thresholds
2. Author the comprehensive test suite in `d:\Timeout Quiz\src\lib\olympia\olympia-3d-suite.test.ts`:
   - Structure tests across 4 Tiers:
     * Tier 1 (Feature Coverage, >=35 tests): Verify all lighting triggers (Khởi động start -> red, finish -> blue; VCNV & Tăng tốc 2.5s delay; Về đích onStage -> red, finish -> blue); Buzzer reaction rules (Khởi động/Về đích/Phụ -> any buzzer glows; VCNV -> strictly fastest/bells[0] glows red, subsequent bells do not glow); Staggered multi-zone fade offsets (Screen t=0s, Stage t=0.5s, Audience t=0.7s); Brand asset presence & WebP metadata; Podium & vitrine layout coordinates.
     * Tier 2 (Boundary & Corner Cases, >=35 tests): Timers at 2499ms vs 2500ms; empty bells; multiple buzzers with identical timestamps; rapid state changes; seatId boundaries (0..3 vs invalid); null/undefined sub-states; FOV adaptation on non-16:9 viewports.
     * Tier 3 (Cross-Feature Combinations, >=7 tests): Pairwise interactions between round transitions, buzzer locks, camera switching, and lighting modes.
     * Tier 4 (Real-World Scenarios, >=5 tests): Full round-by-round match workflows from Khởi động through VCNV, Tăng tốc, Về đích, and Laurel wreath victory presentation.
   - Ensure the test runner can execute cleanly (e.g., using `npx tsx src/lib/olympia/olympia-3d-suite.test.ts` or `esbuild` script matching the project convention in package.json).
3. Once the test suite is created and verified runnable against the interface contract, publish `TEST_READY.md` in `d:\Timeout Quiz\TEST_READY.md` (and a copy in `d:\Timeout Quiz\.agents\teamwork\orchestrator\TEST_READY.md`).
4. Output your progress in your `progress.md` and complete with `handoff.md`.
Send a completion message back when done.
