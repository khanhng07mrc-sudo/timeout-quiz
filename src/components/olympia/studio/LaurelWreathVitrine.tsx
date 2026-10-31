"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LaurelWreathVitrineProps {
  position?: [number, number, number];
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  screenFadeProgress?: number;
}

/**
 * Procedural 3D Golden Laurel Wreath (Vòng nguyệt quế Olympia)
 * Modeled with twin curved golden branches, paired laurel leaves,
 * golden berry clusters, and ribbon tie at base.
 */
function LaurelWreathMesh() {
  const wreathRef = useRef<THREE.Group>(null);
  const leavesGroupRef = useRef<THREE.Group>(null);

  // Generate leaf positions and orientations along two symmetrical branch arcs
  const leafPairs = useMemo(() => {
    const pairs: Array<{
      side: number;
      angle: number;
      pos: [number, number, number];
      rot: [number, number, number];
      scale: number;
    }> = [];

    const numLeaves = 14;
    const radiusX = 0.26;
    const radiusY = 0.30;

    for (let side of [-1, 1]) {
      for (let i = 0; i < numLeaves; i++) {
        const t = (i + 1) / (numLeaves + 1);
        const theta = (t * 0.88 + 0.06) * Math.PI;

        const x = side * Math.sin(theta) * radiusX;
        const y = -Math.cos(theta) * radiusY;
        const z = Math.sin(t * Math.PI) * 0.03;

        const tangentAngle = theta;
        const leafRotZ = side === 1 ? -tangentAngle + 0.35 : tangentAngle - 0.35;
        const leafRotY = side * 0.25;

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
        emissiveIntensity: 0.42,
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
        emissiveIntensity: 0.65,
      }),
    []
  );

  return (
    <group ref={wreathRef} position={[0, 0.18, 0]}>
      {/* ── Twin Branch Stems ── */}
      <mesh position={[-0.01, 0, 0]} rotation={[0, 0, 0.2]}>
        <torusGeometry args={[0.26, 0.009, 12, 48, Math.PI * 0.92]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      <mesh position={[0.01, 0, 0]} rotation={[0, Math.PI, -0.2]}>
        <torusGeometry args={[0.26, 0.009, 12, 48, Math.PI * 0.92]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* ── Golden Laurel Leaves ── */}
      <group ref={leavesGroupRef}>
        {leafPairs.map((p, idx) => (
          <group key={idx} position={p.pos} rotation={p.rot} scale={p.scale}>
            <mesh position={[0.02 * p.side, 0.02, 0]} rotation={[0, 0, p.side * 0.4]}>
              <coneGeometry args={[0.024, 0.085, 5]} />
              <primitive object={goldMaterial} attach="material" />
            </mesh>

            <mesh position={[-0.015 * p.side, 0.015, -0.01]} rotation={[0.2, 0, -p.side * 0.35]}>
              <coneGeometry args={[0.02, 0.07, 5]} />
              <primitive object={goldMaterial} attach="material" />
            </mesh>

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
        <mesh>
          <sphereGeometry args={[0.025, 16, 16]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        <mesh position={[-0.04, 0.01, 0]} rotation={[0, 0, 0.4]}>
          <torusGeometry args={[0.035, 0.01, 8, 24]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        <mesh position={[0.04, 0.01, 0]} rotation={[0, 0, -0.4]}>
          <torusGeometry args={[0.035, 0.01, 8, 24]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
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

/**
 * Laurel Wreath Honor Dais:
 * Positioned in Center Foreground Apron [0.0, 0, 1.8] as seen from central audience.
 * Formed with a pristine white circular tiered dais, illuminated LED ring,
 * white marble pedestal column, and warm golden overhead spotlight.
 * Sized proportionally (~1.25m total height) so it never blocks the MC dais or portal.
 */
export function LaurelWreathVitrine({
  position = [0.0, 0, 2.6],
  quality: _quality = "HIGH",
  screenFadeProgress = 0,
}: LaurelWreathVitrineProps) {
  const ringColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff1a40"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  return (
    <group position={position}>
      {/* ── 1. PRISTINE WHITE CIRCULAR TIERED DAIS (As seen in VTV3 Photo 2) ── */}
      {/* Lower White Stepped Plinth */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.06, 36]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.15} metalness={0.2} />
      </mesh>

      {/* Glowing LED Base Ring */}
      <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.58, 36]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Upper White Platform */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.46, 0.52, 0.06, 36]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.3} />
      </mesh>

      {/* ── 2. WHITE MARBLE DISPLAY PEDESTAL COLUMN ── */}
      {/* Column Base Ring */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.04, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Gold Accent Ring */}
      <mesh position={[0, 0.165, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.012, 24]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.95}
          roughness={0.15}
          emissive="#ffd700"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Main Fluted Pillar */}
      <mesh position={[0, 0.365, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.40, 24]} />
        <meshStandardMaterial
          color="#f1f5f9"
          metalness={0.4}
          roughness={0.22}
        />
      </mesh>

      {/* Gold Trim Ring at Column Top */}
      <mesh position={[0, 0.575, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.015, 24]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.95}
          roughness={0.15}
          emissive="#ffd700"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Column Capital / Top Plinth */}
      <mesh position={[0, 0.595, 0]}>
        <cylinderGeometry args={[0.20, 0.16, 0.045, 24]} />
        <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* ── 3. ROYAL CRIMSON VELVET DISPLAY PILLOW ── */}
      <group position={[0, 0.635, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.20, 0.05, 32]} />
          <meshStandardMaterial color="#880e28" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.01, 0]}>
          <torusGeometry args={[0.19, 0.009, 16, 36]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.92}
            roughness={0.2}
            emissive="#ffd700"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>

      {/* ── 4. ROTATING GOLDEN LAUREL WREATH ── */}
      <group position={[0, 0.74, 0]}>
        <LaurelWreathMesh />
      </group>

      {/* ── 5. CRYSTAL CLOCHE (GLASS DISPLAY DOME) ── */}
      <group position={[0, 0.66, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.36, 32, 1, true]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.92}
            opacity={0.35}
            transparent
            roughness={0.06}
            ior={1.5}
            thickness={0.04}
            envMapIntensity={2.0}
          />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.19, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.92}
            opacity={0.35}
            transparent
            roughness={0.06}
            ior={1.5}
            thickness={0.04}
            envMapIntensity={2.0}
          />
        </mesh>
      </group>

      {/* ── 6. DEDICATED WARM GOLD SPOTLIGHT ── */}
      <spotLight
        position={[0, 6.0, 0]}
        target-position={[0, 0.74, 0]}
        color="#fff0b3"
        intensity={8.5}
        angle={0.35}
        penumbra={0.4}
        distance={10}
      />
    </group>
  );
}
