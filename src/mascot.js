/*
 * LUMI — The Trusted AI Companion
 * Real-time WebGL mascot built from Three.js primitives (ceramic body, glossy
 * face display, emissive eyes and energy core). Bundled locally by
 * tools/build.mjs, so no network is needed at presentation time.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, SphereGeometry,
  CapsuleGeometry, TorusGeometry, CylinderGeometry, MeshPhysicalMaterial,
  MeshStandardMaterial, MeshBasicMaterial, DirectionalLight, PointLight,
  PMREMGenerator, Sprite, SpriteMaterial, CanvasTexture, AdditiveBlending,
  ACESFilmicToneMapping, SRGBColorSpace, Vector3, PlaneGeometry, DoubleSide,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function hologramTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(84,229,255,0.9)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(6, 6, 244, 148, 18);
  g.stroke();
  g.fillStyle = 'rgba(84,229,255,0.16)';
  g.fill();
  g.fillStyle = 'rgba(84,229,255,0.95)';
  g.fillRect(24, 28, 90, 12);
  g.fillStyle = 'rgba(232,190,117,0.95)';
  g.fillRect(24, 52, 54, 8);
  g.fillStyle = 'rgba(84,229,255,0.55)';
  [76, 96, 116].forEach((y, i) => g.fillRect(24, y, 200 - i * 46, 8));
  g.beginPath();
  g.arc(206, 46, 18, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(84,229,255,0.9)';
  g.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function create(canvas, opts = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.15, 10.5);
  camera.lookAt(0, -0.45, 0);

  // ---------- materials ----------
  const ceramic = new MeshPhysicalMaterial({
    color: 0xf2f5fa, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
  });
  const visorMat = new MeshPhysicalMaterial({
    color: 0x040a14, roughness: 0.1, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.04,
  });
  const eyeMat = new MeshBasicMaterial({ color: 0x8ff3ff, toneMapped: false });
  const coreMat = new MeshBasicMaterial({ color: 0x5fb4ff, toneMapped: false });
  const accentMat = new MeshStandardMaterial({
    color: 0x1f4fff, emissive: 0x2c6bff, emissiveIntensity: 1.4, roughness: 0.35, metalness: 0.2,
  });
  const steel = new MeshStandardMaterial({ color: 0xc8d3e2, roughness: 0.25, metalness: 0.9 });
  const ringMat = new MeshBasicMaterial({ color: 0x54e5ff, toneMapped: false, transparent: true, opacity: 0.75 });
  const ringMat2 = new MeshBasicMaterial({ color: 0x477bff, toneMapped: false, transparent: true, opacity: 0.45 });

  const root = new Group();
  scene.add(root);
  const bot = new Group();
  root.add(bot);

  // ---------- head ----------
  const headPivot = new Group();
  headPivot.position.y = 0.62;
  bot.add(headPivot);
  const headShape = new Group();
  headShape.scale.set(1.2, 0.98, 1.02);
  headPivot.add(headShape);
  headShape.add(new Mesh(new SphereGeometry(1, 64, 48), ceramic));

  const visor = new Mesh(
    new SphereGeometry(1.014, 64, 40, Math.PI / 2 - 0.98, 1.96, Math.PI / 2 - 0.56, 1.1),
    visorMat,
  );
  headShape.add(visor);

  const onFace = (x, y, r = 1.03) => new Vector3(x, y, 0).setZ(Math.sqrt(Math.max(0, 1 - x * x - y * y))).normalize().multiplyScalar(r);

  const eyes = [];
  [-0.34, 0.34].forEach((x) => {
    const eye = new Mesh(new CapsuleGeometry(0.085, 0.13, 8, 20), eyeMat);
    const p = onFace(x, 0.08);
    eye.position.copy(p);
    eye.lookAt(p.clone().multiplyScalar(2));
    eye.scale.z = 0.35;
    const holder = new Group();
    holder.add(eye);
    headShape.add(holder);
    eyes.push(eye);
  });

  const mouth = new Mesh(new TorusGeometry(0.1, 0.02, 8, 28, Math.PI), eyeMat);
  const mp = onFace(0, -0.2);
  mouth.position.copy(mp);
  mouth.lookAt(mp.clone().multiplyScalar(2));
  mouth.rotateZ(Math.PI);
  headShape.add(mouth);

  // ears + rings
  [-1, 1].forEach((s) => {
    const ear = new Mesh(new CylinderGeometry(0.22, 0.24, 0.18, 40), ceramic);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(s * 1.16, 0, 0);
    headPivot.add(ear);
    const ring = new Mesh(new TorusGeometry(0.16, 0.028, 12, 40), accentMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(s * 1.26, 0, 0);
    headPivot.add(ring);
  });

  // antenna
  const antenna = new Mesh(new CylinderGeometry(0.022, 0.03, 0.36, 12), steel);
  antenna.position.set(0, 1.12, 0);
  headPivot.add(antenna);
  const tip = new Mesh(new SphereGeometry(0.075, 24, 16), eyeMat);
  tip.position.set(0, 1.33, 0);
  headPivot.add(tip);
  const tipGlow = new Sprite(new SpriteMaterial({
    map: radialTexture('rgba(160,245,255,1)', 'rgba(84,229,255,0.35)'),
    blending: AdditiveBlending, depthWrite: false, transparent: true,
  }));
  tipGlow.scale.set(0.6, 0.6, 1);
  tipGlow.position.copy(tip.position);
  headPivot.add(tipGlow);

  // ---------- neck ring ----------
  const neck = new Mesh(new TorusGeometry(0.38, 0.045, 16, 60), visorMat);
  neck.rotation.x = Math.PI / 2;
  neck.position.y = -0.42;
  bot.add(neck);
  const neckGlow = new Mesh(new TorusGeometry(0.38, 0.012, 8, 60), ringMat);
  neckGlow.rotation.x = Math.PI / 2;
  neckGlow.position.y = -0.4;
  bot.add(neckGlow);

  // ---------- body ----------
  const body = new Group();
  body.position.y = -1.08;
  bot.add(body);
  const torso = new Mesh(new SphereGeometry(1, 56, 40), ceramic);
  torso.scale.set(0.74, 0.68, 0.64);
  body.add(torso);
  const core = new Mesh(new SphereGeometry(0.15, 32, 24), coreMat);
  core.position.set(0, 0.02, 0.58);
  body.add(core);
  const coreRing = new Mesh(new TorusGeometry(0.21, 0.026, 12, 48), accentMat);
  coreRing.position.set(0, 0.02, 0.6);
  body.add(coreRing);
  const coreGlow = new Sprite(new SpriteMaterial({
    map: radialTexture('rgba(150,210,255,1)', 'rgba(71,123,255,0.45)'),
    blending: AdditiveBlending, depthWrite: false, transparent: true,
  }));
  coreGlow.position.set(0, 0.02, 0.75);
  coreGlow.scale.set(1.1, 1.1, 1);
  body.add(coreGlow);
  const coreLight = new PointLight(0x54a8ff, 2.2, 3, 2);
  coreLight.position.set(0, 0.05, 1.1);
  body.add(coreLight);

  // arms
  const arms = [-1, 1].map((s) => {
    const pivot = new Group();
    pivot.position.set(s * 0.7, 0.18, 0);
    const arm = new Mesh(new CapsuleGeometry(0.13, 0.3, 10, 24), ceramic);
    arm.position.y = -0.26;
    pivot.add(arm);
    const cuff = new Mesh(new TorusGeometry(0.13, 0.02, 8, 32), ringMat2);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.48;
    pivot.add(cuff);
    body.add(pivot);
    return { pivot, s };
  });

  // ---------- hover rings + ground glow ----------
  const halo = new Mesh(new TorusGeometry(0.9, 0.012, 8, 140), ringMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -2.05;
  root.add(halo);
  const halo2 = new Mesh(new TorusGeometry(1.18, 0.008, 8, 160), ringMat2);
  halo2.rotation.x = Math.PI / 2 + 0.12;
  halo2.position.y = -2.0;
  root.add(halo2);
  const ground = new Sprite(new SpriteMaterial({
    map: radialTexture('rgba(84,229,255,0.85)', 'rgba(71,123,255,0.25)'),
    blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
  }));
  ground.scale.set(3.2, 0.9, 1);
  ground.position.y = -2.15;
  root.add(ground);

  // hologram panel + orbiting motes
  const holo = new Mesh(
    new PlaneGeometry(1.15, 0.72),
    new MeshBasicMaterial({ map: hologramTexture(), transparent: true, opacity: 0, side: DoubleSide, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  holo.position.set(-1.75, 0.55, 0.3);
  holo.rotation.y = 0.5;
  root.add(holo);
  const motes = [0, 1, 2].map((i) => {
    const m = new Mesh(new SphereGeometry(0.045, 12, 10), eyeMat);
    root.add(m);
    return m;
  });

  // ---------- lights ----------
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rim = new DirectionalLight(0x54e5ff, 3.2);
  rim.position.set(-4, 2.5, -4);
  scene.add(rim);
  const rim2 = new DirectionalLight(0x477bff, 2.2);
  rim2.position.set(4, -1, -3);
  scene.add(rim2);
  const fill = new DirectionalLight(0x9fb8ff, 0.6);
  fill.position.set(-3, -2, 4);
  scene.add(fill);

  // ---------- state ----------
  const reduced = !!opts.reducedMotion;
  const pose = { yaw: 0, pitch: 0, point: 0, holo: 0 };
  const cur = { yaw: 0, pitch: 0, point: 0, holo: 0 };
  const pointer = { x: 0, y: 0 };
  let running = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let nextBlink = 1.5;
  let blinkT = -1;
  let reactT = -1;
  let happyT = -1;

  function update(dt, wall = dt) {
    time += dt;
    const k = 1 - Math.pow(0.0025, dt);
    cur.yaw = lerp(cur.yaw, pose.yaw + pointer.x * 0.22, k);
    cur.pitch = lerp(cur.pitch, pose.pitch + pointer.y * 0.12, k);
    cur.point = lerp(cur.point, pose.point, k * 0.8);
    cur.holo = lerp(cur.holo, pose.holo, k * 0.6);

    const t = reduced ? 0 : time;
    bot.position.y = Math.sin(t * 1.35) * 0.09;
    bot.rotation.z = Math.sin(t * 0.8) * 0.03;
    headPivot.rotation.y = cur.yaw;
    headPivot.rotation.x = cur.pitch;
    headPivot.rotation.z = Math.sin(t * 0.6) * 0.04;
    body.rotation.y = cur.yaw * 0.35;

    // reaction spin on slide change
    let spin = 0;
    if (reactT >= 0) {
      reactT += wall / 1.15;
      if (reactT >= 1) reactT = -1; else spin = ease(reactT) * Math.PI * 2;
    }
    bot.rotation.y = spin;

    // arms: idle sway, point gesture uses the arm on screen-left
    arms.forEach(({ pivot, s }) => {
      const idle = s * 0.22 + Math.sin(t * 1.6 + s) * 0.05;
      if (s < 0) {
        pivot.rotation.z = lerp(idle, -2.05, cur.point);
        pivot.rotation.x = lerp(0, -0.35, cur.point);
      } else {
        pivot.rotation.z = idle;
      }
    });

    // blink
    nextBlink -= dt;
    if (nextBlink <= 0 && blinkT < 0) { blinkT = 0; nextBlink = 2.4 + Math.random() * 3.2; }
    let eyeY = 1;
    if (blinkT >= 0) {
      blinkT += dt / 0.17;
      eyeY = 1 - Math.sin(Math.min(blinkT, 1) * Math.PI) * 0.9;
      if (blinkT >= 1) { blinkT = Math.random() < 0.18 ? -0.6 : -1; }
    } else if (blinkT < -0.05 && blinkT > -1) {
      blinkT += dt / 0.12; // brief pause before a double blink
      if (blinkT >= -0.05) blinkT = 0;
    }
    if (happyT >= 0) {
      happyT += wall / 1.4;
      eyeY = Math.min(eyeY, 1 - Math.sin(Math.min(happyT, 1) * Math.PI) * 0.55);
      if (happyT >= 1) happyT = -1;
    }
    eyes.forEach((e) => { e.scale.y = eyeY; });

    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    coreGlow.scale.setScalar(0.95 + pulse * 0.3);
    coreLight.intensity = 1.6 + pulse * 1.4;
    tipGlow.scale.setScalar(0.5 + pulse * 0.25);
    halo.rotation.z = t * 0.5;
    halo2.rotation.z = -t * 0.35;
    halo.scale.setScalar(1 + Math.sin(t * 1.35) * 0.03);
    ground.material.opacity = 0.6 + Math.cos(t * 1.35) * 0.15;

    holo.material.opacity = cur.holo * (0.75 + 0.15 * Math.sin(t * 3));
    holo.position.y = 0.55 + Math.sin(t * 1.1) * 0.06;
    motes.forEach((m, i) => {
      const a = t * (0.7 + i * 0.25) + i * 2.1;
      m.position.set(Math.cos(a) * (1.55 + i * 0.12), -0.3 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * 1.1);
    });
  }

  function frame(now) {
    if (!running) return;
    const wall = Math.min(0.5, (now - last) / 1000 || 0.016);
    last = now;
    update(Math.min(0.05, wall), wall);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  const api = {
    setSize(px, dpr) {
      renderer.setPixelRatio(Math.min(dpr || 1, 2));
      renderer.setSize(Math.max(16, Math.round(px)), Math.max(16, Math.round(px)), false);
      if (!running) { update(0); renderer.render(scene, camera); }
    },
    setPose(p) { Object.assign(pose, p); if (!running) { update(0.5); renderer.render(scene, camera); } },
    setPointer(x, y) { pointer.x = x; pointer.y = y; },
    react() { if (!reduced) { reactT = 0; happyT = 0; } },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    renderOnce() { update(0.016); renderer.render(scene, camera); },
  };
  api.renderOnce();
  return api;
}

window.Lumi = { create };
