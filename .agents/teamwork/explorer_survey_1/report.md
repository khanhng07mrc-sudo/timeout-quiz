# Technical Analysis Report: 3D Studio Architecture & Olympia Studio Specification

- **Date**: 2026-10-31
- **Author**: `teamwork_explorer_survey_1`
- **Scope**: Reference 3D Studio in `WheelStudio3DScene.tsx` and Architectural Specification for Đường lên đỉnh Olympia 3D Studio Set (`OlympiaStudio3DScene.tsx`).

---

## 1. Executive Summary

This report delivers a comprehensive technical analysis of the 3D studio architecture implemented in `d:\Timeout Quiz\src\components\modes\WheelStudio3DScene.tsx` (the Magic Wheel / Chiếc Nón Kỳ Diệu broadcast studio) and provides the definitive technical blueprint for constructing the interactive 3D **Đường lên đỉnh Olympia** studio set (`OlympiaStudio3DScene.tsx`).

The architecture in `WheelStudio3DScene.tsx` is an exceptionally mature, high-performance broadcast-grade 3D environment built on **React Three Fiber (R3F) v9.8.2** and **Three.js v0.186.1**. It achieves 60 FPS performance without heavy external 3D model downloads (0 KB GLTF assets) by employing procedural parametric geometries, standard PBR materials, multi-point broadcast studio lighting, and dynamic 2D canvas textures with single-quad rendering.

By leveraging these exact patterns, the proposed Olympia 3D Studio Set will faithfully deliver:
1. **R1**: A grand central LED display with the authentic Olympia logo from `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` and golden gradient typography, 1 MC lectern, 4 contestant podiums with scoreboards, and an illuminated laurel wreath showcase.
2. **R2**: A multi-stage, staggered lighting transition engine (Cluster 1: Inner LED screen $\rightarrow$ Cluster 2: Stage backlights & LED cove $\rightarrow$ Cluster 3: Audience amphitheater & wall wash) smoothly fading between Blue (ambient/standby) and Red (in-round tension) according to round-specific rules.
3. **R3**: Round-aware buzzer reactions (Khởi động, Về đích, Câu hỏi phụ: any buzzer illuminates; Vượt chướng ngại vật: strictly the single fastest buzzer illuminates).
4. **R4**: Strict workspace integrity, leaving all external system files intact.

---

## 2. Core Three.js Ecosystem & Setup

### 2.1 Dependency Matrix (`package.json`)
The application operates on a modern, bleeding-edge React 19 + Next.js 16 stack:
- `"three": "^0.186.1"`
- `"@types/three": "^0.186.0"`
- `"@react-three/fiber": "^9.8.2"`
- `"@react-three/drei": "^10.7.9"`
- `"react": "19.2.8"` / `"react-dom": "19.2.8"`
- `"next": "16.3.7"`

### 2.2 Architectural Paradigm: Declarative R3F with Imperative Texture Pipelines
The reference architecture does **not** rely on vanilla Three.js in a raw `useEffect(canvasRef)` (as seen in lightweight transitions like `ArenaThreeScene.tsx`). Instead, it uses **React Three Fiber** declarative JSX components:
- Canvas Container: `<Canvas ...>` providing a WebGL context, camera manager, and render loop.
- Hooks: `useFrame` for frame-by-frame animations, physics, camera lerping, and canvas texture re-rendering; `useThree` for accessing the active camera, WebGL renderer, and viewport dimensions.
- Native Three.js Objects: Created via `useMemo` (e.g., `new THREE.CanvasTexture(canvas)`, `THREE.MathUtils`, `THREE.Color`) and passed as props to R3F elements.

### 2.3 Client-Side Next.js Wrapping
Because Three.js requires `window`, `document`, and WebGL contexts, all 3D scenes are marked with `"use client";` at the top and imported dynamically with Server-Side Rendering disabled:
```tsx
const WheelStudio3DScene = dynamic(() => import("./WheelStudio3DScene"), { ssr: false });
```
The same pattern must be applied for `OlympiaStudio3DScene.tsx`.

---

## 3. Detailed Analysis of `WheelStudio3DScene.tsx`

`WheelStudio3DScene.tsx` spans 5,079 lines of robust, battle-tested code. Below is the breakdown of its core systems.

