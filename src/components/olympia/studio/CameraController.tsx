"use client";

import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface CamConfig {
  id: number;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

/**
 * 10 Authentic Olympia Studio Broadcast Camera Presets
 */
export const OLYMPIA_CAM_PRESETS: Record<number, CamConfig> = {
  1: {
    id: 1,
    label: "CAM 1: Toàn Cảnh",
    pos: [0.0, 3.2, 7.8],
    target: [0.0, 2.0, -1.5],
  },
  2: {
    id: 2,
    label: "CAM 2: Màn LED",
    pos: [0.0, 3.2, 3.8],
    target: [0.0, 3.8, -6.5],
  },
  3: {
    id: 3,
    label: "CAM 3: Bục Thí Sinh",
    pos: [0.9, 2.3, 1.2],
    target: [0.9, 1.4, -2.8],
  },
  4: {
    id: 4,
    label: "CAM 4: Bục MC",
    pos: [-3.2, 2.2, 0.4],
    target: [-4.5, 1.6, -2.0],
  },
  5: {
    id: 5,
    label: "CAM 5: Nguyệt Quế",
    pos: [-1.7, 2.0, -3.2],
    target: [-2.4, 1.7, -4.8],
  },
  6: {
    id: 6,
    label: "CAM 6: Cận TS 1-2",
    pos: [-0.8, 2.0, -0.6],
    target: [-0.9, 1.4, -2.7],
  },
  7: {
    id: 7,
    label: "CAM 7: Cận TS 3-4",
    pos: [2.6, 2.0, -0.6],
    target: [2.7, 1.4, -2.9],
  },
  8: {
    id: 8,
    label: "CAM 8: Góc Nghiêng",
    pos: [6.8, 3.5, 2.0],
    target: [-1.0, 1.8, -3.5],
  },
  9: {
    id: 9,
    label: "CAM 9: Góc Cao",
    pos: [0.0, 6.8, 6.2],
    target: [0.0, 1.2, -2.5],
  },
  10: {
    id: 10,
    label: "CAM 10: Khán Giả",
    pos: [0.0, 2.6, -1.0],
    target: [0.0, 4.0, 15.0],
  },
};

interface CameraControllerProps {
  camAngle: number;
  transitionMode?: "CUT" | "MORPH";
  ptzYaw?: number;
  ptzPitch?: number;
  ptzZoom?: number;
}

export function CameraController({
  camAngle = 1,
  transitionMode = "CUT",
  ptzYaw = 0,
  ptzPitch = 0,
  ptzZoom = 1.0,
}: CameraControllerProps) {
  const { camera, size } = useThree();
  const targetConfig = useRef<CamConfig>(OLYMPIA_CAM_PRESETS[1]);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 2.0, -1.5));
  const initialized = useRef(false);
  const baseFov = 46;

  useEffect(() => {
    const nextCfg = OLYMPIA_CAM_PRESETS[camAngle] ?? OLYMPIA_CAM_PRESETS[1];
    targetConfig.current = nextCfg;

    // Hard Cut: 0ms instant broadcast switch
    if (transitionMode === "CUT" && initialized.current) {
      camera.position.set(...nextCfg.pos);
      targetLookAtRef.current.set(...nextCfg.target);
      camera.lookAt(targetLookAtRef.current);
    }
  }, [camAngle, transitionMode, camera]);

  useFrame((_, delta) => {
    const persCamera = camera as THREE.PerspectiveCamera;
    const cfg = targetConfig.current;

    if (!initialized.current) {
      camera.position.set(...cfg.pos);
      targetLookAtRef.current.set(...cfg.target);
      camera.lookAt(targetLookAtRef.current);
      initialized.current = true;
      return;
    }

    // ── RESPONSIVE HORIZONTAL FOV AUTO-ADAPTATION ──
    // When viewport aspect ratio is narrower than standard 16:9,
    // expand vertical FOV so the horizontal view never clips the stage
    const aspect = size.width / Math.max(1, size.height);
    let computedFov = baseFov;
    if (aspect < 16 / 9) {
      const baseHRad = 2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * (16 / 9));
      computedFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseHRad / 2) / aspect));
    }

    // Apply PTZ Zoom
    const clampedZoom = Math.max(1.0, Math.min(2.5, ptzZoom || 1.0));
    computedFov = Math.max(18, Math.min(68, computedFov / clampedZoom));

    if (Math.abs(persCamera.fov - computedFov) > 0.05) {
      persCamera.fov = THREE.MathUtils.lerp(persCamera.fov, computedFov, delta * 5.0);
      persCamera.updateProjectionMatrix();
    }

    // Calculate effective look-at target with PTZ Yaw/Pitch
    const effectiveTarget = targetLookAtRef.current.clone();
    if (ptzYaw !== 0 || ptzPitch !== 0) {
      const dir = effectiveTarget.clone().sub(camera.position);
      const dist = dir.length();
      dir.normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), ptzYaw);
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (right.lengthSq() > 0.01) {
        dir.applyAxisAngle(right, ptzPitch);
      }
      effectiveTarget.copy(camera.position).addScaledVector(dir, dist);
    }

    if (transitionMode === "CUT") {
      camera.lookAt(effectiveTarget);
      return;
    }

    // Morph: Smooth jib glide
    const factor = Math.min(1, delta * 4.5);
    camera.position.lerp(new THREE.Vector3(...cfg.pos), factor);
    targetLookAtRef.current.lerp(new THREE.Vector3(...cfg.target), factor);
    camera.lookAt(effectiveTarget);
  });

  return null;
}
