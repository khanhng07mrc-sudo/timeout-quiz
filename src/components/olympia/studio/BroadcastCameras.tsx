"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getContestantPodiumWorldPos } from "./CameraController";

export interface BroadcastCamerasProps {
  camAngle?: number;
  ptzZoom?: number;
  pushInProgress?: number;
  totalSeats?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Physical Broadcast Camera Specifications (Sony HDC-4300 / Box Lens Style)
// ─────────────────────────────────────────────────────────────────────────────

interface CameraTargetSpec {
  target: [number, number, number];
  isLive: boolean;
}

/**
 * Computes Pan (Yaw) and Tilt (Pitch) angles so that the camera (pointing towards -Z in local coords)
 * aims accurately at the specified 3D world target.
 */
function computeEulerAngles(
  camWorldPos: [number, number, number],
  targetWorldPos: [number, number, number]
): { yaw: number; pitch: number } {
  const dx = targetWorldPos[0] - camWorldPos[0];
  const dy = targetWorldPos[1] - camWorldPos[1];
  const dz = targetWorldPos[2] - camWorldPos[2];

  // Camera default orientation faces -Z.
  // When looking towards -Z with dx = 0: yaw = 0.
  // When turning right (dx > 0): yaw is negative around +Y in Three.js right-handed system.
  const yaw = -Math.atan2(dx, -dz);

  const horizontalDist = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
  // Positive rotation around +X tilts the nose downwards (-Z -> -Y).
  // If target is lower than camera (dy < 0), pitch should tilt downwards (positive).
  const pitch = Math.atan2(-dy, horizontalDist);

  return { yaw, pitch };
}

/**
 * Generates high-res broadcast decal texture for "SCANNER | EGRIPMENT" on Jib boom arm (Image 1)
 */
function createEgripmentDecalTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, 1024, 128);

  // Bold white text with subtle edge highlight
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SCANNER  |  EGRIPMENT", 512, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Studio Pedestal Camera Rig with Fluid Head & Tally System
// ─────────────────────────────────────────────────────────────────────────────

interface PedestalCameraProps {
  position: [number, number, number];
  target: [number, number, number];
  isLive: boolean;
  zoom?: number;
  label: string;
  hasCameraman?: boolean;
}