### 3.1 Studio Architecture & Component Tree
The 3D studio is organized into clear architectural layers:
```text
WheelStudio3DSceneComponent (Canvas wrapper, PTZ handlers, Quality state)
 ├── CameraController (Multi-director angles, Jib morph vs Hard cut, adaptive FOV, PTZ)
 ├── Broadcast 6-Point Studio Lighting (Ambient, Directional, Key Spotlight, Wash lights, Rim lights)
 ├── StudioCeilingRig (Overhead circular trusses & 8 softbox lights)
 ├── EnclosedStudioWalls (Acoustic wood slat walls, gold metal trim, cove wash lights)
 ├── StudioSetWingMotifs (Architectural floating segmented arc ribs & slats)
 ├── BackdropCurvedLedScreen (Huge 11.2m x 7.5m LED video wall with titanium bezel)
 ├── StudioFloor (70m x 70m dark epoxy floor, R=12m apron, R=10m raised deck, LED floor rings)
 ├── WheelMachineGroup (3D conical wheel, brass pins, cherry indicator needle)
 ├── DedicatedMcStation (Elevated MC podium, desk, cue card, gooseneck microphone, MC mannequin)
 ├── ElevatedContestantDaisBehindWheel (Arc arrangement, contestant desks, score screens, buzzers)
 ├── Studio3DPuzzleBoard (Left-wing crossword board, hostess runway)
 └── AudienceAmphitheaterVietnamese (6-tier amphitheater, Dong Son bronze drum, Hội An lanterns)
```

### 3.2 Geometry Generation (Procedural Parametric vs External Models)
- **Zero External Model Downloads**: The entire scene is constructed from Three.js parametric geometries:
  - `CylinderGeometry`: Stage decks, podium columns, microphone stems, spotlights.
  - `BoxGeometry`: Stage walls, acoustic slats, bezels, contestant desks, cue cards.
  - `RingGeometry`: LED floor borders, cove lighting halos.
  - `CircleGeometry`: Stage decks, bronze drum face.
  - `PlaneGeometry`: LED display screens, floor grids.
  - `TorusGeometry`: Ceiling trusses, buzzer domes, golden halos.
  - `SphereGeometry`: Buzzer buttons, lanterns, mannequin joints.
- **Benefits**: Instant zero-latency loading, zero CORS issues, 100% responsive procedural customization, and minimal bundle footprint.

### 3.3 PBR Materials & Shader Configuration
Standard PBR (`meshStandardMaterial`) is used throughout:
1. **Epoxy Polished Stage Floor**:
   - `color: "#080e1c"`, `roughness: 0.10`, `metalness: 0.90`, `emissive: "#030610"`, `emissiveIntensity: 0.25`
   - Yields a high-gloss reflective look without real-time mirror render passes.
2. **Gold Brass & Chrome Hardware**:
   - Polished Gold: `color: "#fbbf24"`, `metalness: 0.95`, `roughness: 0.08`, `emissive: "#d97706"`, `emissiveIntensity: 1.2`
   - Chrome: `color: "#f8fafc"`, `metalness: 0.98`, `roughness: 0.03`
3. **Titanium Bezels & Dark Obsidian Metals**:
   - `color: "#0b1120"`, `metalness: 0.92`, `roughness: 0.20`
4. **Digital Displays & Neon Halos (`toneMapped={false}`)**:
   - For screens and neon trims, `meshBasicMaterial` with `toneMapped={false}` is crucial. By bypassing ACESFilmic tone mapping, the digital content maintains pure whites, radiant neon glows, and high TV contrast without being desaturated or dimmed.

### 3.4 Procedural 2D Canvas Textures
Instead of thousands of 3D polygon letter meshes, digital text and UI screens are rendered to offscreen 2D HTML5 canvases:
1. `generatePodiumTexture(name, totalScore, roundScore, color, isTurn, edition, rank)`:
   - Dimensions: 1024 x 512.
   - Draws dynamic gradients, team avatar, player name in uppercase `Roboto Slab`, ranking badge, and giant 152px score numbers with golden drop glow.
   - Cached via `useMemo` and re-uploaded with `tex.needsUpdate = true` only when props mutate.
