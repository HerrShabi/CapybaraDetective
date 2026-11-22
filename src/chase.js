import * as THREE from 'three';
import { t } from './i18n.js';
import { audio } from './audio.js';
import { box, ball, cylinder, mat, makeDetective, makeGuard } from './models.js';

// THE POLICE CAR CHASE (Ethan, 2026-11-22, GAME_DESIGN.md Q11-Q20), after you catch Guard Bulldog lying.
// 1. 'drive': first person inside the police car (steering wheel with Copybara's paws, dashboard with a speed
//    meter and a blinking siren light, the radio, SuperCapybara in the passenger seat shouting tips). Dodge
//    traffic, fruit stands and boxes; SPACE = the 🚨 siren makes the cars pull over. Baby Capybara is the radio.
//    Guard Bulldog drives the museum van ahead of you. No timer.
// 2. 'harbor': he jumps on a boat; Copybara dives in.
// 3. 'swim': first person in the water (paws paddling). The boat runs out of gas, he has to swim, and capybaras
//    are faster swimmers: get close and CLICK, the handcuffs.
// 4. 'caught' → 'jail': the bars slam down ("I'll be back!"), then onDone() (the medal party).
// The world runs along -z: the road from z = 0 to -ROAD_LEN, then the dock, then the water.

const ROAD_LEN = 700;
const ROAD_HALF = 7.5;
const LANES = [-4.5, 0, 4.5];
const TOP_SPEED = 28;
const SIREN_MS = 4500;
const SIREN_WAIT_MS = 2500;
const SWIM_SPEED = 9.5;
const BOAT_SPEED = 10;
const GAS_RUNS_OUT = 6; // seconds of boat chase
const GUARD_SWIM = 4.5;
const DOCK_END = -ROAD_LEN - 40;

// A small seeded random, so the street is the same every time
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- Models ----------

function makeCar(color) {
  const g = new THREE.Group();
  g.add(box(2.0, 0.7, 4.0, color, 0, 0.65, 0));
  g.add(box(1.7, 0.6, 2.0, color, 0, 1.3, 0.2));
  g.add(box(1.72, 0.45, 1.6, 0x263238, 0, 1.32, 0.2)); // windows
  for (const x of [-0.95, 0.95]) for (const z of [-1.3, 1.3]) {
    const wheel = cylinder(0.38, 0.38, 0.3, 0x111111, x, 0.38, z);
    wheel.rotation.z = Math.PI / 2;
    g.add(wheel);
  }
  g.add(box(0.4, 0.2, 0.05, 0xff1744, -0.6, 0.75, -2.0), box(0.4, 0.2, 0.05, 0xff1744, 0.6, 0.75, -2.0)); // tail lights
  return g;
}

function makeVan() {
  const g = new THREE.Group();
  g.add(box(2.3, 2.2, 4.8, 0xf5f5f5, 0, 1.4, 0));
  g.add(box(2.32, 0.4, 4.82, 0x1a3a8a, 0, 1.1, 0)); // stripe
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), new THREE.MeshBasicMaterial({
    map: canvasTexture(200, 60, (ctx, w, h) => {
      ctx.fillStyle = '#1a3a8a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 36px Arial Black, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MUSEUM', w / 2, 44);
    }),
  }));
  sign.position.set(0, 2.0, -2.42);
  sign.rotation.y = Math.PI;
  g.add(sign);
  for (const x of [-1.1, 1.1]) for (const z of [-1.6, 1.6]) {
    const wheel = cylinder(0.45, 0.45, 0.3, 0x111111, x, 0.45, z);
    wheel.rotation.z = Math.PI / 2;
    g.add(wheel);
  }
  return g;
}

function makeFruitStand() {
  const g = new THREE.Group();
  g.add(box(2.6, 0.9, 1.4, 0x8d6e63, 0, 0.45, 0));
  for (let i = 0; i < 5; i++) g.add(box(0.52, 0.08, 1.6, i % 2 ? 0xffffff : 0xe53935, -1.04 + i * 0.52, 2.2, 0)); // awning
  for (const x of [-1.2, 1.2]) g.add(box(0.08, 1.4, 0.08, 0x5d4037, x, 1.5, 0.6));
  const fruit = [0xe53935, 0xff9800, 0xfdd835, 0x43a047, 0x8e24aa];
  for (let i = 0; i < 12; i++) g.add(ball(0.16, fruit[i % 5], -1.0 + (i % 6) * 0.4, 1.02, -0.3 + Math.floor(i / 6) * 0.5));
  g.add(ball(0.35, 0x2e7d32, 0.9, 1.2, 0.2)); // a watermelon
  return g;
}

