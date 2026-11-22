import * as THREE from 'three';
import { mat, box, ball, cylinder } from './models.js';

// The city museum (case 1: THE GOLDEN BOLT). Units are about 1 = one capybara.
// The main hall goes from x -20 to 20 and z -15 (back wall) to 15 (entrance). The Golden Bolt's broken case
// stands in the middle. The STAFF ONLY door in the back wall (locked; Copybara opens it) leads to the camera room.
// buildMuseum(scene, { solved }) returns { solids, walls, doors, spots, update(dt) } (solved: the party at the end,
// with no broken glass, "?" or clues lying around):
// solids = boxes { minX, maxX, minZ, maxZ } you bump into; walls = meshes the camera shouldn't go through;
// doors = locked doors; spots = where the clues and people are.

export const HALL = { minX: -20, maxX: 20, minZ: -15, maxZ: 15 };
export const CAMERA_ROOM = { minX: -13, maxX: 0, minZ: -26, maxZ: -15 };
export const STAFF_DOOR = { x: -6, width: 3 };
export const START = { x: 0, z: 9, yaw: Math.PI }; // facing the back of the hall (-z)
const WALL_HEIGHT = 6;
const CASE = { x: 0, z: -2 };

export const SPOTS = {
  // Clues (real: footprints, uniform, video; fake: banana, wool)
  footprints: { x: -3.2, z: -8 },
  uniform: { x: 0.85, z: -1.3, y: 1.3 },
  video: { x: -6.5, z: -23.2, y: 1.6 },
  banana: { x: -8.5, z: -0.5 },
  wool: { x: 3, z: 1 },
  // People
  director: { x: 2.5, z: 6.5, face: -2.6 },
  guard: { x: 9, z: -12, face: 0.4 },
  monkey: { x: -12, z: 0.5, face: 2.6 },
  sheep: { x: 15, z: 3, face: -1.6 },
};

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildMuseum(scene, { solved = false } = {}) {
  const solids = [];
  const walls = [];
  const doors = [];
  const movers = [];
  const solid = (minX, maxX, minZ, maxZ) => {
    const s = { minX, maxX, minZ, maxZ };
    solids.push(s);
    return s;
  };
  const wall = (minX, maxX, minZ, maxZ, color = 0xe8dcc8, height = WALL_HEIGHT) => {
    const mesh = box(maxX - minX, height, maxZ - minZ, color, (minX + maxX) / 2, height / 2, (minZ + maxZ) / 2);
    scene.add(mesh);
    walls.push(mesh);
    solid(minX, maxX, minZ, maxZ);
    return mesh;
  };

  // ---------- Floor, walls, lights ----------
  const tiles = canvasTexture(128, 128, (ctx) => {
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#d7ccc8' : '#efebe9';
      ctx.fillRect(x * 64, y * 64, 64, 64);
    }
  });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(20, 22);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 44), new THREE.MeshStandardMaterial({ map: tiles }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -4);
  scene.add(floor);
  // Red carpet from the entrance to the Golden Bolt
  const carpet = box(3, 0.02, 12, 0xb71c1c, 0, 0.01, 7.5);
  scene.add(carpet);

  const T = 0.6; // wall thickness
  wall(HALL.minX - T, HALL.minX, HALL.minZ, HALL.maxZ); // west
  wall(HALL.maxX, HALL.maxX + T, HALL.minZ, HALL.maxZ); // east
  wall(HALL.minX - T, HALL.maxX + T, HALL.maxZ, HALL.maxZ + T); // entrance wall (south)
  // Back wall, with the staff door's gap
  const doorL = STAFF_DOOR.x - STAFF_DOOR.width / 2;
  const doorR = STAFF_DOOR.x + STAFF_DOOR.width / 2;
  wall(HALL.minX - T, doorL, HALL.minZ - T, HALL.minZ);
  wall(doorR, HALL.maxX + T, HALL.minZ - T, HALL.minZ);
  const above = box(STAFF_DOOR.width, WALL_HEIGHT - 3.5, T, 0xe8dcc8, STAFF_DOOR.x, 3.5 + (WALL_HEIGHT - 3.5) / 2, HALL.minZ - T / 2); // above the door
  scene.add(above);
  walls.push(above);
  // The camera room behind it
  const R = CAMERA_ROOM;
  wall(R.minX - T, R.minX, R.minZ, R.maxZ - T, 0xcfd8dc);
  wall(R.maxX, R.maxX + T, R.minZ, R.maxZ - T, 0xcfd8dc);
  wall(R.minX - T, R.maxX + T, R.minZ - T, R.minZ, 0xcfd8dc);
  const roomFloor = box(R.maxX - R.minX, 0.02, R.maxZ - R.minZ, 0x90a4ae, (R.minX + R.maxX) / 2, 0.01, (R.minZ + R.maxZ) / 2);
  scene.add(roomFloor);

  // The locked STAFF ONLY door (slides up when Copybara opens it)
  const doorMesh = box(STAFF_DOOR.width, 3.5, 0.25, 0x6d4c41, STAFF_DOOR.x, 1.75, HALL.minZ - T / 2);
  doorMesh.add(box(0.15, 0.15, 0.2, 0xffd23f, 1.1, 0, 0.1)); // handle
  scene.add(doorMesh);
  walls.push(doorMesh);
  const doorSolid = solid(doorL, doorR, HALL.minZ - T, HALL.minZ);
  doors.push({ id: 'staff', mesh: doorMesh, solid: doorSolid, x: STAFF_DOOR.x, z: HALL.minZ + 0.8, open: false, lift: 0 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({
    map: canvasTexture(256, 68, (ctx, w, h) => {
      ctx.fillStyle = '#c62828';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 34px Arial Black, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STAFF ONLY 🔒', w / 2, h / 2 + 2);
    }),
  }));
  sign.position.set(STAFF_DOOR.x, 4.1, HALL.minZ + 0.02);
  scene.add(sign);

  scene.add(new THREE.HemisphereLight(0xfffbf0, 0x8d6e63, 1.5));
  for (const [x, z] of [[-10, 5], [10, 5], [-10, -8], [10, -8], [-6, -20]]) {
    const lamp = new THREE.PointLight(0xfff3e0, 40, 22);
    lamp.position.set(x, 5.5, z);
    scene.add(lamp);
  }
  const spot = new THREE.SpotLight(0xfff59d, 120, 14, 0.45, 0.4);
  spot.position.set(CASE.x, 7, CASE.z);
  spot.target.position.set(CASE.x, 0, CASE.z);
  scene.add(spot, spot.target);

  // ---------- The Golden Bolt's broken case ----------
  scene.add(box(1.6, 1.0, 1.6, 0x37474f, CASE.x, 0.5, CASE.z));
  scene.add(box(1.8, 0.1, 1.8, 0xffd23f, CASE.x, 1.02, CASE.z));
  solid(CASE.x - 0.9, CASE.x + 0.9, CASE.z - 0.9, CASE.z + 0.9);
  const glass = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  // Three glass sides still standing; the front one is smashed
  for (const [w, d, x, z] of [[1.6, 0.04, 0, -0.8], [0.04, 1.6, -0.8, 0], [0.04, 1.6, 0.8, 0]]) {
    const pane = box(w, 1.3, d, glass, CASE.x + x, 1.72, CASE.z + z);
    scene.add(pane);
  }
  // Shards on the floor
  for (let i = 0; i < (solved ? 0 : 14); i++) {
    const shard = new THREE.Mesh(new THREE.CircleGeometry(0.12 + (i % 3) * 0.05, 3), glass);
    shard.rotation.set(-Math.PI / 2, 0, i);
    shard.position.set(CASE.x - 1 + (i * 37 % 20) / 10, 0.02, CASE.z + 1 + (i * 13 % 10) / 10);
    scene.add(shard);
  }
  // A "?" where the bolt was
  const question = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({
    transparent: true,
    map: canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 56px Arial Black';
      ctx.textAlign = 'center';
      ctx.fillText('?', 32, 54);
    }),
  }));
  question.position.set(CASE.x, 1.8, CASE.z);
  if (!solved) scene.add(question);
  movers.push((time) => {
    question.rotation.y = time;
    question.position.y = 1.8 + Math.sin(time * 2) * 0.1;
  });
  // Velvet ropes around it
  const posts = [[-3, -5], [3, -5], [3, 1], [-3, 1]];
  posts.forEach(([x, z]) => {
    scene.add(cylinder(0.08, 0.12, 1.0, 0xffc107, CASE.x + x, 0.5, CASE.z + z + 3));
    scene.add(ball(0.12, 0xffc107, CASE.x + x, 1.05, CASE.z + z + 3));
  });
  posts.forEach(([x, z], i) => {
    const [nx, nz] = posts[(i + 1) % 4];
    if (i === 3) return; // the rope at the front is down
    const rope = box(Math.abs(nx - x) || 0.06, 0.06, Math.abs(nz - z) || 0.06, 0xb71c1c, CASE.x + (x + nx) / 2, 0.85, CASE.z + (z + nz) / 2 + 3);
    scene.add(rope);
  });

  // ---------- Exhibits ----------
  // The dinosaur skeleton (west)
  const dino = new THREE.Group();
  const bone = 0xfafafa;
  dino.add(box(8, 0.4, 3.5, 0x5d4037, 0, 0.2, 0)); // platform
  dino.add(box(4, 0.35, 0.35, bone, 0, 2.6, 0)); // spine
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 12, Math.PI), mat(bone));
    rib.position.set(-1.4 + i * 0.7, 2.6, 0);
    rib.rotation.set(Math.PI, Math.PI / 2, 0);
    dino.add(rib);
  }
  for (const x of [-1.2, 1.2]) for (const z of [-0.6, 0.6]) dino.add(box(0.25, 2.2, 0.25, bone, x, 1.4, z));
  dino.add(box(1.5, 0.25, 0.25, bone, 2.6, 3.1, 0)); // neck
  dino.add(box(1.0, 0.7, 0.6, bone, 3.6, 3.5, 0)); // skull
  dino.add(box(0.4, 0.15, 0.5, bone, 3.9, 3.1, 0)); // jaw
  dino.add(box(3, 0.2, 0.2, bone, -3.3, 2.3, 0)); // tail
  dino.position.set(-14, 0, -5);
  scene.add(dino);
  solid(-18, -10, -6.75, -3.25);

  // A capybara statue (east)
  scene.add(box(1.4, 1.2, 1.4, 0xbdbdbd, 13, 0.6, -9));
  const statue = new THREE.Group();
  statue.add(box(1.0, 0.8, 1.6, 0x9e9e9e, 0, 0.6, 0));
  statue.add(box(0.8, 0.8, 0.9, 0x9e9e9e, 0, 1.2, 0.9));
  statue.position.set(13, 1.2, -9);
  statue.rotation.y = -0.6;
  scene.add(statue);
  solid(12.3, 13.7, -9.7, -8.3);

  // Paintings on the east wall
  const paintings = [
    (ctx, w, h) => { // sunset
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ff7043');
      g.addColorStop(1, '#ffd54f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.7, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a237e';
      ctx.fillRect(0, h * 0.72, w, h);
    },
    (ctx, w, h) => { // a capybara portrait
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#9b6b3d';
      ctx.fillRect(w * 0.25, h * 0.25, w * 0.5, h * 0.55);
      ctx.fillStyle = '#6e4a2a';
      ctx.fillRect(w * 0.35, h * 0.55, w * 0.3, h * 0.2);
      ctx.fillStyle = '#000';
      ctx.fillRect(w * 0.33, h * 0.4, 8, 8);
      ctx.fillRect(w * 0.6, h * 0.4, 8, 8);
    },
    (ctx, w, h) => { // a lightning bolt
      ctx.fillStyle = '#1a3a8a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(w * 0.55, h * 0.1);
      ctx.lineTo(w * 0.3, h * 0.55);
      ctx.lineTo(w * 0.5, h * 0.55);
      ctx.lineTo(w * 0.4, h * 0.9);
      ctx.lineTo(w * 0.72, h * 0.42);
      ctx.lineTo(w * 0.52, h * 0.42);
      ctx.closePath();
      ctx.fill();
    },
  ];
  paintings.forEach((draw, i) => {
    const frame = box(0.15, 2.4, 3.2, 0xb8860b, HALL.maxX - 0.08, 3, 6 - i * 5);
    scene.add(frame);
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0), new THREE.MeshBasicMaterial({ map: canvasTexture(140, 100, draw) }));
    picture.position.set(HALL.maxX - 0.17, 3, 6 - i * 5);
    picture.rotation.y = -Math.PI / 2;
    scene.add(picture);
  });

  // Benches
  for (const [x, z] of [[-8, 9], [8, 9]]) {
    scene.add(box(3, 0.15, 0.9, 0x8d6e63, x, 0.6, z));
    for (const dx of [-1.2, 1.2]) scene.add(box(0.15, 0.6, 0.8, 0x5d4037, x + dx, 0.3, z));
    solid(x - 1.5, x + 1.5, z - 0.45, z + 0.45);
  }

  // ---------- The camera room ----------
  // The desk with the security monitors; the middle screen shows the shadow with the guard hat
  scene.add(box(5, 0.9, 1.4, 0x546e7a, -6.5, 0.45, -24.5));
  solid(-9, -4, -25.2, -23.8);
  const screens = [
    (ctx, w, h) => { // the hall (static)
      ctx.fillStyle = '#263238';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    },
    (ctx, w, h) => { // THE VIDEO: a shadow with a guard hat grabbing the bolt
      ctx.fillStyle = '#37474f';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#111';
      ctx.fillRect(w * 0.42, h * 0.38, w * 0.2, h * 0.5); // body
      ctx.beginPath();
      ctx.arc(w * 0.52, h * 0.3, 14, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.fillRect(w * 0.4, h * 0.13, w * 0.25, 8); // guard hat
      ctx.fillRect(w * 0.45, h * 0.05, w * 0.14, 12);
      ctx.fillRect(w * 0.6, h * 0.45, w * 0.15, 7); // arm
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(w * 0.8, h * 0.32);
      ctx.lineTo(w * 0.74, h * 0.5);
      ctx.lineTo(w * 0.79, h * 0.5);
      ctx.lineTo(w * 0.75, h * 0.66);
      ctx.lineTo(w * 0.85, h * 0.45);
      ctx.lineTo(w * 0.8, h * 0.45);
      ctx.fill();
      ctx.fillStyle = '#f44336';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('● REC', 6, 14);
    },
    (ctx, w, h) => { // the entrance (empty)
      ctx.fillStyle = '#263238';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.7);
    },
  ];
  screens.forEach((draw, i) => {
    const x = -8.3 + i * 1.8;
    scene.add(box(1.6, 1.1, 0.3, 0x212121, x, 1.55, -24.8));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ map: canvasTexture(128, 82, draw) }));
    screen.position.set(x, 1.55, -24.64);
    scene.add(screen);
  });
  scene.add(box(0.8, 0.9, 0.8, 0x263238, -6.5, 0.45, -22.8)); // chair
  // A locker with a guard hat on top (another hint)
  scene.add(box(1.2, 2.6, 0.8, 0x78909c, -11.8, 1.3, -18));
  solid(-12.4, -11.2, -18.4, -17.6);
  scene.add(cylinder(0.32, 0.32, 0.15, 0x1e3a5f, -11.8, 2.7, -18));

  // ---------- Clue props ----------
  if (!solved) addClueProps(scene);

  return {
    solids,
    walls,
    doors,
    update(dt, time) {
      for (const move of movers) move(time);
      for (const door of doors) {
        if (!door.open || door.lift >= 3.4) continue;
        door.lift = Math.min(3.4, door.lift + dt * 2.5);
        door.mesh.position.y = 1.75 + door.lift;
      }
    },
  };
}