2. `renderVideoWallCanvas(ctx, t)`:
   - Dimensions: 1024 x 512.
   - Renders deep sapphire radial gradient, perspective floor grid, rotating volumetric light rays, concentric glowing arcs, and golden shimmer particles.
3. Typography loading:
   - Injects Google Fonts (`Roboto Slab:wght@700;800;900` & `Merriweather:wght@900`) dynamically into `<head>` to ensure crisp Vietnamese font rendering with proper diacritics.

### 3.5 Animation Loop (`useFrame`) & Performance Decoupling
- Animations are calculated inside `useFrame((state, delta) => ...)` using `delta` time for framerate independence.
- React state is **not** updated per-frame; instead, direct mutations to Three.js Object3D matrices, material colors, and canvas contexts are used to prevent re-rendering the React virtual DOM tree.

### 3.6 Broadcast Camera System (`CameraController`)
- **Camera Configurations**: 10 distinct TV broadcast angles (Master Wide, Center Stage, Close-up Player, Audience POV, etc.).
- **Hard Cut vs Morph**:
  - `CUT`: Instant 0ms broadcast vision mixer cut (`camera.position.set(...); camera.lookAt(...);`).
  - `MORPH`: Smooth crane/jib lerp (`camera.position.lerp(targetPos, delta * 4.2);`).
- **Adaptive Horizontal FOV**:
  When the viewport aspect ratio is narrower than 16:9 (tablets, mobile, square windows), `CameraController` recalculates the vertical FOV so the horizontal view of the stage is never cropped:
  $$\text{computedFOV} = 2 \cdot \arctan\left(\tan(\text{baseHRad} / 2) / \text{aspect}\right)$$
- **Bounded PTZ (Pan-Tilt-Zoom)**:
  Pointer drag events allow viewers to Pan (clamped to $\pm 25^\circ$), Tilt (clamped to $\pm 15^\circ$), and Zoom ($1.0\times$ to $2.5\times$), with double-click reset.

### 3.7 Performance Optimizations
1. **MeshReflectorMaterial Replacement**: Planar mirror reflections require rendering the entire scene twice per frame. Replacing them with high-metalness PBR floors improved framerate from ~30 FPS to rock-solid 60 FPS.
2. **Adaptive DPR (Device Pixel Ratio)**:
   - High: `[1, 1.5]`
   - Medium: `[1, 1.25]`
   - Low: `[1, 1.0]`
   This prevents high-resolution 4K/Retina displays from choking the GPU fillrate.
3. **Shadow Throttling**:
   - `shadows={quality === "HIGH"}`
   - Only 1 Key Spotlight casts shadows, with map size limited to $512 \times 512$ (or $256 \times 256$). Point lights do **not** cast shadows.
4. **Graphic Quality Switcher**: Persisted in `localStorage("wheel_3d_quality")` with automatic fallback for lower hardware concurrency ($\le 4$ cores).

---

## 4. Studio Lighting, Atmosphere & Color Transitions

### 4.1 6-Point Broadcast Studio Lighting Architecture
In `WheelStudio3DScene.tsx`, lighting is structured as follows:
- **Ambient Fill**: `<ambientLight intensity={3.2} color="#eff6ff" />` providing soft cool base visibility.
- **Top Directional Key**: `<directionalLight position={[0, 14, 6]} intensity={3.5} color="#dbeafe" />`.
- **Key Center Spotlight**: `<spotLight position={[0, 9.5, 4.0]} intensity={14.0} angle={0.75} penumbra={0.3} color="#ffffff" castShadow />`.
- **Floor Specular Downlight**: `<spotLight position={[0, 10.0, 1.5]} intensity={6.0} angle={0.9} penumbra={0.8} color="#fffdf0" />`.
- **Front Camera Fill**: `<spotLight position={[0, 5.0, 5.5]} intensity={7.0} angle={0.8} penumbra={0.5} color="#fffbeb" />`.
- **Stage Left & Right Wash Lights**: Two spotlights at $[\pm 5.0, 6.5, 2.5]$ with warm broadcast color `#fffbeb` and intensity 5.5.
- **Back Rim / Kicker Light**: `<pointLight position={[0, 4.5, -4.5]} color="#93c5fd" intensity={8.0} />` separating subjects from the background.
- **Under-Pedestal Uplights**: Golden uplights giving floating depth to the stage.

