import * as THREE from 'three';

// 3D models built from simple shapes (no model files), facing +Z with +Y up, standing on y = 0.
// The heroes look like SuperCapybara's 3D heroes: SuperCapybara in his red suit (here with a detective coat, hat
// and magnifying glass), and COPYBARA (Ethan's drawing in SuperCapybara's concept-art/hero-copybara.jpeg):
// a dark blue police suit with a gold badge, no cape, handcuffs.

const materials = new Map();
export function mat(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, ...options }));
  return materials.get(key);
}

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  return mesh;
}

export function ball(r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

export function cylinder(rTop, rBottom, h, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 14), typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  return mesh;
}

const FUR = 0x9b6b3d;
const FUR_DARK = 0x6e4a2a;

// A capybara standing on four legs, in a suit. Returns { group, legs } (legs swing when walking).
function capybara(suit, suitDark) {
  const group = new THREE.Group();
  const legs = [];
  for (const [x, z] of [[-0.25, 0.3], [0.25, 0.3], [-0.25, -0.3], [0.25, -0.3]]) {
    const leg = box(0.16, 0.35, 0.16, suitDark, x, 0.18, z);
    legs.push(leg);
    group.add(leg);
  }
  group.add(box(0.7, 0.5, 1.0, suit, 0, 0.58, 0)); // body
  group.add(box(0.55, 0.5, 0.6, FUR, 0, 0.88, 0.62)); // head
  group.add(box(0.42, 0.32, 0.25, FUR_DARK, 0, 0.8, 0.98)); // snout
  for (const x of [-0.2, 0.2]) {
    group.add(box(0.12, 0.12, 0.1, FUR_DARK, x, 1.17, 0.5)); // ears
    group.add(ball(0.06, 0x000000, x, 0.98, 0.93)); // eyes
  }
  return { group, legs };
}

function boltShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0.05, 0.22);
  shape.lineTo(-0.1, -0.02);
  shape.lineTo(0.02, -0.02);
  shape.lineTo(-0.06, -0.24);
  shape.lineTo(0.12, 0.04);
  shape.lineTo(0, 0.04);
  shape.lineTo(0.1, 0.22);
  return new THREE.ShapeGeometry(shape);
}

// SUPERCAPYBARA the detective: red suit with the lightning bolt, a tan detective coat, a brown detective hat,
// and a magnifying glass held out in front.
export function makeDetective() {
  const { group, legs } = capybara(0xd8343f, 0x9e1f2a);
  group.add(box(0.76, 0.42, 0.7, 0xc8a165, 0, 0.62, -0.2)); // coat over the back
  group.add(box(0.78, 0.12, 0.72, 0x8d6e43, 0, 0.6, -0.2)); // belt
  for (const side of [-1, 1]) {
    const bolt = new THREE.Mesh(boltShape(), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }));
    bolt.position.set(side * 0.36, 0.62, 0.3);
    bolt.rotation.y = side * Math.PI / 2;
    group.add(bolt);
  }
  // Detective hat
  group.add(cylinder(0.3, 0.32, 0.22, 0x8d6e63, 0, 1.3, 0.6));
  group.add(cylinder(0.45, 0.45, 0.05, 0x6d4c41, 0, 1.2, 0.6));
  group.add(box(0.62, 0.06, 0.06, 0x3e2723, 0, 1.24, 0.6)); // hat band
  // Magnifying glass
  const glass = new THREE.Group();
  glass.add(box(0.06, 0.4, 0.06, 0x5d4037, 0, -0.25, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 8, 20), mat(0xffd23f));
  glass.add(ring);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  glass.add(lens);
  glass.position.set(0.42, 1.0, 0.95);
  glass.rotation.y = 0.4;
  group.add(glass);
  return { group, legs, tool: glass };
}

// COPYBARA: dark blue police suit, gold badge (not the bolt), police cap, handcuffs on his belt, no cape.
export function makeCopybara() {
  const { group, legs } = capybara(0x1a3a8a, 0x0d1f4f);
  for (const side of [-1, 1]) {
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.15, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }));
    badge.position.set(side * 0.36, 0.62, 0.1);
    badge.rotation.y = side * Math.PI / 2;
    group.add(badge);
  }
  // Police cap
  group.add(cylinder(0.32, 0.28, 0.2, 0x0d1f4f, 0, 1.25, 0.58));
  group.add(box(0.4, 0.04, 0.22, 0x111111, 0, 1.17, 0.85)); // visor
  group.add(box(0.12, 0.12, 0.02, 0xffd23f, 0, 1.28, 0.9)); // cap badge
  // Handcuffs on the belt
  group.add(box(0.74, 0.08, 1.02, 0x111111, 0, 0.42, 0));
  const cuffs = new THREE.Group();
  for (const x of [-0.1, 0.1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), mat(0xcfd8dc, { metalness: 0.7 }));
    ring.position.x = x;
    cuffs.add(ring);
  }
  cuffs.position.set(0.38, 0.4, -0.2);
  cuffs.rotation.y = Math.PI / 2;
  group.add(cuffs);
  return { group, legs, tool: cuffs };
}

// ---------- The people in the museum ----------