function PedestalCamera({
  position,
  target,
  isLive,
  zoom = 1.0,
  label,
  hasCameraman = true,
}: PedestalCameraProps) {
  const panGroupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const lensBarrelRef = useRef<THREE.Mesh>(null);
  const tallyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const operatorHeadRef = useRef<THREE.Group>(null);

  // Exact fluid head pivot height in world coordinates
  const headWorldPos = useMemo<[number, number, number]>(() => {
    return [position[0], position[1] + 1.45, position[2]];
  }, [position]);

  // Dynamic tracking in useFrame for broadcast-smooth fluid head movement
  useFrame((_, delta) => {
    const { yaw, pitch } = computeEulerAngles(headWorldPos, target);

    if (panGroupRef.current) {
      panGroupRef.current.rotation.y = THREE.MathUtils.damp(
        panGroupRef.current.rotation.y,
        yaw,
        5.5,
        delta
      );
    }

    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.x = THREE.MathUtils.damp(
        tiltGroupRef.current.rotation.x,
        pitch,
        5.5,
        delta
      );
    }

    // Telescoping zoom barrel reaction
    if (lensBarrelRef.current) {
      const targetZ = -0.38 - (zoom - 1.0) * 0.12;
      lensBarrelRef.current.position.z = THREE.MathUtils.damp(
        lensBarrelRef.current.position.z,
        targetZ,
        4.0,
        delta
      );
    }

    // Cameraman head tracking (head aligns with the 7" viewfinder)
    if (operatorHeadRef.current && panGroupRef.current) {
      operatorHeadRef.current.rotation.y = THREE.MathUtils.damp(
        operatorHeadRef.current.rotation.y,
        panGroupRef.current.rotation.y * 0.85,
        5.0,
        delta
      );
    }

    // Tally light emissive update
    if (tallyMatRef.current) {
      const targetColor = isLive ? "#ef4444" : "#15803d";
      const targetIntensity = isLive ? 2.2 : 0.35;
      tallyMatRef.current.color.set(targetColor);
      tallyMatRef.current.emissive.set(targetColor);
      tallyMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        tallyMatRef.current.emissiveIntensity,
        targetIntensity,
        8.0,
        delta
      );
    }
  });

  // Reusable materials
  const chassisMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.85, roughness: 0.25 }),
    []
  );
  const chromeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.95, roughness: 0.12 }),
    []
  );
  const boxLensBodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f8fafc", metalness: 0.40, roughness: 0.30 }),
    []
  );
  const matteBlackMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#050811", metalness: 0.70, roughness: 0.50 }),
    []
  );
  const opticalGlassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0369a1", metalness: 0.90, roughness: 0.05 }),
    []
  );
  const tallyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isLive ? "#ef4444" : "#15803d",
        emissive: isLive ? "#ef4444" : "#15803d",
        emissiveIntensity: isLive ? 2.2 : 0.35,
        roughness: 0.2,
      }),
    [isLive]
  );
  const screenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: isLive ? "#1e3a8a" : "#0f172a",
      }),
    [isLive]
  );

  return (
    <group position={position}>
      {/* ── A. CASTORS & BASE DOLLY (Triangular 3-Arm Star Dolly) ── */}
      <group position={[0, 0.05, 0]}>
        {/* Central Dolly Hub */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.22, 0.26, 0.08, 24]} />
          <primitive object={chassisMat} attach="material" />
        </mesh>

        {/* 3 Heavy Radial Arms at 120° with Double Wheels and Cable Sweepers */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((rad, idx) => {
          const armLen = 0.46;
          const armX = Math.sin(rad) * (armLen / 2 + 0.15);
          const armZ = Math.cos(rad) * (armLen / 2 + 0.15);
          const wheelX = Math.sin(rad) * (armLen + 0.18);
          const wheelZ = Math.cos(rad) * (armLen + 0.18);

          return (
            <group key={`dolly-arm-${idx}`}>
              {/* Radial Arm */}
              <mesh position={[armX, 0.04, armZ]} rotation={[0, rad, 0]}>
                <boxGeometry args={[0.10, 0.065, armLen]} />
                <primitive object={chassisMat} attach="material" />
              </mesh>

              {/* Wheel Caster Assembly & Cable Sweeper Guard */}
              <group position={[wheelX, 0, wheelZ]} rotation={[0, rad, 0]}>
                {/* Cable Sweeper Shield */}
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.12, 0.03, 0.12]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>
                {/* Left Wheel */}
                <mesh position={[-0.035, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.045, 0.045, 0.025, 16]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>
                {/* Right Wheel */}
                <mesh position={[0.035, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.045, 0.045, 0.025, 16]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>
              </group>
            </group>
          );
        })}

        {/* Floor Heavy SMPTE Studio Cable Coil */}
        <mesh position={[0.12, 0.015, 0.22]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <torusGeometry args={[0.38, 0.022, 12, 28]} />
          <primitive object={matteBlackMat} attach="material" />
        </mesh>
      </group>

      {/* ── B. PNEUMATIC PEDESTAL COLUMN ── */}
      {/* Lower Cylinder Barrel */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.09, 0.095, 0.72, 24]} />
        <primitive object={chassisMat} attach="material" />
      </mesh>

      {/* Circular Steering Wheel / Handwheel Ring for Height & Direction */}
      <group position={[0, 0.78, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.016, 12, 32]} />
          <primitive object={chromeMat} attach="material" />
        </mesh>
        {/* 4 Handwheel Spokes */}
        {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((sRad, sIdx) => (
          <mesh key={`spoke-${sIdx}`} rotation={[0, sRad, 0]}>
            <boxGeometry args={[0.016, 0.012, 0.63]} />
            <primitive object={chromeMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Upper Chrome Pneumatic Piston (Polished Dual-stage cylinder) */}
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.48, 24]} />
        <primitive object={chromeMat} attach="material" />
      </mesh>

      {/* ── C. FLUID HEAD WITH PAN (YAW) & TILT (PITCH) ROTATORS ── */}
      <group position={[0, 1.28, 0]}>
        {/* Pan Base Hub */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 20]} />
          <primitive object={chassisMat} attach="material" />
        </mesh>

        {/* 1. PAN ROTATOR (Rotates horizontally around Y axis) */}
        <group ref={panGroupRef}>
          {/* Fluid Head Chassis */}
          <mesh position={[0, 0.10, 0]}>
            <boxGeometry args={[0.16, 0.12, 0.18]} />
            <primitive object={chassisMat} attach="material" />
          </mesh>

          {/* 2. TILT ROTATOR (Pivots vertically around X axis at Y = +0.17) */}
          <group ref={tiltGroupRef} position={[0, 0.17, 0]}>
            {/* Camera Mounting Baseplate */}
            <mesh position={[0, 0.015, 0]}>
              <boxGeometry args={[0.17, 0.03, 0.28]} />
              <primitive object={chassisMat} attach="material" />
            </mesh>

            {/* Twin Pan/Tilt Control Handles with Foam Grips (Extending toward Cameraman, +Z) */}
            <group position={[0, 0.02, 0.08]}>
              {/* Left Handle */}
              <mesh position={[-0.14, 0.02, 0.24]} rotation={[0.22, -0.15, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.45, 12]} />
                <primitive object={chromeMat} attach="material" />
              </mesh>
              <mesh position={[-0.17, 0.07, 0.42]} rotation={[0.22, -0.15, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>

              {/* Right Handle (with Zoom Demand rocker box) */}
              <mesh position={[0.14, 0.02, 0.24]} rotation={[0.22, 0.15, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.45, 12]} />
                <primitive object={chromeMat} attach="material" />
              </mesh>
              <mesh position={[0.17, 0.07, 0.42]} rotation={[0.22, 0.15, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
              {/* Zoom Rocker Module */}
              <mesh position={[0.17, 0.09, 0.38]}>
                <boxGeometry args={[0.035, 0.025, 0.045]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
            </group>

            {/* ── D. SONY HDC-4300 STYLE BROADCAST CAMERA BODY ── */}
            <group position={[0, 0.14, 0.02]}>
              {/* Main Camera Body (Graphite Grey Housing) */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.18, 0.20, 0.32]} />
                <primitive object={chassisMat} attach="material" />
              </mesh>

              {/* Side Status Panel / OLED Display */}
              <mesh position={[0.092, 0.02, -0.02]}>
                <planeGeometry args={[0.12, 0.08]} />
                <meshBasicMaterial color="#0284c7" />
              </mesh>

              {/* Top Carrying Handle with Rigging Rods */}
              <mesh position={[0, 0.12, -0.02]}>
                <boxGeometry args={[0.03, 0.04, 0.26]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
              <mesh position={[0, 0.14, -0.15]}>
                <cylinderGeometry args={[0.015, 0.015, 0.08, 12]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>

              {/* ── E. TELEPHOTO BOX LENS (Broadcast White Housing) ── */}
              <group position={[0, 0.01, -0.26]}>
                {/* Main Box Lens Housing */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.20, 0.20, 0.28]} />
                  <primitive object={boxLensBodyMat} attach="material" />
                </mesh>

                {/* Box Lens Side Graphic Stripe (VTV Blue Accent) */}
                <mesh position={[0.102, 0, 0]}>
                  <boxGeometry args={[0.002, 0.04, 0.22]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
                <mesh position={[-0.102, 0, 0]}>
                  <boxGeometry args={[0.002, 0.04, 0.22]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>

                {/* Telescoping Zoom Barrel (Dynamic movement with zoom) */}
                <mesh ref={lensBarrelRef} position={[0, 0, -0.38]} rotation={[-Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.095, 0.098, 0.18, 24]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>

                {/* Professional Square Matte Box Hood */}
                <group position={[0, 0, -0.26]}>
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.24, 0.24, 0.08]} />
                    <primitive object={matteBlackMat} attach="material" />
                  </mesh>

                  {/* Optical Front Element (Deep Coated Glass) */}
                  <mesh position={[0, 0, -0.041]} rotation={[Math.PI, 0, 0]}>
                    <circleGeometry args={[0.095, 24]} />
                    <primitive object={opticalGlassMat} attach="material" />
                  </mesh>

                  {/* Front Lens Tally Light (Red On-Air / Green Standby) */}
                  <mesh position={[0, 0.13, -0.02]}>
                    <boxGeometry args={[0.07, 0.022, 0.03]} />
                    <primitive ref={tallyMatRef} object={tallyMat} attach="material" />
                  </mesh>
                </group>
              </group>

              {/* ── F. 7-INCH STUDIO VIEWFINDER (Mounted on Top Rear facing Cameraman) ── */}
              <group position={[0, 0.22, 0.11]} rotation={[-0.18, 0, 0]}>
                {/* Viewfinder Monitor Housing */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.22, 0.15, 0.05]} />
                  <primitive object={chassisMat} attach="material" />
                </mesh>

                {/* 3-Sided Folding Sunhood */}
                <mesh position={[0, 0.08, 0.04]} rotation={[0.35, 0, 0]}>
                  <boxGeometry args={[0.22, 0.015, 0.09]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>
                <mesh position={[-0.11, 0, 0.04]} rotation={[0, -0.35, 0]}>
                  <boxGeometry args={[0.015, 0.15, 0.09]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>
                <mesh position={[0.11, 0, 0.04]} rotation={[0, 0.35, 0]}>
                  <boxGeometry args={[0.015, 0.15, 0.09]} />
                  <primitive object={matteBlackMat} attach="material" />
                </mesh>

                {/* 7-Inch LCD Screen (Facing Cameraman, +Z) */}
                <mesh position={[0, 0, 0.026]}>
                  <planeGeometry args={[0.19, 0.12]} />
                  <primitive object={screenMat} attach="material" />
                </mesh>

                {/* Viewfinder Top Tally Light */}
                <mesh position={[0, 0.088, 0]}>
                  <boxGeometry args={[0.08, 0.024, 0.035]} />
                  <primitive object={tallyMat} attach="material" />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ── G. CAMERAMAN OPERATOR FIGURE (Manning the Pedestal) ── */}
      {hasCameraman && (
        <group position={[0, 0, 0.68]}>
          {/* Feet & Technical Safety Shoes */}
          <mesh position={[-0.14, 0.04, 0]}>
            <boxGeometry args={[0.11, 0.08, 0.24]} />
            <primitive object={matteBlackMat} attach="material" />
          </mesh>
          <mesh position={[0.14, 0.04, 0]}>
            <boxGeometry args={[0.11, 0.08, 0.24]} />
            <primitive object={matteBlackMat} attach="material" />
          </mesh>

          {/* Lower Legs (Trousers in #1e293b) */}
          <mesh position={[-0.14, 0.26, -0.02]}>
            <cylinderGeometry args={[0.055, 0.055, 0.36, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
          </mesh>
          <mesh position={[0.14, 0.26, -0.02]}>
            <cylinderGeometry args={[0.055, 0.055, 0.36, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
          </mesh>

          {/* Thighs */}
          <mesh position={[-0.14, 0.62, -0.04]}>
            <cylinderGeometry args={[0.065, 0.06, 0.38, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
          </mesh>
          <mesh position={[0.14, 0.62, -0.04]}>
            <cylinderGeometry args={[0.065, 0.06, 0.38, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
          </mesh>

          {/* Torso: Dark Technical Crew Polo (#0f172a) */}
          <group position={[0, 1.10, -0.06]}>
            {/* Belt */}
            <mesh position={[0, -0.28, 0]}>
              <boxGeometry args={[0.34, 0.05, 0.22]} />
              <primitive object={matteBlackMat} attach="material" />
            </mesh>
            {/* Chest & Belly */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.38, 0.52, 0.24]} />
              <meshStandardMaterial color="#0f172a" metalness={0.15} roughness={0.85} />
            </mesh>
            {/* Collar & VTV Badge */}
            <mesh position={[0, 0.27, -0.02]}>
              <boxGeometry args={[0.16, 0.04, 0.16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-0.10, 0.12, -0.122]}>
              <planeGeometry args={[0.05, 0.03]} />
              <meshBasicMaterial color="#dc2626" />
            </mesh>

            {/* Left Arm Gripping Left Pan Handle */}
            <group position={[-0.20, 0.18, 0]}>
              {/* Upper arm */}
              <mesh position={[-0.04, -0.16, -0.06]} rotation={[0.4, 0.15, -0.2]}>
                <cylinderGeometry args={[0.042, 0.042, 0.30, 12]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              {/* Forearm & Hand */}
              <mesh position={[-0.02, -0.26, -0.22]} rotation={[1.1, -0.1, 0.1]}>
                <cylinderGeometry args={[0.038, 0.038, 0.28, 12]} />
                <meshStandardMaterial color="#e2b697" />
              </mesh>
            </group>

            {/* Right Arm Gripping Right Pan Handle & Zoom Rocker */}
            <group position={[0.20, 0.18, 0]}>
              {/* Upper arm */}
              <mesh position={[0.04, -0.16, -0.06]} rotation={[0.4, -0.15, 0.2]}>
                <cylinderGeometry args={[0.042, 0.042, 0.30, 12]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              {/* Forearm & Hand */}
              <mesh position={[0.02, -0.26, -0.22]} rotation={[1.1, 0.1, -0.1]}>
                <cylinderGeometry args={[0.038, 0.038, 0.28, 12]} />
                <meshStandardMaterial color="#e2b697" />
              </mesh>
            </group>
          </group>

          {/* Head & Studio Intercom Headset */}
          <group ref={operatorHeadRef} position={[0, 1.50, -0.08]}>
            {/* Head (Skin tone) */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshStandardMaterial color="#e2b697" roughness={0.6} />
            </mesh>
            {/* Hair */}
            <mesh position={[0, 0.04, -0.02]}>
              <sphereGeometry args={[0.114, 18, 18]} />
              <meshStandardMaterial color="#171717" roughness={0.9} />
            </mesh>

            {/* Studio Intercom Headset (Over-ear Headphone with Boom Mic) */}
            <group position={[0, 0.02, 0]}>
              {/* Headband Arch */}
              <mesh position={[0, 0.10, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.12, 0.012, 10, 24, Math.PI]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
              {/* Left Ear Cushion */}
              <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.035, 16]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
              {/* Right Ear Cushion */}
              <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.035, 16]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
              {/* Flexible Boom Microphone to Mouth */}
              <mesh position={[-0.12, -0.05, -0.08]} rotation={[0.4, -0.3, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.14, 8]} />
                <primitive object={chromeMat} attach="material" />
              </mesh>
              {/* Foam Mic Windscreen */}
              <mesh position={[-0.07, -0.08, -0.14]}>
                <sphereGeometry args={[0.014, 12, 12]} />
                <primitive object={matteBlackMat} attach="material" />
              </mesh>
            </group>
          </group>
        </group>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. High-Elevation Jib Crane Rig ("SCANNER EGRIPMENT" on Stage Floor, Image 1)
// ─────────────────────────────────────────────────────────────────────────────

interface JibCraneRigProps {
  position: [number, number, number];
  target: [number, number, number];
  isLive: boolean;
}

function JibCraneRig({ position, target, isLive }: JibCraneRigProps) {
  const gimbalRef = useRef<THREE.Group>(null);
  const tallyMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const egripmentTex = useMemo(() => createEgripmentDecalTexture(), []);

  // Boom tip world position where camera head hovers: reaches diagonally forward and up
  // Base at [-3.80, 0.22, 3.20] -> Tip reaches [-1.4, 5.5, -0.6]
  const tipPos = useMemo<[number, number, number]>(() => {
    return [position[0] + 2.4, position[1] + 5.28, position[2] - 3.8];
  }, [position]);

  useFrame((_, delta) => {
    const { yaw, pitch } = computeEulerAngles(tipPos, target);

    if (gimbalRef.current) {
      gimbalRef.current.rotation.y = THREE.MathUtils.damp(
        gimbalRef.current.rotation.y,
        yaw,
        5.0,
        delta
      );
      gimbalRef.current.rotation.x = THREE.MathUtils.damp(
        gimbalRef.current.rotation.x,
        pitch,
        5.0,
        delta
      );
    }

    if (tallyMatRef.current) {
      const targetColor = isLive ? "#ef4444" : "#15803d";
      const targetIntensity = isLive ? 2.5 : 0.35;
      tallyMatRef.current.color.set(targetColor);
      tallyMatRef.current.emissive.set(targetColor);
      tallyMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        tallyMatRef.current.emissiveIntensity,
        targetIntensity,
        8.0,
        delta
      );
    }
  });

  const trussMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.85, roughness: 0.25 }),
    []
  );
  const baseMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0b1120", metalness: 0.90, roughness: 0.20 }),
    []
  );
  const weightMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.8, roughness: 0.4 }),
    []
  );
  const tallyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isLive ? "#ef4444" : "#15803d",
        emissive: isLive ? "#ef4444" : "#15803d",
        emissiveIntensity: isLive ? 2.5 : 0.35,
        roughness: 0.2,
      }),
    [isLive]
  );

  return (
    <group position={position}>
      {/* ── A. HEAVY 4-WHEEL JIB BASE & LEVELING JACKS ── */}
      <group position={[0, 0.08, 0]}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.95, 0.14, 1.25]} />
          <primitive object={baseMat} attach="material" />
        </mesh>

        {/* 4 Heavy-Duty Castor Wheels */}
        {[-0.45, 0.45].map((wx, ix) =>
          [-0.55, 0.55].map((wz, iz) => (
            <group key={`jib-wheel-${ix}-${iz}`} position={[wx, 0.02, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
                <primitive object={baseMat} attach="material" />
              </mesh>
            </group>
          ))
        )}

        {/* Cable sweepers / leveling stabilizers */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[1.05, 0.04, 1.35]} />
          <primitive object={baseMat} attach="material" />
        </mesh>
      </group>

      {/* Central Fulcrum Tower (rising to Y = 1.65m) */}
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.14, 0.20, 1.55, 16]} />
        <primitive object={trussMat} attach="material" />
      </mesh>
      {/* Hydraulic Pivot Bearing Hub */}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.22, 20]} />
        <primitive object={baseMat} attach="material" />
      </mesh>

      {/* ── B. COUNTERWEIGHT BASKET & BARBELL WEIGHTS (Rear tail towards outer stage) ── */}
      <group position={[-0.45, 1.55, 0.85]} rotation={[0, 0.45, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.48, 0.32, 0.42]} />
          <primitive object={baseMat} attach="material" />
        </mesh>
        {/* Cast Iron Barbells / Weight Discs */}
        {[-0.16, 0, 0.16].map((px, pIdx) => (
          <mesh key={`plate-${pIdx}`} position={[px, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.07, 24]} />
            <primitive object={weightMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* ── C. TELESCOPING BOOM ARM ("SCANNER EGRIPMENT", Image 1) ── */}
      {/* Arm pivots from [0, 1.65, 0] angling up and forward-right across stage towards center */}
      <group position={[0, 1.65, 0]} rotation={[-0.35, -0.56, 0.15]}>
        {/* Main Boom Arm Body (Heavy Rectangular Profile, Length 6.2m) */}
        <mesh position={[0, 0, -3.1]}>
          <boxGeometry args={[0.24, 0.32, 6.2]} />
          <primitive object={baseMat} attach="material" />
        </mesh>

        {/* Left Side Decal: "SCANNER | EGRIPMENT" */}
        {egripmentTex && (
          <mesh position={[-0.122, 0, -3.1]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[4.8, 0.26]} />
            <meshBasicMaterial map={egripmentTex} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Right Side Decal: "SCANNER | EGRIPMENT" */}
        {egripmentTex && (
          <mesh position={[0.122, 0, -3.1]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[4.8, 0.26]} />
            <meshBasicMaterial map={egripmentTex} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Tension Cables & Guy Wires */}
        <mesh position={[0, 0.28, -3.1]}>
          <boxGeometry args={[0.02, 0.20, 5.8]} />
          <primitive object={trussMat} attach="material" />
        </mesh>

        {/* ── D. MOTORIZED REMOTE 3-AXIS GIMBAL HEAD AT BOOM TIP ── */}
        <group position={[0, 0, -6.2]}>
          {/* Gimbal Mount Bracket */}
          <mesh position={[0, -0.10, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.16, 16]} />
            <primitive object={baseMat} attach="material" />
          </mesh>

          {/* Gimbal Dynamic Pivot */}
          <group ref={gimbalRef}>
            {/* U-Shaped Gimbal Yoke */}
            <mesh position={[0, -0.22, 0]}>
              <boxGeometry args={[0.26, 0.08, 0.20]} />
              <primitive object={trussMat} attach="material" />
            </mesh>

            {/* Camera Body + High-End Broadcast Lens */}
            <group position={[0, -0.32, 0]}>
              {/* Camera Body */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.18, 0.16, 0.28]} />
                <primitive object={baseMat} attach="material" />
              </mesh>
              {/* Box Lens */}
              <mesh position={[0, 0, -0.24]}>
                <boxGeometry args={[0.15, 0.15, 0.22]} />
                <primitive object={baseMat} attach="material" />
              </mesh>
              {/* Front Optical Glass */}
              <mesh position={[0, 0, -0.352]} rotation={[Math.PI, 0, 0]}>
                <circleGeometry args={[0.068, 20]} />
                <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.05} />
              </mesh>
              {/* Top Tally Light */}
              <mesh position={[0, 0.10, -0.06]}>
                <boxGeometry args={[0.08, 0.025, 0.03]} />
                <primitive ref={tallyMatRef} object={tallyMat} attach="material" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Broadcast Cameras Component
// ─────────────────────────────────────────────────────────────────────────────

export function BroadcastCameras({
  camAngle = 1,
  ptzZoom = 1.0,
  pushInProgress = 0,
  totalSeats = 4,
}: BroadcastCamerasProps) {
  // Determine active on-air camera and targets
  // Left Pedestal Camera at [-6.20, 0.22, 7.80]:
  // Active when covering Cam 2 (LED Wall), Cam 3 (MC Desk), or Cam 11 (Audience/Stairs)
  const leftCamSpec: CameraTargetSpec = useMemo(() => {
    if (camAngle === 3) {
      return { target: [3.12, 1.02, -7.16], isLive: true }; // Coaxial straight-on MC Desk & Grounded Hexagon Portal
    }
    if (camAngle === 2) {
      return { target: [5.8, 3.2, -2.2], isLive: true }; // Main LED Wall
    }
    if (camAngle === 11) {
      return { target: [0.0, 1.8, 9.5], isLive: true }; // Audience / Staircase
    }
    // Standby Ready Angle: Facing Main Stage Center
    return { target: [0.0, 1.8, -3.2], isLive: false };
  }, [camAngle]);

  // Right Pedestal Camera at [+6.20, 0.22, 7.80]:
  // Active when covering Cam 4 (Laurel Vitrine), Cam 10 (Science Wall), Cam 14 (Low-Angle Hero Shot), or contestant round shots
  const rightCamSpec: CameraTargetSpec = useMemo(() => {
    const activeCam = camAngle;
    const isContestantActive = (activeCam >= 5 && activeCam <= 8) || (activeCam >= 25 && activeCam <= 28);
    const isRightActive = activeCam === 10 || (activeCam >= 5 && activeCam <= 8) || (activeCam >= 25 && activeCam <= 28);

    if (isContestantActive) {
      // Focus directly on the exact contestant podium along the active totalSeats arc
      const seatIdx = activeCam >= 25 ? activeCam - 25 + 4 : activeCam - 5;
      const targetPos = getContestantPodiumWorldPos(seatIdx, totalSeats || 4, 1.25);
      return { target: targetPos, isLive: isRightActive };
    }
    if (activeCam === 4) {
      return { target: [1.8, 0.75, 2.6], isLive: true }; // Laurel Vitrine
    }
    if (activeCam === 10) {
      return { target: [-5.8, 2.5, -3.2], isLive: isRightActive }; // Science Wall
    }
    if (activeCam === 14) {
      return { target: [1.60, 1.80, -3.20], isLive: true }; // Low-Angle Hero Shot across stage behind Laurel Vitrine
    }
    // Standby Ready Angle: Facing Contestant Arc
    return { target: [-5.2, 1.4, -3.6], isLive: false };
  }, [camAngle, totalSeats]);

  // Jib Crane at [-8.50, 0.22, 11.00] (Camera Pit in floor wing per real studio layout):
  // Active when Cam 9 is selected
  const jibCamSpec: CameraTargetSpec = useMemo(() => {
    if (camAngle === 9) {
      return { target: [0.0, 1.8, -3.2], isLive: true };
    }
    return { target: [0.0, 1.8, -3.2], isLive: false };
  }, [camAngle]);

  const effectiveZoom = ptzZoom + pushInProgress * 0.3;

  // Authentic Broadcast Directing:
  // On primary broadcast shots (Cam 1 Toàn Cảnh & Cam 3 Bục MC), the jib crane is parked/hidden
  // so the broadcast frame is 100% clean and never obstructed by camera hardware.
  // Visible during audience shots (Cam 11, Cam 12) or crane angle itself (Cam 9).
  const isJibVisible = camAngle !== 1 && camAngle !== 3;

  return (
    <group name="studio-broadcast-cameras">
      {/* ── 1. LEFT PEDESTAL BROADCAST CAMERA & OPERATOR (Floor level flanking grandstand wing left) ── */}
      <PedestalCamera
        position={[-6.20, 0.22, 7.80]}
        target={leftCamSpec.target}
        isLive={leftCamSpec.isLive}
        zoom={leftCamSpec.isLive ? effectiveZoom : 1.0}
        label="CAM A (Left Stage & MC Coverage)"
        hasCameraman={true}
      />

      {/* ── 2. RIGHT PEDESTAL BROADCAST CAMERA & OPERATOR (Floor level flanking grandstand wing right) ── */}
      <PedestalCamera
        position={[6.20, 0.22, 7.80]}
        target={rightCamSpec.target}
        isLive={rightCamSpec.isLive}
        zoom={rightCamSpec.isLive ? effectiveZoom : 1.0}
        label="CAM B (Right Contestants & Vitrine Coverage)"
        hasCameraman={true}
      />

      {/* ── 3. SCANNER EGRIPMENT JIB CRANE RIG (Parked in Camera Pit, tucked away from Cam 1/3) ── */}
      <group visible={isJibVisible}>
        <JibCraneRig
          position={[-8.50, 0.22, 11.00]}
          target={jibCamSpec.target}
          isLive={jibCamSpec.isLive}
        />
      </group>
    </group>
  );
}
