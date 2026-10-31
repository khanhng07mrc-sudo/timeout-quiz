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
    label: "Toàn Cảnh",
    pos: [0.0, 3.2, 7.8],
    target: [0.0, 2.0, -1.5],
  },
  2: {
    id: 2,
    label: "Bục Thí Sinh",
    pos: [0.9, 2.3, 2.2],
    target: [0.9, 1.4, -2.8],
  },
  3: {
    id: 3,
    label: "Bục MC",
    pos: [-3.0, 2.0, 0.2],
    target: [-4.5, 1.4, -2.0],
  },
  4: {
    id: 4,
    label: "Nguyệt Quế",
    pos: [-1.7, 1.9, -3.2],
    target: [-2.4, 1.5, -4.8],
  },
  5: {
    id: 5,
    label: "Cận Cảnh TS 1",
    pos: [-1.8, 1.7, -0.6],
    target: [-1.8, 1.35, -2.5],
  },
  6: {
    id: 6,
    label: "Cận Cảnh TS 2",
    pos: [0.0, 1.7, -1.0],
    target: [0.0, 1.35, -2.9],
  },
  7: {
    id: 7,
    label: "Cận Cảnh TS 3",
    pos: [1.8, 1.7, -1.0],
    target: [1.8, 1.35, -2.9],
  },
  8: {
    id: 8,
    label: "Cận Cảnh TS 4",
    pos: [3.6, 1.7, -0.6],
    target: [3.6, 1.35, -2.5],
  },
  9: {
    id: 9,
    label: "Góc Cao",
    pos: [0.0, 6.8, 1.2],
    target: [0.0, 1.0, -2.6],
  },
  10: {
    id: 10,
    label: "Màn LED",
    pos: [0.0, 3.2, 3.8],
    target: [0.0, 3.8, -6.5],
  },
};

interface CameraControllerProps {
  camAngle: number;
  transitionMode?: "CUT" | "MORPH";
  pushInProgress?: number;
  ptzYaw?: number;
  ptzPitch?: number;
  ptzZoom?: number;
}

export function CameraController({
  camAngle = 1,
  transitionMode = "CUT",
  pushInProgress = 0,
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

    // Responsive aspect calculation
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

    // Calculate position with push-in (dolly zoom forward during questions)
    const effectivePos = new THREE.Vector3(...cfg.pos);
    const effectiveTarget = targetLookAtRef.current.clone();

    if (pushInProgress > 0) {
      const forward = new THREE.Vector3(...cfg.target).sub(effectivePos).normalize();
      effectivePos.addScaledVector(forward, pushInProgress * 0.45);
    }

    if (!initialized.current) {
      camera.position.copy(effectivePos);
      targetLookAtRef.current.set(...cfg.target);
      camera.lookAt(targetLookAtRef.current);
      initialized.current = true;
      return;
    }

    // Calculate effective look-at target with PTZ Yaw/Pitch
    if (ptzYaw !== 0 || ptzPitch !== 0) {
      const dir = effectiveTarget.clone().sub(effectivePos);
      const dist = dir.length();
      dir.normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), ptzYaw);
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (right.lengthSq() > 0.01) {
        dir.applyAxisAngle(right, ptzPitch);
      }
      effectiveTarget.copy(effectivePos).addScaledVector(dir, dist);
    }

    if (transitionMode === "CUT") {
      camera.position.copy(effectivePos);
      camera.lookAt(effectiveTarget);
      return;
    }

    // Morph: Smooth jib glide
    const factor = Math.min(1, delta * 4.5);
    camera.position.lerp(effectivePos, factor);
    targetLookAtRef.current.lerp(new THREE.Vector3(...cfg.target), factor);
    camera.lookAt(effectiveTarget);
  });

  return null;
}
