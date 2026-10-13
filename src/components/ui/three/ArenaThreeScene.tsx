"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { transitionSoundEngine } from "@/lib/audio/transitionSoundEngine";

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

    // Phát âm thanh Web Audio API độc bản cho từng mode (0KB mp3 tải ngoài)
    transitionSoundEngine.playTransitionSfx(mode);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // ── 1. KHỞI TẠO SCENE & CAMERA CHUẨN ĐIỆN ẢNH ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04050d, 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // ── 2. HỆ THỐNG ÁNH SÁNG STUDIO ĐA CHIỀU (PBR STUDIO LIGHTING) ──
    const ambientLight = new THREE.AmbientLight(0x0f172a, 3.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffbeb, 5.5);
    mainLight.position.set(6, 12, 8);
    scene.add(mainLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 8.0, 30);
    cyanPointLight.position.set(-5, -2, 4);
    scene.add(cyanPointLight);

    const purplePointLight = new THREE.PointLight(0xa855f7, 7.0, 30);
    purplePointLight.position.set(5, -2, 4);
    scene.add(purplePointLight);

    const goldPointLight = new THREE.PointLight(0xfacc15, 8.5, 20);
    goldPointLight.position.set(0, 2, 5);
    scene.add(goldPointLight);

    // ── 4. CHẤT LIỆU CHUẨN PBR CAO CẤP ──
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.16,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
    });
    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.22,
    });
    const neonCyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.85,
      metalness: 0.5,
      roughness: 0.18,
    });
    const neonPurpleMaterial = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0xa855f7,
      emissiveIntensity: 0.85,
      metalness: 0.5,
      roughness: 0.18,
    });
    const rubyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.8,
      metalness: 0.35,
      roughness: 0.12,
    });

    // ── 5. KHỞI TẠO HERO 3D MODEL TẠI TÂM (Takeoff do GPU Compositor CSS đảm nhiệm) ──
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ── 6. XÂY DỰNG 9 KỊCH BẢN 3D ĐỘC BẢN CHO 9 CHẾ ĐỘ ──
    const norm = (mode || "").toUpperCase();
    const updateFns: ((time: number, isOutro: boolean, progress: number) => void)[] = [];

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 1] GRID CARO: Bảng 3D xoay nổi, lật ô, ô trung tâm mở portal xuyên camera
    // ──────────────────────────────────────────────────────────────────────────
    if (norm.includes("CARO")) {
      const caroGroup = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.4, 0.25), darkMetalMaterial);
      caroGroup.add(board);

      // 16 ô cờ ma trận 4x4
      const tiles: THREE.Mesh[] = [];
      const tileSize = 0.9;
      const gap = 0.1;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const tileMat = (r + c) % 2 === 0 ? neonCyanMaterial : goldMaterial;
          const tile = new THREE.Mesh(new THREE.BoxGeometry(tileSize, tileSize, 0.12), tileMat);
          const px = (c - 1.5) * (tileSize + gap);
          const py = (r - 1.5) * (tileSize + gap);
          tile.position.set(px, py, 0.15);
          caroGroup.add(tile);
          tiles.push(tile);
        }
      }

      // Ô trung tâm mở cửa portal
      const portalRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.08, 16, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      portalRing.position.set(0, 0, 0.3);
      caroGroup.add(portalRing);

      rootGroup.add(caroGroup);

      updateFns.push((time, isOutroPhase) => {
        caroGroup.rotation.y = Math.sin(time * 2.5) * 0.25;
        caroGroup.rotation.x = 0.18 + Math.cos(time * 2) * 0.1;

        tiles.forEach((t, i) => {
          t.rotation.x = Math.sin(time * 5 + i * 0.4) * 0.35;
        });

        if (isOutroPhase) {
          portalRing.scale.addScalar(0.08);
          caroGroup.position.z += 0.35;
          caroGroup.scale.multiplyScalar(1.04);
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 2] MYSTERY QUEST: Chìa khóa vàng hoàng gia, xoay 90° cắm ổ khóa -> Iris ring
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("MYSTERY") || norm.includes("QUEST")) {
      const questGroup = new THREE.Group();

      // Chiếc Chìa Khóa Vàng 3D Hoàng Gia Cổ Đại
      const keyGroup = new THREE.Group();
      // Vòng tròn đầu chìa khóa bọc vàng
      const keyHeadOuter = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.18, 16, 32), goldMaterial);
      keyHeadOuter.position.set(0, 0.95, 0);
      keyGroup.add(keyHeadOuter);

      // Viên ngọc Ruby phát sáng ở trung tâm đầu chìa khóa
      const rubyGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), rubyMaterial);
      rubyGem.position.set(0, 0.95, 0);
      keyGroup.add(rubyGem);

      // Vòng đai phụ chạm khắc
      const keyFiligree = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 16, 24), goldMaterial);
      keyFiligree.position.set(0, 0.95, 0);
      keyFiligree.rotation.x = Math.PI / 2;
      keyGroup.add(keyFiligree);

      // Thân trục chìa khóa vàng
      const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.2, 16), goldMaterial);
      keyShaft.position.set(0, -0.35, 0);
      keyGroup.add(keyShaft);

      // Răng cưa chìa khóa kép
      const keyTeeth1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.15), goldMaterial);
      keyTeeth1.position.set(0.25, -1.0, 0);
      keyGroup.add(keyTeeth1);

      const keyTeeth2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.15), goldMaterial);
      keyTeeth2.position.set(0.2, -1.3, 0);
      keyGroup.add(keyTeeth2);

      questGroup.add(keyGroup);
      rootGroup.add(questGroup);

      updateFns.push((time, isOutroPhase) => {
        rubyGem.rotation.y = time * 3;
        rubyGem.rotation.x = time * 2;

        if (!isOutroPhase) {
          keyGroup.rotation.y = time * 2.8;
          keyGroup.rotation.z = Math.sin(time * 3.5) * 0.15;
          keyGroup.position.y = Math.sin(time * 4) * 0.12;
        } else {
          // Xoay 90 độ cắm ổ khóa và mở rộng Iris
          keyGroup.rotation.z = THREE.MathUtils.lerp(keyGroup.rotation.z, Math.PI / 2, 0.18);
          keyGroup.position.z += 0.35;
          keyGroup.scale.multiplyScalar(1.03);
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 3] SPEED RACE / BUZZ: Xe đua Cyberpunk, Nitro xanh neon, Speed lines
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("BUZZ") || norm.includes("SPEED") || norm.includes("RACE")) {
      const raceGroup = new THREE.Group();

      // Thân xe đua khí động học
      const carBody = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.4, 5), neonCyanMaterial);
      carBody.rotation.x = Math.PI / 2;
      raceGroup.add(carBody);

      // Đôi cánh lướt gió sau
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 0.6), darkMetalMaterial);
      wing.position.set(0, 0.3, -1.8);
      raceGroup.add(wing);

      // 2 ống xả phản lực Nitro
      const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 16), goldMaterial);
      thrusterL.rotation.x = Math.PI / 2;
      thrusterL.position.set(-0.6, 0, -2.1);
      const thrusterR = thrusterL.clone();
      thrusterR.position.x = 0.6;
      raceGroup.add(thrusterL);
      raceGroup.add(thrusterR);

      // Luồng lửa Nitro Cyan
      const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 8), rubyMaterial);
      flameL.rotation.x = -Math.PI / 2;
      flameL.position.set(-0.6, 0, -2.9);
      const flameR = flameL.clone();
      flameR.position.x = 0.6;
      raceGroup.add(flameL);
      raceGroup.add(flameR);

      rootGroup.add(raceGroup);

      updateFns.push((time, isOutroPhase) => {
        raceGroup.position.x = Math.sin(time * 8) * 0.1;
        raceGroup.position.y = Math.cos(time * 10) * 0.08;
        raceGroup.rotation.z = Math.sin(time * 4) * 0.15;
        flameL.scale.y = 1 + Math.sin(time * 20) * 0.3;
        flameR.scale.y = 1 + Math.cos(time * 20) * 0.3;

        if (isOutroPhase) {
          raceGroup.position.z += 0.55;
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 4] TOWER DEFENSE / ELIMINATION: Tháp pha lê & Khiên lục giác Hexagon
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("TOWER") || norm.includes("DEFENSE") || norm.includes("ELIMINATION")) {
      const towerGroup = new THREE.Group();

      // Tháp pha lê công nghệ
      const towerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 4.0, 6), darkMetalMaterial);
      towerGroup.add(towerMesh);

      // Lõi năng lượng xoay trên đỉnh
      const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.85), neonCyanMaterial);
      coreMesh.position.set(0, 2.5, 0);
      towerGroup.add(coreMesh);

      // Vòm khiên lục giác năng lượng (Hexagon Forcefield Dome)
      const forcefield = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3.4, 1),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          wireframe: true,
          transparent: true,
          opacity: 0.7,
          emissive: 0x22d3ee,
          emissiveIntensity: 0.6,
        })
      );
      towerGroup.add(forcefield);

      rootGroup.add(towerGroup);

      updateFns.push((time, isOutroPhase) => {
        coreMesh.rotation.y = time * 4;
        coreMesh.rotation.x = time * 2;
        forcefield.rotation.y = -time * 1.5;

        if (isOutroPhase) {
          forcefield.scale.addScalar(0.14);
          towerGroup.scale.multiplyScalar(1.03);
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 5] BATTLE ROYALE / TOURNAMENT: Hòm Airdrop rơi cắm đất, vòng bo điện
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("BATTLE") || norm.includes("ROYALE") || norm.includes("TOURNAMENT")) {
      const airdropGroup = new THREE.Group();

      // Thùng thính quân sự Airdrop đỏ xanh
      const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), rubyMaterial);
      crateMesh.position.y = -0.5;
      airdropGroup.add(crateMesh);

      const tarpCover = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 2.5), neonCyanMaterial);
      tarpCover.position.y = 0.7;
      airdropGroup.add(tarpCover);

      // Vòng bo điện tử Blue Zone
      const blueZone = new THREE.Mesh(
        new THREE.TorusGeometry(3.6, 0.08, 16, 64),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      blueZone.rotation.x = Math.PI / 2;
      airdropGroup.add(blueZone);

      rootGroup.add(airdropGroup);

      updateFns.push((time, isOutroPhase) => {
        airdropGroup.rotation.y = time * 2;
        airdropGroup.position.y = Math.sin(time * 3) * 0.2;
        blueZone.scale.setScalar(1 + Math.sin(time * 6) * 0.15);

        if (isOutroPhase) {
          blueZone.scale.addScalar(0.2);
          airdropGroup.position.z += 0.35;
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 6] BOSS RAID: Mắt rồng đỏ rực, tiếng gầm rung màn hình & hào quang đen đỏ
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("BOSS") || norm.includes("RAID")) {
      const bossGroup = new THREE.Group();

      // Cặp sừng Ma Vương / Rồng lửa 3D
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 16), darkMetalMaterial);
      hornL.position.set(-1.6, 1.2, 0);
      hornL.rotation.z = -0.4;
      hornL.rotation.x = -0.2;
      const hornR = hornL.clone();
      hornR.position.x = 1.6;
      hornR.rotation.z = 0.4;
      bossGroup.add(hornL);
      bossGroup.add(hornR);

      // Đôi mắt đỏ rực rỡ
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), rubyMaterial);
      eyeL.position.set(-0.8, 0.2, 0.8);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.8;
      bossGroup.add(eyeL);
      bossGroup.add(eyeR);

      // Hào quang dung nham xoay quanh
      const magmaHalo = new THREE.Mesh(
        new THREE.TorusGeometry(2.8, 0.15, 16, 48),
        new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xef4444,
          emissiveIntensity: 1.0,
        })
      );
      bossGroup.add(magmaHalo);

      rootGroup.add(bossGroup);

      updateFns.push((time, isOutroPhase) => {
        bossGroup.rotation.y = Math.sin(time * 2) * 0.3;
        magmaHalo.rotation.z = time * 3;

        // Rung chấn màn hình (Screen Shake)
        camera.position.x = (Math.random() - 0.5) * 0.08;
        camera.position.y = (Math.random() - 0.5) * 0.08;

        if (isOutroPhase) {
          bossGroup.scale.multiplyScalar(1.04);
          bossGroup.position.z += 0.35;
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 7] GOLD MINE / WAGER: Cuốc chim vàng giáng đá quý -> Mưa tiền vàng 3D
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("GOLD") || norm.includes("MINE") || norm.includes("WAGER")) {
      const mineGroup = new THREE.Group();

      // Khối đá quý khổng lồ đa diện
      const crystalRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8), rubyMaterial);
      crystalRock.position.set(0, -0.6, 0);
      mineGroup.add(crystalRock);

      // Chiếc cuốc chim mạ vàng
      const pickaxeGroup = new THREE.Group();
      const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 16), darkMetalMaterial);
      pickaxeGroup.add(pickHandle);

      const pickHead = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.14, 16, 32, Math.PI * 0.6), goldMaterial);
      pickHead.position.set(0, 1.4, 0);
      pickHead.rotation.z = -Math.PI * 0.3;
      pickaxeGroup.add(pickHead);

      pickaxeGroup.position.set(1.4, 1.2, 0.5);
      pickaxeGroup.rotation.z = -0.5;
      mineGroup.add(pickaxeGroup);

      // 12 đồng tiền vàng xoay tròn tập trung quanh khối đá (không rải rác ngoài rìa)
      const coins: THREE.Mesh[] = [];
      for (let c = 0; c < 12; c++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), goldMaterial);
        const a = (c / 12) * Math.PI * 2;
        coin.position.set(Math.cos(a) * 2.2, Math.sin(a) * 1.8, (Math.random() - 0.5) * 1.5);
        mineGroup.add(coin);
        coins.push(coin);
      }

      rootGroup.add(mineGroup);

      updateFns.push((time, isOutroPhase) => {
        pickaxeGroup.rotation.z = -0.5 + Math.sin(time * 6) * 0.4;
        crystalRock.rotation.y = time * 1.5;

        coins.forEach((coin, idx) => {
          coin.rotation.x += 0.05 + idx * 0.01;
          coin.rotation.y += 0.04;
        });

        if (isOutroPhase) {
          mineGroup.position.z += 0.35;
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 8] AUCTION STEALTH / DICE: Búa gõ sóng chấn động + Mặt nạ đạo tặc tím
    // ──────────────────────────────────────────────────────────────────────────
    else if (norm.includes("AUCTION") || norm.includes("STEALTH") || norm.includes("DICE")) {
      const auctionGroup = new THREE.Group();

      // Chiếc búa gõ hoàng gia 3D
      const gavelGroup = new THREE.Group();
      const gavelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.0, 16), goldMaterial);
      gavelGroup.add(gavelHandle);

      const gavelHead = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 16), darkMetalMaterial);
      gavelHead.rotation.z = Math.PI / 2;
      gavelHead.position.set(0, 1.4, 0);
      gavelGroup.add(gavelHead);
      auctionGroup.add(gavelGroup);

      // Đe gõ phát chấn động
      const blockMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.4, 32), goldMaterial);
      blockMesh.position.set(0, -1.6, 0);
      auctionGroup.add(blockMesh);

      // Mặt nạ đạo tặc tím mộng mơ
      const maskMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.2, 16, 32, Math.PI), neonPurpleMaterial);
      maskMesh.rotation.x = Math.PI;
      maskMesh.position.set(0, 0.2, 1.2);
      auctionGroup.add(maskMesh);

      rootGroup.add(auctionGroup);

      updateFns.push((time, isOutroPhase) => {
        gavelGroup.rotation.x = Math.sin(time * 5) * 0.4;
        maskMesh.rotation.y = time * 2;
        maskMesh.position.y = 0.2 + Math.sin(time * 4) * 0.2;

        if (isOutroPhase) {
          auctionGroup.position.z += 0.35;
          maskMesh.scale.multiplyScalar(1.05);
        }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // [MODE 9] CLASSIC QUIZ: Sách tri thức ma thuật lật trang & Cúp vàng vinh quang
    // ──────────────────────────────────────────────────────────────────────────
    else {
      const classicGroup = new THREE.Group();

      // Cuốn sách tri thức bọc da ma thuật
      const bookGroup = new THREE.Group();
      const cover = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 2.4), darkMetalMaterial);
      bookGroup.add(cover);

      const pages = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 2.2), goldMaterial);
      pages.position.y = 0.05;
      bookGroup.add(pages);
      classicGroup.add(bookGroup);

      // Chiếc cúp vô địch vàng óng
      const cupGroup = new THREE.Group();
      const cupBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.4, 1.4, 24), goldMaterial);
      cupBowl.position.y = 1.2;
      cupGroup.add(cupBowl);

      const cupStem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), goldMaterial);
      cupStem.position.y = 0.4;
      cupGroup.add(cupStem);

      const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 24), darkMetalMaterial);
      cupBase.position.y = -0.1;
      cupGroup.add(cupBase);

      cupGroup.position.set(0, 0.6, 1.0);
      classicGroup.add(cupGroup);

      rootGroup.add(classicGroup);

      updateFns.push((time, isOutroPhase) => {
        bookGroup.rotation.y = Math.sin(time * 2) * 0.25;
        bookGroup.rotation.x = 0.3 + Math.cos(time * 2) * 0.1;

        cupGroup.rotation.y = time * 3;
        cupGroup.position.y = 0.8 + Math.sin(time * 4) * 0.25;

        if (isOutroPhase) {
          cupGroup.position.z += 0.4;
          classicGroup.position.z += 0.25;
        }
      });
    }

    // ── 7. HOẠT CẢNH VÒNG LẶP RAF (60 FPS MƯỢT TUYỆT ĐỐI) ──
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) / 1000;
      const isOutroActive = isOutroRef.current;

      // Cập nhật kịch bản riêng của từng mode
      updateFns.forEach((fn) => fn(elapsed, isOutroActive, elapsed));

      renderer.render(scene, camera);
    };
    animate();

    // ── 8. THU DỌN TÀI NGUYÊN (CLEANUP & MEMORY LEAK PREVENTION) ──
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
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      // Giải phóng bộ nhớ GPU Three.js
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode, sourceRect]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center"
      style={{ willChange: "transform, opacity" }}
    />
  );
}