### 4.2 Local Accent Fixtures
- Cove rings along the walls and amphitheater tiers with high emissive intensity ($1.5 - 2.8$).
- Dedicated spotlights on the MC lectern and contestant podiums.
- Buzzer mechanical lights:
  - Red dome: `emissive="#ff0000"`, `emissiveIntensity={8.5}`.
  - Red point lights: `intensity={14.0}`, `distance={4.5}`, `decay={1.5}`.
  - Visible neon ground ring: `visible={isBuzzed}`.

---

## 5. Architectural Specification for Đường Lên Đỉnh Olympia Studio Set

Based on requirements R1, R2, R3, and R4 from `ORIGINAL_REQUEST.md`, here is the technical specification for `OlympiaStudio3DScene.tsx`.

```
====================================================================================================
                               OLYMPIA 3D STUDIO SPATIAL LAYOUT
====================================================================================================

                                 [Back Acoustic Slat Walls]
                                          Z = -8.5m
               +--------------------------------------------------------------+
               |                                                              |
               |                GRAND CENTRAL LED DISPLAY (12m x 5.5m)        |
               |               +-------------------------------+              |
               |               |   [OLYMPIA LOGO 2016 .webp]   |              |
               |               |  "ĐƯỜNG LÊN ĐỈNH OLYMPIA"     |              |
               |               |  (Golden Gradient Typography) |              |
               |               |  [Question / Media / Scores]  |              |
               |               +-------------------------------+              |
               |                                                              |
               +--------------------------------------------------------------+
                                          Z = -6.5m

 [LAUREL WREATH DISPLAY]                                                 [MC PODIUM]
   Glass Showcase &                                                    Lectern & Mic
   Golden Laurel Wreath                                                  X = +4.8m
      X = -4.8m                                                          Z = -1.8m
      Z = -1.8m          [SEAT 1]      [SEAT 2]      [SEAT 3]      [SEAT 4]
                        (X = -2.7m)   (X = -0.9m)   (X = +0.9m)   (X = +2.7m)
                        <-- 4 Contestant Podiums with Buzzer & Scores -->
                                          Z = -1.8m

              ===================================================================
                               CIRCULAR RAISED STAGE DECK (R = 8.5m)
                               Dark Epoxy Glass + Golden LED Rims
              ===================================================================
                                          Z = 0.0m

                                  [BROADCAST CAMERAS]
                                      Z = +5.0m to +7.0m

              ===================================================================
                             AUDIENCE AMPHITHEATER (6 TIERS, R = 14m - 20m)
              ===================================================================
                                      Z = +8.0m to +16.0m
====================================================================================================
```

### 5.1 Spatial Coordinates & Staging (R1)
1. **Central Stage Deck**:
   - Center at $(0, -0.75, 0)$.
   - Outer apron: $R = 10.5$m, thickness $0.05$m.
   - Raised circular deck: $R = 8.5$m, dark epoxy satin finish (`roughness: 0.10, metalness: 0.90`).
   - Concentric gold and blue LED floor trim rings.
2. **Central LED Screen**:
   - Position: $[0, 3.2, -6.5]$.
   - Dimensions: $12.0$m wide $\times 5.5$m high.
   - Single quad canvas texture ($1920 \times 1080$ or $1280 \times 720$).
   - Framed by a titanium bezel ($50$mm) with internal warm gold cove LED lights.
   - Tiered architectural base pedestal with obsidian glass and gold feet.
3. **Branding: Logo & Golden Gradient Text**:
   - Asset location: User provided `C:\Users\khanh\Downloads\Olympia_logo_2016.webp`.
   - Asset deployment: Copied to `d:\Timeout Quiz\public\brand\olympia\Olympia_logo_2016.webp` (to allow browser WebGL HTTP loading without sandbox access errors).
   - Canvas Header Render:
     - Central Olympia logo drawn via `ctx.drawImage(logoImg, cx - w/2, topY, w, h)`.
     - Underneath: 2D linear gradient `createLinearGradient(0, y1, 0, y2)` with stops:
       - `0.0`: `#fef08a` (bright radiant yellow)
       - `0.5`: `#f59e0b` (vibrant gold)
       - `1.0`: `#92400e` (rich amber bronze)
     - Typography: `900 56px "Roboto Slab", "Montserrat", sans-serif`, centered with crisp drop shadow.
