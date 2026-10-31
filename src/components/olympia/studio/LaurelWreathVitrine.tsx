"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LaurelWreathVitrineProps {
  position?: [number, number, number];
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}

/**
 * Procedural 3D Golden Laurel Wreath (Vòng nguyệt quế)
 * Modeled with twin curved golden branches, paired laurel leaves,
 * golden berry clusters, and ribbon tie at base.
 */
function LaurelWreathMesh() {
  const wreathRef = useRef<THREE.Group>(null);
  const leavesGroupRef = useRef<THREE.Group>(null);

  // Generate leaf positions and orientations along two symmetrical branch arcs
  const leafPairs = useMemo(() => {
    const pairs: Array<{
      side: number; // -1 for left, 1 for right
      angle: number; // parametric position along arc (0 to ~140 deg)
      pos: [number, number, number];
      rot: [number, number, number];
      scale: number;
    }> = [];

    const numLeaves = 14; // 14 leaves per branch = 28 leaves total
    const radiusX = 0.26;
    const radiusY = 0.30;

    for (let side of [-1, 1]) {
      for (let i = 0; i < numLeaves; i++) {
        const t = (i + 1) / (numLeaves + 1); // 0 to 1
        const theta = (t * 0.88 + 0.06) * Math.PI; // sweep from bottom to top

        // Elliptical branch curve
        const x = side * Math.sin(theta) * radiusX;
        const y = -Math.cos(theta) * radiusY;
        const z = Math.sin(t * Math.PI) * 0.03; // subtle forward curvature

        // Tangent angle along curve
        const tangentAngle = theta;
        const leafRotZ = side === 1 ? -tangentAngle + 0.35 : tangentAngle - 0.35;
        const leafRotY = side * 0.25;

        // Leaves grow slightly larger at middle, taper at tip
        const sizeFactor = 0.75 + Math.sin(t * Math.PI) * 0.35;

        pairs.push({
          side,
          angle: theta,
          pos: [x, y, z],
          rot: [0.15, leafRotY, leafRotZ],
          scale: sizeFactor,
        });
      }
    }
    return pairs;
  }, []);

  // Continuous smooth rotation and subtle majestic floating
  useFrame((state, delta) => {
    if (wreathRef.current) {
      wreathRef.current.rotation.y += delta * 0.55;
      const t = state.clock.getElapsedTime();
      wreathRef.current.position.y = 0.18 + Math.sin(t * 1.8) * 0.012;
    }
  });

  // Radiant Golden PBR Material
  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 0.96,
        roughness: 0.12,
        emissive: "#ffb700",
        emissiveIntensity: 0.38,
        envMapIntensity: 2.5,
      }),
    []
  );

  const berryMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff1a8",
        metalness: 0.98,
        roughness: 0.08,
        emissive: "#ffd700",
        emissiveIntensity: 0.6,
      }),
    []
  );

  return (
    <group ref={wreathRef} position={[0, 0.18, 0]}>
      {/* ── Twin Branch Stems ── */}
      {/* Left Branch Torus Arc */}
      <mesh position={[-0.01, 0, 0]} rotation={[0, 0, 0.2]}>
        <torusGeometry args={[0.26, 0.009, 12, 48, Math.PI * 0.92]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* Right Branch Torus Arc */}
      <mesh position={[0.01, 0, 0]} rotation={[0, Math.PI, -0.2]}>
        <torusGeometry args={[0.26, 0.009, 12, 48, Math.PI * 0.92]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* ── Golden Laurel Leaves ── */}
      <group ref={leavesGroupRef}>
        {leafPairs.map((p, idx) => (
          <group key={idx} position={p.pos} rotation={p.rot} scale={p.scale}>
            {/* Primary Laurel Leaf Blade */}
            <mesh position={[0.02 * p.side, 0.02, 0]} rotation={[0, 0, p.side * 0.4]}>
              <coneGeometry args={[0.024, 0.085, 5]} />
              <primitive object={goldMaterial} attach="material" />
            </mesh>

            {/* Secondary Paired Laurel Leaf */}
            <mesh position={[-0.015 * p.side, 0.015, -0.01]} rotation={[0.2, 0, -p.side * 0.35]}>
              <coneGeometry args={[0.02, 0.07, 5]} />
              <primitive object={goldMaterial} attach="material" />
            </mesh>

            {/* Golden Berry Bead at Junction */}
            {idx % 2 === 0 && (
              <mesh position={[0, 0, 0.015]}>
                <sphereGeometry args={[0.009, 12, 12]} />
                <primitive object={berryMaterial} attach="material" />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {/* ── Ribbon Bow & Tassels at Base ── */}
      <group position={[0, -0.3, 0.02]}>
        {/* Central Ribbon Knot */}
        <mesh>
          <sphereGeometry args={[0.025, 16, 16]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        {/* Left Ribbon Loop */}
        <mesh position={[-0.04, 0.01, 0]} rotation={[0, 0, 0.4]}>
          <torusGeometry args={[0.035, 0.01, 8, 24]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        {/* Right Ribbon Loop */}
        <mesh position={[0.04, 0.01, 0]} rotation={[0, 0, -0.4]}>
          <torusGeometry args={[0.035, 0.01, 8, 24]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        {/* Dangling Ribbon Tails */}
        <mesh position={[-0.025, -0.05, 0]} rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.008, 0.012, 0.08, 8]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        <mesh position={[0.025, -0.05, 0]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.008, 0.012, 0.08, 8]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

export function LaurelWreathVitrine({
  position = [-2.4, 0, -4.8],
  quality: _quality = "HIGH",
}: LaurelWreathVitrineProps) {
  return (
    <group position={position}>
      {/* ── 1. OCTAGONAL MARBLE DISPLAY PEDESTAL COLUMN ── */}
      {/* Heavy Base Plinth */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.2, 8]} />
        <meshStandardMaterial color="#080c14" metalness={0.92} roughness={0.18} />
      </mesh>
      {/* Gold Trim Ring at Base */}
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.63, 0.63, 0.025, 8]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.94}
          roughness={0.15}
          emissive="#ffd700"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Main Octagonal Column Body */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.52, 0.58, 1.0, 8]} />
        <meshStandardMaterial
          color="#111827"
          metalness={0.7}
          roughness={0.25}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Gold Trim Ring at Column Top */}
      <mesh position={[0, 1.23, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.03, 8]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.95}
          roughness={0.15}
          emissive="#ffd700"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Column Capital / Top Plinth */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.60, 0.54, 0.12, 8]} />
        <meshStandardMaterial color="#080c14" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* ── 2. ROYAL CRIMSON VELVET DISPLAY PILLOW ── */}
      <group position={[0, 1.42, 0]}>
        {/* Rounded Velvet Cushion */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.44, 0.12, 32]} />
          <meshStandardMaterial
            color="#7a0b22"
            roughness={0.75}
            metalness={0.15}
          />
        </mesh>
        {/* Golden Braided Rope Trim around Pillow */}
        <mesh position={[0, -0.01, 0]}>
          <torusGeometry args={[0.43, 0.018, 16, 48]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.92}
            roughness={0.2}
            emissive="#ffd700"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* ── 3. ROTATING GOLDEN LAUREL WREATH ── */}
      <group position={[0, 1.62, 0]}>
        <LaurelWreathMesh />
      </group>

      {/* ── 4. CRYSTAL CLOCHE (GLASS DISPLAY DOME) ── */}
      <group position={[0, 1.48, 0]}>
        {/* Cloche Glass Cylinder */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.40, 0.40, 0.9, 32, 1, true]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.32}
            roughness={0.05}
            metalness={0.05}
            transmission={0.92}
            ior={1.52}
            thickness={0.04}
            envMapIntensity={2.0}
          />
        </mesh>
        {/* Cloche Glass Dome Top */}
        <mesh position={[0, 0.90, 0]}>
          <sphereGeometry args={[0.40, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.35}
            roughness={0.05}
            metalness={0.05}
            transmission={0.92}
            ior={1.52}
            thickness={0.04}
            envMapIntensity={2.0}
          />
        </mesh>
        {/* Golden Handle Knob on Glass Cloche Apex */}
        <mesh position={[0, 1.33, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.95}
            roughness={0.15}
            emissive="#ffd700"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>

      {/* ── 5. DEDICATED OVERHEAD FOCUSED SPOTLIGHT ── */}
      <spotLight
        position={[0, 4.2, 0]}
        target-position={[0, 1.75, 0]}
        color="#fff5d1"
        intensity={8.0}
        angle={0.36}
        penumbra={0.4}
        distance={9}
      />
      {/* Subtle point light inside cloche for sparkling gold specular reflections */}
      <pointLight position={[0, 1.85, 0.15]} color="#ffd700" intensity={1.8} distance={2.5} />
    </group>
  );
}
