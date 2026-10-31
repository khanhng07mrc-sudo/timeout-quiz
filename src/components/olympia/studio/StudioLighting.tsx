"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface StudioLightingProps {
  screenFadeProgress?: number;
  stageFadeProgress?: number;
  audienceFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  isVeDichDimmed?: boolean;
  activeMainContestantSeat?: number | null;
  is5sBuzzerChasing?: boolean;
  spotlightChaseIndex?: number;
  lockedSpotlightSeat?: number | null;
}

const CONTESTANT_POSITIONS: Array<[number, number, number]> = [
  [-5.8, 0, -2.4], // TS 1: Đỏ
  [-4.7, 0, -2.9], // TS 2: Lam
  [-3.6, 0, -3.4], // TS 3: Vàng
  [-2.5, 0, -3.8], // TS 4: Lục
];

/**
 * High-specular PBR Studio Epoxy Floor with Raised Stage Platform & Glowing Tracks
 */
export function StudioFloor({
  stageFadeProgress = 0,
  quality = "HIGH",
}: {
  stageFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}) {
  const ringColor = useMemo(() => {
    const c = new THREE.Color("#00f0ff");
    c.lerp(new THREE.Color("#ff1a40"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  const goldColor = new THREE.Color("#ffd700");

  return (
    <group position={[0, -0.01, 0]}>
      {/* ── 1. MAIN GLOSSY BROADCAST FLOOR DISC ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[24, quality === "LIGHT" ? 32 : 64]} />
        <meshStandardMaterial
          color="#060e20"
          roughness={0.16}
          metalness={0.25}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* ── 2. RAISED STAGE DECK PLATFORM (Stage S14 Elevation) ── */}
      <mesh position={[0, 0.05, -1.2]}>
        <cylinderGeometry args={[9.2, 9.2, 0.1, quality === "LIGHT" ? 32 : 64]} />
        <meshStandardMaterial
          color="#08142c"
          roughness={0.18}
          metalness={0.3}
        />
      </mesh>

      {/* Stage Front Curved Apron Glowing Neon Border */}
      <mesh position={[0, 0.102, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.16, 9.24, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* ── 3. CONCENTRIC GLOWING RING TRACKS ON STAGE ── */}
      {/* Inner Center Ring */}
      <mesh position={[0, 0.103, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 3.86, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Mid Arc Ring (Gold) */}
      <mesh position={[0, 0.103, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 5.27, 64]} />
        <meshBasicMaterial color={goldColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer Perimeter Ring */}
      <mesh position={[0, 0.103, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.2, 7.28, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Radial Runway Accents */}
      {[-0.6, -0.2, 0.2, 0.6].map((angle, idx) => (
        <mesh
          key={idx}
          position={[
            Math.sin(angle) * 5.6,
            0.104,
            -2.2 + Math.cos(angle) * 5.6,
          ]}
          rotation={[-Math.PI / 2, 0, -angle]}
        >
          <planeGeometry args={[0.04, 2.6]} />
          <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Studio Perimeter Walls with Vertical Architectural LED Light Ribs
 * and Horizontal Radiant Cyan/Blue Broadcast Neon Bands (as in real VTV3 Studio S14)
 */
export function StudioWalls({
  stageFadeProgress = 0,
}: {
  stageFadeProgress?: number;
}) {
  const wallLightColor = useMemo(() => {
    const c = new THREE.Color("#00d4ff");
    c.lerp(new THREE.Color("#ff1133"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  const finConfigs = useMemo(() => {
    const fins: Array<{ pos: [number, number, number]; rotY: number }> = [];
    const count = 18;
    const radius = 18.5;
    for (let i = 0; i < count; i++) {
      const theta = ((i - (count - 1) / 2) / count) * Math.PI * 0.95 + Math.PI / 2;
      const x = Math.cos(theta) * radius;
      const z = -Math.sin(theta) * radius + 5.0;
      fins.push({
        pos: [x, 5.5, z],
        rotY: -theta + Math.PI / 2,
      });
    }
    return fins;
  }, []);

  return (
    <group>
      {/* Curved Deep Sapphire Studio Cyc Enclosure */}
      <mesh position={[0, 6.0, -1.0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[20.5, 20.5, 13, 48, 1, true, -Math.PI * 0.85, Math.PI * 1.7]} />
        <meshStandardMaterial
          color="#030c24"
          roughness={0.4}
          metalness={0.6}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 4 Horizontal Glowing Neon Bands along Cyc Wall (As in VTV3 Olympia photo) */}
      {[2.2, 3.8, 5.4, 7.0].map((h, idx) => (
        <mesh key={`band-${idx}`} position={[0, h, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[20.35, 20.40, 64, 1, -Math.PI * 0.82, Math.PI * 1.64]} />
          <meshBasicMaterial color={wallLightColor} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Architectural Vertical Light Fins */}
      {finConfigs.map((f, i) => (
        <group key={i} position={f.pos} rotation={[0, f.rotY, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 11.0, 0.7]} />
            <meshStandardMaterial color="#0e172a" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.36]}>
            <boxGeometry args={[0.05, 10.8, 0.05]} />
            <meshBasicMaterial color={wallLightColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Ceiling Lighting Truss Rig
 */
export function StudioCeilingRig() {
  return (
    <group position={[0, 11.5, -1.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9.5, 0.14, 12, 64]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 0.12, 12, 48]} />
        <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.2} />
      </mesh>
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((ang, i) => (
        <mesh key={i} rotation={[0, ang, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 19.0, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Audience Amphitheater in Studio Background
 */
export function AudienceAmphitheater({
  audienceFadeProgress = 0,
}: {
  audienceFadeProgress?: number;
}) {
  const seatGlowColor = useMemo(() => {
    const c = new THREE.Color("#051636");
    c.lerp(new THREE.Color("#3d030b"), audienceFadeProgress);
    return c;
  }, [audienceFadeProgress]);

  const tiers = [0, 1, 2, 3, 4];

  return (
    <group position={[0, 0, 10.5]}>
      {tiers.map((tIdx) => {
        const radius = 9.5 + tIdx * 1.5;
        const tierHeight = (tIdx + 1) * 0.55;
        return (
          <group key={tIdx} position={[0, tierHeight / 2, 0]}>
            <mesh rotation={[0, Math.PI, 0]}>
              <cylinderGeometry
                args={[radius, radius, tierHeight, 32, 1, true, -Math.PI * 0.35, Math.PI * 0.7]}
              />
              <meshStandardMaterial color="#080c14" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[0, tierHeight / 2, 0]} rotation={[0, Math.PI, 0]}>
              <cylinderGeometry
                args={[radius - 0.2, radius - 0.2, 0.25, 32, 1, true, -Math.PI * 0.34, Math.PI * 0.68]}
              />
              <meshStandardMaterial color={seatGlowColor} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Studio Lighting Rig Controller:
 * Coordinates multi-zone broadcast illumination, smooth blue/red color fades,
 * and Về Đích dramatic dimming + spotlight chase behaviors.
 */
export function StudioLighting({
  screenFadeProgress = 0,
  stageFadeProgress = 0,
  audienceFadeProgress = 0,
  quality = "HIGH",
  isVeDichDimmed = false,
  activeMainContestantSeat = null,
  is5sBuzzerChasing = false,
  spotlightChaseIndex = 0,
  lockedSpotlightSeat = null,
}: StudioLightingProps) {
  // Screen Zone Down-Wash Color
  const screenWashColor = useMemo(() => {
    const c = new THREE.Color("#0a2663");
    c.lerp(new THREE.Color("#d90429"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  // Stage Back Wash Color
  const stageBackColor = useMemo(() => {
    const c = new THREE.Color("#081a44");
    c.lerp(new THREE.Color("#b80320"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Stage Rim Wash Color
  const stageRimColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff2244"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Audience Wash Color
  const audienceWashColor = useMemo(() => {
    const c = new THREE.Color("#05102a");
    c.lerp(new THREE.Color("#7a0215"), audienceFadeProgress);
    return c;
  }, [audienceFadeProgress]);

  // Ambient & Key Light Intensity Factors (Dimmed during Về Đích)
  const ambientIntensity = isVeDichDimmed ? 0.35 : 1.45;
  const keyIntensity = isVeDichDimmed ? 0.9 : 3.8;
  const fillIntensity = isVeDichDimmed ? 0.45 : 2.4;

  return (
    <group>
      {/* ── 1. AMBIENT & BROADCAST KEY LIGHTS ── */}
      <ambientLight intensity={ambientIntensity} color="#e0f2fe" />

      {/* Screen Zone Overhead Downlight */}
      <pointLight position={[0, 5.0, -4.5]} intensity={isVeDichDimmed ? 1.5 : 4.5} color={screenWashColor} distance={12} />

      {/* Main Directional Key Spotlight (Stage Center) */}
      <directionalLight
        position={[4.5, 12.0, 7.5]}
        intensity={keyIntensity}
        color="#ffffff"
        castShadow={quality === "HIGH"}
      />

      {/* Fill Light (Stage Left) */}
      <directionalLight
        position={[-6.0, 10.0, 6.0]}
        intensity={fillIntensity}
        color="#e0f2fe"
      />

      {/* Front Broadcast Key Flood Light (Directly illuminates front of contestant podiums & MC desk) */}
      <directionalLight
        position={[0.0, 4.5, 8.0]}
        intensity={isVeDichDimmed ? 0.7 : 3.5}
        color="#ffffff"
      />

      {/* ── 2. STAGE BACK LIGHTS ── */}
      <spotLight
        position={[-7.5, 8.5, -5.0]}
        target-position={[0, 3.0, -6.5]}
        intensity={isVeDichDimmed ? 3.0 : 8.5}
        color={stageBackColor}
        angle={0.65}
        penumbra={0.5}
        distance={20}
      />

      <spotLight
        position={[7.5, 8.5, -5.0]}
        target-position={[0, 3.0, -6.5]}
        intensity={isVeDichDimmed ? 3.0 : 8.5}
        color={stageBackColor}
        angle={0.65}
        penumbra={0.5}
        distance={20}
      />

      {/* Broadcast Wing Cyc Wash Lights (Stage Left behind formula wall & Stage Right) */}
      <pointLight position={[-6.5, 4.0, -3.5]} color={screenWashColor} intensity={isVeDichDimmed ? 1.5 : 6.0} distance={15} />
      <pointLight position={[6.5, 4.0, -3.5]} color={screenWashColor} intensity={isVeDichDimmed ? 1.5 : 6.0} distance={15} />
      <pointLight position={[0, 6.0, -6.0]} color={stageBackColor} intensity={isVeDichDimmed ? 2.0 : 7.5} distance={16} />

      {/* Floor Up-Wash Lights onto Backdrop */}
      <pointLight position={[-4.5, 0.5, -6.0]} intensity={3.5} color={stageRimColor} distance={8} />
      <pointLight position={[4.5, 0.5, -6.0]} intensity={3.5} color={stageRimColor} distance={8} />
      <pointLight position={[0.0, 0.5, -6.2]} intensity={4.0} color={stageRimColor} distance={8} />

      {/* ── 3. VỀ ĐÍCH SPECIAL OVERHEAD SPOTLIGHTS (TS 1..4) ── */}
      {CONTESTANT_POSITIONS.map((pos, sIdx) => {
        // Evaluate spotlight state for this seat
        const isLocked = lockedSpotlightSeat === sIdx;
        const isChased = is5sBuzzerChasing && spotlightChaseIndex === sIdx;
        const isMainActive = isVeDichDimmed && !is5sBuzzerChasing && lockedSpotlightSeat == null && activeMainContestantSeat === sIdx;

        const isLit = isLocked || isChased || isMainActive;
        const spotIntensity = isLocked ? 13.0 : isChased ? 9.5 : isMainActive ? 8.5 : 0.0;
        const spotColor = isLocked ? "#ffffff" : isChased ? "#00e5ff" : "#fff8e7";

        if (!isLit) return null;

        return (
          <spotLight
            key={`ts-spot-${sIdx}`}
            position={[pos[0], 7.5, pos[2] + 0.8]}
            target-position={[pos[0], 1.2, pos[2]]}
            color={spotColor}
            intensity={spotIntensity}
            angle={0.4}
            penumbra={0.3}
            distance={11}
          />
        );
      })}

      {/* ── 4. AUDIENCE AMPHITHEATER LIGHTS ── */}
      <spotLight
        position={[0, 9.0, 4.0]}
        target-position={[0, 2.0, 12.0]}
        intensity={isVeDichDimmed ? 1.5 : 4.5}
        color={audienceWashColor}
        angle={0.8}
        penumbra={0.6}
        distance={22}
      />

      {/* ── 5. STUDIO ENVIRONMENT GEOMETRY ── */}
      <StudioFloor stageFadeProgress={stageFadeProgress} quality={quality} />
      <StudioWalls stageFadeProgress={stageFadeProgress} />
      <StudioCeilingRig />
      <AudienceAmphitheater audienceFadeProgress={audienceFadeProgress} />
    </group>
  );
}