function makeBoxes() {
  const g = new THREE.Group();
  for (const [x, y, z] of [[-0.6, 0.45, 0], [0.6, 0.45, 0], [0, 1.35, 0]]) {
    g.add(box(1.1, 0.9, 1.1, 0xa1887f, x, y, z));
    g.add(box(1.12, 0.12, 0.2, 0x6d4c41, x, y, z));
  }
  return g;
}

function makeBoat() {
  const g = new THREE.Group();
  g.add(box(2.4, 0.9, 5, 0xffffff, 0, 0.3, 0));
  g.add(box(2.42, 0.25, 5.02, 0xd32f2f, 0, 0.1, 0));
  g.add(box(1.6, 0.9, 1.4, 0x90caf9, 0, 1.1, 0.4)); // little cabin
  g.add(box(0.5, 0.7, 0.5, 0x424242, 0, 0.7, 2.7)); // motor
  return g;
}

// The inside of the police car, stuck to the camera (in camera space: -z is forward)
function makeInterior() {
  const g = new THREE.Group();
  g.add(box(3.2, 0.5, 0.7, 0x263238, 0, -0.68, -1.2)); // dashboard
  g.add(box(3.2, 0.06, 0.75, 0x37474f, 0, -0.42, -1.2));
  for (const side of [-1, 1]) {
    const pillar = box(0.14, 1.8, 0.14, 0x111111, side * 1.55, 0.05, -1.25);
    pillar.rotation.z = side * 0.25;
    g.add(pillar);
  }
  g.add(box(3.6, 0.2, 0.5, 0x111111, 0, 0.82, -1.1)); // roof edge
  // The steering wheel, with Copybara's paws in blue sleeves
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 24), mat(0x212121)));
  wheel.add(box(0.5, 0.05, 0.04, 0x212121));
  wheel.add(box(0.12, 0.12, 0.06, 0xffd23f)); // a little gold badge in the middle
  for (const side of [-1, 1]) {
    const paw = new THREE.Group();
    paw.add(box(0.13, 0.13, 0.13, 0x9b6b3d));
    const sleeve = box(0.16, 0.16, 0.5, 0x1a3a8a, side * 0.05, -0.05, 0.3);
    sleeve.rotation.x = 0.5;
    paw.add(sleeve);
    paw.position.set(side * 0.3, 0.02, 0.04);
    wheel.add(paw);
  }
  wheel.position.set(-0.45, -0.44, -0.78);
  wheel.rotation.x = -0.35;
  g.add(wheel);
  // Speed meter (a canvas, redrawn as you drive)
  const speedCanvas = document.createElement('canvas');
  speedCanvas.width = 128;
  speedCanvas.height = 72;
  const speedTexture = new THREE.CanvasTexture(speedCanvas);
  const meter = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.24), new THREE.MeshBasicMaterial({ map: speedTexture }));
  meter.position.set(0.2, -0.3, -1.0);
  meter.rotation.x = -0.25;
  g.add(meter);
  // The siren light on the dashboard, and the radio
  const sirenLight = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0x440000 }));
  sirenLight.position.set(0.55, -0.36, -1.05);
  g.add(sirenLight);
  g.add(box(0.36, 0.2, 0.12, 0x424242, 0.85, -0.36, -1.0)); // radio
  for (let i = 0; i < 4; i++) g.add(box(0.03, 0.12, 0.02, 0x9e9e9e, 0.74 + i * 0.06, -0.36, -0.935));
  // SuperCapybara in the passenger seat, looking ahead
  const buddy = makeDetective().group;
  buddy.scale.setScalar(0.85);
  buddy.position.set(1.05, -1.1, -0.8);
  buddy.rotation.y = Math.PI - 0.35;
  g.add(buddy);
  return { group: g, wheel, sirenLight, speedCanvas, speedTexture, buddy };
}

// Copybara's paws paddling at the bottom of the view (swimming)
function makePaddlers() {
  const g = new THREE.Group();
  const paws = [-1, 1].map((side) => {
    const paw = new THREE.Group();
    paw.add(box(0.2, 0.14, 0.24, 0x9b6b3d));
    const arm = box(0.2, 0.2, 0.6, 0x1a3a8a, 0, -0.02, 0.38);
    paw.add(arm);
    paw.userData.side = side;
    g.add(paw);
    return paw;
  });
  return { group: g, paws };
}

// ---------- The chase ----------