4. **4 Contestant Podiums**:
   - Arranged in a gentle forward-facing arc at $Z = -1.8$m:
     - Seat 0 (Thí sinh 1): $X = -2.7$m, $rotY = 0.12$ rad.
     - Seat 1 (Thí sinh 2): $X = -0.9$m, $rotY = 0.04$ rad.
     - Seat 2 (Thí sinh 3): $X = +0.9$m, $rotY = -0.04$ rad.
     - Seat 3 (Thí sinh 4): $X = +2.7$m, $rotY = -0.12$ rad.
   - Each podium features:
     - Solid navy/titanium body with LED accent edge.
     - Digital score screen ($1024 \times 512$ canvas texture) displaying candidate name, current round score, and total score.
     - Chrome-plated mechanical bell buzzer with red translucent dome and button.
     - Red emission glow and top-down spotlight for buzzer activation.
     - Optional stylized 3D mannequin representing the contestant.
5. **1 MC Lectern**:
   - Positioned on Stage Right: $X = +4.8$m, $Z = -1.8$m, rotated $rotY = -0.65$ rad facing contestants and center stage.
   - Includes lectern body, tilted desk, cue card, chrome gooseneck microphone, and illuminated "MC" acrylic badge.
6. **Laurel Wreath Display Area (Khu vực trưng bày Vòng nguyệt quế)**:
   - Positioned on Stage Left (symmetrical to MC): $X = -4.8$m, $Z = -1.8$m, $rotY = 0.65$ rad.
   - Architecture:
     - High-gloss black marble / gold-trimmed hexagonal pedestal ($H = 1.1$m).
     - Transparent glass display cylinder or showcase cube ($H = 0.6$m, $opacity = 0.35$).
     - Royal red velvet display cushion (`roughness: 0.85, color: #881337`).
     - Procedural 3D Golden Laurel Wreath:
       A golden ring (`torusGeometry`) embellished with pairs of angled laurel leaf meshes (`coneGeometry` or `extrudeGeometry`), coated in ultra-lustrous 24K gold PBR material (`color: #ffd700, metalness: 0.96, roughness: 0.12, emissive: #b45309, emissiveIntensity: 0.4`).
     - Dedicated ceiling spotlight (`spotLight, position: [-4.8, 8.0, -1.8], intensity: 12.0, angle: 0.35, penumbra: 0.4, color: #ffffff`) generating brilliant specular glints on the golden leaves.

---

### 5.2 Staged Lighting Transition Engine (R2)

Requirement R2 mandates:
- Blue lighting for ambient/outside-round status.
- Red lighting during active competition.
- Staggered fade: **Inner screen fades first $\rightarrow$ Stage back & LED cove fade second $\rightarrow$ Audience area fades third**.

#### 5.2.1 Lighting Color Profiles
| Element / Cluster | BLUE State (Ambient/Standby) | RED State (In-Round Tension) |
|---|---|---|
| **Cluster 1: Inner LED Screen** | Sapphire Navy (`#061b42` to `#0a3a78`), cyan grid | Crimson Dark (`#3b0712` to `#881337`), red grid |
| **Cluster 1: Screen Bezel LED** | Cool Blue Cyan (`#38bdf8`, emissive `#0284c7`) | Intense Red (`#ef4444`, emissive `#dc2626`) |
| **Cluster 2: Stage Back Lights** | Royal Blue (`#1d4ed8`, intensity 6.0) | Fiery Red (`#dc2626`, intensity 8.5) |
| **Cluster 2: Stage LED Rings** | Warm Amber Gold & Cyan (`#fde047` / `#38bdf8`) | Hot Red & Deep Amber (`#ef4444` / `#f59e0b`) |
| **Cluster 2: Wing Spotlights** | Ice Blue Wash (`#dbeafe`, intensity 5.5) | Dramatic Scarlet (`#fca5a5`, intensity 7.0) |
| **Cluster 3: Audience Wash** | Deep Midnight Blue (`#0f172a`, intensity 7.0) | Dark Maroon Glow (`#450a0a`, intensity 8.5) |
| **Cluster 3: Wall Cove Strips** | Warm Amber Cove (`#fbbf24`, emissive 1.8) | Crimson Cove (`#ef4444`, emissive 2.2) |

