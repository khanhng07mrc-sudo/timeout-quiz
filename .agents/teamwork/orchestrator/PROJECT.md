# Project: Đường lên đỉnh Olympia S14 Broadcast Studio Refactoring

## Architecture
- **Environment**: Next.js 14, React Three Fiber, Three.js, Tailwind CSS, TypeScript.
- **Scene Hierarchy**:
  - `OlympiaStudio3DScene.tsx`: Main canvas manager, ambient atmosphere, round state props.
  - `StudioLighting.tsx`: Lighting rigs, studio trusses, grandstand amphitheater, cyclorama backdrop, 4-layer portal arches, mountain landscape, and sponsor fixtures.
  - `CentralLedWall.tsx`: Front stage hexagonal tunnel portal, 16:9 stage right screen, formula wall.
  - `CameraController.tsx`: Studio broadcast camera orbits and presets (Cam 1–13).
  - `AudienceAmphitheater`: Tiered audience seating grandstand ($Z = 0$ to $3.4\text{m}$, top landing plinth at $Z = 3.4\text{m}$ to $5.16\text{m}$), holding:
    - Cylindrical curved cyclorama at apex $Z = 5.20\text{m}$, center $Z_c = -17.30\text{m}$, radius $R = 22.50\text{m}$, height $8.50\text{m}$, span $84^\circ$.
    - Procedural 3D low-poly mountain landscape `StudioMountainLandscape` at plinth base $Y = 1.96\text{m}$, $Z = 4.60\text{m}$.
    - Concentric 4-layer portal arches at $Z = 3.60\text{m} - 3.66\text{m}$.
    - Anchored Quizorra lightbox and Olympia medallion with vertical structural steel columns grounded on the top plinth deck at $Y = 1.97\text{m}$.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1. Cylindrical Cyclorama (R1) | True curved cylindrical cyclorama ($R=22.5\text{m}, \text{span}=84^\circ, H=8.5\text{m}, Z_{\text{apex}}=5.20\text{m}$) replacing flat wall, enclosing audience with curved neon trims. | M1 | Survey E1 |
| 2 | F2. Sapphire Sunset Sky & Symbols (R1) | Sapphire sunset cosmic sky texture with 8 subtle scholarship symbols (~16% opacity watermark) and star constellation filaments. | M1 | Survey E1 |
| 3 | F3. 4-Layer Portal Arches (R5) | Concentric arches: Arc 1 warm ivory (width $0.22\text{m}$), Arc 2 dark spacer (width $0.08\text{m}$), Arc 3 glossy black lacquer (width $0.38\text{m}$, largest), Arc 4 warm ivory reaching $5.20\text{m}$ (tallest, $\theta_{\text{top}}=40^\circ$). | M1 | Survey E1 |
| 4 | F4. 3D Rugged Digital Mountain (R3) | Procedural 3D low-poly crystalline mountain `StudioMountainLandscape` at $Z=4.60\text{m}, Y=1.96\text{m}$, sharp chiaroscuro shading, `EdgesGeometry` wireframe, and constellation vertex nodes. | M2 | Survey E2 |
| 5 | F5. Luminous Canyon Pass (R2) | Organic S-curve recessed canyon pass with feathered alpha gradient shader (zero hard lines, zero ice tent/waterfall cave hole defect). | M2 | Survey E2 |
| 6 | F6. Summit Beacon & Victory Flag (R4) | Lighthouse beacon tower with soft multi-tier gaussian bloom halo, slender silver flagpole, and translucent cyan/white pennant ("lá cờ chìm") waving right; real-time summit point light. | M2 | Survey E3 |
| 7 | F7. Anchored Stanchion Legs (R6) | Continuous plinth deck at $Y=1.97\text{m}$ with cyan neon bead; dual heavy structural steel columns with welded top brackets and bolted baseplates seated solidly on plinth for Quizorra and Olympia boards. | M3 | Survey E3 |
| 8 | F8. Cam 13 & Verification Pipeline | Cam 13 preset in `CameraController.tsx` + automated multi-angle screenshot capture script `scratch/verify_backdrop_and_fixtures.js` for Cam 11, 12, 3, 13 at $1920\times 1080$. | M3 | Survey E3 |
| 9 | F9. Regression Guard & File Safety (R7) | Maintain 100% pass on 3D test suite (`npm run test:olympia-3d`), zero file deletion outside project, preserve existing project assets. | M4 | Survey E3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backdrop Cyclorama & 4-Layer Arches | F1, F2, F3 in `StudioLighting.tsx` | None | DONE |
| M2 | Mountain Landscape, Canyon & Beacon/Flag | F4, F5, F6 in `StudioLighting.tsx` | M1 | DONE |
| M3 | Anchored Stanchions, Cam 13 & Pipeline | F7, F8 in `StudioLighting.tsx`, `CameraController.tsx`, `scratch/` | M1, M2 | DONE |
| M4 | E2E Tests, Visual Capture & Final Gate | F9 in test suite, visual capture execution & comparison vs ref | M1, M2, M3 | DONE |

## Interface Contracts
### Cyclorama ↔ Amphitheater
- Placement: Cylinder origin at $(0, 4.05, -17.30)$, radius $22.50\text{m}$.
- Apex touches $Z = 5.20\text{m}$, flanks wrap forward to $Z = -0.58\text{m}$ at $X = \pm 15.06\text{m}$.
- Neon trims: Top at $Y = 8.28\text{m}$, Base at $Y = -0.18\text{m}$.

### Portal Arches ↔ Mountain Framing
- Arc 4 top tips: $X = \pm 0.763\text{m}$, $Y = 5.191\text{m} \approx 5.20\text{m}$ (gap $1.526\text{m}$).
- Mountain apex: $X = 0.00\text{m}$, $Y = 4.38\text{m}$ (world $Y = 1.96 + 2.42 = 4.38\text{m}$).
- Beacon tower sits at $Y = 4.38\text{m} - 4.65\text{m}$, flagpole rises to $Y = 4.96\text{m}$, directly framed within the Arc 4 crown opening.

### Plinth ↔ Logo Stanchions
- Plinth top deck: $Y = 1.97\text{m}$, $Z \in [3.38\text{m}, 5.16\text{m}]$, width $13.2\text{m}$ ($X \in [-6.6\text{m}, +6.6\text{m}]$).
- Quizorra stanchion bases: $X = 3.35\text{m}$ and $4.85\text{m}$, baseplate bottom at $Y = 1.97\text{m}$.
- Olympia medallion stanchion bases: $X = -4.55\text{m}$ and $-3.65\text{m}$, baseplate bottom at $Y = 1.97\text{m}$.

## Code Layout
- `src/components/olympia/studio/StudioLighting.tsx`: Cyclorama, Arches, MountainLandscape, Summit Beacon & Flag, Plinth & Stanchions.
- `src/components/olympia/studio/CameraController.tsx`: Camera presets (Cam 1–13).
- `src/lib/olympia/olympia-3d-suite.test.ts`: Automated test assertions (171/171 passing).
- `scratch/verify_backdrop_and_fixtures.js`: Automated visual capture script.
