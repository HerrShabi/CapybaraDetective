import * as THREE from 'three';
import { mat, box, ball, cylinder } from './models.js';

// Case 2's characters (THE MISSING PIZZA CHEF), from simple shapes, facing +Z, standing on y = 0.

// A curly mustache (Chef Mozzarella's: a stick-on one! It's the first clue when she's gone.)
export function makeMustache(color = 0x3e2723) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 6, 12, Math.PI * 1.4), mat(color));
    curl.position.set(side * 0.1, 0, 0);
    curl.rotation.set(0, 0, side > 0 ? -0.6 : Math.PI + 0.6);
    g.add(curl);
  }
  g.add(box(0.12, 0.05, 0.05, color));
  return g;
}

// CHEF MOZZARELLA: a fancy white cat (a girl!) with a tall chef's hat, a red scarf, an apron, and her mustache
export function makeChefCat(withMustache = true) {
  const g = new THREE.Group();
  for (const x of [-0.15, 0.15]) g.add(box(0.15, 0.45, 0.15, 0xfafafa, x, 0.22, 0));
  g.add(ball(0.38, 0xffffff, 0, 0.8, 0, 1, 1.15, 0.9)); // body in a chef's jacket
  g.add(box(0.5, 0.55, 0.05, 0xe53935, 0, 0.75, 0.33)); // red apron
  g.add(ball(0.32, 0xfff8e1, 0, 1.38, 0.05)); // head
  for (const x of [-0.18, 0.18]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), mat(0xfff8e1));
    ear.position.set(x, 1.66, 0.02);
    g.add(ear);
    g.add(ball(0.05, 0x1e88e5, x * 0.65, 1.45, 0.32)); // blue eyes
  }
  g.add(ball(0.04, 0xff6f9c, 0, 1.36, 0.36)); // nose
  g.add(box(0.5, 0.08, 0.08, 0xd32f2f, 0, 1.12, 0.18)); // scarf
  g.add(cylinder(0.25, 0.22, 0.4, 0xffffff, 0, 1.85, 0)); // chef's hat
  g.add(ball(0.3, 0xffffff, 0, 2.1, 0, 1, 0.6, 1));
  if (withMustache) {
    const m = makeMustache();
    m.position.set(0, 1.3, 0.36);
    g.add(m);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 12, Math.PI * 1.3), mat(0xfff8e1));
  tail.position.set(0, 0.55, -0.4);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  return g;
}

// PIZZA BOSS (SuperCapybara World 1's boss): a pizza slice with blasters in both hands and spiky metal legs
export function makePizzaBoss() {
  const g = new THREE.Group();
  // Spiky metal legs
  for (const x of [-0.3, 0.3]) {
    g.add(box(0.12, 0.8, 0.12, 0x9e9e9e, x, 0.4, 0));
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), mat(0xbdbdbd));
      spike.position.set(x + (i - 1) * 0.1, 0.05, 0.12);
      spike.rotation.x = Math.PI / 2;
      g.add(spike);
    }
  }
  // The slice: point down, crust on top
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.9);
  shape.lineTo(0.75, 0.6);
  shape.lineTo(-0.75, 0.6);
  shape.closePath();
  const slice = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), mat(0xffca28));
  slice.position.set(0, 1.75, -0.15);
  g.add(slice);
  g.add(box(1.7, 0.3, 0.42, 0xd4a056, 0, 2.42, 0)); // crust
  for (const [x, y] of [[-0.3, 2.0], [0.3, 1.95], [0, 1.5], [-0.12, 1.1], [0.35, 2.2]]) {
    const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12), mat(0xc62828));
    pep.rotation.x = Math.PI / 2;
    pep.position.set(x, y, 0.17);
    g.add(pep);
  }
  // Angry eyes
  for (const x of [-0.22, 0.22]) {
    g.add(ball(0.1, 0xffffff, x, 1.9, 0.18));
    g.add(ball(0.05, 0x000000, x, 1.9, 0.26));
    const brow = box(0.22, 0.05, 0.05, 0x3e2723, x, 2.03, 0.2);
    brow.rotation.z = x > 0 ? 0.4 : -0.4;
    g.add(brow);
  }
  g.add(box(0.3, 0.05, 0.05, 0x3e2723, 0, 1.68, 0.2)); // grumpy mouth
  // Blasters
  for (const x of [-0.95, 0.95]) {
    g.add(box(0.12, 0.12, 0.5, 0x424242, x * 0.8, 1.6, 0.15)); // arm
    g.add(box(0.2, 0.25, 0.6, 0x37474f, x, 1.55, 0.45));
    const barrel = cylinder(0.07, 0.07, 0.3, 0x212121, x, 1.6, 0.85);
    barrel.rotation.x = Math.PI / 2;
    g.add(barrel);
  }
  return g;
}