#### 5.2.2 Staggered Transition Timing & Math
To create a broadcast-quality smooth transition without sudden flashes, the transition engine uses normalized time tracking inside `useFrame`:

```typescript
// Timing parameters (in seconds)
const STAGE_CONFIG = {
  CLUSTER_1_SCREEN: { delay: 0.00, duration: 0.70 },
  CLUSTER_2_STAGE:  { delay: 0.35, duration: 0.80 },
  CLUSTER_3_AUDIENCE:{ delay: 0.70, duration: 0.90 },
};

function getClusterProgress(elapsedSec: number, delay: number, duration: number): number {
  if (elapsedSec <= delay) return 0;
  if (elapsedSec >= delay + duration) return 1;
  const p = (elapsedSec - delay) / duration;
  // Cubic smoothstep easing: 3p^2 - 2p^3
  return p * p * (3 - 2 * p);
}
```

In `useFrame`, every light fixture and emissive material blends its color via `THREE.Color.lerp()`:
```typescript
const p1 = getClusterProgress(transitionElapsed, STAGE_CONFIG.CLUSTER_1_SCREEN.delay, STAGE_CONFIG.CLUSTER_1_SCREEN.duration);
const p2 = getClusterProgress(transitionElapsed, STAGE_CONFIG.CLUSTER_2_STAGE.delay, STAGE_CONFIG.CLUSTER_2_STAGE.duration);
const p3 = getClusterProgress(transitionElapsed, STAGE_CONFIG.CLUSTER_3_AUDIENCE.delay, STAGE_CONFIG.CLUSTER_3_AUDIENCE.duration);

// Blend cluster 1
screenBezelMat.color.lerpColors(BLUE_BEZEL, RED_BEZEL, isRedTarget ? p1 : 1 - p1);
// Blend cluster 2
stageBackLight.color.lerpColors(BLUE_LIGHT, RED_LIGHT, isRedTarget ? p2 : 1 - p2);
// Blend cluster 3
audienceWashLight.color.lerpColors(BLUE_AUDIENCE, RED_AUDIENCE, isRedTarget ? p3 : 1 - p3);
```

#### 5.2.3 Round-Specific Trigger Automations
- **Khởi động (Starting)**:
  - Trigger `targetState = "RED"` when contestant starts individual or communal round (e.g., `stage === "active"` or timer starts).
  - Trigger `targetState = "BLUE"` immediately when round/turn ends.
- **Vượt chướng ngại vật (VCNV) & Tăng tốc (Acceleration)**:
  - When the question starts, lighting remains **BLUE**.
  - A timer delay of **2.5 seconds** elapses $\rightarrow$ automatically triggers transition to **RED**.
  - Returns to **BLUE** when question finishes.
- **Về đích (Finish)**:
  - Transitions to **RED** from the moment the candidate steps onto the stage (starts their 3-question package).
  - Maintains **RED** throughout their questions and steal attempts.
  - Automatically transitions to **BLUE** when the turn concludes (`seatDone`).

---

### 5.3 Buzzer Reaction Engine (R3)

The buzzer reactions hook directly into the `OlympiaState` state machine from `src/lib/olympia/engine.ts`:

1. **Khởi động, Về đích, Câu hỏi phụ**:
   - Condition: Any contestant who presses the buzzer triggers their podium beacon.
   - State mapping:
     - Khởi động: `state.khoiDong.buzzedSeat === seat.id`
     - Về đích (Steal): `state.veDich.steal?.buzzedSeat === seat.id`
     - Câu hỏi phụ: `state.cauHoiPhu.buzzedSeat === seat.id`
   - Podium Action:
     - Buzzer dome scales up $1.15\times$, turns intense emissive red (`emissive="#ff0000"`, `emissiveIntensity={8.5}`).
     - Podium point light activates (`intensity={14.0}`, `color="#ff0000"`).
     - Overhead candidate spotlight shifts to warm red.
