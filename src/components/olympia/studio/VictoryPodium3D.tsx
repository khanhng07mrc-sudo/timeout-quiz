import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { OlympiaAwardsState } from "../../../lib/olympia/types";

export interface VictoryPodium3DProps {
  awardsState?: OlympiaAwardsState | null;
  totalSeats?: number;
}

/**
 * Calculates world coordinates for contestants standing on the 3-tier Victory Podium.
 * Podium center base is at [0, 0.22, -0.6].
 * Tier 1 (Center): height 0.48m -> surface Y = 0.22 + 0.48 = 0.70m
 * Tier 2 (Left):   height 0.30m -> surface Y = 0.22 + 0.30 = 0.52m
 * Tier 3 (Right):  height 0.16m -> surface Y = 0.22 + 0.16 = 0.38m
 */
export function getVictoryPodiumSlotWorldPos(
  seatId: number,
  awardsState?: OlympiaAwardsState | null,
  totalSeats: number = 4
): [number, number, number] {
  if (!awardsState) return [0, 0.22, -0.6];

  const { first, second, third } = awardsState.tiers;

  // 1st place (Center step)
  if (first.includes(seatId)) {
    const idx = first.indexOf(seatId);
    const count = first.length;
    const xOffset = count > 1 ? (idx - (count - 1) / 2) * 0.45 : 0;
    return [+(xOffset).toFixed(3), 0.70, -0.60];
  }

  // 2nd place (Left step)
  if (second.includes(seatId)) {
    const idx = second.indexOf(seatId);
    const count = second.length;
    const xBase = -1.25;
    const xOffset = count > 1 ? (idx - (count - 1) / 2) * 0.40 : 0;
    return [+(xBase + xOffset).toFixed(3), 0.52, -0.60];
  }

  // 3rd place / Đồng Giải Ba (Right step)
  if (third.includes(seatId)) {
    const idx = third.indexOf(seatId);
    const count = Math.max(1, third.length);
    const xBase = 1.35;
    const spacing = count > 2 ? 0.38 : 0.45;
    const xOffset = (idx - (count - 1) / 2) * spacing;
    return [+(xBase + xOffset).toFixed(3), 0.38, -0.60];
  }

  return [0, 0.22, -0.6];
}

/**
 * Instanced Confetti Particles (Golden metallic glints, ribbons & stars celebrating champion)
 */
function LaurelConfettiParticles({ active = false }: { active?: boolean }) {
  const count = 180;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 5.0,
      y: 0.70 + Math.random() * 3.5,
      z: -0.60 + (Math.random() - 0.5) * 3.5,
      speedY: 0.6 + Math.random() * 0.8,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4.0,
      scale: 0.04 + Math.random() * 0.04,
      color: Math.random() > 0.35 ? "#fbbf24" : Math.random() > 0.5 ? "#f59e0b" : "#ffffff",
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    const dt = Math.min(0.05, delta);

    particles.forEach((p, i) => {
      p.y -= p.speedY * dt;
      p.rotX += p.rotSpeed * dt;
      p.rotY += p.rotSpeed * 0.8 * dt;
      if (p.y < 0.22) {
        p.y = 4.2 + Math.random() * 0.5;
        p.x = (Math.random() - 0.5) * 4.5;
        p.z = -0.60 + (Math.random() - 0.5) * 3.5;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      dummy.scale.set(p.scale, p.scale * 1.5, p.scale * 0.2);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={0.6}
        roughness={0.2}
        metalness={0.8}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/**
 * 3D Olympic Broadcast Victory Podium (3 Tiers: Center Gold 1st, Left Silver 2nd, Right Bronze/Blue 3rd)
 */
export function VictoryPodium3D({ awardsState, totalSeats = 4 }: VictoryPodium3DProps) {
  const rootRef = useRef<THREE.Group>(null);
  const active = Boolean(awardsState?.active);
  const laurelCrowned = Boolean(awardsState?.laurelCrowned);

  // Dynamic podium width expansion for 5-8 contestants
  const thirdCount = awardsState?.tiers.third.length ?? 2;
  const tier3Width = thirdCount >= 4 ? 2.6 : thirdCount >= 3 ? 2.1 : 1.65;

  // Podium elevation animation on open
  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    if (active) {
      rootRef.current.visible = true;
      const targetY = 0.22;
      rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, targetY, 0.08);
    } else {
      rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, -1.0, 0.12);
      if (rootRef.current.position.y < -0.95) {
        rootRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={rootRef} position={[0, -1.0, -0.6]} visible={false}>
      {/* ── 1. CENTER TIER: 1ST PLACE (QUÁN QUÂN) ── */}
      <group position={[0, 0.24, 0]}>
        {/* Main Step Body: width 1.15m, height 0.48m, depth 0.95m */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.48, 0.95]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Glowing Gold Border Top Lip */}
        <mesh position={[0, 0.235, 0]}>
          <boxGeometry args={[1.19, 0.02, 0.99]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={laurelCrowned ? 1.2 : 0.6}
            roughness={0.15}
            metalness={0.9}
          />
        </mesh>
        {/* Step Front Number '1' Emblem */}
        <mesh position={[0, 0, 0.48]}>
          <boxGeometry args={[0.22, 0.22, 0.02]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Laurel Wreath Ring on Front of Step 1 */}
        <mesh position={[0, 0, 0.495]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.14, 0.016, 12, 32]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={laurelCrowned ? 1.5 : 0.8}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* ── 2. LEFT TIER: 2ND PLACE (GIẢI NHÌ) ── */}
      <group position={[-1.25, 0.15, 0]}>
        {/* Main Step Body: width 1.05m, height 0.30m, depth 0.90m */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.30, 0.90]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Silver Edge Top Lip */}
        <mesh position={[0, 0.145, 0]}>
          <boxGeometry args={[1.09, 0.02, 0.94]} />
          <meshStandardMaterial
            color="#93c5fd"
            emissive="#60a5fa"
            emissiveIntensity={0.5}
            roughness={0.18}
            metalness={0.85}
          />
        </mesh>
        {/* Step Front Number '2' Emblem */}
        <mesh position={[0, 0, 0.455]}>
          <boxGeometry args={[0.18, 0.18, 0.02]} />
          <meshStandardMaterial
            color="#93c5fd"
            emissive="#3b82f6"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* ── 3. RIGHT TIER: 3RD PLACE / ĐỒNG GIẢI BA ── */}
      <group position={[1.35, 0.08, 0]}>
        {/* Main Step Body: width tier3Width, height 0.16m, depth 0.90m */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[tier3Width, 0.16, 0.90]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Bronze / Blue Edge Top Lip */}
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[tier3Width + 0.04, 0.02, 0.94]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#3b82f6"
            emissiveIntensity={0.4}
            roughness={0.22}
            metalness={0.8}
          />
        </mesh>
        {/* Step Front Number '3' Emblem */}
        <mesh position={[0, 0, 0.455]}>
          <boxGeometry args={[0.16, 0.16, 0.02]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#2563eb"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* ── 4. CONFETTI & CELEBRATION EFFECTS ── */}
      <LaurelConfettiParticles active={laurelCrowned} />
    </group>
  );
}