// GUARD BULLDOG (the thief! shh): grey bulldog in a light blue guard uniform with a guard hat and muddy boots.
// His sleeve has a piece missing (the ripped uniform clue).
export function makeGuard() {
  const g = new THREE.Group();
  for (const x of [-0.18, 0.18]) {
    g.add(box(0.22, 0.25, 0.32, 0x5d4037, x, 0.12, 0.04)); // muddy boots
    g.add(box(0.18, 0.5, 0.18, 0x1e3a5f, x, 0.5, 0)); // legs
  }
  g.add(box(0.75, 0.75, 0.45, 0x5c8fbf, 0, 1.12, 0)); // uniform
  g.add(box(0.2, 0.2, 0.02, 0xcfd8dc, 0.2, 1.3, 0.24)); // silver badge
  for (const [x, y] of [[0, 1.0], [0, 1.25]]) g.add(ball(0.035, 0xcfd8dc, x, y, 0.235)); // buttons (one is missing...)
  g.add(box(0.18, 0.6, 0.2, 0x5c8fbf, -0.47, 1.1, 0)); // left arm
  g.add(box(0.18, 0.35, 0.2, 0x5c8fbf, 0.47, 1.25, 0)); // right arm, ripped short
  g.add(box(0.16, 0.25, 0.18, 0x9e9e9e, 0.47, 0.95, 0)); // bare paw under the rip
  g.add(box(0.6, 0.5, 0.5, 0x9e9e9e, 0, 1.75, 0.05)); // head
  g.add(box(0.45, 0.25, 0.2, 0x757575, 0, 1.62, 0.35)); // jowls
  g.add(ball(0.06, 0x000000, 0, 1.72, 0.46)); // nose
  for (const x of [-0.15, 0.15]) {
    g.add(ball(0.05, 0x000000, x, 1.85, 0.3));
    g.add(box(0.15, 0.2, 0.08, 0x616161, x * 2.2, 1.95, 0)); // ears
  }
  g.add(cylinder(0.32, 0.32, 0.15, 0x1e3a5f, 0, 2.08, 0.05)); // guard hat
  g.add(box(0.4, 0.04, 0.2, 0x111111, 0, 2.02, 0.3)); // visor
  return g;
}

// MONKEY (a fake suspect): a brown monkey with a curly tail.
export function makeMonkey() {
  const g = new THREE.Group();
  for (const x of [-0.15, 0.15]) g.add(box(0.14, 0.45, 0.14, 0x6d4c41, x, 0.22, 0));
  g.add(ball(0.35, 0x6d4c41, 0, 0.75, 0, 1, 1.1, 0.9));
  g.add(ball(0.22, 0xd7b899, 0, 0.72, 0.22, 1, 1.2, 0.6)); // tummy
  g.add(ball(0.3, 0x6d4c41, 0, 1.3, 0));
  g.add(ball(0.2, 0xd7b899, 0, 1.25, 0.18, 1.1, 0.9, 0.7)); // face
  for (const x of [-0.1, 0.1]) g.add(ball(0.04, 0x000000, x, 1.33, 0.32));
  for (const x of [-0.32, 0.32]) g.add(ball(0.1, 0xd7b899, x, 1.32, 0));
  for (const x of [-0.38, 0.38]) g.add(box(0.12, 0.55, 0.12, 0x6d4c41, x, 0.75, 0.05)); // arms
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16, Math.PI * 1.5), mat(0x6d4c41));
  tail.position.set(0, 0.7, -0.4);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  return g;
}

// SHEEP (a fake suspect): a fluffy tourist with a camera.
export function makeSheep() {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.2, 0.25], [0.2, 0.25], [-0.2, -0.25], [0.2, -0.25]]) g.add(box(0.1, 0.4, 0.1, 0x212121, x, 0.2, z));
  for (const [x, y, z] of [[0, 0.65, 0], [-0.22, 0.7, 0.15], [0.22, 0.7, 0.15], [-0.2, 0.7, -0.2], [0.2, 0.7, -0.2], [0, 0.85, 0]]) g.add(ball(0.3, 0xf5f5f5, x, y, z));
  g.add(box(0.3, 0.38, 0.35, 0x212121, 0, 0.95, 0.5)); // face
  for (const x of [-0.08, 0.08]) g.add(ball(0.04, 0xffffff, x, 1.02, 0.68));
  g.add(ball(0.18, 0xf5f5f5, 0, 1.15, 0.45)); // fluffy top
  g.add(box(0.22, 0.15, 0.1, 0x37474f, 0, 0.62, 0.62)); // camera
  const lens = cylinder(0.04, 0.04, 0.06, 0x111111, 0, 0.62, 0.69);
  lens.rotation.x = Math.PI / 2;
  g.add(lens);
  return g;
}

// MUSEUM DIRECTOR OWL: round, brown, big eyes, glasses and a bow tie.
export function makeOwl() {
  const g = new THREE.Group();
  g.add(ball(0.5, 0x8d6e63, 0, 0.75, 0, 1, 1.3, 0.9));
  g.add(ball(0.35, 0xd7ccc8, 0, 0.65, 0.2, 1, 1.2, 0.6)); // tummy
  for (const x of [-0.18, 0.18]) {
    g.add(ball(0.15, 0xffffff, x, 1.2, 0.35));
    g.add(ball(0.07, 0x000000, x, 1.2, 0.48));
    const glasses = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 16), mat(0x212121));
    glasses.position.set(x, 1.2, 0.42);
    g.add(glasses);
    g.add(box(0.1, 0.25, 0.05, 0x6d4c41, x * 1.6, 1.55, 0)); // ear tufts
  }
  g.add(box(0.1, 0.1, 0.15, 0xffb300, 0, 1.05, 0.48)); // beak
  g.add(box(0.3, 0.12, 0.06, 0xd32f2f, 0, 0.88, 0.45)); // bow tie
  return g;
}
