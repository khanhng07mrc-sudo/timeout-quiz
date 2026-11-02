# Test Infrastructure: 3D Đường lên đỉnh Olympia Studio Set (Broadcast Refactoring Edition)

## 1. Test Philosophy & Methodology

The 3D Đường lên đỉnh Olympia Studio Set testing infrastructure follows an **opaque-box, requirement-driven, contract-based verification methodology**. 

Because Three.js / WebGL rendering environments in Next.js/React 19 involve client-side canvas rendering, time-sensitive broadcast show automation, procedural 3D geometries, and architectural broadcast stage fixtures, testing is architected into complementary layers:
1. **Contract & State Automation Oracles**: High-speed, deterministic headless evaluation of all lighting triggers, multi-zone staggered fades, buzzer reactions, and camera math against formal interface contracts.
2. **Procedural Geometry, Material & Coordinate Invariants**: Mathematical verification of physical layout specifications (curved cylindrical cyclorama, 4-layer concentric portal arches, procedural 3D low-poly mountain, feathered luminous canyon shader, summit beacon lantern tower & translucent flag, continuous plinth deck and structural steel stanchions).
3. **Automated Implementation Conformance Audit**: Static inspection of `StudioLighting.tsx` and `CameraController.tsx` to detect and escalate implementation defects to the worker agent.

---

## 2. 4-Tier Test Classification

### Tier 1: Feature Coverage (Core Functional Requirements)
- **Baseline Studio Set (41 tests)**: Khởi động, VCNV, Tăng tốc, Về đích, Câu hỏi phụ lighting triggers and buzzer glow rules; 3-zone staggered fade; brand assets and stage podium coordinates.
- **Studio S14 Refactor (36 tests)**:
  - **R1 (Cyclorama)**: Radius ($22.5\text{m} \pm 0.5\text{m}$), span ($84^\circ \pm 4^\circ$), height ($8.5\text{m}$), apex at $Z = 5.20\text{m}$, flank wrap forward to $Z \approx -0.58\text{m}$ at $X = \pm 15.06\text{m}$, top neon at $Y = 8.28\text{m}$, base neon at $Y = -0.18\text{m}$, 8 scholarship symbols with watermark opacity $\le 25\%$.
  - **R2 (Canyon Pass)**: S-curve trajectory recessed in Z, organic narrowing ($0.65\text{m} \to 0.16\text{m}$ monotonic width decrease), feathered alpha shader falloff reaching strictly 0.0 at lateral boundaries.
  - **R3 (3D Mountain)**: World base at $Y = 1.96\text{m}, Z = 4.60\text{m}$; pinnacle apex at World $Y = 4.38\text{m}$; at least 6 secondary peaks across asymmetric flanks; chiaroscuro normal facet classification; `EdgesGeometry` wireframe at $15^\circ$.
  - **R4 (Summit Beacon & Flag)**: Lantern tower ($Y = 4.38\text{m} - 4.65\text{m}$); 4-tier radial bloom halo ($16\text{px}, 36\text{px}, 64\text{px}, 96\text{px}$); slender silver flagpole ($Y = 4.93\text{m}$); translucent pennant flag ("lá cờ chìm", opacity $\le 60\%$, waving $+X$); summit point light ($Y \ge 4.60\text{m}$, intensity $\ge 25$).
  - **R5 (4-Layer Portal Arches)**: Arc 3 widest pylon ($\ge 0.36\text{m}$), glossy black lacquer (roughness $\le 0.10$); Arc 4 tallest arch ($Y \ge 5.15\text{m}-5.20\text{m}$, $\theta_{\text{top}} \ge 39^\circ$); Arc 2 smallest spacer ($\le 0.10\text{m}$, roughness $\ge 0.80$); Arc 1 warm ivory lightbox ($\approx 0.22\text{m}$); extrude depth hierarchy.
  - **R6 (Anchored Stanchions)**: Plinth top landing deck at $Y = 1.97\text{m}$ with cyan neon trim; dual steel columns for Quizorra ($X = 3.35\text{m}, 4.85\text{m}$) and Olympia medallion ($X = -4.55\text{m}, -3.65\text{m}$) with baseplates at $Y = 1.97\text{m}$; zero mid-air floating gap ($\le 0.01\text{m}$).

### Tier 2: Boundary & Corner Cases (68 tests)
- Exact 1ms timer thresholds (2499ms vs 2500ms delay in VCNV/Tăng tốc); negative elapsed timers; invalid contestant seat indices (-1, 4, 8, NaN); null/undefined state safety; non-standard aspect ratios (1:1, 4:3, 9:16 vertical, 21:9 ultrawide) for FOV adaptation.
- Cyclorama radius bounds ($22.0\text{m}$ to $23.0\text{m}$), span bounds ($80^\circ$ to $88^\circ$), UV coordinate bounds ($v=0$ to $1$).
- Canyon shader falloff at clamped/out-of-bounds UVs, intermediate feathering shoulder ($u=0.08$), elevation clamping at negative/extreme heights.
- Arc 4 angle bounds ($39^\circ$ to $41^\circ$), Arc 3 width lower bound ($0.36\text{m}$), Arc 3 lacquer roughness cutoff ($0.10$ vs $0.11$).
- Stanchion grounding contact tolerance ($0.005\text{m}$ pass vs $0.015\text{m}$ fail).
- Pennant flag opacity bounds ($\le 60\%$ pass vs $75\%$ fail), summit point light elevation bounds ($Y \ge 4.60\text{m}$ pass vs legacy $4.00\text{m}$ fail).

