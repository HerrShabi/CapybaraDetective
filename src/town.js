import * as THREE from 'three';
import { mat, box, ball, cylinder } from './models.js';
import { makeMustache, makeScooter } from './models2.js';

// Case 2's town (Ethan: "you walk from the museum to the pizza place to celebrate, but then she's gone").
// The street runs from the museum (z = 12, behind you) toward -z. On the right: PESTO PALACE (the rival). On the
// left: a café table and Danny Dough's scooter. At the end: CHEF MOZZARELLA'S PIZZA (z -38 to -50), and behind
// its locked back door the alley with the open MANHOLE (to the sewer maze).
// buildTown(scene, { solved }) returns { solids, walls, doors, update } (solved: the pizza party at the end, with no
// mustache, note or footprints lying around).

export const TOWN = {
  start: { x: 0, z: 7, yaw: Math.PI },
  shopFront: -38,
  shopBack: -50,
  alleyEnd: -60,
  manhole: { x: 0, z: -56 },
  backDoor: { x: 4, width: 2.6 },
};

// Where everything is
export const TOWN_SPOTS = {
  // Clues
  mustache: { x: 2, z: -44.5, y: 0.1 },
  flour: { x: 4.2, z: -47.5 },
  giantPrint: { x: 2.2, z: -53.5 },
  smell: { x: 0, z: -57.8 },
  apron: { x: 8.4, z: -12.5, y: 1.3 },
  scooter: { x: -7.6, z: -27 },
  note: { x: 2.6, z: -37.4, y: 1.5 },
  // People
  waiter: { x: -1.8, z: -44.5, face: 0.4 },
  pesto: { x: 7, z: -15.5, face: -1.4 },
  danny: { x: -6.2, z: -24.5, face: 1.2 },
  customer: { x: -6.8, z: -8, face: 1.3 },
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

function sign(text, width, height, background, color) {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: canvasTexture(Math.round(width * 64), Math.round(height * 64), (ctx, w, h) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.round(h * 0.55)}px Arial Black, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 2);
    }),
  }));
}

