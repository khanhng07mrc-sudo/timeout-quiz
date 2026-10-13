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
    scene.fog = new THREE.FogExp2(0x070814, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // ── 2. HỆ THỐNG ÁNH SÁNG STUDIO ĐA CHIỀU (PBR STUDIO LIGHTING) ───────────
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffbeb, 4.5);
    mainLight.position.set(6, 12, 8);
    scene.add(mainLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 6.0, 35);
    cyanPointLight.position.set(-6, -4, 4);
    scene.add(cyanPointLight);

    const purplePointLight = new THREE.PointLight(0xa855f7, 5.5, 35);
    purplePointLight.position.set(6, -4, 4);
    scene.add(purplePointLight);

    const goldAccentLight = new THREE.PointLight(0xfacc15, 7.0, 25);
    goldAccentLight.position.set(0, 2, 6);
    scene.add(goldAccentLight);

    // ── 3. KHÔNG GIAN LƯỢNG TỬ (QUANTUM VOID: CYBER GRID & STARDUST PARTICLES) ─
    // Lưới Cyber Grid 3D lượn sóng dưới đáy
    const gridHelper = new THREE.GridHelper(60, 40, 0x06b6d4, 0x1e1b4b);
    gridHelper.position.y = -6;
    gridHelper.rotation.x = 0.15;
    scene.add(gridHelper);

    // Bụi sao vũ trụ 3D (Stardust Particles)
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 30;
      particlePositions[i + 1] = (Math.random() - 0.5) * 20;
      particlePositions[i + 2] = (Math.random() - 0.5) * 15;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.15,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(starField);

    // ── 4. BỘ VẬT LIỆU PBR KIM LOẠI VÀNG & THỦY TINH CYBERPUNK ────────────────
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.94,
      roughness: 0.12,
      emissive: 0x854d0e,
      emissiveIntensity: 0.25,
    });

    const platinumMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.08,
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });

    const cyanGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.2,
      roughness: 0.08,
      transparent: true,
      opacity: 0.88,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
    });

    const purpleGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.5,
    });

    const rubyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      metalness: 0.45,
      roughness: 0.15,
      emissive: 0xe11d48,
      emissiveIntensity: 0.45,
    });

    // ── 5. XÂY DỰNG 9 HOẠT CẢNH ĐỘC BẢN THEO ĐÚNG KỊCH BẢN ĐÃ DUYỆT ───────────
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const normalizedMode = (mode || "CLASSIC").toUpperCase();
    const outroUpdates: ((t: number) => void)[] = [];

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 1: MYSTERY QUEST - Chìa Khóa Hoàng Kim & Rương Báu Mở Nắp Cầu Vồng
    // ═════════════════════════════════════════════════════════════════════════
    if (normalizedMode === "MYSTERY_QUEST") {
      const questGroup = new THREE.Group();

      // Chiếc Rương Báu Cổ Tích Cyber 3D (Treasure Chest Base)
      const chestBaseGeom = new THREE.BoxGeometry(3.6, 1.8, 2.4);
      const chestBase = new THREE.Mesh(chestBaseGeom, darkMetalMaterial);
      chestBase.position.set(0, -1.0, 0);
      questGroup.add(chestBase);

      // Viền Mạ Vàng Của Rương
      const trimGeom = new THREE.BoxGeometry(3.8, 0.2, 2.6);
      const chestTrim = new THREE.Mesh(trimGeom, goldMaterial);
      chestTrim.position.set(0, -0.1, 0);
      questGroup.add(chestTrim);

      // Nắp Rương Mở Bản Lề (Chest Lid on Hinge)
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.0, -1.2); // Tọa độ bản lề sau

      const lidGeom = new THREE.CylinderGeometry(1.2, 1.2, 3.6, 24, 1, false, 0, Math.PI);
      const lidMesh = new THREE.Mesh(lidGeom, darkMetalMaterial);
      lidMesh.rotation.z = Math.PI / 2;
      lidMesh.position.set(0, 0.6, 1.2);
      lidGroup.add(lidMesh);

      // Viền Nắp Vàng
      const lidTrimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 16, 32, Math.PI), goldMaterial);
      lidTrimMesh.rotation.z = Math.PI / 2;
      lidTrimMesh.position.set(0, 0.6, 1.2);
      lidGroup.add(lidTrimMesh);

      questGroup.add(lidGroup);

      // Ổ Khóa Vàng Ở Mặt Trước
      const lockGeom = new THREE.TorusGeometry(0.35, 0.08, 16, 24);
      const lockMesh = new THREE.Mesh(lockGeom, goldMaterial);
      lockMesh.position.set(0, -0.4, 1.25);
      questGroup.add(lockMesh);

      // Chiếc Chìa Khóa Vàng 3D Bay Tới (Flying Golden Key)
      const keyGroup = new THREE.Group();
      const headMesh = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.18, 16, 32), goldMaterial);
      headMesh.position.set(0, 0.7, 0);
      keyGroup.add(headMesh);

      const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), cyanGlassMaterial);
      gemMesh.position.set(0, 0.7, 0);
      keyGroup.add(gemMesh);

      const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 16), goldMaterial);
      shaftMesh.position.set(0, -0.4, 0);
      keyGroup.add(shaftMesh);

      const toothMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.15), goldMaterial);
      toothMesh.position.set(0.22, -1.0, 0);
      keyGroup.add(toothMesh);

      keyGroup.position.set(1.5, 1.5, 2.5);
      keyGroup.rotation.set(-0.3, 0.4, -0.6);
      questGroup.add(keyGroup);

      // Chùm Tia Sáng Cầu Vồng Bên Trong Rương (Rainbow Volumetric Light Beam)
      const rainbowBeamGeom = new THREE.CylinderGeometry(0.2, 4.0, 8.0, 32, 1, true);
      const rainbowBeamMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      });
      const rainbowBeam = new THREE.Mesh(rainbowBeamGeom, rainbowBeamMat);
      rainbowBeam.position.set(0, 3.5, 0);
      questGroup.add(rainbowBeam);

      questGroup.rotation.x = 0.25;
      rootGroup.add(questGroup);

      outroUpdates.push((t) => {
        // Chìa khóa bay tới cắm vào ổ
        if (t < 0.4) {
          const keyT = t / 0.4;
          keyGroup.position.lerp(new THREE.Vector3(0, -0.4, 1.5), keyT);
          keyGroup.rotation.set(Math.PI / 2, 0, 0);
        } else {
          keyGroup.rotation.z = (t - 0.4) * 4; // Vặn khóa
        }

        // Rương báu mở nắp bật tung từ t = 0.45 trở đi
        if (t > 0.45) {
          const openT = (t - 0.45) / 0.55;
          lidGroup.rotation.x = -openT * (Math.PI * 0.75); // Mở nắp ra phía sau
          rainbowBeamMat.opacity = openT * 0.95;
          rainbowBeam.scale.set(1 + openT * 6, 1 + openT * 2, 1 + openT * 6);
          questGroup.position.z = openT * 8; // Lao về phía camera nuốt trọn màn hình
        }
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 2: GRID CARO - Bảng Cờ Caro 3D & Ô Cửa Không Gian Zoom-Through
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "GRID_CARO") {
      const caroGroup = new THREE.Group();

      // Bảng Cờ Khối Thủy Tinh Neon Nền
      const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.4, 0.35), cyanGlassMaterial);
      caroGroup.add(boardMesh);

      // Khung Bạch Kim Bo Cạnh
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.6, 0.18), platinumMaterial);
      frameMesh.position.set(0, 0, -0.1);
      caroGroup.add(frameMesh);

      // 9 Ô Cờ Khối Thể Tích
      let centerCellMesh: THREE.Mesh | null = null;
      for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
          const isCenter = r === 0 && c === 0;
          const cellMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.15, 1.15, 0.24),
            isCenter ? goldMaterial : purpleGlassMaterial
          );
          cellMesh.position.set(c * 1.35, r * 1.35, 0.24);
          caroGroup.add(cellMesh);
          if (isCenter) centerCellMesh = cellMesh;
        }
      }

      // Khối X 3D và Khối O 3D Nổi Khối
      const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.16), cyanGlassMaterial);
      xBar1.position.set(-1.35, 1.35, 0.42);
      xBar1.rotation.z = Math.PI / 4;
      caroGroup.add(xBar1);
      const xBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.16), cyanGlassMaterial);
      xBar2.position.set(-1.35, 1.35, 0.42);
      xBar2.rotation.z = -Math.PI / 4;
      caroGroup.add(xBar2);

      const oMesh = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 16, 32), rubyMaterial);
      oMesh.position.set(1.35, -1.35, 0.42);
      caroGroup.add(oMesh);

      caroGroup.rotation.set(0.35, -0.28, 0);
      rootGroup.add(caroGroup);

      outroUpdates.push((t) => {
        // Ô trung tâm mở toang ánh sáng vàng kim và bảng caro zoom xuyên camera
        if (centerCellMesh) {
          centerCellMesh.scale.setScalar(1 + t * 4);
          centerCellMesh.position.z = 0.24 + t * 2;
        }
        caroGroup.position.z = t * 16;
        caroGroup.scale.setScalar(1 + t * 7);
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 3: FAST BUZZ - Nút Chuông Dập Sóng Âm Siêu Thanh (Sonic Rings)
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "BUZZ") {
      const buzzGroup = new THREE.Group();

      // Đế Bạc Trụ Chrome
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 0.6, 32), platinumMaterial);
      buzzGroup.add(baseMesh);

      // Đệm Cao Su Viền Đen
      const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.16, 16, 32), darkMetalMaterial);
      rimMesh.position.set(0, 0.3, 0);
      rimMesh.rotation.x = Math.PI / 2;
      buzzGroup.add(rimMesh);

      // Núm Chuông Nhấn Ruby 3D
      const capGroup = new THREE.Group();
      const capMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        rubyMaterial
      );
      capGroup.add(capMesh);

      const pinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16), goldMaterial);
      pinMesh.position.set(0, 1.8, 0);
      capGroup.add(pinMesh);

      capGroup.position.set(0, 0.35, 0);
      buzzGroup.add(capGroup);

      // 3 Vòng Sóng Âm Tròn Bung Mở (Sonic Rings)
      const sonicRings: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const ringGeom = new THREE.RingGeometry(2.2, 2.4, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(0, 0.4, 0);
        ring.rotation.x = Math.PI / 2;
        buzzGroup.add(ring);
        sonicRings.push(ring);
      }

      buzzGroup.rotation.x = 0.5;
      rootGroup.add(buzzGroup);

      outroUpdates.push((t) => {
        // Núm chuông dập nảy xuống ở t < 0.3
        if (t < 0.3) {
          capGroup.position.y = 0.35 - (t / 0.3) * 0.8;
        } else {
          capGroup.position.y = -0.45 + ((t - 0.3) / 0.7) * 0.8;
        }

        // 3 Vòng sóng âm thanh bung mở 300%
        sonicRings.forEach((ring, idx) => {
          const delay = idx * 0.15;
          if (t > delay) {
            const ringT = (t - delay) / (1 - delay);
            ring.scale.setScalar(1 + ringT * 12);
            (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - ringT) * 0.9);
          }
        });
        buzzGroup.scale.setScalar(1 + t * 2.5);
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 4: DICE RACE - Đường Đua Cosmic Race Track & Xúc Xắc Phóng Vút
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "DICE_RACE") {
      const raceGroup = new THREE.Group();

      // Dải Đường Đua Uốn Lượn 3D (Curved Race Track)
      const trackCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8, -4, -6),
        new THREE.Vector3(-4, -1, -2),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(4, 2, 4),
        new THREE.Vector3(8, 4, 8),
      ]);
      const trackGeom = new THREE.TubeGeometry(trackCurve, 64, 0.4, 16, false);
      const trackMesh = new THREE.Mesh(trackGeom, cyanGlassMaterial);
      raceGroup.add(trackMesh);

      // Cặp Xúc Xắc Bo Cạnh Lập Thể 3D
      const diceGroup = new THREE.Group();
      const diceMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), purpleGlassMaterial);
      diceGroup.add(diceMesh);

      // Nốt Vàng May Mắn
      const dotGeom = new THREE.SphereGeometry(0.2, 16, 16);
      const dot1 = new THREE.Mesh(dotGeom, goldMaterial);
      dot1.position.set(0, 0, 1.05);
      diceGroup.add(dot1);

      raceGroup.add(diceGroup);
      rootGroup.add(raceGroup);

      outroUpdates.push((t) => {
        // Xúc xắc lăn thần tốc bám theo đường đua và phóng vào camera
        const point = trackCurve.getPointAt(Math.min(1.0, t * 1.2));
        diceGroup.position.copy(point);
        diceGroup.rotation.x += 0.2;
        diceGroup.rotation.y += 0.2;
        diceGroup.scale.setScalar(1 + t * 4);
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 5: SURVIVAL - Khiên Sinh Tồn Gai Góc Xung Kích EMP Bức Xạ
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "ELIMINATION") {
      const shieldGroup = new THREE.Group();

      // Mặt Khiên Sinh Tồn 3D Gai Góc (Cyber Shield)
      const shieldGeom = new THREE.CylinderGeometry(2.4, 2.0, 0.4, 6);
      const shieldMesh = new THREE.Mesh(shieldGeom, rubyMaterial);
      shieldMesh.rotation.x = Math.PI / 2;
      shieldGroup.add(shieldMesh);

      // Viền Khung Gai Titan
      const spikeGeom = new THREE.ConeGeometry(0.4, 1.2, 16);
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeom, goldMaterial);
        const angle = (i * Math.PI) / 3;
        spike.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 2.6, 0);
        spike.rotation.z = angle - Math.PI / 2;
        shieldGroup.add(spike);
      }

      // Sóng Bức Xạ EMP
      const empGeom = new THREE.RingGeometry(2.8, 3.2, 64);
      const empMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const empRing = new THREE.Mesh(empGeom, empMat);
      shieldGroup.add(empRing);

      rootGroup.add(shieldGroup);

      outroUpdates.push((t) => {
        // Phóng luồng sóng xung kích EMP sinh tồn quét sạch bóng tối
        empMat.opacity = Math.max(0, (1 - t) * 0.95);
        empRing.scale.setScalar(1 + t * 14);
        shieldGroup.scale.setScalar(1 + t * 3);
        shieldGroup.rotation.z = t * 2;
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 6: TOURNAMENT 1V1 - Cúp Vàng & Hai Thanh Kiếm Plasma Giao Đấu
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "TOURNAMENT") {
      const tourGroup = new THREE.Group();

      // Cúp Vàng Vô Địch 3D
      const cupGeom = new THREE.CylinderGeometry(1.6, 0.9, 2.4, 32);
      const cupMesh = new THREE.Mesh(cupGeom, goldMaterial);
      tourGroup.add(cupMesh);

      const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.6, 32), platinumMaterial);
      cupBase.position.set(0, -1.8, 0);
      tourGroup.add(cupBase);

      // Hai Thanh Kiếm Plasma 3D Đối Kháng (Clashing Blades)
      const sword1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.8, 16), cyanGlassMaterial);
      sword1.position.set(-1.8, 1.2, 0.5);
      sword1.rotation.z = -Math.PI / 4;
      tourGroup.add(sword1);

      const sword2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.8, 16), rubyMaterial);
      sword2.position.set(1.8, 1.2, 0.5);
      sword2.rotation.z = Math.PI / 4;
      tourGroup.add(sword2);

      rootGroup.add(tourGroup);

      outroUpdates.push((t) => {
        // Hai thanh kiếm chém giao nhau tóe lửa và cúp vàng bùng nổ vương miện
        if (t < 0.35) {
          sword1.position.x = -1.8 + (t / 0.35) * 1.8;
          sword2.position.x = 1.8 - (t / 0.35) * 1.8;
        }
        tourGroup.scale.setScalar(1 + t * 4);
        tourGroup.rotation.y += 0.05;
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 7: BOUNCEBACK - Vòng Quay Gói Điểm 10-20-30 Olympia & Mũi Tên
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "BOUNCEBACK") {
      const olympiaGroup = new THREE.Group();

      // Bánh Xe Vòng Quay Gói Điểm 3D (Point Wheel)
      const wheelGeom = new THREE.CylinderGeometry(2.6, 2.6, 0.4, 32);
      const wheelMesh = new THREE.Mesh(wheelGeom, cyanGlassMaterial);
      wheelMesh.rotation.x = Math.PI / 2;
      olympiaGroup.add(wheelMesh);

      // Mũi Tên Cướp Điểm 3D Lao Vào Tâm (Steal Arrow)
      const arrowGeom = new THREE.ConeGeometry(0.6, 1.8, 16);
      const arrowMesh = new THREE.Mesh(arrowGeom, goldMaterial);
      arrowMesh.position.set(0, 3.8, 0);
      arrowMesh.rotation.z = Math.PI;
      olympiaGroup.add(arrowMesh);

      rootGroup.add(olympiaGroup);

      outroUpdates.push((t) => {
        // Vòng quay xoay tít và mũi tên lao thẳng vào tâm kích hoạt đấu trường
        wheelMesh.rotation.z += 0.25;
        arrowMesh.position.y = 3.8 - t * 3.8;
        olympiaGroup.scale.setScalar(1 + t * 3.5);
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 8: SECRET WAGER - Tung Đồng Xu Cược ALL-IN x2
    // ═════════════════════════════════════════════════════════════════════════
    else if (normalizedMode === "WAGER") {
      const wagerGroup = new THREE.Group();

      // Đồng Tiền Chip Cược Vàng 3D
      const coinGeom = new THREE.CylinderGeometry(2.4, 2.4, 0.3, 32);
      const coinMesh = new THREE.Mesh(coinGeom, goldMaterial);
      coinMesh.rotation.x = Math.PI / 2;
      wagerGroup.add(coinMesh);

      // Vành Viền Bạch Kim Khía Rãnh
      const coinRim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.1, 16, 32), platinumMaterial);
      wagerGroup.add(coinRim);

      rootGroup.add(wagerGroup);

      outroUpdates.push((t) => {
        // Đồng xu tung bổng lên trời, xoay lộn vòng và lật mở All-in x2
        wagerGroup.position.y = Math.sin(t * Math.PI) * 3;
        wagerGroup.rotation.x += 0.3;
        wagerGroup.rotation.y += 0.2;
        wagerGroup.scale.setScalar(1 + t * 4);
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE 9: CLASSIC - Chiếc Đồng Hồ Bấm Giờ 3D Quét Kim 3-2-1
    // ═════════════════════════════════════════════════════════════════════════
    else {
      const chronoGroup = new THREE.Group();

      // Vỏ Đồng Hồ Bấm Giờ Bạch Kim
      const bodyGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.45, 32);
      const bodyMesh = new THREE.Mesh(bodyGeom, platinumMaterial);
      bodyMesh.rotation.x = Math.PI / 2;
      chronoGroup.add(bodyMesh);

      // Mặt Đồng Hồ Kính Sapphire Xanh
      const faceMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.5, 32), cyanGlassMaterial);
      faceMesh.rotation.x = Math.PI / 2;
      chronoGroup.add(faceMesh);

      // Nút Bấm Đỉnh Đồng Hồ
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), goldMaterial);
      crown.position.set(0, 2.8, 0);
      chronoGroup.add(crown);

      // Kim Giây Quét 360° (Sweeping Second Hand)
      const handGeom = new THREE.BoxGeometry(0.1, 1.8, 0.05);
      const handMesh = new THREE.Mesh(handGeom, rubyMaterial);
      handMesh.position.set(0, 0.9, 0.3);
      chronoGroup.add(handMesh);

      rootGroup.add(chronoGroup);

      outroUpdates.push((t) => {
        // Kim giây quét tích tắc 3-2-1 và bùng nổ rung chuông xuất phát
        handMesh.rotation.z = -t * (Math.PI * 4);
        chronoGroup.scale.setScalar(1 + t * 3.5);
      });
    }

    // ── 6. QUỸ ĐẠO BAY TỪ TOẠ ĐỘ THẺ MODE RA TÂM (FLIGHT TRAJECTORY 360ms) ───
    const fovInRad = (camera.fov * Math.PI) / 180;
    const visibleHeightAtZero = 2 * Math.tan(fovInRad / 2) * camera.position.z;
    const visibleWidthAtZero = visibleHeightAtZero * (width / height);

    let startX = 0;
    let startY = 0;
    let startScale = 0.18;

    if (sourceRect) {
      const centerX = sourceRect.left + sourceRect.width / 2;
      const centerY = sourceRect.top + sourceRect.height / 2;
      const normX = centerX / width;
      const normY = centerY / height;
      startX = (normX - 0.5) * visibleWidthAtZero;
      startY = -(normY - 0.5) * visibleHeightAtZero;
      startScale = Math.max(0.12, sourceRect.width / 380);
    }

    // ── 7. TƯƠNG TÁC CHUỘT PARALLAX 3D (MOUSE PARALLAX) ──────────────────────
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / width - 0.5) * 0.4;
      mouseY = (e.clientY / height - 0.5) * 0.4;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ── 8. RENDER LOOP CHUẨN 60 FPS ──────────────────────────────────────────
    const startTime = performance.now();
    let animFrameId: number;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);

      const elapsed = now - startTime;
      const takeoffT = Math.min(1.0, elapsed / 360);
      const easeT = 1 - Math.pow(1 - takeoffT, 3); // Cubic Out

      // Xoay nhẹ bụi sao vũ trụ
      starField.rotation.y = elapsed * 0.0003;

      if (takeoffT < 1.0) {
        // Pha 1: Bay từ toạ độ thẻ ra tâm (Takeoff Morphing)
        rootGroup.position.x = startX * (1 - easeT);
        rootGroup.position.y = startY * (1 - easeT);
        rootGroup.position.z = -3 * (1 - easeT);
        rootGroup.scale.setScalar(startScale + (1.0 - startScale) * easeT);
        rootGroup.rotation.y = easeT * (Math.PI * 2);
      } else {
        // Pha 2: Lơ lửng tại tâm có góc nghiêng Isometric 25° + Mouse Parallax
        const floatTime = (now - startTime - 360) * 0.002;
        rootGroup.position.x = 0;
        rootGroup.position.y = Math.sin(floatTime * 2) * 0.12;
        rootGroup.position.z = 0;

        if (!isOutroRef.current) {
          rootGroup.rotation.y = floatTime * 1.2 + mouseX;
          rootGroup.rotation.x = 0.25 - mouseY;
        }
      }

      // Pha 3: Outro tương tác đặc trưng theo từng mode
      if (isOutroRef.current) {
        const outroT = Math.min(1.0, (now - (startTime + 360)) / 550);
        outroUpdates.forEach((fn) => fn(outroT));
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    // ── 9. RESIZE & CLEANUP ──────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

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