### Tier 3: Cross-Feature Combinations (16 tests)
- Simultaneous round phase swaps with buzzer locks and camera movements.
- **Framing Invariant**: Mountain summit apex ($Y = 4.38\text{m}$) and flagpole ($Y = 4.93\text{m}$) framed cleanly within the Arc 4 crown opening ($Y = 5.191\text{m}$, aperture $1.526\text{m}$, clearance $>0.25\text{m}$).
- **Stanchion & Plinth Interlock**: Stanchion columns strictly within plinth width ($X \in [-6.6\text{m}, +6.6\text{m}]$) and depth ($Z \in [3.38\text{m}, 5.16\text{m}]$).
- **Depth Monotonicity**: Portal Arches ($Z = 3.65\text{m}$) < Mountain Landscape ($Z = 4.60\text{m}$) < Cyclorama Apex ($Z = 5.20\text{m}$) preventing z-fighting.
- **Cyclorama Clearance**: Cyclorama clears the plinth rear edge ($Z = 5.16\text{m}$) at full width.
- **Camera 11 Enclosure**: $84^\circ$ cyclorama arc span fully encloses Cam 11 horizontal field of view.
- **Camera 13 Panorama Alignment**: Cam 13 preset (`[0.0, 3.35, 6.20]` $\to$ `[0.0, 3.90, 13.55]`) focuses directly on portal arches and mountain summit.
- **Color Grading Harmony**: Coordinated palette across sapphire cosmic sky, warm ivory lightboxes, glossy black lacquer, cyan neon trims, and dark architectural steel.

### Tier 4: Real-World Scenarios (10 tests)
- **Scenarios 1–5 (Baseline)**: Full match flows across Khởi động, VCNV keyword race, Tăng tốc 4-question pipeline, Về đích hope star and steal, victory ceremony and Laurel wreath presentation.
- **Scenarios 6–10 (Broadcast Refactor)**:
  - Scenario 1: Cam 11 Audience & Mountain Backdrop Broadcast View.
  - Scenario 2: Cam 12 High-Angle Grandstand Shot Enclosure.
  - Scenario 3: Cam 13 / Portal Summit Focus Shot (Beacon, Flag & Canyon).
  - Scenario 4: Sponsor Branding & Olympia Medallion Rigidity & Visibility.
  - Scenario 5: Studio Refactor Regression Guard & R7 Safety Integrity.

---

## 3. Test Inventory & Coverage Thresholds

| Metric | Baseline Target | Refactor Target | Grand Total Target | Minimum Acceptable | Actual Verified | Status |
|--------|-----------------|-----------------|--------------------|-------------------|-----------------|--------|
| **Tier 1 (Feature Coverage)** | $\ge 35$ | $\ge 35$ | $\ge 70$ | 70 tests | **77 / 77** | **100% PASS** |
| **Tier 2 (Boundary & Corner Cases)** | $\ge 35$ | $\ge 25$ | $\ge 60$ | 60 tests | **68 / 68** | **100% PASS** |
| **Tier 3 (Cross-Feature Combos)** | $\ge 7$ | $\ge 7$ | $\ge 14$ | 14 tests | **16 / 16** | **100% PASS** |
| **Tier 4 (Real-World Scenarios)** | $\ge 5$ | $\ge 5$ | $\ge 10$ | 10 tests | **10 / 10** | **100% PASS** |
| **Grand Total Tests** | **97** | **74** | **171** | **154 tests** | **171 / 171** | **100% PASS** |
| **Pass Rate** | 100% | 100% | 100% | 100% | **100%** | **CLEAN** |

---

## 4. Test Execution Commands

### Consolidated Suite (Official Verification Script)
```powershell
cd "d:\Timeout Quiz"
npm run test:olympia-3d
```
*Executes both the Baseline Game Engine Suite (97 tests) and the S14 Studio Refactor Suite (74 tests) in under 200ms.*

### Standalone Studio Refactor Suite
```powershell
cd "d:\Timeout Quiz"
npx esbuild src/lib/olympia/olympia-studio-refactor.test.ts --bundle --platform=node --target=node20 --outfile=scratch/olympia-studio-refactor-test.cjs; node scratch/olympia-studio-refactor-test.cjs
```

---

## 5. Implementation Audit Integration

The refactor test runner includes an automated static analysis oracle inspecting `StudioLighting.tsx` and `CameraController.tsx`. As workers implement milestones M1, M2, and M3, the audit dynamically tracks progress and alerts the team to remaining refactoring tasks.
