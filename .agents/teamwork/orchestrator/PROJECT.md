# Project: 3D Đường lên đỉnh Olympia Studio Set Environment for Timeout Quiz

## Architecture

The 3D Đường lên đỉnh Olympia Studio is an interactive, high-performance WebGL environment built using React Three Fiber (`@react-three/fiber` v9.8.2) and Three.js (v0.186.1) inside Next.js 16 (React 19). It inherits the broadcast-grade architectural patterns established in `WheelStudio3DScene.tsx` (Magic Wheel / CNKD studio).

### Core Components
1. **`OlympiaStudio3DScene.tsx`** (`src/components/olympia/OlympiaStudio3DScene.tsx`):
   - Root 3D canvas and studio environment.
   - R3F Canvas with responsive camera controller (10 broadcast camera presets, 0ms hard cut, smooth jib transitions, FOV auto-adaptation).
   - Studio floor with dark high-specular PBR epoxy finish and glowing ring tracks.
   - Dual-track lighting rig: Ambient, Directional Key, Shadow Spotlight, Specular Downlight, Wash Spots, Rim Lights.
   - 3-Cluster Staggered Lighting Controller (Screen Zone -> Stage Back Zone -> Audience Zone).
2. **Studio Staging & Podiums**:
   - **Central LED Wall**: 16:9 (`12.0m x 6.75m`), titanium framing, gold neon trim, tiered pedestal. Dynamic HTML5 CanvasTexture rendering the official Olympia 2016 WebP logo and golden light-to-dark gradient text "ĐƯỜNG LÊN ĐỈNH OLYMPIA".
   - **1 MC Podium**: Independent lectern at Stage Left (`X = -4.5m, Z = -2.0m`), angled 40° inward, with microphone, cue card, and dedicated key spotlight.
   - **4 Contestant Podiums**: Curved arc array (`X = -1.8m, 0.0m, +1.8m, +3.6m`, `Z = -2.5m` to `-3.1m`), featuring individual score screens, touch tablets, and chrome dome buzzers.
   - **Laurel Wreath (Vòng nguyệt quế) Showcase**: Dedicated vitrine at Stage Left-Center (`X = -2.4m, Z = -4.8m`), octagonal marble pedestal, velvet pillow, crystal cloche, rotating golden laurel wreath mesh, and focused overhead spotlight.
3. **Lighting Automation & Multi-Zone Fade Engine**:
   - Master State: Sapphire Blue (`#0a2663`) base vs Fiery Red (`#d90429`) competition.
   - Staggered timing: Inner LED screen fades first ($t=0.0s$, duration $0.9s$), followed by Stage Back ($t=0.5s$, duration $1.2s$) and Audience amphitheater ($t=0.7s$, duration $1.2s$).
   - Round triggers:
     - Khởi động: Turns Red on `kd.started === true`; reverts to Blue on `kd:finishTurn` / segment finish.
     - VCNV & Tăng tốc: Turns Red after 2.5s timer running delay; reverts to Blue upon answer reveal / grid return.
     - Về đích: Turns Red on contestant `onStage` / package selection through turn finish; reverts to Blue on finish.
4. **Contestant Buzzer Reaction System**:
   - Chrome base with dome button, scaling $1.15\times$, red emissive intensity 9.0, dual pointLights (intensity 14.0/10.0), and desk halo.
   - Khởi động, Về đích, Câu hỏi phụ: Any buzzed seat lights up Red.
   - Vượt chướng ngại vật: Strictly the fastest buzzer (`v.bells[0]?.seat === seatId`) lights up Red. Subsequent buzzers remain unlit.
5. **UI & Sound Integration**:
   - Seamless toggle and embedding in `src/components/olympia/DisplayScreen.tsx` with dynamic import (`ssr: false`).
   - Integrated camera selector bar, PTZ orbit controls, and audio cue synchronization.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Brand Asset & Media Setup | Copy `Olympia_logo_2016.webp` safely to `public/olympia/Olympia_logo_2016.webp` (R4 compliant). | M1 | R1, R4 |
