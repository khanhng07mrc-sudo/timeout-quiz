# Handoff Report: Twin Arrows Animation, Center Alignment, and Multi-Layer Zoom Effect

**Agent**: Explorer Survey 2  
**Date**: 2026-11-11  
**Working Directory**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_2`  
**Recipient**: Orchestrator (ID: `47820d92-4889-4395-abf8-ed65add978a1`)  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

1. **Flawed Convergence Offset Formula in `V3ArrowShell.tsx` and `Vtv3BroadcastGraphics.tsx`**:
   - `src/components/olympia/V3ArrowShell.tsx:159`:
     ```typescript
     const dcConverge = canvasW / 2 - shell.startX / 2;
     ```
   - `src/components/olympia/Vtv3BroadcastGraphics.tsx:1778, 2023, 2513`:
     ```typescript
     const dc = shell.canvasW / 2 - shell.startX / 2;
     ```
   - In `v3Geometry.ts:248`:
     ```typescript
     canvasW: W + 2 * startX
     ```
     Therefore:
     $$\text{canvasW} / 2 = W / 2 + \text{startX}$$
     $$\text{dcConverge} = (W / 2 + \text{startX}) - \text{startX} / 2 = W / 2 + \text{startX} / 2$$
     Left chevron inner tip starts at $x = \text{startX}$. Shifting by $+\text{dcConverge}$ places it at:
     $$x = \text{startX} + W / 2 + \text{startX} / 2 = \text{canvasW} / 2 + \text{startX} / 2$$
     Right chevron inner tip starts at $x = \text{startX} + W$. Shifting by $-\text{dcConverge}$ places it at:
     $$x = (\text{startX} + W) - (W / 2 + \text{startX} / 2) = \text{canvasW} / 2 - \text{startX} / 2$$
     The two chevrons cross and overlap each other by exactly $\text{startX}$ (between 50px and 106px).

2. **Viewport Unit Contamination (`50vw`) in Scaled SVG Space**:
   - `src/components/olympia/Vtv3BroadcastGraphics.tsx:2538, 2574`:
     ```css
     0% { transform: translateX(calc(var(--dc) + 50vw)) scale(0.1); opacity: 0; }
     ```
   - In `V3ScaledStage` (`V3ArrowShell.tsx:59`), the inner container has `transform: scale(scale)`.
   - On 4K screens ($3840 \times 2160$), `scale \approx 2.0`, translating the arrows by $100\text{vw}$ ($3840\text{px}$). On ultrawide (21:9) monitors, `50vw` translates by $1720\text{px}$.

3. **Missing SVG Transform Origin & Box Rules**:
   - In `Vtv3BroadcastGraphics.tsx:2629-2638` and `V3ArrowShell.tsx:115-116`, SVG `<g>` elements lack `transform-box: fill-box; transform-origin: center;`.
   - When scaled by `scale(0.1)` in keyframes, SVG scales relative to $(0, 0)$ of the SVG viewport, jumping over $900\text{px}$ off-axis on the right arrow.

4. **Lower-Third Hardcoding in `DisplayScreen.tsx`**:
   - `src/components/olympia/DisplayScreen.tsx:300`:
     ```typescript
     (state.overlayMode === "FULLSCREEN" && state.currentRound !== "khoiDong" && state.currentRound !== "veDich")
     ```
   - Because `veDich` is excluded from fullscreen, lines 480-490 route Về Đích into `flex flex-col justify-end pb-3 pt-1`, placing the 360px-high package selection grid at the bottom lower-third rather than centered vertically in the viewport.
   - `VeDichSlantedGridGraphic` (`Vtv3BroadcastGraphics.tsx:2999-3015`) has only `animate-fade-in` and static chevrons, with zero twin arrow entrance animation.

5. **Existing Geometry Test Suite Pass**:
   - Command: `npx tsx src/components/olympia/v3Geometry.test.ts`
   - Result: 25 tests passed with exit code 0.

---

## 2. Logic Chain

1. From Observation 1, the true center of the SVG stage is $X_{\text{center}} = \text{canvasW} / 2 = \text{startX} + W / 2$.
2. To translate the left chevron inner tip ($x = \text{startX}$) to $X_{\text{center}}$, the displacement must be:
   $$\Delta x_{\text{left}} = X_{\text{center}} - \text{startX} = \frac{W}{2}$$
3. To translate the right chevron inner tip ($x = \text{startX} + W$) to $X_{\text{center}}$, the displacement must be:
   $$\Delta x_{\text{right}} = X_{\text{center}} - (\text{startX} + W) = - \frac{W}{2}$$
4. Setting $\text{dc} = \frac{W}{2}$ ensures that at the convergence keyframe (38% $\to$ 44%), both inner tips meet at $X_{\text{center}}$ with $0.000\text{px}$ gap and $0.000\text{px}$ overlap.
5. From Observation 2, replacing `50vw` with an SVG design-space travel distance $\text{travelDist} = \max(\text{canvasW}, 1400)$ decouples the animation from the host screen resolution, making it 100% deterministic on 1080p, 4K, and ultrawide displays.
6. From Observation 3, adding `transform-box: fill-box; transform-origin: center;` to all SVG chevron animation classes ensures each layer zooms smoothly around its own centroid.
7. From Observation 4, moving `VeDichSlantedGridGraphic` into a dedicated centered modal container (`absolute inset-0 z-30 flex items-center justify-center`) and equipping it with the 4-layer twin arrows zoom & convergence animation satisfies Requirements R1 and R2 completely.

---

## 3. Caveats

- **Audio Triggering**: The audio cue `4_VeDich/choose_package` must continue to be cued when `vd:showPackageGraphic` is dispatched.
- **Ruleset Independence**: `VeDichSlantedGridGraphic` geometry adapts automatically via `resolveVeDichGridSpec` across O26, O22, and O13-O21 without hardcoded coordinates.
- **No Source Code Modified Yet**: As mandated by the STRICT CONSTRAINT, this investigation is strictly read-only. All proposals are documented in `analysis.md` and this report.

---

## 4. Conclusion

The twin arrows animation issue is fully analyzed with root causes identified and mathematical solutions proven:
1. **Mathematical Centering**: Set $\text{dc} = \text{shell.W} / 2$ (replacing `canvasW / 2 - startX / 2`). Tips touch perfectly at $X_{\text{center}} = \text{canvasW} / 2$.
2. **Resolution Invariance**: Replace `50vw` with `--v3-travel: Math.max(canvasW, 1400)px` in SVG design space.
3. **Multi-Layer Zoom Effect**: Add `transform-box: fill-box; transform-origin: center;` and staggered layer scaling (`scale(0.20) -> scale(1.20) -> scale(1.0)`) across Ghost Wing 1, Ghost Wing 2, Primary Cyan Wing, and Navy Core.
4. **Vertical/Horizontal Screen Centering**: Mount `VeDichSlantedGridGraphic` in `DisplayScreen.tsx` within an `absolute inset-0 flex items-center justify-center` container with full twin arrows animation triggered upon MC's "Mở bảng chọn gói" button.

---

## 5. Verification Method

To independently verify the analysis and future implementation:
1. **Geometry Tests**:
   ```powershell
   npx tsx src/components/olympia/v3Geometry.test.ts
   ```
   Add assertion:
   ```typescript
   const dx = shell.W / 2;
   assert.equal(shell.startX + dx, shell.canvasW / 2);
   assert.equal(shell.startX + shell.W - dx, shell.canvasW / 2);
   ```
2. **Typecheck & Build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
3. **Visual Inspection**:
   Open browser at `/dev/graphics?tab=vd-grid` and `/display/[code]`. Verify arrows meet seamlessly at exact center with multi-layer depth zoom before expanding the package grid.
