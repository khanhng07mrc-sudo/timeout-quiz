import os
import sys
import base64
import subprocess
import numpy as np
import cv2
from playwright.sync_api import sync_playwright

FFMPEG_PATH = r"C:\Users\khanh\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
OUT_DIR = os.path.abspath(r"public\transitions")
os.makedirs(OUT_DIR, exist_ok=True)

THREE_PATH = os.path.abspath(r"node_modules\three\build\three.module.js").replace('\\', '/')

WIDTH, HEIGHT = 1280, 720
FPS = 30
TOTAL_FRAMES = 35

HTML_TEMPLATE = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; overflow: hidden; }}
  body {{ background: transparent; }}
  canvas {{ display: block; }}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script type="module">
  import * as THREE from 'file:///{THREE_PATH}';

  const canvas = document.getElementById('c');
  const width = {WIDTH}, height = {HEIGHT};
  canvas.width = width;
  canvas.height = height;

  const renderer = new THREE.WebGLRenderer({{
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    premultipliedAlpha: false
  }});
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  // ── STUDIO WRAP-AROUND 360° LIGHTING (Crisp specular, no black shadows) ──
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 2.8);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
  keyLight.position.set(4, 5, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xbae6fd, 2.4);
  fillLight.position.set(-5, 3, 4);
  scene.add(fillLight);

  const uplight = new THREE.DirectionalLight(0xfef08a, 1.8);
  uplight.position.set(0, -4, 3);
  scene.add(uplight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 4.0);
  rimLight.position.set(0, 4, -4);
  scene.add(rimLight);

  // Dynamic Floating Particles
  const PARTICLE_COUNT = 70;
  const pGeom = new THREE.BufferGeometry();
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pInitial = new Float32Array(PARTICLE_COUNT * 3);
  const pVelocities = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {{
    const theta = Math.random() * Math.PI * 2;
    const r = 1.0 + Math.random() * 2.5;
    const x = Math.cos(theta) * r;
    const y = (Math.random() - 0.5) * 3.0;
    const z = (Math.random() - 0.5) * 2.0;

    pPositions[i * 3] = x;
    pPositions[i * 3 + 1] = y;
    pPositions[i * 3 + 2] = z;
    pInitial[i * 3] = x;
    pInitial[i * 3 + 1] = y;
    pInitial[i * 3 + 2] = z;

    pVelocities[i * 3] = (Math.random() - 0.5) * 5.0;
    pVelocities[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
    pVelocities[i * 3 + 2] = Math.random() * 4.0 + 2.0;
  }}
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

  const pMat = new THREE.PointsMaterial({{
    size: 0.12,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  }});
  const particles = new THREE.Points(pGeom, pMat);
  scene.add(particles);

  let currentModeGroup = null;
  let updateChoreography = null;

  window.setupMode = function(modeName) {{
    if (currentModeGroup) {{
      scene.remove(currentModeGroup);
      currentModeGroup = null;
    }}

    camera.position.set(0, 0, 7.5);
    camera.rotation.set(0, 0, 0);

    // Reset particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {{
      pPositions[i * 3] = pInitial[i * 3];
      pPositions[i * 3 + 1] = pInitial[i * 3 + 1];
      pPositions[i * 3 + 2] = pInitial[i * 3 + 2];
    }}
    pGeom.attributes.position.needsUpdate = true;
    pMat.opacity = 0.85;

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    currentModeGroup = rootGroup;

    // ─────────────────────────────────────────────────────────────
    // 1. TOWER DEFENSE: KHIÊN HIỆP SĨ HEATER SHIELD TÁCH ĐÔI MỞ CỔNG EMERALD
    // ─────────────────────────────────────────────────────────────
    if (modeName === 'tower_defense') {{
      pMat.color.setHex(0x10b981);
      rimLight.color.setHex(0x34d399);

      const steelMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, metalness: 0.88, roughness: 0.22, flatShading: true }});
      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.96, roughness: 0.15, flatShading: true }});
      const emeraldMat = new THREE.MeshStandardMaterial({{ color: 0x10b981, metalness: 0.85, roughness: 0.15, flatShading: true }});

      // Half-shield Left
      const shieldLeft = new THREE.Group();
      const shapeL = new THREE.Shape();
      shapeL.moveTo(0, 1.6);
      shapeL.lineTo(-1.25, 1.4);
      shapeL.bezierCurveTo(-1.35, 0.6, -1.1, -0.6, 0, -1.8);
      shapeL.lineTo(0, 1.6);

      const geomL = new THREE.ExtrudeGeometry(shapeL, {{ depth: 0.2, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.06, bevelThickness: 0.06 }});
      shieldLeft.add(new THREE.Mesh(geomL, steelMat));

      // Golden Bevel Border Left
      const borderL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.26), goldMat);
      borderL.position.set(-0.65, 0.8, 0.1);
      borderL.rotation.z = 0.25;
      shieldLeft.add(borderL);

      // Gold Rivets Left
      const rivetG = new THREE.SphereGeometry(0.065, 10, 10);
      [-0.3, -0.7, -1.0, -1.1, -0.8, -0.4].forEach((rx, idx) => {{
        const rMesh = new THREE.Mesh(rivetG, goldMat);
        rMesh.position.set(rx, 1.2 - idx * 0.5, 0.22);
        shieldLeft.add(rMesh);
      }});

      // Left Cross Arm & Half Umbo
      const crossArmL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.24), goldMat);
      crossArmL.position.set(-0.35, 0.2, 0.14);
      shieldLeft.add(crossArmL);

      const crossVertL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.24), goldMat);
      crossVertL.position.set(-0.06, 0.1, 0.14);
      shieldLeft.add(crossVertL);

      const umboL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16, Math.PI / 2, Math.PI), emeraldMat);
      umboL.position.set(0, 0.2, 0.24);
      shieldLeft.add(umboL);

      rootGroup.add(shieldLeft);

      // Half-shield Right
      const shieldRight = new THREE.Group();
      const shapeR = new THREE.Shape();
      shapeR.moveTo(0, 1.6);
      shapeR.lineTo(1.25, 1.4);
      shapeR.bezierCurveTo(1.35, 0.6, 1.1, -0.6, 0, -1.8);
      shapeR.lineTo(0, 1.6);

      const geomR = new THREE.ExtrudeGeometry(shapeR, {{ depth: 0.2, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.06, bevelThickness: 0.06 }});
      shieldRight.add(new THREE.Mesh(geomR, steelMat));

      // Golden Bevel Border Right
      const borderR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.26), goldMat);
      borderR.position.set(0.65, 0.8, 0.1);
      borderR.rotation.z = -0.25;
      shieldRight.add(borderR);

      // Gold Rivets Right
      [0.3, 0.7, 1.0, 1.1, 0.8, 0.4].forEach((rx, idx) => {{
        const rMesh = new THREE.Mesh(rivetG, goldMat);
        rMesh.position.set(rx, 1.2 - idx * 0.5, 0.22);
        shieldRight.add(rMesh);
      }});

      // Right Cross Arm & Half Umbo
      const crossArmR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.24), goldMat);
      crossArmR.position.set(0.35, 0.2, 0.14);
      shieldRight.add(crossArmR);

      const crossVertR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.24), goldMat);
      crossVertR.position.set(0.06, 0.1, 0.14);
      shieldRight.add(crossVertR);

      const umboR = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16, -Math.PI / 2, Math.PI), emeraldMat);
      umboR.position.set(0, 0.2, 0.24);
      shieldRight.add(umboR);

      rootGroup.add(shieldRight);

      // Emerald Radiant Energy Portal Ring
      const portal = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 32), new THREE.MeshBasicMaterial({{ color: 0x34d399, side: THREE.DoubleSide }}));
      portal.position.set(0, 0.2, -0.1);
      portal.visible = false;
      rootGroup.add(portal);

      updateChoreography = (t) => {{
        if (t < 0.52) {{
          const sway = Math.sin(t * Math.PI * 2) * 0.16;
          shieldLeft.rotation.y = sway;
          shieldRight.rotation.y = sway;
          shieldLeft.rotation.x = 0.1;
          shieldRight.rotation.x = 0.1;
          shieldLeft.position.set(0, 0, 0);
          shieldRight.position.set(0, 0, 0);
          portal.visible = false;
        }} else {{
          const openT = (t - 0.52) / 0.48;
          const easeOpen = openT * openT * (3 - 2 * openT);

          shieldLeft.position.x = -easeOpen * 5.8;
          shieldLeft.rotation.y = -easeOpen * 0.45;
          shieldRight.position.x = easeOpen * 5.8;
          shieldRight.rotation.y = easeOpen * 0.45;

          portal.visible = true;
          portal.scale.setScalar(1.0 + easeOpen * 7.5);
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 2. GOLD MINE: CUỐC CHIM ĐẬP VỠ QUẶNG VÀ VĂNG RA NGOÀI, KHỐI VÀNG VỠ MỞ CỔNG
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'gold_mine') {{
      pMat.color.setHex(0xfbbf24);
      rimLight.color.setHex(0x38bdf8);

      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.96, roughness: 0.15, flatShading: true }});
      const gemMat = new THREE.MeshStandardMaterial({{ color: 0x0284c7, metalness: 0.88, roughness: 0.18, flatShading: true }});
      const steelMat = new THREE.MeshStandardMaterial({{ color: 0x94a3b8, metalness: 0.94, roughness: 0.2, flatShading: true }});
      const woodMat = new THREE.MeshStandardMaterial({{ color: 0x92400e, metalness: 0.15, roughness: 0.6 }});

      // Geode split into Left and Right halves so it can shatter open!
      const geodeLeft = new THREE.Group();
      const geodeRight = new THREE.Group();

      const cryL = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), gemMat);
      cryL.position.x = -0.05;
      geodeLeft.add(cryL);

      const nug1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), goldMat);
      nug1.position.set(-0.65, 0.6, 0.3);
      geodeLeft.add(nug1);

      const cryR = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), gemMat);
      cryR.position.x = 0.05;
      geodeRight.add(cryR);

      const nug2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), goldMat);
      nug2.position.set(0.75, -0.5, 0.35);
      geodeRight.add(nug2);

      rootGroup.add(geodeLeft);
      rootGroup.add(geodeRight);

      // Pickaxe
      const pickaxe = new THREE.Group();
      const pickCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.1, -0.2, 0),
        new THREE.Vector3(0, 0.15, 0),
        new THREE.Vector3(1.1, -0.2, 0)
      ]);
      const headMesh = new THREE.Mesh(new THREE.TubeGeometry(pickCurve, 20, 0.14, 8, false), steelMat);
      pickaxe.add(headMesh);

      const tipL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 8), steelMat);
      tipL.position.set(-1.15, -0.25, 0);
      tipL.rotation.z = 1.3;
      pickaxe.add(tipL);

      const tipR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 8), steelMat);
      tipR.position.set(1.15, -0.25, 0);
      tipR.rotation.z = -1.3;
      pickaxe.add(tipR);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), steelMat);
      collar.position.set(0, -0.05, 0);
      pickaxe.add(collar);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.3, 14), woodMat);
      handle.position.set(0, -1.15, 0);
      pickaxe.add(handle);

      pickaxe.position.set(1.4, 0.8, 0.5);
      rootGroup.add(pickaxe);

      // Golden Coins that scatter far off-screen
      const coinG = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
      const coins = [];
      for (let i = 0; i < 14; i++) {{
        const coin = new THREE.Mesh(coinG, goldMat);
        coin.position.set((Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.0, Math.random() * 0.6);
        coin.visible = false;
        rootGroup.add(coin);
        coins.push({{
          mesh: coin,
          rotSpeed: 6 + Math.random() * 6,
          vel: new THREE.Vector3((Math.random() - 0.5) * 16.0, (Math.random() - 0.5) * 14.0, 5 + Math.random() * 6)
        }});
      }}

      // Golden Sunburst Portal Ring
      const sunburst = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 32), new THREE.MeshBasicMaterial({{ color: 0xfbbf24, side: THREE.DoubleSide }}));
      sunburst.visible = false;
      rootGroup.add(sunburst);

      updateChoreography = (t) => {{
        if (t < 0.45) {{
          const swingT = t / 0.45;
          pickaxe.rotation.z = -0.5 + swingT * 0.85;
          pickaxe.position.set(1.3, 0.8 + swingT * 0.5, 0.5);
          geodeLeft.rotation.y = t * Math.PI * 1.4;
          geodeRight.rotation.y = t * Math.PI * 1.4;
          sunburst.visible = false;
        }} else if (t < 0.58) {{
          const hitT = (t - 0.45) / 0.13;
          pickaxe.rotation.z = 0.35 - hitT * 1.25;
          pickaxe.position.set(0.5 - hitT * 0.35, 0.15, 0.4);
          coins.forEach(c => {{ c.mesh.visible = true; }});
        }} else {{
          // PICKAXE FLIES OFF & GEODE SHATTERS OUT OF FRAME
          const exitT = (t - 0.58) / 0.42;
          const easeExit = exitT * exitT;
          pickaxe.position.x = 0.15 + easeExit * 8.5; // VĂNG HOÀN TOÀN KHỎI MÀN HÌNH
          pickaxe.position.y = 0.15 + easeExit * 6.0;
          pickaxe.rotation.z += 0.25;

          // Geode halves shatter outwards completely off-screen
          geodeLeft.position.x = -easeExit * 6.5;
          geodeLeft.rotation.y += 0.15;
          geodeRight.position.x = easeExit * 6.5;
          geodeRight.rotation.y -= 0.15;

          sunburst.visible = true;
          sunburst.scale.setScalar(1.0 + exitT * 14.0);

          coins.forEach(c => {{
            c.mesh.position.addScaledVector(c.vel, 0.05);
            c.mesh.rotation.x += c.rotSpeed * 0.04;
          }});
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 3. GRID CARO: LƯỚI 3x3 CHUẨN HOLLOW & Ô TRUNG TÂM MỞ CỬA SỔ
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'grid_caro') {{
      pMat.color.setHex(0x06b6d4);
      rimLight.color.setHex(0xec4899);

      const boardGroup = new THREE.Group();
      const carbonMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, metalness: 0.85, roughness: 0.22, flatShading: true }});
      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.95, roughness: 0.16, flatShading: true }});
      const oMat = new THREE.MeshStandardMaterial({{ color: 0x06b6d4, metalness: 0.95, roughness: 0.14, flatShading: true }});
      const xMat = new THREE.MeshStandardMaterial({{ color: 0xec4899, metalness: 0.95, roughness: 0.14, flatShading: true }});

      // Hollow 3x3 Outer Frame
      const frameShape = new THREE.Shape();
      frameShape.moveTo(-2.1, -2.1);
      frameShape.lineTo(2.1, -2.1);
      frameShape.lineTo(2.1, 2.1);
      frameShape.lineTo(-2.1, 2.1);
      frameShape.lineTo(-2.1, -2.1);

      const holePath = new THREE.Path();
      holePath.moveTo(-0.7, -0.7);
      holePath.lineTo(0.7, -0.7);
      holePath.lineTo(0.7, 0.7);
      holePath.lineTo(-0.7, 0.7);
      holePath.lineTo(-0.7, -0.7);
      frameShape.holes.push(holePath);

      const frameGeom = new THREE.ExtrudeGeometry(frameShape, {{ depth: 0.22, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.04, bevelThickness: 0.04 }});
      boardGroup.add(new THREE.Mesh(frameGeom, carbonMat));

      // 4 Clear Metallic Grid Dividers visible on front face (Z = 0.24)
      [-0.7, 0.7].forEach((gx) => {{
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 0.08), goldMat);
        vBar.position.set(gx, 0, 0.24);
        boardGroup.add(vBar);

        const hBar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.08), goldMat);
        hBar.position.set(0, gx, 0.24);
        boardGroup.add(hBar);
      }});

      // Gold Corner Brackets
      [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].forEach(([cx, cy]) => {{
        const cMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.28), goldMat);
        cMesh.position.set(cx, cy, 0.05);
        boardGroup.add(cMesh);
      }});

      // 2-bar crossing 'X'
      const createX = (x, y) => {{
        const xGroup = new THREE.Group();
        xGroup.position.set(x, y, 0.26);
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.16), xMat);
        b1.rotation.z = Math.PI / 4;
        xGroup.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.16), xMat);
        b2.rotation.z = -Math.PI / 4;
        xGroup.add(b2);
        return xGroup;
      }};

      const o1 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.12, 16, 24), oMat);
      o1.position.set(-1.4, 1.4, 0.26);
      boardGroup.add(o1);

      boardGroup.add(createX(1.4, 1.4));

      const o2 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.12, 16, 24), oMat);
      o2.position.set(1.4, -1.4, 0.26);
      boardGroup.add(o2);

      boardGroup.add(createX(-1.4, -1.4));

      // CENTER 3x3 CELL: HINGED WINDOW DOOR
      const windowDoorPivot = new THREE.Group();
      windowDoorPivot.position.set(-0.7, 0, 0.12);
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.36, 0.14), goldMat);
      doorMesh.position.set(0.68, 0, 0);
      windowDoorPivot.add(doorMesh);

      const lattice = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.16), oMat);
      lattice.position.set(0.68, 0, 0);
      windowDoorPivot.add(lattice);

      boardGroup.add(windowDoorPivot);

      // Portal tunnel behind center window
      const tunnelRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.25, 32), new THREE.MeshBasicMaterial({{ color: 0x06b6d4, side: THREE.DoubleSide }}));
      tunnelRing.position.set(0, 0, -0.1);
      tunnelRing.visible = false;
      boardGroup.add(tunnelRing);

      rootGroup.add(boardGroup);

      updateChoreography = (t) => {{
        if (t < 0.52) {{
          boardGroup.rotation.y = -0.25 + t * 0.5;
          boardGroup.rotation.x = 0.15 + Math.sin(t * Math.PI) * 0.1;
          windowDoorPivot.rotation.y = 0;
          tunnelRing.visible = false;
        }} else {{
          const openT = (t - 0.52) / 0.48;
          const easeOpen = openT * openT * (3 - 2 * openT);
          windowDoorPivot.rotation.y = -easeOpen * Math.PI * 0.85; // Door swings open 150°

          tunnelRing.visible = true;
          tunnelRing.scale.setScalar(1.0 + easeOpen * 7.5);

          // Camera dives right THROUGH the open center window to 100% transparency!
          camera.position.z = 7.5 - easeOpen * 8.6;
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 4. MYSTERY QUEST: CHÌA KHÓA VÀO Ổ, XOAY 90 ĐỘ, NẮP MỞ MƯỢT, RƯƠNG HẠ XUỐNG MỞ CỔNG
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'mystery_quest') {{
      pMat.color.setHex(0xf59e0b);
      rimLight.color.setHex(0xa855f7);

      const woodMat = new THREE.MeshStandardMaterial({{ color: 0x451a03, metalness: 0.25, roughness: 0.5 }});
      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.95, roughness: 0.16, flatShading: true }});
      const gemMat = new THREE.MeshStandardMaterial({{ color: 0xa855f7, metalness: 0.85, roughness: 0.18, flatShading: true }});

      const chestGroup = new THREE.Group();

      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.5), woodMat);
      baseMesh.position.y = -0.25;
      chestGroup.add(baseMesh);

      [[-1.0, -0.25], [1.0, -0.25]].forEach(([bx, by]) => {{
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.15, 1.55), goldMat);
        strap.position.set(bx, by, 0);
        chestGroup.add(strap);
      }});

      const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.1), goldMat);
      lockPlate.position.set(0, 0.05, 0.78);
      chestGroup.add(lockPlate);

      // Hinged Lid
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.3, -0.75);

      const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 16, 1, false, 0, Math.PI), woodMat);
      lidMesh.rotation.z = Math.PI / 2;
      lidMesh.position.set(0, 0, 0.75);
      lidPivot.add(lidMesh);

      [[-1.0], [1.0]].forEach(([lx]) => {{
        const strapL = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 16, Math.PI), goldMat);
        strapL.position.set(lx[0], 0, 0.75);
        strapL.rotation.y = Math.PI / 2;
        lidPivot.add(strapL);
      }});

      chestGroup.add(lidPivot);
      rootGroup.add(chestGroup);

      // Skeleton Key
      const keyGroup = new THREE.Group();
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 12, 18), goldMat);
      keyGroup.add(bow);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), gemMat);
      keyGroup.add(gem);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 12), goldMat);
      stem.position.set(0, -0.4, 0);
      keyGroup.add(stem);
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), goldMat);
      bit.position.set(0.08, -0.65, 0);
      keyGroup.add(bit);

      keyGroup.position.set(1.2, 0.6, 2.8);
      keyGroup.rotation.x = Math.PI / 2;
      rootGroup.add(keyGroup);

      // Portal at center (parented to rootGroup, not chestGroup)
      const questPortal = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 32), new THREE.MeshBasicMaterial({{ color: 0xf59e0b, side: THREE.DoubleSide }}));
      questPortal.position.set(0, 0.2, 0);
      questPortal.visible = false;
      rootGroup.add(questPortal);

      updateChoreography = (t) => {{
        chestGroup.rotation.y = -0.2 + Math.sin(t * Math.PI) * 0.12;

        if (t < 0.40) {{
          const keyT = t / 0.40;
          const easeKey = keyT * keyT * (3 - 2 * keyT);
          keyGroup.position.set(1.2 * (1 - easeKey), 0.6 - easeKey * 0.55, 2.8 - easeKey * 1.95);
          keyGroup.rotation.z = 0;
          lidPivot.rotation.x = 0;
          questPortal.visible = false;
        }} else if (t < 0.52) {{
          const insT = (t - 0.40) / 0.12;
          keyGroup.position.set(0, 0.05, 0.85 - insT * 0.15);
        }} else if (t < 0.65) {{
          const rotT = (t - 0.52) / 0.13;
          keyGroup.rotation.z = rotT * Math.PI * 0.5;
        }} else {{
          // CHEST LID OPENS SMOOTHLY, CHEST RECEDES DOWNWARD, PORTAL EXPANDS
          const openT = (t - 0.65) / 0.35;
          const easeLid = 1 - Math.pow(1 - openT, 3); // Smooth easeOutCubic

          lidPivot.rotation.x = -easeLid * 1.85;
          keyGroup.position.z = 0.70 - openT * 0.8;
          keyGroup.scale.setScalar(Math.max(0.01, 1 - openT * 1.5));

          chestGroup.position.y = -openT * 8.5; // Chest descends completely out of frame!

          questPortal.visible = true;
          questPortal.scale.setScalar(1.0 + easeLid * 16.0);
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 5. SPEED RACE: SIÊU XE CYBERPUNK / F1 GÓC QUAN SÁT 3/4 & NITRO PHÓNG QUA ỐNG KÍNH
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'speed_race') {{
      pMat.color.setHex(0x06b6d4);
      rimLight.color.setHex(0x06b6d4);

      const car = new THREE.Group();
      const carMat = new THREE.MeshStandardMaterial({{ color: 0x0f172a, metalness: 0.92, roughness: 0.18, flatShading: true }});
      const cyanMat = new THREE.MeshStandardMaterial({{ color: 0x06b6d4, metalness: 0.95, roughness: 0.12, flatShading: true }});
      const tireMat = new THREE.MeshStandardMaterial({{ color: 0x27272a, metalness: 0.4, roughness: 0.6 }});
      const glassMat = new THREE.MeshStandardMaterial({{ color: 0x38bdf8, metalness: 0.95, roughness: 0.1, transparent: true, opacity: 0.85 }});
      const headlightMat = new THREE.MeshStandardMaterial({{ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.0 }});

      // Sculpted Aerodynamic Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 3.4), carMat);
      chassis.position.y = 0.3;
      car.add(chassis);

      // Low Wedge Hood & Front Splitter (Authentic F1 / Supercar nose)
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 1.4), cyanMat);
      hood.position.set(0, 0.25, 1.8);
      car.add(hood);

      // Xenon Headlights
      [-0.6, 0.6].forEach(hx => {{
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), headlightMat);
        hl.position.set(hx, 0.3, 2.5);
        car.add(hl);
      }});

      // Cockpit Canopy
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.5, 4), glassMat);
      canopy.rotation.x = Math.PI / 2;
      canopy.position.set(0, 0.62, 0.1);
      car.add(canopy);

      // Rear GT Wing / Spoiler on twin pylons
      const pylonL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.15), cyanMat);
      pylonL.position.set(-0.6, 0.55, -1.4);
      car.add(pylonL);

      const pylonR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.15), cyanMat);
      pylonR.position.set(0.6, 0.55, -1.4);
      car.add(pylonR);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.45), cyanMat);
      spoiler.position.set(0, 0.75, -1.4);
      car.add(spoiler);

      // 4 Wheels
      const wheels = [];
      const tireG = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16);
      const rimG = new THREE.CylinderGeometry(0.22, 0.22, 0.30, 10);

      [[-1.05, 0.3, 1.0], [1.05, 0.3, 1.0], [-1.05, 0.3, -1.0], [1.05, 0.3, -1.0]].forEach(([wx, wy, wz]) => {{
        const wGroup = new THREE.Group();
        wGroup.position.set(wx, wy, wz);

        const tire = new THREE.Mesh(tireG, tireMat);
        tire.rotation.z = Math.PI / 2;
        wGroup.add(tire);

        const rim = new THREE.Mesh(rimG, cyanMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(rim);

        car.add(wGroup);
        wheels.push(wGroup);
      }});

      // Dual Nitro Exhaust Flame Cones
      const flameMat = new THREE.MeshStandardMaterial({{ color: 0xf97316, metalness: 0.4, roughness: 0.3, flatShading: true }});
      const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.2, 12), flameMat);
      flameL.rotation.x = Math.PI / 2;
      flameL.position.set(0.45, 0.3, -2.1);
      car.add(flameL);

      const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.2, 12), flameMat);
      flameR.rotation.x = Math.PI / 2;
      flameR.position.set(-0.45, 0.3, -2.1);
      car.add(flameR);

      car.position.set(0, 0, -6.5);
      rootGroup.add(car);

      updateChoreography = (t) => {{
        wheels.forEach(w => {{ w.rotation.x += 0.45; }});

        if (t < 0.60) {{
          const runT = t / 0.60;
          const easeRun = runT * runT * (3 - 2 * runT);
          car.position.z = -6.5 + easeRun * 6.5; // Moves to Z = 0
          car.position.x = -0.6 + Math.sin(runT * Math.PI) * 0.8;
          // Dynamic 3/4 perspective angle
          car.rotation.y = -0.48 + (1 - runT) * 0.25;
          car.rotation.x = 0.20;
          car.position.y = Math.sin(t * 30) * 0.02;

          flameL.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.4, 1);
          flameR.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.4, 1);
        }} else {{
          // MAX NITRO ROCKETS STRAIGHT PAST CAMERA
          const nitroT = (t - 0.60) / 0.40;
          const easeNitro = nitroT * nitroT * nitroT;
          car.position.z = easeNitro * 18.0; // Rockets behind camera!
          car.position.x = 0;
          car.rotation.y = 0;
          car.rotation.x = 0;

          flameL.scale.set(2.2, 2.8, 1);
          flameR.scale.set(2.2, 2.8, 1);
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 6. BATTLE ROYALE: GÓC NHÌN CAO 3/4 XUỐNG HÒM AIRDROP & LAO VÔ LÒNG HỘP XUYÊN ĐÁY
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'battle_royale') {{
      pMat.color.setHex(0xef4444);
      rimLight.color.setHex(0xef4444);

      // Elevated Camera Angle looking down 30 degrees into the crate
      camera.position.set(0, 3.2, 5.8);
      camera.lookAt(0, 0, 0);

      const crateGroup = new THREE.Group();
      const crateMat = new THREE.MeshStandardMaterial({{ color: 0x991b1b, metalness: 0.82, roughness: 0.3, flatShading: true }});
      const tarpMat = new THREE.MeshStandardMaterial({{ color: 0x0284c7, metalness: 0.88, roughness: 0.22, flatShading: true }});
      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.95, roughness: 0.16, flatShading: true }});

      // 4 Crate Walls (Hollow Interior)
      const wallFront = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.12), crateMat);
      wallFront.position.set(0, 0, 0.84);
      crateGroup.add(wallFront);

      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.12), crateMat);
      wallBack.position.set(0, 0, -0.84);
      crateGroup.add(wallBack);

      const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 1.8), crateMat);
      wallLeft.position.set(-0.84, 0, 0);
      crateGroup.add(wallLeft);

      const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 1.8), crateMat);
      wallRight.position.set(0.84, 0, 0);
      crateGroup.add(wallRight);

      // Glowing Legendary Loot Cache inside
      const lootCache = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42), goldMat);
      lootCache.position.set(0, -0.2, 0);
      crateGroup.add(lootCache);

      // Blue Canvas Tarp Lid
      const tarpLidPivot = new THREE.Group();
      tarpLidPivot.position.set(0, 0.7, -0.84);

      const tarpLid = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.9), tarpMat);
      tarpLid.position.set(0, 0, 0.84);
      tarpLidPivot.add(tarpLid);
      crateGroup.add(tarpLidPivot);

      // Red Flare Canister
      const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 12), new THREE.MeshStandardMaterial({{ color: 0xef4444 }}));
      flare.position.set(0.72, 0.95, 0.72);
      crateGroup.add(flare);

      rootGroup.add(crateGroup);

      // Legendary Loot Beam Portal
      const lootPortal = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.2, 32), new THREE.MeshBasicMaterial({{ color: 0xfbbf24, side: THREE.DoubleSide }}));
      lootPortal.rotation.x = Math.PI / 2;
      lootPortal.position.set(0, 0.2, 0);
      lootPortal.visible = false;
      crateGroup.add(lootPortal);

      updateChoreography = (t) => {{
        if (t < 0.48) {{
          const fallT = t / 0.48;
          crateGroup.position.y = 2.4 - fallT * 2.4;
          crateGroup.rotation.y = t * Math.PI * 0.6;
          tarpLidPivot.rotation.x = 0;
          lootPortal.visible = false;
        }} else if (t < 0.58) {{
          const bT = (t - 0.48) / 0.10;
          crateGroup.position.y = -Math.sin(bT * Math.PI) * 0.12;
        }} else if (t < 0.72) {{
          const openT = (t - 0.58) / 0.14;
          const easeLid = 1 - Math.pow(1 - openT, 3);
          tarpLidPivot.rotation.x = -easeLid * 2.1;
          lootCache.rotation.y = openT * Math.PI;
        }} else {{
          // CAMERA DIVES DOWN INTO OPEN CRATE & WALLS PART OUTWARDS INTO 100% TRANSPARENCY
          const diveT = (t - 0.72) / 0.28;
          const easeDive = diveT * diveT * (3 - 2 * diveT);

          camera.position.set(0, 3.2 - easeDive * 4.5, 5.8 - easeDive * 7.0);
          camera.lookAt(0, -1.0, 0);

          // 4 Crate walls smoothly part outwards off-screen
          wallFront.position.z = 0.84 + easeDive * 6.5;
          wallBack.position.z = -0.84 - easeDive * 6.5;
          wallLeft.position.x = -0.84 - easeDive * 6.5;
          wallRight.position.x = 0.84 + easeDive * 6.5;
          lootCache.scale.setScalar(Math.max(0.01, 1 - easeDive * 2.0));
          flare.position.y = 0.95 + easeDive * 6.0;
          // floor removed

          lootPortal.visible = true;
          lootPortal.scale.setScalar(1.0 + easeDive * 18.0);
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 7. BOSS RAID: ĐẦU RỒNG SCULPTED LIỀN MẠCH, HÀM MỞ GẦM THÉT PHUN BÃO LỬA
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'boss_raid') {{
      pMat.color.setHex(0xdc2626);
      rimLight.color.setHex(0xf97316);
      rimLight.intensity = 5.0;

      const dragon = new THREE.Group();
      const skullMat = new THREE.MeshStandardMaterial({{ color: 0x27272a, metalness: 0.85, roughness: 0.28, flatShading: true }});
      const hornMat = new THREE.MeshStandardMaterial({{ color: 0x3f3f46, metalness: 0.9, roughness: 0.2, flatShading: true }});
      const eyeMat = new THREE.MeshStandardMaterial({{ color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 1.5, flatShading: true }});
      const toothMat = new THREE.MeshStandardMaterial({{ color: 0xf8fafc, metalness: 0.2, roughness: 0.3 }});

      // Upper Cranium & Snout
      const upperHead = new THREE.Group();
      const cranium = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), skullMat);
      cranium.position.set(0, 0.4, -0.2);
      upperHead.add(cranium);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 0.6), skullMat);
      brow.position.set(0, 0.65, 0.3);
      upperHead.add(brow);

      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 1.3, 6), skullMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 0.25, 0.8);
      upperHead.add(snout);

      // Curved Horns rooted directly into brow
      const hornCurveL = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.65, 0.65, -0.2),
        new THREE.Vector3(-1.15, 1.3, -0.6),
        new THREE.Vector3(-1.45, 1.85, -1.0)
      ]);
      const hornMeshL = new THREE.Mesh(new THREE.TubeGeometry(hornCurveL, 16, 0.16, 8, false), hornMat);
      upperHead.add(hornMeshL);

      const hornCurveR = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.65, 0.65, -0.2),
        new THREE.Vector3(1.15, 1.3, -0.6),
        new THREE.Vector3(1.45, 1.85, -1.0)
      ]);
      const hornMeshR = new THREE.Mesh(new THREE.TubeGeometry(hornCurveR, 16, 0.16, 8, false), hornMat);
      upperHead.add(hornMeshR);

      // Glowing Magma Eyes
      const eyeL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), eyeMat);
      eyeL.rotation.x = Math.PI / 2;
      eyeL.position.set(-0.45, 0.4, 0.55);
      upperHead.add(eyeL);

      const eyeR = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), eyeMat);
      eyeR.rotation.x = Math.PI / 2;
      eyeR.position.set(0.45, 0.4, 0.55);
      upperHead.add(eyeR);

      // Upper Fangs
      [[-0.3, 0.85], [0.3, 0.85]].forEach(([tx, tz]) => {{
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), toothMat);
        tooth.rotation.x = Math.PI;
        tooth.position.set(tx, 0.05, tz);
        upperHead.add(tooth);
      }});

      dragon.add(upperHead);

      // Lower Jaw
      const jawPivot = new THREE.Group();
      jawPivot.position.set(0, -0.15, -0.4);

      const jawMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 1.2, 6), skullMat);
      jawMesh.rotation.x = Math.PI / 2;
      jawMesh.position.set(0, -0.1, 0.9);
      jawPivot.add(jawMesh);

      [[-0.25, 0.9], [0.25, 0.9]].forEach(([tx, tz]) => {{
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), toothMat);
        tooth.position.set(tx, 0.15, tz);
        jawPivot.add(tooth);
      }});

      dragon.add(jawPivot);

      // Front Magma Demonic Point Light to brightly illuminate dragon skull facets
      const dragonGlow = new THREE.PointLight(0xff4500, 5.0, 12);
      dragonGlow.position.set(0, 0.5, 2.5);
      dragon.add(dragonGlow);

      // Gold horn rings
      [-0.9, 0.9].forEach(rx => {{
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 8, 16), new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 }}));
        ring.position.set(rx, 1.1, -0.4);
        dragon.add(ring);
      }});

      // Volcanic Hellfire Eruption Ring
      const firePortal = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.35, 32), new THREE.MeshBasicMaterial({{ color: 0xdc2626, side: THREE.DoubleSide }}));
      firePortal.position.set(0, 0, 1.1);
      firePortal.visible = false;
      dragon.add(firePortal);

      rootGroup.add(dragon);

      updateChoreography = (t) => {{
        if (t < 0.48) {{
          dragon.rotation.y = Math.sin(t * Math.PI * 2) * 0.16;
          jawPivot.rotation.x = 0;
          upperHead.position.y = 0;
          firePortal.visible = false;
        }} else if (t < 0.65) {{
          const roarT = (t - 0.48) / 0.17;
          const easeRoar = roarT * roarT * (3 - 2 * roarT);
          jawPivot.rotation.x = easeRoar * 0.75;
          upperHead.position.y = easeRoar * 0.25;
        }} else {{
          const fireT = (t - 0.65) / 0.35;
          firePortal.visible = true;
          firePortal.scale.setScalar(1.0 + fireT * 16.0);
          dragon.position.z = -fireT * 7.5; // Dragon recoils completely away
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 8. AUCTION STEALTH: BÚA ĐẬP VĂNG RA NGOÀI & MẶT NẠ VENETIAN TÁCH ĐÔI
    // ─────────────────────────────────────────────────────────────
    else if (modeName === 'auction_stealth') {{
      pMat.color.setHex(0xa855f7);
      rimLight.color.setHex(0xf59e0b);

      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.96, roughness: 0.15, flatShading: true }});
      const rosewoodMat = new THREE.MeshStandardMaterial({{ color: 0x451a03, metalness: 0.3, roughness: 0.4 }});
      const marbleMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, metalness: 0.85, roughness: 0.22, flatShading: true }});
      const maskMat = new THREE.MeshStandardMaterial({{ color: 0x6b21a8, metalness: 0.82, roughness: 0.2, flatShading: true }});

      // Ceremonial Auction Gavel
      const gavel = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 20), goldMat);
      head.rotation.z = Math.PI / 2;
      gavel.add(head);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.7, 16), rosewoodMat);
      handle.position.set(0, -0.9, 0);
      gavel.add(handle);

      gavel.position.set(0, 1.2, 0.3);
      rootGroup.add(gavel);

      // Octagonal Marble Sounding Block
      const anvil = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.3, 8), marbleMat);
      anvil.position.set(0, -0.85, 0.3);
      rootGroup.add(anvil);

      // Venetian Phantom Mask Halves
      const maskGroup = new THREE.Group();
      const maskLeft = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 16, Math.PI / 2, Math.PI, 0, Math.PI / 1.6), maskMat);
      maskLeft.position.set(-0.08, 0.1, 0);
      maskLeft.rotation.x = Math.PI;
      maskGroup.add(maskLeft);

      const maskRight = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 16, -Math.PI / 2, Math.PI, 0, Math.PI / 1.6), maskMat);
      maskRight.position.set(0.08, 0.1, 0);
      maskRight.rotation.x = Math.PI;
      maskGroup.add(maskRight);

      maskGroup.position.set(0, 0, -1.5);
      maskGroup.visible = false;
      rootGroup.add(maskGroup);

      updateChoreography = (t) => {{
        if (t < 0.42) {{
          gavel.position.y = 1.2 + Math.sin(t * Math.PI * 4) * 0.35;
          anvil.position.y = -0.85;
          maskGroup.visible = false;
        }} else if (t < 0.52) {{
          const slamT = (t - 0.42) / 0.10;
          gavel.position.y = 1.2 - slamT * 1.65;
        }} else if (t < 0.65) {{
          const exitT = (t - 0.52) / 0.13;
          gavel.position.x = exitT * 8.5; // VĂNG HOÀN TOÀN KHỎI MÀN HÌNH
          gavel.position.y = -0.45 - exitT * 4.5;
          anvil.position.y = -0.85 - exitT * 5.5;

          maskGroup.visible = true;
          maskGroup.position.z = -1.5 + exitT * 1.5;
        }} else {{
          gavel.position.x = 25;
          anvil.position.y = -25;

          const splitT = (t - 0.65) / 0.35;
          const easeSplit = splitT * splitT * (3 - 2 * splitT);

          maskLeft.position.x = -0.08 - easeSplit * 6.8;
          maskLeft.rotation.y = -easeSplit * 0.45;
          maskRight.position.x = 0.08 + easeSplit * 6.8;
          maskRight.rotation.y = easeSplit * 0.45;
        }}
      }};
    }}

    // ─────────────────────────────────────────────────────────────
    // 9. CLASSIC QUIZ: CÚP VÔ ĐỊCH CHAMPIONS CUP PHÓNG THẲNG CAMERA
    // ─────────────────────────────────────────────────────────────
    else {{
      pMat.color.setHex(0xeab308);
      rimLight.color.setHex(0x38bdf8);

      const goldMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, metalness: 0.96, roughness: 0.14, flatShading: true }});
      const marbleMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, metalness: 0.85, roughness: 0.22, flatShading: true }});

      const trophy = new THREE.Group();

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.45, 1.5, 24), goldMat);
      cup.position.set(0, 0.7, 0);
      trophy.add(cup);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 16), goldMat);
      stem.position.set(0, -0.4, 0);
      trophy.add(stem);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 0.48, 24), marbleMat);
      base.position.set(0, -1.04, 0);
      trophy.add(base);

      const hG = new THREE.TorusGeometry(0.7, 0.12, 16, 24);
      const hL = new THREE.Mesh(hG, goldMat);
      hL.position.set(-1.05, 0.7, 0);
      trophy.add(hL);

      const hR = new THREE.Mesh(hG, goldMat);
      hR.position.set(1.05, 0.7, 0);
      trophy.add(hR);

      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), goldMat);
      star.position.set(0, 1.8, 0);
      trophy.add(star);

      const sunHalo = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.55, 32), new THREE.MeshBasicMaterial({{ color: 0xfbbf24, side: THREE.DoubleSide }}));
      sunHalo.visible = false;
      trophy.add(sunHalo);

      rootGroup.add(trophy);

      updateChoreography = (t) => {{
        star.rotation.y = t * Math.PI * 4;
        if (t < 0.55) {{
          trophy.rotation.y = t * Math.PI * 2.2;
          trophy.rotation.x = 0.15 + Math.sin(t * Math.PI * 2) * 0.1;
          sunHalo.visible = false;
        }} else {{
          const surgeT = (t - 0.55) / 0.45;
          const easeSurge = surgeT * surgeT * (3 - 2 * surgeT);
          trophy.position.z = easeSurge * 8.5;

          sunHalo.visible = true;
          sunHalo.scale.setScalar(1.0 + easeSurge * 6.5);
        }}
      }};
    }}
  }};

  window.renderFrame = function(frameIndex) {{
    const t = frameIndex / {TOTAL_FRAMES};
    if (updateChoreography) {{
      updateChoreography(t);
    }}

    // Update Particles
    const pos = pGeom.attributes.position.array;
    if (t < 0.55) {{
      for (let i = 0; i < PARTICLE_COUNT; i++) {{
        const angle = t * 2.0;
        const x0 = pInitial[i * 3];
        const y0 = pInitial[i * 3 + 1];
        const z0 = pInitial[i * 3 + 2];
        pos[i * 3] = x0 * Math.cos(angle) - z0 * Math.sin(angle);
        pos[i * 3 + 1] = y0 + Math.sin(t * 3.0 + i) * 0.1;
        pos[i * 3 + 2] = x0 * Math.sin(angle) + z0 * Math.cos(angle);
      }}
      pMat.opacity = 0.85;
      pMat.size = 0.12;
    }} else {{
      const burstT = (t - 0.55) / 0.45;
      for (let i = 0; i < PARTICLE_COUNT; i++) {{
        pos[i * 3] += pVelocities[i * 3] * 0.16 * (1.0 + burstT * 2.0);
        pos[i * 3 + 1] += pVelocities[i * 3 + 1] * 0.16 * (1.0 + burstT * 2.0);
        pos[i * 3 + 2] += pVelocities[i * 3 + 2] * 0.16 * (1.0 + burstT * 2.0);
      }}
      pMat.opacity = Math.max(0, 1.0 - burstT * 0.85);
      pMat.size = 0.18 + burstT * 0.22;
    }}
    pGeom.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  }};

  window.ready = true;