// PIZZA BOSS IN DISGUISE: "just a normal customer" in a long trench coat, a hat and sunglasses
// (his giant spiky feet stick out at the bottom...)
export function makeDisguise() {
  const g = new THREE.Group();
  for (const x of [-0.3, 0.3]) {
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), mat(0xbdbdbd));
      spike.position.set(x + (i - 1) * 0.1, 0.05, 0.12);
      spike.rotation.x = Math.PI / 2;
      g.add(spike);
    }
  }
  g.add(cylinder(0.55, 0.75, 1.9, 0x8d6e43, 0, 1.1, 0)); // trench coat
  g.add(box(0.1, 1.5, 0.05, 0x5d4037, 0, 1.1, 0.68)); // coat opening
  g.add(cylinder(0.45, 0.55, 0.5, 0xffca28, 0, 2.3, 0)); // a cheesy head poking out...
  g.add(box(0.7, 0.14, 0.12, 0x111111, 0, 2.38, 0.42)); // sunglasses
  g.add(cylinder(0.4, 0.42, 0.4, 0x3e2723, 0, 2.75, 0)); // hat
  g.add(cylinder(0.65, 0.65, 0.05, 0x3e2723, 0, 2.56, 0));
  g.add(box(0.3, 0.06, 0.06, 0x3e2723, 0, 2.18, 0.45)); // fake mustache
  return g;
}

// CHEF PESTO, the rival chef across the street (a fake suspect): a green parrot in a chef's hat
export function makeChefPesto() {
  const g = new THREE.Group();
  for (const x of [-0.12, 0.12]) g.add(box(0.08, 0.4, 0.08, 0xffb300, x, 0.2, 0));
  g.add(ball(0.36, 0x43a047, 0, 0.8, 0, 1, 1.3, 0.9));
  g.add(box(0.48, 0.6, 0.05, 0xffffff, 0, 0.75, 0.32)); // apron
  g.add(ball(0.28, 0x43a047, 0, 1.38, 0.05));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), mat(0xffb300));
  beak.position.set(0, 1.32, 0.38);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  for (const x of [-0.12, 0.12]) g.add(ball(0.05, 0x000000, x, 1.45, 0.26));
  g.add(cylinder(0.22, 0.2, 0.35, 0xffffff, 0, 1.75, 0));
  g.add(ball(0.26, 0xffffff, 0, 1.98, 0, 1, 0.6, 1));
  for (const side of [-1, 1]) {
    const wing = box(0.1, 0.5, 0.4, 0x2e7d32, side * 0.38, 0.85, 0);
    wing.rotation.z = side * 0.2;
    g.add(wing);
  }
  return g;
}