| F2 | Central LED Screen & Typography | 16:9 central display with high contrast, Olympia 2016 logo, and yellow light-to-dark gradient text "ĐƯỜNG LÊN ĐỈNH OLYMPIA". | M2 | R1 |
| F3 | Studio Staging & Podiums Geometry | 1 MC podium, 4 Contestant arc podiums, floor epoxy & lighting ring tracks, and Laurel Wreath showcase pedestal. | M2 | R1 |
| F4 | Staggered Lighting & Round Automation | Blue base vs Red competition lighting with multi-zone staggered fade (screen first, stage & audience after) triggered by round states. | M3 | R2 |
| F5 | Buzzer Reaction Logic & Visual FX | Chrome dome buzzer FX; all-buzzer red glow for Khởi động/Về đích/Phụ vs fastest-only red glow for VCNV. | M3 | R3 |
| F6 | UI Integration & Camera Director Dock | Dynamic import into `DisplayScreen.tsx`, 3D toggle, 10 broadcast camera presets, and responsive FOV handling. | M4 | R1, AC |
| F7 | E2E Testing Suite & Visual Verification | Automated unit and integration verification for lighting transitions, buzzer contracts, and 3D scene rendering. | E2E | AC |

---

## Code Layout

- Implementation Files:
  - `src/components/olympia/OlympiaStudio3DScene.tsx` (Main 3D Scene entry point)
  - `src/components/olympia/studio/CentralLedWall.tsx` (Central LED display, logo & gradient text canvas)
  - `src/components/olympia/studio/Podiums.tsx` (1 MC podium, 4 Contestant podiums with buzzers)
  - `src/components/olympia/studio/LaurelWreathVitrine.tsx` (Laurel wreath pedestal & showcase)
  - `src/components/olympia/studio/StudioLighting.tsx` (Lighting rig & multi-zone staggered fade controller)
  - `src/components/olympia/studio/CameraController.tsx` (Broadcast camera presets & auto FOV)
  - `src/components/olympia/studio/useOlympiaLightingState.ts` (Lighting & buzzer state mapping hook)
  - `src/components/olympia/DisplayScreen.tsx` (Integration point for 3D studio toggle)
- Asset Files:
  - `public/olympia/Olympia_logo_2016.webp` (Copied from Downloads)
- Test Files:
  - `src/lib/olympia/olympia-3d-suite.test.ts` (Comprehensive 97-test 4-tier E2E test suite)
  - `src/lib/olympia/lighting-buzzer.test.ts` (Unit/integration test for lighting and buzzer rules)

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Asset Provisioning & Setup | Copy `Olympia_logo_2016.webp` to `public/olympia/` without touching Downloads (R4). Verify accessibility. | none | DONE |
| M2 | 3D Studio Architecture & Staging | Implement Central LED screen with logo & gradient text, 1 MC podium, 4 contestant podiums, and Laurel wreath vitrine. | M1 | DONE |
| M3 | Dynamic Lighting & Buzzer System | Implement Blue vs Red lighting transitions, multi-zone staggered fade, and round buzzer reaction logic. | M2 | DONE |
| M4 | UI Integration & Broadcast Cameras | Integrate 3D studio into `DisplayScreen.tsx`, add camera director dock, and responsive FOV handling. | M3 | DONE |
| M5 | Final E2E Verification & Audit | Execute automated test suite, visual walkthrough, audit verification, and finalize handoff. | M4, E2E | DONE |

---

## Interface Contracts

### Game State $\rightarrow$ 3D Studio Props Contract
```typescript
export interface OlympiaStudio3DSceneProps {
  state: OlympiaState;
  activeCamera?: string;
  onCameraChange?: (cam: string) => void;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  debugMode?: boolean;
}
```

### Lighting State Contract
```typescript
export type LightingMode = "BLUE" | "RED";

export interface StudioLightingState {
  targetMode: LightingMode;
  screenFadeProgress: number; // 0.0 (Blue) to 1.0 (Red), t_delay = 0.0s
  stageFadeProgress: number;  // 0.0 (Blue) to 1.0 (Red), t_delay = 0.5s
  audienceFadeProgress: number;// 0.0 (Blue) to 1.0 (Red), t_delay = 0.7s
}
```

### Buzzer Reaction Contract
```typescript
export function isSeatBuzzedIn3D(seatId: number, state: OlympiaState | null | undefined): boolean {
  if (!state) return false;
  switch (state.currentRound) {
    case "khoiDong":
      return state.khoiDong?.buzzedSeat === seatId;
    case "vcnv":
      // Strictly the fastest (first) bell rings red:
      return state.vcnv?.bells?.[0]?.seat === seatId;
    case "veDich":
      return state.veDich?.steal?.buzzedSeat === seatId;
    case "cauHoiPhu":
      return state.cauHoiPhu?.buzzedSeat === seatId;
    default:
      return false;
  }
}
```
