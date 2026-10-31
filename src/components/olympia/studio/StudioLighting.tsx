"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface StudioLightingProps {
  screenFadeProgress?: number;
  stageFadeProgress?: number;
  audienceFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}

/**
 * High-specular PBR Studio Epoxy Floor with Glowing Ring Tracks
 */
export function StudioFloor({
  stageFadeProgress = 0,
  quality = "HIGH",
}: {
  stageFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}) {
  const ringColor = useMemo(() => {
    const c = new THREE.Color("#00d4ff");
    c.lerp(new THREE.Color("#ff2a4b"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  const goldColor = new THREE.Color("#ffd700");

  return (
    <group position={[0, -0.01, 0]}>
      {/* ── 1. MAIN DARK HIGH-SPECULAR EPOXY FLOOR DISC ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[22, quality === "LIGHT" ? 32 : 64]} />
        <meshStandardMaterial
          color="#03060f"
          roughness={0.08}
          metalness={0.88}
          envMapIntensity={2.2}
        />
      </mesh>

      {/* ── 2. CONCENTRIC GLOWING RING TRACKS ── */}
      {/* Ring 1: Inner Stage Center Ring */}
      <mesh position={[0, 0.002, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 3.84, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Ring 2: Mid Contestant Podiums Ring (Gold) */}
      <mesh position={[0, 0.002, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 5.25, 64]} />
        <meshBasicMaterial color={goldColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Ring 3: Outer Stage Perimeter Ring */}
      <mesh position={[0, 0.002, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.4, 7.46, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* ── 3. RADIAL RUNWAY TRACKS & ACCENTS ── */}
      {[-0.6, -0.2, 0.2, 0.6].map((angle, idx) => (
        <mesh
          key={idx}
          position={[
            Math.sin(angle) * 5.8,
            0.002,
            -2.5 + Math.cos(angle) * 5.8,
          ]}
          rotation={[-Math.PI / 2, 0, -angle]}
        >
          <planeGeometry args={[0.04, 2.8]} />
          <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Studio Perimeter Walls with Vertical Architectural LED Light Ribs
 */
export function StudioWalls({
  stageFadeProgress = 0,
}: {
  stageFadeProgress?: number;
}) {
  const wallLightColor = useMemo(() => {
    const c = new THREE.Color("#0099ff");
    c.lerp(new THREE.Color("#ff1133"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Generate architectural fins along curved background wall
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
      {/* Curved Dark Studio Cyc / Enclosure */}
      <mesh position={[0, 6.0, -1.0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[20.5, 20.5, 13, 48, 1, true, -Math.PI * 0.85, Math.PI * 1.7]} />
        <meshStandardMaterial
          color="#02040a"
          roughness={0.7}
          metalness={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Architectural Light Fins */}
      {finConfigs.map((f, i) => (
        <group key={i} position={f.pos} rotation={[0, f.rotY, 0]}>
          {/* Dark Structural Fin Pillar */}
          <mesh>
            <boxGeometry args={[0.3, 11.0, 0.7]} />
            <meshStandardMaterial color="#0b0f19" metalness={0.88} roughness={0.25} />
          </mesh>
          {/* Vertical Neon Edge Light Strip */}
          <mesh position={[0, 0, 0.36]}>
            <boxGeometry args={[0.04, 10.8, 0.04]} />
            <meshBasicMaterial color={wallLightColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Ceiling Lighting Truss Rig with Studio Softboxes
 */
export function StudioCeilingRig() {
  return (
    <group position={[0, 11.5, -1.5]}>
      {/* Outer Truss Octagonal Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9.5, 0.14, 12, 64]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
      </mesh>
      {/* Inner Truss Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 0.12, 12, 48]} />
        <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.2} />
      </mesh>

      {/* Cross Spoke Pipes */}
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
 * Audience Amphitheater in Studio Background (Z = +8m to +16m)
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

  // 5 Curved Tiers of Seating
  const tiers = [0, 1, 2, 3, 4];

  return (
    <group position={[0, 0, 10.5]}>
      {tiers.map((tIdx) => {
        const radius = 9.5 + tIdx * 1.5;
        const tierHeight = (tIdx + 1) * 0.55;
        return (
          <group key={tIdx} position={[0, tierHeight / 2, 0]}>
            {/* Tier Platform Arc */}
            <mesh rotation={[0, Math.PI, 0]}>
              <cylinderGeometry
                args={[radius, radius, tierHeight, 32, 1, true, -Math.PI * 0.35, Math.PI * 0.7]}
              />
              <meshStandardMaterial color="#080c14" metalness={0.8} roughness={0.4} />
            </mesh>
            {/* Velvet Seating Row Lip */}
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
 * Coordinates multi-zone staggered blue/red fade transitions:
 * - Screen zone: (0.0 to 1.0)
 * - Stage back lights: (0.0 to 1.0)
 * - Audience amphitheater: (0.0 to 1.0)
 */
export function StudioLighting({
  screenFadeProgress = 0,
  stageFadeProgress = 0,
  audienceFadeProgress = 0,
  quality = "HIGH",
}: StudioLightingProps) {
  // Screen Zone Down-Wash Color
  const screenWashColor = useMemo(() => {
    // Sapphire Blue (#0a2663) -> Fiery Red (#d90429)
    const c = new THREE.Color("#0a2663");
    c.lerp(new THREE.Color("#d90429"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  // Stage Back Wash Color
  const stageBackColor = useMemo(() => {
    // Sapphire Blue (#081a44) -> Fiery Red (#b80320)
    const c = new THREE.Color("#081a44");
    c.lerp(new THREE.Color("#b80320"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Stage Rim Wash Color
  const stageRimColor = useMemo(() => {
    // Cyan/Blue (#00e5ff) -> Red (#ff2244)
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff2244"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Audience Wash Color
  const audienceWashColor = useMemo(() => {
    // Deep Blue (#05102a) -> Deep Red (#7a0215)
    const c = new THREE.Color("#05102a");
    c.lerp(new THREE.Color("#7a0215"), audienceFadeProgress);
    return c;
  }, [audienceFadeProgress]);

  return (
    <group>
      {/* ── 1. AMBIENT & KEY STUDIO LIGHTING ── */}
      {/* Base Neutral Broadcast Ambient */}
      <ambientLight intensity={0.85} color="#e2e8f0" />

      {/* Screen Zone Overhead Downlight */}
      <pointLight position={[0, 4.5, -4.5]} intensity={2.5} color={screenWashColor} distance={10} />

      {/* Main Directional Key Spotlight (Stage Center) */}
      <directionalLight
        position={[4.5, 12.0, 7.5]}
        intensity={2.8}
        color="#ffffff"
        castShadow={quality === "HIGH"}
      />

      {/* Fill Light (Stage Left) */}
      <directionalLight
        position={[-6.0, 10.0, 6.0]}
        intensity={1.6}
        color="#e2e8f0"
      />

      {/* ── 2. STAGE BACK LIGHTS (Reacts to stageFadeProgress) ── */}
      {/* Left Back Wall Spotlight */}
      <spotLight
        position={[-7.5, 8.5, -5.0]}
        target-position={[0, 3.0, -6.5]}
        intensity={7.0}
        color={stageBackColor}
        angle={0.65}
        penumbra={0.5}
        distance={18}
      />

      {/* Right Back Wall Spotlight */}
      <spotLight
        position={[7.5, 8.5, -5.0]}
        target-position={[0, 3.0, -6.5]}
        intensity={7.0}
        color={stageBackColor}
        angle={0.65}
        penumbra={0.5}
        distance={18}
      />

      {/* Floor Up-Wash Lights onto Backdrop */}
      <pointLight position={[-4.5, 0.5, -6.0]} intensity={3.5} color={stageRimColor} distance={8} />
      <pointLight position={[4.5, 0.5, -6.0]} intensity={3.5} color={stageRimColor} distance={8} />
      <pointLight position={[0.0, 0.5, -6.2]} intensity={4.0} color={stageRimColor} distance={8} />

      {/* ── 3. AUDIENCE AMPHITHEATER LIGHTS (Reacts to audienceFadeProgress) ── */}
      <spotLight
        position={[0, 9.0, 4.0]}
        target-position={[0, 2.0, 12.0]}
        intensity={4.5}
        color={audienceWashColor}
        angle={0.8}
        penumbra={0.6}
        distance={22}
      />

      {/* ── 4. STUDIO ENVIRONMENT GEOMETRY ── */}
      <StudioFloor stageFadeProgress={stageFadeProgress} quality={quality} />
      <StudioWalls stageFadeProgress={stageFadeProgress} />
      <StudioCeilingRig />
      <AudienceAmphitheater audienceFadeProgress={audienceFadeProgress} />
    </group>
  );
}
