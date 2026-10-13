"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  mode: string;
  isOutro: boolean;
  sourceRect?: { top: number; left: number; width: number; height: number } | null;
}

export default function ArenaThreeScene({ mode, isOutro, sourceRect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isOutroRef = useRef(isOutro);
  isOutroRef.current = isOutro;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // ── 1. KHỞI TẠO THREE.JS SCENE, CAMERA, RENDERER ─────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // ── 2. HỆ THỐNG ÁNH SÁNG ĐA CHIỀU (STUDIO PBR LIGHTING) ──────────────────
    const ambientLight = new THREE.AmbientLight(0x0f172a, 3.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 4.0);
    mainLight.position.set(6, 10, 8);
    scene.add(mainLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 6.0, 30);
    cyanPointLight.position.set(-6, -4, 4);
    scene.add(cyanPointLight);

    const purplePointLight = new THREE.PointLight(0xa855f7, 5.0, 30);
    purplePointLight.position.set(6, -4, 4);
    scene.add(purplePointLight);

    // ── 3. VẬT LIỆU PBR KIM LOẠI VÀNG & THỦY TINH CYBERPUNK ──────────────────
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.92,
      roughness: 0.14,
      emissive: 0x854d0e,
      emissiveIntensity: 0.2,
    });

    const platinumMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.96,
      roughness: 0.08,
    });

    const cyanGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.2,
      roughness: 0.08,
      transparent: true,
      opacity: 0.88,
      emissive: 0x0891b2,
      emissiveIntensity: 0.45,
    });

    const purpleGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.45,
    });

    const rubyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      metalness: 0.4,
      roughness: 0.15,
      emissive: 0xe11d48,
      emissiveIntensity: 0.4,
    });

    // ── 4. XÂY DỰNG MÔ HÌNH 3D RIÊNG BIỆT CHO TỪNG MODE ──────────────────────
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const normalizedMode = (mode || "CLASSIC").toUpperCase();
    const outroElements: { mesh: THREE.Object3D; update: (t: number) => void }[] = [];

    if (normalizedMode === "MYSTERY_QUEST") {
      // ── MYSTERY QUEST: Chìa Khóa Hoàng Kim 3D + Ổ Khóa Hào Quang ───────────
      const keyGroup = new THREE.Group();

      // Đầu Chìa Khóa Tròn Khối Vàng (Torus Head)
      const headGeom = new THREE.TorusGeometry(1.2, 0.32, 16, 48);
      const headMesh = new THREE.Mesh(headGeom, goldMaterial);
      headMesh.position.set(0, 1.2, 0);
      keyGroup.add(headMesh);

      // Viên Tinh Thể Kim Cương Ở Tâm Đầu Chìa
      const gemGeom = new THREE.OctahedronGeometry(0.42);
      const gemMesh = new THREE.Mesh(gemGeom, cyanGlassMaterial);
      gemMesh.position.set(0, 1.2, 0);
      keyGroup.add(gemMesh);

      // Thân Chìa Khóa Đúc Khối (Shaft)
      const shaftGeom = new THREE.CylinderGeometry(0.22, 0.25, 2.8, 16);
      const shaftMesh = new THREE.Mesh(shaftGeom, goldMaterial);
      shaftMesh.position.set(0, -0.6, 0);
      keyGroup.add(shaftMesh);

      // Răng Chìa Khóa 3D (Teeth)
      const tooth1Geom = new THREE.BoxGeometry(0.85, 0.32, 0.28);
      const tooth1 = new THREE.Mesh(tooth1Geom, goldMaterial);
      tooth1.position.set(0.42, -1.6, 0);
      keyGroup.add(tooth1);

      const tooth2Geom = new THREE.BoxGeometry(0.65, 0.28, 0.28);
      const tooth2 = new THREE.Mesh(tooth2Geom, goldMaterial);
      tooth2.position.set(0.32, -1.15, 0);
      keyGroup.add(tooth2);

      // Điểm Xuyết Vòng Bạch Kim Phản Quang
      const ringGeom = new THREE.TorusGeometry(0.38, 0.08, 16, 32);
      const ringMesh = new THREE.Mesh(ringGeom, platinumMaterial);
      ringMesh.position.set(0, -0.1, 0);
      ringMesh.rotation.x = Math.PI / 2;
      keyGroup.add(ringMesh);

      // Vòng Hào Quang Ổ Khóa 3D Ở Phía Sau
      const haloGeom = new THREE.RingGeometry(2.4, 2.55, 64);
      const haloMesh = new THREE.Mesh(
        haloGeom,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      haloMesh.position.set(0, 0, -0.8);
      rootGroup.add(haloMesh);

      rootGroup.add(keyGroup);

      outroElements.push({
        mesh: keyGroup,
        update: (progress) => {
          // Khi Outro: Chìa khóa xoay 90 độ như cắm vào ổ và vặn khóa
          keyGroup.rotation.z = progress * (Math.PI / 2);
          keyGroup.position.z = Math.sin(progress * Math.PI) * 1.5;
          haloMesh.scale.setScalar(1 + progress * 8);
          haloMesh.rotation.z = progress * 4;
        },
      });
    } else if (normalizedMode === "GRID_CARO") {
      // ── GRID CARO: Bảng Cờ Caro 3D Thủy Tinh & 9 Khối Lập Phương ───────────
      const caroGroup = new THREE.Group();

      // Mặt Bảng Cờ 3D Thủy Tinh Nền
      const boardGeom = new THREE.BoxGeometry(4.4, 4.4, 0.35);
      const boardMesh = new THREE.Mesh(boardGeom, cyanGlassMaterial);
      caroGroup.add(boardMesh);

      // Khung Viền Bạch Kim Bo Góc
      const frameGeom = new THREE.BoxGeometry(4.6, 4.6, 0.2);
      const frameMesh = new THREE.Mesh(frameGeom, platinumMaterial);
      frameMesh.position.set(0, 0, -0.1);
      caroGroup.add(frameMesh);

      // 9 Ô Cờ Khối Lập Thể Lơ Lửng
      for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
          const cellGeom = new THREE.BoxGeometry(1.15, 1.15, 0.22);
          const isCenter = r === 0 && c === 0;
          const cellMesh = new THREE.Mesh(cellGeom, isCenter ? goldMaterial : purpleGlassMaterial);
          cellMesh.position.set(c * 1.35, r * 1.35, 0.24);
          caroGroup.add(cellMesh);
        }
      }

      // Khối X 3D (Góc Trên Trái)
      const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.16), cyanGlassMaterial);
      xBar1.position.set(-1.35, 1.35, 0.42);
      xBar1.rotation.z = Math.PI / 4;
      caroGroup.add(xBar1);
      const xBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.16), cyanGlassMaterial);
      xBar2.position.set(-1.35, 1.35, 0.42);
      xBar2.rotation.z = -Math.PI / 4;
      caroGroup.add(xBar2);

      // Khối O 3D (Góc Dưới Phải)
      const oMesh = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 16, 32), rubyMaterial);
      oMesh.position.set(1.35, -1.35, 0.42);
      caroGroup.add(oMesh);

      caroGroup.rotation.x = 0.35;
      caroGroup.rotation.y = -0.3;
      rootGroup.add(caroGroup);

      outroElements.push({
        mesh: caroGroup,
        update: (progress) => {
          // Bảng caro phóng đại cực đại (Fly-Through Zoom) lọt qua ống kính camera
          caroGroup.position.z = progress * 14;
          caroGroup.scale.setScalar(1 + progress * 6);
        },
      });
    } else if (normalizedMode === "BUZZ") {
      // ── FAST BUZZ: Nút Chuông Bấm Kim Loại Chrome 3D ───────────────────────
      const buzzGroup = new THREE.Group();

      // Đế Chuông Trụ Bạc (Chrome Base)
      const baseGeom = new THREE.CylinderGeometry(2.6, 3.0, 0.6, 32);
      const baseMesh = new THREE.Mesh(baseGeom, platinumMaterial);
      buzzGroup.add(baseMesh);

      // Vành Đệm Cao Su Đen
      const rimGeom = new THREE.TorusGeometry(2.4, 0.16, 16, 32);
      const rimMesh = new THREE.Mesh(rimGeom, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
      rimMesh.position.set(0, 0.3, 0);
      rimMesh.rotation.x = Math.PI / 2;
      buzzGroup.add(rimMesh);

      // Núm Chuông Bán Cầu Đỏ Ruby 3D (Cap)
      const capGroup = new THREE.Group();
      const capGeom = new THREE.SphereGeometry(1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const capMesh = new THREE.Mesh(capGeom, rubyMaterial);
      capGroup.add(capMesh);

      // Đỉnh Chuông Nhấn Cơ Khí
      const pinGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16);
      const pinMesh = new THREE.Mesh(pinGeom, goldMaterial);
      pinMesh.position.set(0, 1.8, 0);
      capGroup.add(pinMesh);

      capGroup.position.set(0, 0.35, 0);
      buzzGroup.add(capGroup);

      buzzGroup.rotation.x = 0.5;
      rootGroup.add(buzzGroup);

      outroElements.push({
        mesh: buzzGroup,
        update: (progress) => {
          // Núm chuông dập nảy xuống với phản lực cơ học
          capGroup.position.y = 0.35 - Math.sin(progress * Math.PI) * 0.8;
          buzzGroup.scale.setScalar(1 + progress * 2.5);
        },
      });
    } else if (normalizedMode === "DICE_RACE") {
      // ── DICE RACE: Khối Xúc Xắc Bo Cạnh Lập Thể 3D ─────────────────────────
      const diceGroup = new THREE.Group();
      const diceGeom = new THREE.BoxGeometry(2.8, 2.8, 2.8);
      const diceMesh = new THREE.Mesh(diceGeom, purpleGlassMaterial);
      diceGroup.add(diceMesh);

      // Các Nốt Chấm Số Vàng 3D Nổi Tròn
      const dotGeom = new THREE.SphereGeometry(0.24, 16, 16);
      // Nốt mặt trước (1 nốt)
      const d1 = new THREE.Mesh(dotGeom, goldMaterial);
      d1.position.set(0, 0, 1.45);
      diceGroup.add(d1);
      // Nốt mặt trên (6 nốt)
      for (let rx = -0.65; rx <= 0.65; rx += 0.65) {
        for (let ry = -0.5; ry <= 0.5; ry += 1.0) {
          const d6 = new THREE.Mesh(dotGeom, platinumMaterial);
          d6.position.set(rx, 1.45, ry);
          diceGroup.add(d6);
        }
      }

      rootGroup.add(diceGroup);

      outroElements.push({
        mesh: diceGroup,
        update: (progress) => {
          diceGroup.rotation.x += 0.08;
          diceGroup.rotation.y += 0.08;
          diceGroup.scale.setScalar(1 + progress * 3.5);
        },
      });
    } else if (normalizedMode === "TOURNAMENT") {
      // ── TOURNAMENT: Cúp Vàng Vô Địch 1v1 3D Hoàng Kim ───────────────────────
      const cupGroup = new THREE.Group();

      const bowlGeom = new THREE.CylinderGeometry(1.6, 0.9, 2.2, 32);
      const bowl = new THREE.Mesh(bowlGeom, goldMaterial);
      cupGroup.add(bowl);

      const stemGeom = new THREE.CylinderGeometry(0.35, 0.45, 1.4, 16);
      const stem = new THREE.Mesh(stemGeom, goldMaterial);
      stem.position.set(0, -1.6, 0);
      cupGroup.add(stem);

      const cupBaseGeom = new THREE.CylinderGeometry(1.5, 1.6, 0.6, 32);
      const cupBase = new THREE.Mesh(cupBaseGeom, platinumMaterial);
      cupBase.position.set(0, -2.4, 0);
      cupGroup.add(cupBase);

      const handle1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.16, 16, 32), goldMaterial);
      handle1.position.set(1.5, 0.2, 0);
      cupGroup.add(handle1);

      const handle2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.16, 16, 32), goldMaterial);
      handle2.position.set(-1.5, 0.2, 0);
      cupGroup.add(handle2);

      rootGroup.add(cupGroup);

      outroElements.push({
        mesh: cupGroup,
        update: (progress) => {
          cupGroup.rotation.y += 0.05;
          cupGroup.scale.setScalar(1 + progress * 3.5);
        },
      });
    } else {
      // ── CÁC MODE CÒN LẠI: Tinh Thể Khối Pha Lê 3D Đa Diện Phát Quang ────────
      const crystalGroup = new THREE.Group();
      const crystalGeom = new THREE.IcosahedronGeometry(2.0, 0);
      const crystalMesh = new THREE.Mesh(crystalGeom, cyanGlassMaterial);
      crystalGroup.add(crystalMesh);

      const wireframe = new THREE.Mesh(
        crystalGeom,
        new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true, transparent: true, opacity: 0.7 })
      );
      crystalGroup.add(wireframe);

      rootGroup.add(crystalGroup);

      outroElements.push({
        mesh: crystalGroup,
        update: (progress) => {
          crystalGroup.rotation.x += 0.05;
          crystalGroup.rotation.y += 0.05;
          crystalGroup.scale.setScalar(1 + progress * 3.5);
        },
      });
    }

    // ── 5. QUỸ ĐẠO BAY TỪ TOẠ ĐỘ THẺ MODE RA TÂM (FLIGHT TRAJECTORY 350ms) ───
    const fovInRad = (camera.fov * Math.PI) / 180;
    const visibleHeightAtZero = 2 * Math.tan(fovInRad / 2) * camera.position.z;
    const visibleWidthAtZero = visibleHeightAtZero * (width / height);

    let startX = 0;
    let startY = 0;
    let startScale = 0.2;

    if (sourceRect) {
      const centerX = sourceRect.left + sourceRect.width / 2;
      const centerY = sourceRect.top + sourceRect.height / 2;
      const normX = centerX / width;
      const normY = centerY / height;
      startX = (normX - 0.5) * visibleWidthAtZero;
      startY = -(normY - 0.5) * visibleHeightAtZero;
      startScale = Math.max(0.15, sourceRect.width / 400);
    }

    const startTime = performance.now();
    let animFrameId: number;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);

      const elapsed = now - startTime;
      const takeoffT = Math.min(1.0, elapsed / 360);
      // Easing Cubic Out mượt mà
      const easeT = 1 - Math.pow(1 - takeoffT, 3);

      if (takeoffT < 1.0) {
        // Pha 1: Bay lướt xoay 3D từ toạ độ thẻ ra tâm màn hình (không hiện đột ngột!)
        rootGroup.position.x = startX * (1 - easeT);
        rootGroup.position.y = startY * (1 - easeT);
        rootGroup.position.z = -3 * (1 - easeT);
        rootGroup.scale.setScalar(startScale + (1.0 - startScale) * easeT);
        rootGroup.rotation.y = easeT * Math.PI * 2;
      } else {
        // Pha 2: Lơ lửng tại tâm, xoay nhẹ quanh trục phối cảnh
        const floatTime = (now - startTime - 360) * 0.002;
        rootGroup.position.x = 0;
        rootGroup.position.y = Math.sin(floatTime * 2) * 0.15;
        rootGroup.position.z = 0;

        if (!isOutroRef.current) {
          rootGroup.rotation.y = floatTime * 1.5;
        }
      }

      // Pha 3: Nếu Outro được kích hoạt (isOutro = true)
      if (isOutroRef.current) {
        const outroT = Math.min(1.0, (now - (startTime + 360)) / 550);
        outroElements.forEach((el) => el.update(outroT));
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    // ── 6. XỬ LÝ RESIZE CỬA SỔ TRÌNH DUYỆT ──────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // ── 7. CLEANUP TRIỆT TIÊU RÒ RỈ BỘ NHỚ KHI TRANSITION KẾT THÚC ──────────
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);

      // Giải phóng tài nguyên Three.js sạch sẽ
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode, sourceRect]);

  return <div ref={containerRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
}