// The footprints, the ripped uniform, the banana peel and the wool
function addClueProps(scene) {
  // Muddy boot prints from the case to the staff door
  const printMat = new THREE.MeshBasicMaterial({ color: 0x4e342e, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = THREE.MathUtils.lerp(-0.5, STAFF_DOOR.x, t) + (i % 2 ? 0.25 : -0.25);
    const z = THREE.MathUtils.lerp(-3.5, HALL.minZ + 1, t);
    const print = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.6), printMat);
    print.rotation.set(-Math.PI / 2, 0, Math.atan2(STAFF_DOOR.x + 0.5, -(HALL.minZ + 4.5)));
    print.position.set(x, 0.025, z);
    scene.add(print);
  }
  // A piece of blue uniform stuck on the broken glass
  const cloth = box(0.25, 0.2, 0.03, 0x5c8fbf, SPOTS.uniform.x, SPOTS.uniform.y, SPOTS.uniform.z);
  cloth.rotation.z = 0.5;
  cloth.add(ball(0.035, 0xcfd8dc, 0.05, 0, 0.03)); // the missing silver button
  scene.add(cloth);
  // A banana peel (fake clue)
  const banana = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const peel = box(0.1, 0.03, 0.4, 0xfdd835, 0, 0.03, 0.15);
    peel.rotation.y = (i / 3) * Math.PI * 2;
    peel.position.set(Math.sin(peel.rotation.y) * 0.15, 0.03, Math.cos(peel.rotation.y) * 0.15);
    banana.add(peel);
  }
  banana.add(ball(0.08, 0x8d6e63, 0, 0.05, 0));
  banana.position.set(SPOTS.banana.x, 0, SPOTS.banana.z);
  scene.add(banana);
  // White wool on a rope post (fake clue)
  scene.add(ball(0.16, 0xffffff, SPOTS.wool.x, 0.9, SPOTS.wool.z, 1.3, 1, 1.3));
}