2. **Vượt chướng ngại vật (VCNV)**:
   - Condition: Only the candidate who pressed fastest (first) lights up.
   - State mapping:
     - `state.vcnv.bells` is an ordered list: `bells: { seat: number; before: boolean; atMs?: number }[]`.
     - Fastest buzzer is strictly `bells[0]?.seat`.
     - Podium for `seat.id === bells[0]?.seat` lights up RED.
     - Subsequent buzzers in `bells.slice(1)` remain **unlit** (no red buzzer light).

---

### 5.4 Camera Director System (10 Authentic Studio Angles)

| CAM ID | Name | Position $[X, Y, Z]$ | Target $[X, Y, Z]$ | Intended Broadcast Scene |
|---|---|---|---|---|
| **CAM 1** | Master Wide | $[0.00, 3.20, 7.50]$ | $[0.00, 2.20, -3.00]$ | Full stage view: LED screen, contestants, MC, laurel wreath |
| **CAM 2** | Central LED Screen | $[0.00, 3.20, 0.50]$ | $[0.00, 3.20, -6.50]$ | Direct hero view of questions, media, and central screen |
| **CAM 3** | Contestants Dais | $[0.00, 2.50, 2.80]$ | $[0.00, 1.80, -1.80]$ | Wide angle covering all 4 contestant podiums |
| **CAM 4** | Contestant 1 | $[-2.70, 2.20, 0.80]$ | $[-2.70, 1.90, -1.80]$ | Close-up on Seat 0 |
| **CAM 5** | Contestant 2 | $[-0.90, 2.20, 0.80]$ | $[-0.90, 1.90, -1.80]$ | Close-up on Seat 1 |
| **CAM 6** | Contestant 3 | $[+0.90, 2.20, 0.80]$ | $[+0.90, 1.90, -1.80]$ | Close-up on Seat 2 |
| **CAM 7** | Contestant 4 | $[+2.70, 2.20, 0.80]$ | $[+2.70, 1.90, -1.80]$ | Close-up on Seat 3 |
| **CAM 8** | MC Lectern | $[+4.00, 2.40, 0.80]$ | $[+4.80, 2.00, -1.80]$ | Close-up on Host / MC |
| **CAM 9** | Laurel Wreath | $[-4.00, 2.20, 0.80]$ | $[-4.80, 1.60, -1.80]$ | Glamour close-up on the Golden Laurel Wreath |
| **CAM 10** | Audience POV | $[0.00, 4.50, 18.00]$ | $[0.00, 2.00, 0.00]$ | High-angle shot from top audience tiers looking down |

---

## 6. Implementation Blueprint & Recommended File Structure

To integrate seamlessly into the project without touching prohibited areas:
1. **Asset Copy**:
   Copy `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` into `d:\Timeout Quiz\public\brand\olympia\Olympia_logo_2016.webp`.
2. **Main 3D Component**:
   Create `d:\Timeout Quiz\src\components\olympia\OlympiaStudio3DScene.tsx`.
3. **Subcomponent Modularization**:
   - `OlympiaLedWall.tsx`: Grand screen, logo, gradient text, canvas redraws.
   - `OlympiaContestantPodiums.tsx`: 4 podiums, score textures, buzzer bells.
   - `OlympiaMcStation.tsx`: MC lectern, mic, cue card.
   - `OlympiaLaurelWreathPedestal.tsx`: Showcase column, 3D laurel wreath, showcase light.
   - `OlympiaStageLighting.tsx`: Staggered 3-cluster transition controller.
   - `OlympiaCameraController.tsx`: 10-camera switcher with PTZ and adaptive FOV.
4. **Integration into `OlympiaSandboxStudio.tsx`**:
   Add a 3D Studio view mode toggle (e.g., standard UI vs 3D Studio stage view) displaying `<OlympiaStudio3DScene />` powered by live engine events.

---

## 7. Conclusion

The reference implementation in `WheelStudio3DScene.tsx` provides an exceptional, production-grade foundation. By porting its lighting architecture, procedural geometry approach, canvas texture pipelines, and camera systems, `OlympiaStudio3DScene.tsx` can be implemented with outstanding visual quality, authentic television broadcast fidelity, 60 FPS performance, and complete adherence to requirements R1, R2, R3, and R4.