export function buildTown(scene, { solved = false } = {}) {
  const solids = [];
  const walls = [];
  const doors = [];
  const movers = [];
  const solid = (minX, maxX, minZ, maxZ) => solids.push({ minX, maxX, minZ, maxZ });
  const wall = (minX, maxX, minZ, maxZ, color, height = 7) => {
    const mesh = box(maxX - minX, height, maxZ - minZ, color, (minX + maxX) / 2, height / 2, (minZ + maxZ) / 2);
    scene.add(mesh);
    walls.push(mesh);
    solid(minX, maxX, minZ, maxZ);
    return mesh;
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d6e63, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(20, 40, 10);
  scene.add(sun);

  // Ground: cobblestones in the street, tiles in the shop, concrete in the alley
  const stones = canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 3;
    for (let y = 0; y < 64; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < 64; x += 32) ctx.strokeRect(x, y, 32, 16);
  });
  stones.wrapS = stones.wrapT = THREE.RepeatWrapping;
  stones.repeat.set(5, 14);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(18, 52), new THREE.MeshStandardMaterial({ map: stones }));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0, -12);
  scene.add(street);
  const tiles = canvasTexture(64, 64, (ctx) => {
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#d32f2f' : '#fafafa';
      ctx.fillRect(x * 32, y * 32, 32, 32);
    }
  });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(9, 6);
  const shopFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), new THREE.MeshStandardMaterial({ map: tiles }));
  shopFloor.rotation.x = -Math.PI / 2;
  shopFloor.position.set(0, 0.01, -44);
  scene.add(shopFloor);
  scene.add(box(18, 0.02, 10, 0x78909c, 0, 0.01, -55));

  // The museum behind you (where case 1 happened)
  wall(-12, 12, 12, 13, 0xe8dcc8, 9);
  for (let x = -8; x <= 8; x += 4) scene.add(cylinder(0.5, 0.5, 6, 0xf5f5f5, x, 3, 11.4));
  const museumSign = sign('MUSEUM', 8, 1.2, '#1a3a8a', '#ffd23f');
  museumSign.position.set(0, 7, 11.9);
  museumSign.rotation.y = Math.PI;
  scene.add(museumSign);

  // Houses along both sides of the street
  const colors = [0xffab91, 0xfff59d, 0x90caf9, 0xa5d6a7, 0xce93d8];
  for (let i = 0; i < 5; i++) {
    const z0 = 12 - i * 10;
    wall(-14, -9, z0 - 10, z0, colors[i % 5], 6 + (i % 3) * 2);
    if (i !== 2 && i !== 3) wall(9, 14, z0 - 10, z0, colors[(i + 2) % 5], 6 + ((i + 1) % 3) * 2);
  }
  // PESTO PALACE (the rival's shop, on the right)
  wall(9, 14, -28, -8, 0x66bb6a, 7);
  const pestoSign = sign('PESTO PALACE 🌿', 6, 1, '#1b5e20', '#ffffff');
  pestoSign.position.set(8.95, 4.8, -15);
  pestoSign.rotation.y = -Math.PI / 2;
  scene.add(pestoSign);
  for (let i = 0; i < 6; i++) scene.add(box(1.4, 0.15, 1.2, i % 2 ? 0xffffff : 0x2e7d32, 8.4, 3.8, -11 - i * 1.4)); // awning
  // The apron with tomato sauce, hanging next to his door (a fake clue)
  scene.add(box(0.6, 0.8, 0.05, 0xffffff, 8.9, 1.3, -12.5).rotateY(Math.PI / 2));
  scene.add(ball(0.12, 0xd32f2f, 8.85, 1.35, -12.4), ball(0.08, 0xd32f2f, 8.85, 1.1, -12.7));

  // The café table outside (where a "normal customer" is sitting...)
  scene.add(cylinder(0.7, 0.7, 0.06, 0xffffff, -5.5, 1.0, -8));
  scene.add(cylinder(0.08, 0.08, 1.0, 0x424242, -5.5, 0.5, -8));
  scene.add(cylinder(0.3, 0.3, 0.05, 0xffca28, -5.5, 1.06, -8)); // a pizza on it
  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8), mat(0xd32f2f));
  umbrella.position.set(-5.5, 3, -8);
  scene.add(umbrella, cylinder(0.05, 0.05, 2.5, 0x424242, -5.5, 1.75, -8));
  solid(-6.3, -4.7, -8.8, -7.2);

  // Danny Dough's scooter (a fake clue)
  const scooter = makeScooter();
  scooter.position.set(TOWN_SPOTS.scooter.x, 0, TOWN_SPOTS.scooter.z);
  scooter.rotation.y = 0.3;
  scene.add(scooter);
  solid(-8.1, -7.1, -27.9, -26.1);

  // ---------- CHEF MOZZARELLA'S PIZZA ----------
  const F = TOWN.shopFront;
  const B = TOWN.shopBack;
  wall(-14, -1.5, F - 0.6, F, 0xfff3e0);
  wall(1.5, 14, F - 0.6, F, 0xfff3e0);
  const above = box(3, 3, 0.6, 0xfff3e0, 0, 5.5, F - 0.3);
  scene.add(above);
  walls.push(above);
  const shopSign = sign("🍕 MOZZARELLA'S PIZZA 🍕", 11, 1.3, '#d32f2f', '#fffde7');
  shopSign.position.set(0, 4.6, F + 0.02);
  scene.add(shopSign);
  wall(-9.6, -9, B, F - 0.6, 0xfff3e0);
  wall(9, 9.6, B, F - 0.6, 0xfff3e0);
  // The back wall, with the locked back door (Copybara opens it)
  const bdL = TOWN.backDoor.x - TOWN.backDoor.width / 2;
  const bdR = TOWN.backDoor.x + TOWN.backDoor.width / 2;
  wall(-9.6, bdL, B - 0.6, B, 0xfff3e0);
  wall(bdR, 9.6, B - 0.6, B, 0xfff3e0);
  const overDoor = box(TOWN.backDoor.width, 3.5, 0.6, 0xfff3e0, TOWN.backDoor.x, 5.25, B - 0.3);
  scene.add(overDoor);
  walls.push(overDoor);
  const doorMesh = box(TOWN.backDoor.width, 3.5, 0.25, 0x6d4c41, TOWN.backDoor.x, 1.75, B - 0.3);
  doorMesh.add(box(0.15, 0.15, 0.2, 0xffd23f, 0.9, 0, 0.1));
  scene.add(doorMesh);
  walls.push(doorMesh);
  const doorSolid = { minX: bdL, maxX: bdR, minZ: B - 0.6, maxZ: B };
  solids.push(doorSolid);
  doors.push({ id: 'back', mesh: doorMesh, solid: doorSolid, x: TOWN.backDoor.x, z: B + 0.8, open: false, lift: 0, message: 'door.openedBack' });
  // Inside: the counter, the brick oven, tables with checkered cloths
  scene.add(box(5, 1.1, 1.2, 0x8d6e63, 5, 0.55, -42.6));
  scene.add(box(5.2, 0.1, 1.4, 0xfafafa, 5, 1.12, -42.6));
  solid(2.5, 7.5, -43.2, -42);
  const oven = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xbf360c));
  oven.position.set(6.5, 0.9, -48);
  scene.add(oven, box(3.8, 0.9, 3.6, 0x8d6e63, 6.5, 0.45, -48));
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xff9100 }));
  glow.position.set(6.5, 0.92, -46.2);
  scene.add(glow);
  solid(4.6, 8.4, -49.8, -46.2);
  for (const z of [-41.5, -46]) {
    scene.add(cylinder(0.9, 0.9, 0.08, 0xffffff, -5.5, 0.95, z));
    scene.add(cylinder(0.92, 0.92, 0.04, 0xd32f2f, -5.5, 1.0, z));
    scene.add(cylinder(0.1, 0.1, 0.95, 0x424242, -5.5, 0.47, z));
    solid(-6.4, -4.6, z - 0.9, z + 0.9);
  }
  // A half-made pizza left on the counter (she was taken in a hurry!)
  scene.add(cylinder(0.4, 0.4, 0.05, 0xffe0b2, 4, 1.2, -42.6));
  scene.add(cylinder(0.32, 0.32, 0.02, 0xd32f2f, 4, 1.23, -42.6));
  // THE MUSTACHE on the floor (Ethan: she left her mustache behind)
  const mustache = makeMustache();
  mustache.scale.setScalar(1.6);
  mustache.position.set(TOWN_SPOTS.mustache.x, 0.05, TOWN_SPOTS.mustache.z);
  mustache.rotation.x = -Math.PI / 2;
  if (!solved) scene.add(mustache);
  // The angry note on the front of the shop (a fake clue)
  const note = sign('!!! >:(', 0.7, 0.5, '#fffde7', '#d32f2f');
  note.position.set(TOWN_SPOTS.note.x, TOWN_SPOTS.note.y, F + 0.03);
  if (!solved) scene.add(note);
  // Floury footprints from the counter to the back door, and on to the manhole
  const flourMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const path = [[3.8, -44], [4.2, -46], [4, -48], [4.2, -49.6], [3.4, -51.5], [2.2, -53], [1.2, -54.5]];
  path.forEach(([x, z], i) => {
    const print = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), flourMat);
    print.rotation.x = -Math.PI / 2;
    print.position.set(x + (i % 2 ? 0.2 : -0.2), 0.03, z);
    print.scale.y = 1.4;
    if (!solved) scene.add(print);
  });

  // ---------- The alley and the manhole ----------
  wall(-9.6, -9, TOWN.alleyEnd, B - 0.6, 0x8d6e63, 6);
  wall(9, 9.6, TOWN.alleyEnd, B - 0.6, 0x8d6e63, 6);
  wall(-9.6, 9.6, TOWN.alleyEnd - 0.6, TOWN.alleyEnd, 0x8d6e63, 6);
  for (const [x, z] of [[-7, -52], [7.5, -58]]) {
    scene.add(cylinder(0.6, 0.6, 1.3, 0x2e7d32, x, 0.65, z)); // trash cans
    solid(x - 0.6, x + 0.6, z - 0.6, z + 0.6);
  }
  const M = TOWN.manhole;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(M.x, 0.03, M.z);
  scene.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 6, 24), mat(0x616161));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(M.x, 0.05, M.z);
  scene.add(rim);
  const lid = cylinder(1.1, 1.1, 0.12, 0x424242, M.x + 1.8, 0.06, M.z + 0.6); // the lid, pushed aside
  scene.add(lid);
  // The GIANT spiky footprint (3 big toes, like spiky metal legs...)
  const giant = new THREE.Group();
  giant.add(new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), new THREE.MeshBasicMaterial({ color: 0x5d4037 })));
  for (const a of [-0.5, 0, 0.5]) {
    const toe = new THREE.Mesh(new THREE.CircleGeometry(0.2, 3), new THREE.MeshBasicMaterial({ color: 0x5d4037 }));
    toe.position.set(Math.sin(a) * 0.75, Math.cos(a) * 0.75, 0);
    toe.rotation.z = a + Math.PI / 2;
    giant.add(toe);
  }
  giant.rotation.x = -Math.PI / 2;
  giant.position.set(TOWN_SPOTS.giantPrint.x, 0.03, TOWN_SPOTS.giantPrint.z);
  scene.add(giant);
  // The smell of pizza coming up out of the manhole
  const wispMat = new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.6 });
  const wisps = Array.from({ length: 8 }, (_, i) => {
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), wispMat);
    scene.add(wisp);
    return { wisp, offset: i / 8 };
  });
  movers.push((time) => {
    for (const { wisp, offset } of wisps) {
      const k = (time * 0.4 + offset) % 1;
      wisp.position.set(M.x + Math.sin((k + offset) * 9) * 0.5, k * 3, M.z + Math.cos((k + offset) * 7) * 0.4);
      wisp.scale.setScalar(0.6 + k);
    }
  });

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
