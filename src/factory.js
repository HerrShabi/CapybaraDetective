import * as THREE from 'three';
import { mat, box, ball, cylinder } from './models.js';
import { makePizzaRobot } from './models2.js';

// Pizza Boss's SECRET PIZZA FACTORY under the city (case 2's end). Conveyor belts with pizzas, giant ovens,
// pizza robots rolling around, the big DOUGH MACHINE (its lever is SuperCapybara's trick), and Chef Mozzarella
// locked in a cage (Copybara opens it). You come in from the sewer door at the front (z = 12).
// buildFactory(scene) returns { solids, walls, doors, update, pourDough(), dough }.

export const FACTORY = {
  start: { x: 0, z: 8, yaw: Math.PI },
  boss: { x: 0, z: -6 },
  lever: { x: 4.2, z: -3.5 },
  cage: { x: -8, z: -9 },
  copybaraIn: { x: 0, z: 12.5 },
};

export function buildFactory(scene) {
  const solids = [];
  const walls = [];
  const doors = [];
  const movers = [];
  const solid = (minX, maxX, minZ, maxZ) => solids.push({ minX, maxX, minZ, maxZ });
  const wall = (minX, maxX, minZ, maxZ, color = 0x546e7a, height = 9) => {
    const mesh = box(maxX - minX, height, maxZ - minZ, color, (minX + maxX) / 2, height / 2, (minZ + maxZ) / 2);
    scene.add(mesh);
    walls.push(mesh);
    solid(minX, maxX, minZ, maxZ);
  };

  scene.add(new THREE.HemisphereLight(0xffe0b2, 0x37474f, 1.2));
  for (const [x, z, color] of [[-8, 4, 0xff9100], [8, 4, 0xff9100], [0, -6, 0xff5252], [-8, -9, 0x40c4ff]]) {
    const light = new THREE.PointLight(color, 50, 20);
    light.position.set(x, 7, z);
    scene.add(light);
  }

  // Floor (yellow-black hazard stripes around the edges) and walls
  scene.add(box(30, 0.1, 28, 0x455a64, 0, -0.05, 0));
  for (const z of [-13, 13]) for (let i = 0; i < 15; i++) scene.add(box(1, 0.02, 0.6, i % 2 ? 0x111111 : 0xfdd835, -14.5 + i * 2 + 0.5, 0.01, z));
  wall(-15.5, -15, -14, 14);
  wall(15, 15.5, -14, 14);
  wall(-15.5, 15.5, -14.5, -14);
  wall(-15.5, -1.5, 14, 14.5);
  wall(1.5, 15.5, 14, 14.5);
  const sewerDoor = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), mat(0x9e9e9e));
  sewerDoor.position.set(0, 1.6, 14.0);
  sewerDoor.rotation.y = Math.PI;
  scene.add(sewerDoor);

  // A big sign: PIZZA BOSS PIZZA FACTORY
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#ffca28';
  ctx.font = 'bold 44px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🍕 PIZZA BOSS FACTORY 🍕', 256, 62);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
  sign.position.set(0, 7, -13.9);
  scene.add(sign);

  // Conveyor belts with pizzas riding along
  const belts = [[-9, 3], [9, 3]];
  for (const [x, z] of belts) {
    scene.add(box(3, 1, 14, 0x37474f, x, 0.5, z));
    scene.add(box(2.6, 0.06, 14, 0x212121, x, 1.03, z));
    solid(x - 1.5, x + 1.5, z - 7, z + 7);
    const pizzas = Array.from({ length: 6 }, (_, i) => {
      const pizza = cylinder(0.6, 0.6, 0.08, 0xffca28, x, 1.1, z - 6 + i * 2.4);
      for (let p = 0; p < 4; p++) pizza.add(cylinder(0.12, 0.12, 0.02, 0xc62828, Math.cos(p * 1.6) * 0.3, 0.05, Math.sin(p * 1.6) * 0.3));
      scene.add(pizza);
      return pizza;
    });
    movers.push((dt) => {
      for (const pizza of pizzas) {
        pizza.position.z += dt * 1.5;
        if (pizza.position.z > z + 6.5) pizza.position.z -= 13.5;
      }
    });
  }
  // Giant ovens along the back wall
  for (const x of [-10, 10]) {
    scene.add(box(5, 5, 3, 0x795548, x, 2.5, -12.4));
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshBasicMaterial({ color: 0xff6d00 }));
    fire.position.set(x, 1.6, -10.88);
    scene.add(fire);
    movers.push((dt, time) => fire.material.color.setHSL(0.06 + Math.sin(time * 9 + x) * 0.02, 1, 0.5));
    solid(x - 2.5, x + 2.5, -13.9, -10.9);
  }

  // The DOUGH MACHINE: a big hopper over Pizza Boss's spot, with a red lever on a post
  const B = FACTORY.boss;
  scene.add(cylinder(2, 1, 2.5, 0xb0bec5, B.x, 6.5, B.z));
  scene.add(cylinder(0.4, 0.4, 1.2, 0x90a4ae, B.x, 4.7, B.z));
  scene.add(cylinder(2.1, 2.1, 0.3, 0x78909c, B.x, 7.8, B.z));
  for (const x of [-2, 2]) scene.add(box(0.3, 8, 0.3, 0x607d8b, B.x + x, 4, B.z));
  const L = FACTORY.lever;
  scene.add(box(0.8, 1.2, 0.8, 0x455a64, L.x, 0.6, L.z));
  const lever = new THREE.Group();
  lever.add(box(0.12, 1, 0.12, 0x9e9e9e, 0, 0.5, 0));
  lever.add(ball(0.18, 0xd32f2f, 0, 1.05, 0));
  lever.position.set(L.x, 1.2, L.z);
  lever.rotation.z = 0.6;
  scene.add(lever);
  solid(L.x - 0.4, L.x + 0.4, L.z - 0.4, L.z + 0.4);
  // The dough: a big blob that drops onto Pizza Boss (hidden until the lever)
  const dough = ball(1.5, 0xfff3e0, B.x, 1.2, B.z, 1, 1.1, 1);
  dough.visible = false;
  scene.add(dough);
  let pour = 0;

  // Chef Mozzarella's cage (locked; Copybara opens it)
  const C = FACTORY.cage;
  const cage = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (i === 2) continue; // (the door side: see the door bars below)
    cage.add(cylinder(0.06, 0.06, 3, 0x424242, Math.cos(a) * 1.4, 1.5, Math.sin(a) * 1.4));
  }
  cage.add(cylinder(1.5, 1.5, 0.15, 0x424242, 0, 3, 0), cylinder(1.5, 1.5, 0.15, 0x424242, 0, 0.07, 0));
  cage.position.set(C.x, 0, C.z);
  scene.add(cage);
  const cageDoor = new THREE.Group();
  for (const dx of [-0.3, 0, 0.3]) cageDoor.add(cylinder(0.06, 0.06, 3, 0x616161, dx, 1.5, 0));
  cageDoor.add(box(0.2, 0.25, 0.15, 0xffd23f, 0.3, 1.5, 0.05)); // a padlock
  cageDoor.position.set(C.x + Math.cos(0.4 * Math.PI) * 1.4, 0, C.z + Math.sin(0.4 * Math.PI) * 1.4);
  cageDoor.rotation.y = -0.4 * Math.PI + Math.PI / 2;
  scene.add(cageDoor);
  solid(C.x - 1.5, C.x + 1.5, C.z - 1.5, C.z + 1.5);

  // Pizza robots rolling back and forth (they don't hurt you, they just work)
  const robots = [[-4, 6], [4, 0], [-3, -2]].map(([x, z], i) => {
    const robot = makePizzaRobot();
    robot.position.set(x, 0, z);
    scene.add(robot);
    return { robot, x, z, i };
  });
  movers.push((dt, time) => {
    for (const r of robots) {
      r.robot.position.x = r.x + Math.sin(time * 0.6 + r.i * 2) * 3;
      r.robot.rotation.y = Math.cos(time * 0.6 + r.i * 2) > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  });

  return {
    solids,
    walls,
    doors,
    cageDoor,
    dough,
    // SuperCapybara pulls the lever: the dough pours down onto Pizza Boss
    pourDough() {
      lever.rotation.z = -0.6;
      dough.visible = true;
      dough.position.y = 7;
      dough.scale.setScalar(0.3);
      pour = 0.01;
    },
    update(dt, time) {
      for (const move of movers) move(dt, time);
      if (pour > 0 && pour < 1) {
        pour = Math.min(1, pour + dt * 1.4);
        dough.position.y = THREE.MathUtils.lerp(7, 1.2, pour);
        dough.scale.setScalar(THREE.MathUtils.lerp(0.3, 1, pour));
      }
    },
  };
}