export class Chase {
  constructor(container, { onDone }) {
    this.container = container;
    this.onDone = onDone;
    this.phase = 'drive';
    this.time = 0;
    this.keys = new Set();
    this.effects = [];
    this.player = { x: 0, z: -2, speed: 0, steer: 0 };
    this.sirenUntil = 0;
    this.sirenReady = 0;
    this.tipReady = 2;
    this.radioSaid = {};

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd3ff);
    this.scene.fog = new THREE.Fog(0x8fd3ff, 60, 220);
    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 600);
    this.scene.add(this.camera);
    this.resize = () => {
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.resize();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5d7a3a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(30, 60, 20);
    this.scene.add(sun);

    this.buildCity();
    this.buildHarbor();
    this.interior = makeInterior();
    this.camera.add(this.interior.group);
    this.createHud();

    this.onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'Space' || event.code === 'KeyX') this.siren();
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    audio.music(true);
    setTimeout(() => this.radio('start'), 600);

    this.last = performance.now();
    this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  // ---------- The city ----------

  buildCity() {
    const scene = this.scene;
    const rand = seeded(7);
    const lines = canvasTexture(64, 128, (ctx, w, h) => {
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w * 0.2 - 2, 0, 4, h * 0.5); // lane lines (the road is 3 lanes: these repeat)
    });
    lines.wrapS = lines.wrapT = THREE.RepeatWrapping;
    lines.repeat.set(2.5, ROAD_LEN / 8);
    lines.offset.x = 0.13;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, ROAD_LEN + 20), new THREE.MeshStandardMaterial({ map: lines }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -ROAD_LEN / 2 + 10);
    scene.add(road);
    for (const side of [-1, 1]) {
      scene.add(box(4, 0.25, ROAD_LEN + 20, 0xbdbdbd, side * (ROAD_HALF + 2), 0.12, -ROAD_LEN / 2 + 10)); // sidewalks
    }
    // (the grass stops where the water starts)
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 100 - DOCK_END), new THREE.MeshStandardMaterial({ color: 0x7cb342 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.05, (100 + DOCK_END) / 2);
    scene.add(grass);

    // Buildings with windows on both sides
    const colors = [0xef9a9a, 0x90caf9, 0xffe082, 0xa5d6a7, 0xce93d8, 0xffab91, 0xb0bec5];
    const windows = canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(12, 12, 16, 20);
      ctx.fillRect(36, 12, 16, 20);
    });
    windows.wrapS = windows.wrapT = THREE.RepeatWrapping;
    for (const side of [-1, 1]) {
      for (let z = 4; z > -ROAD_LEN + 20; z -= 14) {
        const height = 8 + Math.floor(rand() * 14);
        const color = colors[Math.floor(rand() * colors.length)];
        const tex = windows.clone();
        tex.needsUpdate = true;
        tex.repeat.set(3, height / 4);
        const building = new THREE.Mesh(new THREE.BoxGeometry(10, height, 12), new THREE.MeshStandardMaterial({ color, map: tex }));
        building.position.set(side * (ROAD_HALF + 9), height / 2, z);
        scene.add(building);
      }
      for (let z = -10; z > -ROAD_LEN + 20; z -= 30) {
        scene.add(cylinder(0.12, 0.15, 5, 0x37474f, side * (ROAD_HALF + 0.6), 2.5, z));
        scene.add(box(1.2, 0.2, 0.4, 0x37474f, side * (ROAD_HALF - 0.1), 5, z));
        scene.add(ball(0.22, 0xfff59d, side * (ROAD_HALF - 0.5), 4.85, z));
      }
    }

    // Things in the road: traffic, fruit stands, boxes (Q13)
    this.obstacles = [];
    for (let z = -50, i = 0; z > -ROAD_LEN + 50; z -= 22 + rand() * 12, i++) {
      const kind = i % 4 === 1 ? 'fruit' : i % 4 === 3 ? 'boxes' : 'car';
      const lane = LANES[Math.floor(rand() * 3)];
      let mesh;
      if (kind === 'car') mesh = makeCar([0x43a047, 0xfdd835, 0x8e24aa, 0xff7043, 0x00acc1][i % 5]);
      else if (kind === 'fruit') mesh = makeFruitStand();
      else mesh = makeBoxes();
      mesh.position.set(lane, 0, z);
      mesh.rotation.y = kind === 'car' ? Math.PI : 0; // cars drive the same way as you (away)
      scene.add(mesh);
      this.obstacles.push({ kind, mesh, x: lane, z, speed: kind === 'car' ? 9 + rand() * 4 : 0, half: kind === 'car' ? [1.1, 2.1] : [1.4, 0.9], hit: false, pulled: false });
    }

    // Guard Bulldog's getaway: the museum van
    this.van = makeVan();
    this.van.rotation.y = Math.PI;
    scene.add(this.van);
    this.vanX = 0;
  }

  buildHarbor() {
    const scene = this.scene;
    // The dock: wooden planks past the end of the road
    const planks = canvasTexture(64, 64, (ctx) => {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#8d6e63' : '#a1887f';
        ctx.fillRect(0, i * 16, 64, 16);
      }
    });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
    planks.repeat.set(4, 10);
    const dock = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 50), new THREE.MeshStandardMaterial({ map: planks }));
    dock.position.set(0, 0.2, -ROAD_LEN - 15);
    scene.add(dock);
    for (let i = 0; i < 5; i++) scene.add(cylinder(0.3, 0.3, 2, 0x5d4037, -11 + i * 5.5, 0.5, DOCK_END + 0.3)); // posts
    scene.add(makeBoxes().translateX(-8).translateZ(-ROAD_LEN - 20));
    scene.add(makeBoxes().translateX(9).translateZ(-ROAD_LEN - 8));
    // The water (moving waves)
    this.waves = canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#1e88e5';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#64b5f6';
      ctx.lineWidth = 3;
      for (let y = 8; y < 64; y += 16) {
        ctx.beginPath();
        for (let x = 0; x <= 64; x += 4) ctx.lineTo(x, y + Math.sin((x / 64) * Math.PI * 2) * 3);
        ctx.stroke();
      }
    });
    this.waves.wrapS = this.waves.wrapT = THREE.RepeatWrapping;
    this.waves.repeat.set(60, 60);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: this.waves }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.3, DOCK_END - 300);
    scene.add(water);
    // Sailboats far away, and a lighthouse
    for (let i = 0; i < 6; i++) {
      const sail = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 3), mat(0xffffff));
      sail.position.set(-60 + i * 25, 2, DOCK_END - 150 - (i % 3) * 40);
      scene.add(sail);
    }
    scene.add(cylinder(2, 3, 18, 0xffffff, 40, 9, DOCK_END - 120));
    scene.add(cylinder(2.1, 2.1, 3, 0xd32f2f, 40, 12, DOCK_END - 120));

    // Guard Bulldog's boat, waiting at the end of the dock
    this.boat = makeBoat();
    this.boat.position.set(4, -0.2, DOCK_END - 3);
    this.boat.rotation.y = Math.PI;
    scene.add(this.boat);
    this.guard = makeGuard();
    this.guard.visible = false;
    scene.add(this.guard);
  }

  // ---------- HUD ----------

  createHud() {
    const root = (this.hud = document.createElement('div'));
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:"Arial Black",Arial,sans-serif;color:#fff;z-index:5;text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000;';
    root.innerHTML = `
      <div class="ch-radio" style="position:absolute;top:12px;left:12px;width:min(380px,44vw);background:rgba(33,33,33,0.9);border:3px solid #ffd23f;border-radius:12px;padding:8px 12px;display:none;text-shadow:none">
        <div style="font-size:12px;color:#ffd23f">${t('radio.name')}</div><div class="text" style="font:bold 18px Arial,sans-serif;margin-top:4px"></div></div>
      <div class="ch-tip" style="position:absolute;top:30%;right:16px;max-width:36vw;background:#fff;color:#111;border:3px solid #111;border-radius:16px;padding:8px 14px;font-size:18px;display:none;text-shadow:none">🕵️ <span></span></div>
      <div class="ch-distance" style="position:absolute;top:12px;right:14px;font-size:18px;color:#ffd23f"></div>
      <div class="ch-message" style="position:absolute;top:24%;width:100%;text-align:center;font-size:34px;color:#ffd23f"></div>
      <div class="ch-keys" style="position:absolute;bottom:8px;left:12px;font-size:12px"></div>
      <div class="ch-stick" style="position:absolute;left:0;bottom:0;width:45vw;height:55vh;pointer-events:auto;display:none;touch-action:none"></div>
      <button class="ch-siren" style="position:absolute;right:24px;bottom:30px;width:96px;height:96px;border-radius:50%;background:#c62828;border:4px solid #ffd23f;color:#fff;font:16px 'Arial Black';pointer-events:auto;display:none">🚨<br>${t('chase.siren')}</button>
    `;
    document.body.appendChild(root);
    this.el = (name) => root.querySelector(`.ch-${name}`);
    this.el('keys').textContent = t('chase.keys');
    this.stick = { x: 0, y: 0 };
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.touch) {
      this.el('keys').style.display = 'none';
      this.el('siren').style.display = 'block';
      this.el('siren').addEventListener('pointerdown', () => this.siren());
      const area = this.el('stick');
      area.style.display = 'block';
      let origin = null;
      area.addEventListener('pointerdown', (e) => (origin = { x: e.clientX, y: e.clientY, id: e.pointerId }));
      area.addEventListener('pointermove', (e) => {
        if (!origin || e.pointerId !== origin.id) return;
        this.stick.x = Math.max(-1, Math.min(1, (e.clientX - origin.x) / 60));
        this.stick.y = Math.max(-1, Math.min(1, (e.clientY - origin.y) / 60));
      });
      const end = () => {
        origin = null;
        this.stick.x = this.stick.y = 0;
      };
      area.addEventListener('pointerup', end);
      area.addEventListener('pointercancel', end);
    }
  }

  message(text, ms = 1800) {
    this.el('message').textContent = text;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (this.el('message').textContent = ''), ms);
  }

  // Baby Capybara on the police radio (each line once)
  radio(id) {
    if (this.radioSaid[id]) return;
    this.radioSaid[id] = true;
    audio.play('radio');
    setTimeout(() => audio.play('baby'), 250);
    const box = this.el('radio');
    box.style.display = 'block';
    box.querySelector('.text').textContent = t(`radio.${id}`);
    clearTimeout(this.radioTimer);
    this.radioTimer = setTimeout(() => (box.style.display = 'none'), 4000);
  }

  // SuperCapybara's tips from the passenger seat
  tip(text) {
    const box = this.el('tip');
    box.querySelector('span').textContent = text;
    box.style.display = 'block';
    clearTimeout(this.tipTimer);
    this.tipTimer = setTimeout(() => (box.style.display = 'none'), 1600);
    this.interior.buddy.rotation.y = Math.PI - 0.9; // he turns to you
  }

  // ---------- Driving ----------

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  siren() {
    if (this.phase !== 'drive' || this.time < this.sirenReady) return;
    this.sirenUntil = this.time + SIREN_MS / 1000;
    this.sirenReady = this.sirenUntil + SIREN_WAIT_MS / 1000;
    audio.play('siren');
    this.sirenSound = this.time + 1.2;
    this.radio('siren');
  }

  updateDrive(dt) {
    const p = this.player;
    const gas = this.touch || this.down('ArrowUp', 'KeyW') || this.stick.y < -0.3;
    const brake = this.down('ArrowDown', 'KeyS') || this.stick.y > 0.5;
    if (brake) p.speed = Math.max(0, p.speed - 30 * dt);
    else if (gas) p.speed = Math.min(TOP_SPEED, p.speed + 12 * dt);
    else p.speed *= 1 - 0.5 * dt;
    const steer = THREE.MathUtils.clamp((this.down('ArrowLeft', 'KeyA') ? 1 : 0) - (this.down('ArrowRight', 'KeyD') ? 1 : 0) - this.stick.x, -1, 1);
    p.steer += (steer - p.steer) * Math.min(1, dt * 8);
    p.x = THREE.MathUtils.clamp(p.x - p.steer * 9 * dt * THREE.MathUtils.clamp(p.speed / TOP_SPEED, 0.3, 1), -ROAD_HALF + 1.2, ROAD_HALF - 1.2);
    p.z -= p.speed * dt;

    // The siren: traffic ahead pulls over to the side and stops
    const sirenOn = this.time < this.sirenUntil;
    if (sirenOn && this.time > this.sirenSound) {
      audio.play('siren');
      this.sirenSound = this.time + 1.2;
    }
    for (const o of this.obstacles) {
      if (o.kind !== 'car' || o.hit) continue;
      const ahead = p.z - o.z;
      if (sirenOn && ahead > -5 && ahead < 110) o.pulled = true;
      if (o.pulled) {
        const side = o.x >= 0 ? 1 : -1;
        o.x += (side * (ROAD_HALF + 1.3) - o.x) * Math.min(1, dt * 2.5);
        o.speed = Math.max(0, o.speed - 10 * dt);
      }
      o.z -= o.speed * dt;
      o.mesh.position.set(o.x, 0, o.z);
    }

    // Bumping into things
    for (const o of this.obstacles) {
      if (o.hit) continue;
      if (Math.abs(p.x - o.x) < 1.0 + o.half[0] && Math.abs(p.z - o.z) < 1.2 + o.half[1]) this.crash(o);
    }

    // SuperCapybara warns you about what's coming in your lane
    if (this.time > this.tipReady) {
      const next = this.obstacles.find((o) => !o.hit && !o.pulled && Math.abs(o.x - p.x) < 2.2 && p.z - o.z > 10 && p.z - o.z < 32);
      if (next) {
        this.tip(t(next.kind === 'fruit' ? 'tip.fruit' : next.kind === 'car' ? 'tip.car' : 'tip.box'));
        this.tipReady = this.time + 4;
      }
    }

    // The van stays ahead of you, weaving between lanes
    const progress = -p.z / ROAD_LEN;
    if (progress > 0.35) this.radio('away');
    const lead = 38 + Math.sin(this.time * 0.6) * 8;
    const laneWant = LANES[Math.floor(this.time / 3.5) % 3];
    this.vanX += (laneWant - this.vanX) * Math.min(1, dt * 1.5);
    const vanZ = Math.max(p.z - lead, -ROAD_LEN - 8);
    this.van.position.set(this.vanX, 0, vanZ);
    this.el('distance').textContent = `🐶🚐 ${t('chase.distance', { m: Math.round(p.z - vanZ) })}`;

    // The end of the road: the harbor
    if (p.z < -ROAD_LEN + 30) this.startHarbor();

    // The car inside: steering wheel turns, siren light blinks, speed meter
    this.interior.wheel.rotation.z = p.steer * 1.2;
    const blink = sirenOn && Math.floor(this.time * 6) % 2;
    this.interior.sirenLight.material.color.setHex(sirenOn ? (blink ? 0xff1744 : 0x2979ff) : 0x440000);
    this.interior.buddy.rotation.y += (Math.PI - 0.35 - this.interior.buddy.rotation.y) * Math.min(1, dt * 2);
    this.drawSpeed(p.speed);
    this.camera.position.set(p.x - 0.45, 1.35, p.z);
    this.camera.rotation.set(0, p.steer * 0.12, -p.steer * 0.02);
  }

  drawSpeed(speed) {
    const kmh = Math.round(speed * 4);
    if (kmh === this.lastKmh) return;
    this.lastKmh = kmh;
    const c = this.interior.speedCanvas;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#76ff03';
    ctx.font = 'bold 36px Arial Black, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(kmh), 64, 44);
    ctx.font = 'bold 14px Arial';
    ctx.fillText('km/h', 64, 64);
    this.interior.speedTexture.needsUpdate = true;
  }

  crash(o) {
    const p = this.player;
    o.hit = true;
    if (o.kind === 'car') {
      audio.play('crash');
      p.speed *= 0.35;
      o.speed += 6; // it gets pushed ahead
      o.hit = false;
      p.z = o.z + 1.2 + o.half[1] + 0.2;
      return;
    }
    // Fruit stands and boxes burst into pieces
    audio.play(o.kind === 'fruit' ? 'splat' : 'crash');
    p.speed *= o.kind === 'fruit' ? 0.5 : 0.6;
    o.mesh.visible = false;
    const colors = o.kind === 'fruit' ? [0xe53935, 0xff9800, 0xfdd835, 0x43a047, 0x8e24aa, 0x2e7d32] : [0xa1887f, 0x8d6e63];
    for (let i = 0; i < (o.kind === 'fruit' ? 24 : 10); i++) {
      const piece = o.kind === 'fruit' ? ball(0.18, colors[i % colors.length]) : box(0.4, 0.4, 0.4, colors[i % 2]);
      piece.position.set(o.x + (Math.random() - 0.5) * 2, 1, o.z);
      this.scene.add(piece);
      this.effects.push({ mesh: piece, v: new THREE.Vector3((Math.random() - 0.5) * 10, 5 + Math.random() * 6, -p.speed * 0.4 - Math.random() * 6), life: 2 });
    }
    if (o.kind === 'fruit') this.message('🍉🍌🍎 SPLAT!', 900);
  }

  // ---------- The harbor and the swim ----------

  startHarbor() {
    this.phase = 'harbor';
    this.phaseTime = 0;
    this.radio('harbor');
    this.message(t('chase.harbor'), 2500);
    this.el('distance').textContent = '';
    // He jumps out of the van onto the boat
    this.guard.visible = true;
    this.guard.position.set(this.van.position.x, 0.3, DOCK_END + 6);
    this.guard.rotation.y = Math.PI;
    this.van.position.set(this.van.position.x, 0, DOCK_END + 10);
  }

  updateHarbor(dt) {
    const p = this.player;
    this.phaseTime += dt;
    p.speed = Math.max(0, p.speed - 25 * dt);
    p.z = Math.max(p.z - p.speed * dt, -ROAD_LEN - 2);
    this.camera.position.set(p.x - 0.45, 1.35, p.z);
    this.camera.rotation.set(0, 0, 0);
    this.drawSpeed(p.speed);
    // The guard hops onto the boat, and it zooms off
    const hop = Math.min(1, this.phaseTime / 0.9);
    this.guard.position.x = THREE.MathUtils.lerp(this.van.position.x, this.boat.position.x, hop);
    this.guard.position.z = THREE.MathUtils.lerp(DOCK_END + 6, this.boat.position.z, hop);
    this.guard.position.y = 0.3 + Math.sin(hop * Math.PI) * 2;
    if (hop >= 1) {
      this.boat.position.z -= BOAT_SPEED * dt;
      this.guard.position.set(this.boat.position.x, 0.2, this.boat.position.z + 1.2);
    }
    if (this.phaseTime > 2.6 && !this.dived) {
      this.dived = true;
      this.message(t('chase.dive'), 2200);
    }
    if (this.phaseTime > 3.4) this.startSwim();
  }

  startSwim() {
    this.phase = 'swim';
    this.phaseTime = 0;
    this.camera.remove(this.interior.group);
    this.paddlers = makePaddlers();
    this.camera.add(this.paddlers.group);
    this.swimmer = { x: this.player.x, z: DOCK_END - 2, yaw: 0, speed: 0 };
    this.boatSpeed = BOAT_SPEED;
    this.guardSwimming = false;
    this.el('keys').textContent = t('swim.keys');
    this.el('siren').style.display = 'none';
    audio.play('splash');
    this.splashAt(this.swimmer.x, this.swimmer.z - 4, 20);
  }

  updateSwim(dt) {
    const s = this.swimmer;
    this.phaseTime += dt;
    const turn = THREE.MathUtils.clamp((this.down('ArrowLeft', 'KeyA') ? 1 : 0) - (this.down('ArrowRight', 'KeyD') ? 1 : 0) - this.stick.x, -1, 1);
    s.yaw += turn * 1.8 * dt;
    const swimming = this.touch || this.down('ArrowUp', 'KeyW') || this.stick.y < -0.3;
    s.speed += ((swimming ? SWIM_SPEED : 0) - s.speed) * Math.min(1, dt * 3);
    s.x = THREE.MathUtils.clamp(s.x - Math.sin(s.yaw) * s.speed * dt, -80, 80);
    s.z = Math.min(s.z - Math.cos(s.yaw) * s.speed * dt, DOCK_END - 1);
    this.camera.position.set(s.x, 0.55 + Math.sin(this.phaseTime * 6) * 0.06, s.z);
    this.camera.rotation.set(0, s.yaw, 0);
    // Paws paddling
    const stroke = this.phaseTime * (swimming ? 7 : 2);
    for (const paw of this.paddlers.paws) {
      const a = stroke + (paw.userData.side > 0 ? Math.PI : 0);
      paw.position.set(paw.userData.side * 0.42, -0.36 + Math.sin(a) * 0.1, -0.85 + Math.cos(a) * 0.25);
    }
    if (swimming && Math.floor(stroke / Math.PI) !== this.lastStroke) {
      this.lastStroke = Math.floor(stroke / Math.PI);
      audio.play('paddle');
      const ahead = new THREE.Vector3(0, 0, -2.5).applyEuler(this.camera.rotation);
      this.splashAt(s.x + ahead.x, s.z + ahead.z, 3);
    }

    // The boat runs out of gas, then he has to swim
    if (!this.guardSwimming) {
      if (this.phaseTime > GAS_RUNS_OUT && !this.outOfGas) {
        this.outOfGas = true;
        audio.play('putt');
        this.message(t('swim.outOfGas'), 2400);
      }
      if (this.outOfGas) this.boatSpeed = Math.max(0, this.boatSpeed - 6 * dt);
      this.boat.position.z -= this.boatSpeed * dt;
      this.guard.position.set(this.boat.position.x, 0.2, this.boat.position.z + 1.2);
      if (this.outOfGas && this.boatSpeed === 0) {
        this.guardSwimming = true;
        audio.play('splash');
        this.splashAt(this.boat.position.x, this.boat.position.z - 3, 14);
        this.message(t('swim.guardSwims'), 2000);
        setTimeout(() => this.phase === 'swim' && this.message(t('swim.faster'), 2200), 2100);
        this.guard.position.set(this.boat.position.x, -0.9, this.boat.position.z - 3);
      }
    } else {
      // Doggy paddle, slower than a capybara
      this.guard.position.z -= GUARD_SWIM * dt;
      this.guard.position.x += Math.sin(this.phaseTime * 1.3) * dt * 1.2;
      this.guard.position.y = -0.9 + Math.sin(this.phaseTime * 8) * 0.1;
      if (Math.random() < dt * 6) this.splashAt(this.guard.position.x, this.guard.position.z, 2);
      const dx = this.guard.position.x - s.x;
      const dz = this.guard.position.z - s.z;
      const d = Math.hypot(dx, dz);
      // Close by: Copybara aims at him by himself (so you can't just swim past him)
      if (d < 14) {
        const want = Math.atan2(-dx, -dz);
        let turnBy = want - s.yaw;
        turnBy = Math.atan2(Math.sin(turnBy), Math.cos(turnBy));
        s.yaw += turnBy * Math.min(1, dt * 3);
      }
      if (d < 3.4) return this.gotcha();
    }
    this.waves.offset.y += dt * 0.05;
    this.waves.offset.x = Math.sin(this.phaseTime * 0.5) * 0.02;
    const gap = Math.hypot(this.guard.position.x - s.x, this.guard.position.z - s.z);
    this.el('distance').textContent = `🐶 ${t('chase.distance', { m: Math.round(gap) })}`;
  }

  splashAt(x, z, count) {
    for (let i = 0; i < count; i++) {
      const drop = ball(0.05, 0xe3f2fd);
      drop.position.set(x + (Math.random() - 0.5), 0, z + (Math.random() - 0.5));
      this.scene.add(drop);
      this.effects.push({ mesh: drop, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), life: 0.8 });
    }
  }

  gotcha() {
    this.phase = 'caught';
    this.phaseTime = 0;
    audio.play('cuffs');
    this.message(t('swim.gotcha'), 2000);
    this.el('distance').textContent = '';
  }

  // ---------- Jail ----------

  startJail() {
    this.phase = 'jail';
    this.phaseTime = 0;
    if (this.paddlers) this.camera.remove(this.paddlers.group);
    this.camera.remove(this.interior.group);
    // A little jail cell far away from everything
    const cell = (this.cell = new THREE.Group());
    cell.add(box(10, 0.2, 8, 0x9e9e9e, 0, 0, 0));
    cell.add(box(10, 6, 0.3, 0x78909c, 0, 3, -4));
    for (const side of [-1, 1]) cell.add(box(0.3, 6, 8, 0x78909c, side * 5, 3, 0)); // side walls
    cell.add(box(10.6, 0.3, 8, 0x546e7a, 0, 6, 0)); // ceiling
    for (let i = 0; i < 6; i++) cell.add(box(1.6, 0.25, 0.32, 0x616161, -4 + i * 1.6, 2 + (i % 2) * 1.2, -3.84)); // bricks
    this.bars = new THREE.Group();
    for (let i = 0; i < 9; i++) this.bars.add(cylinder(0.07, 0.07, 4, 0x424242, -3.2 + i * 0.8, 2, 0));
    this.bars.add(box(7, 0.2, 0.2, 0x424242, 0, 4, 0), box(7, 0.2, 0.2, 0x424242, 0, 0.1, 0));
    this.bars.position.y = 7;
    cell.add(this.bars);
    cell.position.set(500, 0, 0);
    this.scene.add(cell);
    this.guard.visible = true;
    this.guard.position.set(500, 0, -1.5);
    this.guard.rotation.set(0, 0, 0);
    this.guard.scale.setScalar(1.3);
    this.camera.position.set(500, 2.2, 7);
    this.camera.rotation.set(-0.08, 0, 0);
    this.el('keys').textContent = '';
    this.el('distance').textContent = '';
    this.scene.background = new THREE.Color(0x263238);
    this.scene.fog = null;
  }

  updateJail(dt) {
    this.phaseTime += dt;
    if (this.bars.position.y > 0) {
      this.bars.position.y = Math.max(0, this.bars.position.y - dt * 18);
      if (this.bars.position.y === 0) {
        audio.play('bars');
        setTimeout(() => this.message(t('jail.line'), 2500), 500);
      }
    }
    this.guard.position.y = Math.abs(Math.sin(this.phaseTime * 5)) * 0.15; // stomping, grumpy
    if (this.phaseTime > 4) this.finish();
  }

  // ---------- Every frame ----------

  loop(now) {
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    if (this.phase === 'drive') this.updateDrive(dt);
    else if (this.phase === 'harbor') this.updateHarbor(dt);
    else if (this.phase === 'swim') this.updateSwim(dt);
    else if (this.phase === 'caught') {
      this.phaseTime += dt;
      if (this.phaseTime > 1.8) this.startJail();
    } else if (this.phase === 'jail') this.updateJail(dt);
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      e.v.y -= 18 * dt;
      e.mesh.position.addScaledVector(e.v, dt);
      if (e.life > 0 && e.mesh.position.y > -0.5) return true;
      e.mesh.removeFromParent();
      return false;
    });
    this.renderer.render(this.scene, this.camera);
    if (this.phase !== 'done') this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  finish() {
    this.phase = 'done';
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    clearTimeout(this.messageTimer);
    clearTimeout(this.radioTimer);
    clearTimeout(this.tipTimer);
    this.hud.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.onDone();
  }
}