// DANNY DOUGH, the pizza delivery raccoon (a fake suspect): a red cap and a pizza box
export function makeDannyDough() {
  const g = new THREE.Group();
  for (const x of [-0.15, 0.15]) g.add(box(0.15, 0.45, 0.15, 0x424242, x, 0.22, 0));
  g.add(box(0.6, 0.6, 0.4, 0xd32f2f, 0, 0.75, 0)); // delivery shirt
  g.add(ball(0.3, 0x9e9e9e, 0, 1.3, 0.02)); // head
  g.add(box(0.5, 0.12, 0.05, 0x212121, 0, 1.35, 0.27)); // raccoon mask
  for (const x of [-0.12, 0.12]) g.add(ball(0.045, 0xffffff, x, 1.36, 0.3));
  for (const x of [-0.18, 0.18]) g.add(box(0.12, 0.14, 0.08, 0x757575, x, 1.6, 0));
  g.add(cylinder(0.27, 0.28, 0.14, 0xd32f2f, 0, 1.55, 0)); // red cap
  g.add(box(0.34, 0.04, 0.22, 0xd32f2f, 0, 1.5, 0.3)); // visor
  g.add(box(0.6, 0.1, 0.6, 0xd7ccc8, 0, 0.95, 0.45)); // pizza box
  const tail = box(0.16, 0.16, 0.6, 0x757575, 0, 0.5, -0.45);
  tail.rotation.x = 0.4;
  g.add(tail, box(0.17, 0.17, 0.12, 0x212121, 0, 0.42, -0.65));
  return g;
}

// WAITER MOUSE, who works at Chef Mozzarella's pizza shop: a little mouse with a bow tie
export function makeWaiterMouse() {
  const g = new THREE.Group();
  for (const x of [-0.1, 0.1]) g.add(box(0.08, 0.3, 0.08, 0x212121, x, 0.15, 0));
  g.add(ball(0.26, 0x212121, 0, 0.55, 0, 1, 1.2, 0.9)); // black waiter jacket
  g.add(box(0.2, 0.3, 0.04, 0xffffff, 0, 0.6, 0.22)); // shirt
  g.add(box(0.16, 0.07, 0.05, 0xd32f2f, 0, 0.74, 0.25)); // bow tie
  g.add(ball(0.22, 0xbdbdbd, 0, 0.98, 0.02));
  for (const x of [-0.2, 0.2]) g.add(ball(0.13, 0xf8bbd0, x, 1.17, -0.02, 1, 1, 0.4)); // big ears
  for (const x of [-0.08, 0.08]) g.add(ball(0.035, 0x000000, x, 1.03, 0.2));
  g.add(ball(0.04, 0xff80ab, 0, 0.96, 0.24));
  return g;
}

// A delivery scooter (Danny Dough's: the fake "scooter seen near the shop" clue)
export function makeScooter() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.25, 1.6, 0xd32f2f, 0, 0.45, 0));
  g.add(box(0.4, 0.15, 0.6, 0x212121, 0, 0.65, -0.3)); // seat
  g.add(box(0.1, 0.8, 0.1, 0x9e9e9e, 0, 0.8, 0.7)); // handle post
  g.add(box(0.7, 0.08, 0.08, 0x212121, 0, 1.2, 0.7));
  g.add(box(0.6, 0.45, 0.5, 0xffffff, 0, 0.85, -0.6)); // delivery box
  for (const z of [-0.6, 0.65]) {
    const wheel = cylinder(0.25, 0.25, 0.15, 0x111111, 0, 0.25, z);
    wheel.rotation.z = Math.PI / 2;
    g.add(wheel);
  }
  return g;
}

// A little pizza-factory robot
export function makePizzaRobot() {
  const g = new THREE.Group();
  g.add(cylinder(0.3, 0.35, 0.3, 0x616161, 0, 0.15, 0)); // wheels base
  g.add(box(0.6, 0.6, 0.5, 0xb0bec5, 0, 0.65, 0));
  g.add(box(0.45, 0.35, 0.4, 0x90a4ae, 0, 1.15, 0));
  g.add(box(0.35, 0.1, 0.05, 0xff1744, 0, 1.18, 0.21)); // red eye bar
  g.add(cylinder(0.02, 0.02, 0.3, 0x424242, 0, 1.45, 0));
  g.add(ball(0.06, 0xff1744, 0, 1.62, 0));
  const tray = cylinder(0.3, 0.3, 0.04, 0x9e9e9e, 0.45, 0.9, 0.2);
  g.add(tray);
  g.add(cylinder(0.25, 0.25, 0.05, 0xffca28, 0.45, 0.94, 0.2)); // a pizza on its tray
  return g;
}
