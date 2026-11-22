import * as THREE from 'three';
import { mat, box, cylinder } from './models.js';

// The sewer MAZE RUN (Ethan: SuperCapybara goes in because he's smart and knows mazes very well).
// Dark brick tunnels (the level has a flashlight), a smelly green river in some tunnels, dripping pipes, and a
// trail of pizza smell (little orange wisps) along the right way. The maze is made the same every time
// (a seeded "dig the tunnels" walk); the exit is the big round pizza door to Pizza Boss's factory.
// buildSewer(scene) returns { solids, walls, update, start, exit }.

const SIZE = 7; // cells across and along
const CELL = 5; // how big a cell is
const HEIGHT = 3.2;

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Cell (cx, cz) → its middle in the world. Cell (0, 0) is the start (z = 0), the maze goes toward -z.
const middle = (cx, cz) => ({ x: (cx - (SIZE - 1) / 2) * CELL, z: -cz * CELL });

export function buildSewer(scene) {
  const solids = [];
  const walls = [];
  const rand = seeded(42);

  // Dig the maze: every cell starts with all 4 walls; a random walk knocks walls down
  const open = new Set(); // "cx,cz-cx2,cz2" for each knocked-down wall
  const key = (a, b) => (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}-${b}` : `${b}-${a}`);
  const seen = new Set(['0,0']);
  const stack = [[0, 0]];
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dz]) => [cx + dx, cz + dz])
      .filter(([x, z]) => x >= 0 && z >= 0 && x < SIZE && z < SIZE && !seen.has(`${x},${z}`));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const pick = next[Math.floor(rand() * next.length)];
    open.add(key([cx, cz], pick));
    seen.add(`${pick[0]},${pick[1]}`);
    stack.push(pick);
  }
  const exitCell = [SIZE - 1, SIZE - 1];

  // The right way, from the start to the exit (for the pizza smell trail)
  const cameFrom = new Map([['0,0', null]]);
  const queue = [[0, 0]];
  while (queue.length) {
    const [cx, cz] = queue.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [cx + dx, cz + dz];
      if (cameFrom.has(`${n}`) || !open.has(key([cx, cz], n))) continue;
      cameFrom.set(`${n}`, [cx, cz]);
      queue.push(n);
    }
  }
  const path = [];
  for (let c = exitCell; c; c = cameFrom.get(`${c}`)) path.unshift(c);

  // Floor, ceiling, and the brick walls
  const bricks = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4e5b4e';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#2f3a2f';
    ctx.lineWidth = 3;
    for (let y = 0; y < 64; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < 64; x += 32) ctx.strokeRect(x, y, 32, 16);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();
  const wallMat = new THREE.MeshStandardMaterial({ map: bricks });
  const span = SIZE * CELL;
  const floor = box(span + 2, 0.1, span + 2, 0x37423a, 0, -0.05, -(SIZE - 1) / 2 * CELL);
  scene.add(floor);
  const ceiling = box(span + 2, 0.2, span + 2, 0x263026, 0, HEIGHT + 0.1, -(SIZE - 1) / 2 * CELL);
  scene.add(ceiling);
  const wallAt = (x, z, w, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, HEIGHT, d), wallMat);
    mesh.position.set(x, HEIGHT / 2, z);
    scene.add(mesh);
    walls.push(mesh);
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  };
  const T = 0.5;
  for (let cx = 0; cx < SIZE; cx++) {
    for (let cz = 0; cz < SIZE; cz++) {
      const m = middle(cx, cz);
      // Wall on the +x side of this cell, and on the -z side (further in)
      if (cx === SIZE - 1 || !open.has(key([cx, cz], [cx + 1, cz]))) wallAt(m.x + CELL / 2, m.z, T, CELL + T);
      if (!(cx === exitCell[0] && cz === exitCell[1]) && (cz === SIZE - 1 || !open.has(key([cx, cz], [cx, cz + 1])))) wallAt(m.x, m.z - CELL / 2, CELL + T, T);
      if (cx === 0) wallAt(m.x - CELL / 2, m.z, T, CELL + T);
      if (cz === 0) wallAt(m.x, m.z + CELL / 2, CELL + T, T);
    }
  }

  // The smelly green river in some tunnels (just to look at), and pipes dripping
  const slime = new THREE.MeshBasicMaterial({ color: 0x7cb342, transparent: true, opacity: 0.7 });
  const drips = [];
  for (let i = 0; i < SIZE * SIZE; i += 3) {
    const cx = i % SIZE;
    const cz = Math.floor(i / SIZE);
    const m = middle(cx, cz);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(1.2, CELL * 0.8), slime);
    river.rotation.x = -Math.PI / 2;
    river.position.set(m.x + 1.6, 0.02, m.z);
    scene.add(river);
    const pipe = cylinder(0.25, 0.25, CELL * 0.8, 0x6d4c41, m.x - 2.1, HEIGHT - 0.4, m.z);
    pipe.rotation.x = Math.PI / 2;
    scene.add(pipe);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), slime);
    scene.add(drip);
    drips.push({ drip, x: m.x - 2.1, z: m.z, offset: i * 0.37 });
  }

  // The trail of pizza smell along the right way
  const wispMat = new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.85 });
  const wisps = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = middle(...path[i]);
    const b = middle(...path[i + 1]);
    for (const k of [0, 0.5]) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), wispMat);
      const x = THREE.MathUtils.lerp(a.x, b.x, k);
      const z = THREE.MathUtils.lerp(a.z, b.z, k);
      scene.add(wisp);
      wisps.push({ wisp, x, z, offset: i + k });
    }
  }

  // The exit: a big round door with a pizza on it (to Pizza Boss's factory)
  const exit = middle(...exitCell);
  const door = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), mat(0x9e9e9e));
  door.position.set(exit.x, 1.6, exit.z - CELL / 2 - 0.3);
  scene.add(door);
  const pizza = new THREE.Mesh(new THREE.CircleGeometry(1.0, 6), new THREE.MeshBasicMaterial({ color: 0xffca28 }));
  pizza.position.set(exit.x, 1.6, exit.z - CELL / 2 - 0.28);
  scene.add(pizza);
  const doorLight = new THREE.PointLight(0xff9100, 30, 10);
  doorLight.position.set(exit.x, 2, exit.z - CELL / 2 + 1);
  scene.add(doorLight);
  wallAt(exit.x, exit.z - CELL / 2 - 0.6, CELL + T, T);

  scene.add(new THREE.HemisphereLight(0x8899aa, 0x223322, 0.6));

  return {
    solids,
    walls,
    doors: [],
    start: { x: middle(0, 0).x, z: middle(0, 0).z - 1, yaw: Math.PI },
    exit: { x: exit.x, z: exit.z - CELL / 2 + 1.2 },
    update(dt, time) {
      for (const { wisp, x, z, offset } of wisps) {
        wisp.position.set(x + Math.sin(time * 2 + offset) * 0.3, 1.1 + Math.sin(time * 3 + offset * 2) * 0.3, z);
        wisp.material.opacity = 0.6 + Math.sin(time * 4 + offset) * 0.25;
      }
      for (const d of drips) {
        const k = (time * 0.8 + d.offset) % 1;
        d.drip.position.set(d.x, HEIGHT - 0.6 - k * (HEIGHT - 0.6), d.z);
      }
    },
  };
}

// The maze's start and exit (needed before building, for the level)
export const SEWER = {
  start: { x: middle(0, 0).x, z: middle(0, 0).z - 1, yaw: Math.PI },
  exit: { x: middle(SIZE - 1, SIZE - 1).x, z: middle(SIZE - 1, SIZE - 1).z - CELL / 2 + 1.2 },
};