</script>
</body>
</html>
"""

HTML_FILE = os.path.abspath("render_3d_final.html")
with open(HTML_FILE, "w", encoding="utf-8") as f:
    f.write(HTML_TEMPLATE)

MODES = [
    ("tower_defense", "tower_defense.webm"),
    ("gold_mine", "gold_mine.webm"),
    ("grid_caro", "grid_caro.webm"),
    ("mystery_quest", "mystery_quest.webm"),
    ("speed_race", "speed_race.webm"),
    ("battle_royale", "battle_royale.webm"),
    ("boss_raid", "boss_raid.webm"),
    ("auction_stealth", "auction_stealth.webm"),
    ("classic", "classic.webm"),
]

def encode_mode(page, mode_id, out_filename):
    out_path = os.path.join(OUT_DIR, out_filename)
    print(f"\n==========================================")
    print(f"🎬 RENDERING FINAL MASTERPIECE: {mode_id} -> {out_filename}")
    print(f"==========================================")
    
    page.evaluate(f"window.setupMode('{mode_id}')")
    
    ffmpeg_cmd = [
        FFMPEG_PATH, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "bgra",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libvpx",
        "-auto-alt-ref", "0",
        "-b:v", "2400k",
        "-quality", "realtime",
        "-cpu-used", "8",
        "-threads", "8",
        "-pix_fmt", "yuva420p",
        out_path
    ]
    
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    
    for f in range(TOTAL_FRAMES):
        data_url = page.evaluate(f"window.renderFrame({f})")
        header, b64 = data_url.split(",", 1)
        raw_png = base64.b64decode(b64)
        
        nparr = np.frombuffer(raw_png, np.uint8)
        img_bgra = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        proc.stdin.write(img_bgra.tobytes())
        
        if f % 10 == 0 or f == TOTAL_FRAMES - 1:
            alpha = img_bgra[:, :, 3]
            pct_transparent = (np.sum(alpha == 0) / alpha.size) * 100
            print(f"  Frame {f+1:02d}/{TOTAL_FRAMES}: {pct_transparent:.1f}% transparent background")
            
    proc.stdin.close()
    proc.wait()
    file_size_kb = os.path.getsize(out_path) / 1024
    print(f"✅ Generated {out_filename}: {file_size_kb:.1f} KB (Final Masterpiece WebM)")

print("Launching Playwright Chrome headless...")
with sync_playwright() as p:
    browser = p.chromium.launch(
        channel="chrome",
        headless=True,
        args=["--allow-file-access-from-files", "--use-gl=angle", "--use-angle=d3d11", "--enable-webgl"]
    )
    page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})
    file_url = f"file:///{HTML_FILE.replace(os.sep, '/')}"
    page.goto(file_url)
    page.wait_for_function("window.ready === true")
    
    for mode_id, out_filename in MODES:
        encode_mode(page, mode_id, out_filename)
        
    browser.close()

if os.path.exists(HTML_FILE):
    os.remove(HTML_FILE)

print("\n🎉 ALL 9 FINAL MASTERPIECE 3D TRANSITIONS COMPLETED!")
