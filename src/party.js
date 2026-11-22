import * as THREE from 'three';
import { t } from './i18n.js';
import { audio } from './audio.js';
import { box, ball, mat, makeDetective, makeCopybara, makeOwl, makeMonkey, makeSheep } from './models.js';
import { buildMuseum } from './museum.js';
import { buildTown } from './town.js';
import { makeChefCat, makeWaiterMouse, makeChefPesto, makeDannyDough } from './models2.js';

// The end of a case. Case 1 (Ethan, Q18): back at the museum, the Golden Bolt is back in a brand-new glass case,
// everybody cheers, the owl gives SuperCapybara and Copybara detective medals 🏅, confetti... and then Baby Capybara
// on the police radio: "Detectives! A NEW CASE!". Case 2: a pizza party at Chef Mozzarella's (mustache back on).
// Then THE END → back to the title.

const PARTIES = {
  1: {
    build: (scene) => buildMuseum(scene, { solved: true }),
    heroes: [[-1.4, 1.8, 0.2], [1.4, 1.8, -0.2]],
    crowd: [[makeOwl, 0, 3.6, Math.PI], [makeMonkey, -3.4, 0.4, 1.2], [makeSheep, 3.4, 0.4, -1.2]],
    center: [0, 1.3, 0],
    eye: [0, 3.2, 8.5],
    bolt: true,
    title: 'party.solved',
    thanks: 'party.thanks',
    radio: 'radio.newCase',
    end: 'party.theEnd',
  },
  2: {
    build: (scene) => buildTown(scene, { solved: true }),
    heroes: [[-1.3, -41.8, 0], [1.3, -41.8, 0]],
    crowd: [[() => makeChefCat(true), 0, -44.8, 0], [makeWaiterMouse, -2.6, -44, 0.3], [makeChefPesto, 2.8, -44.6, -0.3], [makeDannyDough, -4.2, -45.5, 0.5]],
    center: [0, 1.2, -44],
    eye: [0, 3, -38.6],
    bolt: false,
    title: 'party.solved2',
    thanks: 'party.thanks2',
    radio: 'radio.soon',
    end: 'party.theEnd2',
  },
};

function goldenBolt() {
  const shape = new THREE.Shape();
  shape.moveTo(0.1, 0.55);
  shape.lineTo(-0.25, -0.05);
  shape.lineTo(0.05, -0.05);
  shape.lineTo(-0.15, -0.6);
  shape.lineTo(0.3, 0.1);
  shape.lineTo(0, 0.1);
  shape.lineTo(0.25, 0.55);
  const bolt = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa000, emissiveIntensity: 0.5, metalness: 0.6 }));
  return bolt;
}

function medal() {
  const g = new THREE.Group();
  const ribbon = box(0.12, 0.3, 0.02, 0xd32f2f, 0, 0.15, 0);
  g.add(ribbon);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16), mat(0xffd23f, { metalness: 0.7, roughness: 0.3 }));
  disk.rotation.x = Math.PI / 2;
  g.add(disk);
  return g;
}

export class Party {
  // which: the case (1 or 2)
  constructor(container, { which = 1, onDone }) {
    this.onDone = onDone;
    const party = (this.party = PARTIES[which]);
    this.time = 0;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3e2723);
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 200);
    this.resize = () => {
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.resize();
    this.place = party.build(this.scene);

    // The Golden Bolt is back, in a new case (all 4 glass sides)
    if (party.bolt) {
      this.bolt = goldenBolt();
      this.bolt.position.set(-0.05, 1.9, -2.07);
      this.scene.add(this.bolt);
      const glass = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.3 });
      this.scene.add(box(1.6, 1.3, 0.04, glass, 0, 1.72, -1.2));
    }

    // Everybody around it; the heroes get medals
    const place = (model, x, z, yaw) => {
      model.position.set(x, 0, z);
      model.rotation.y = yaw;
      this.scene.add(model);
      return model;
    };
    this.heroes = [place(makeDetective().group, ...party.heroes[0]), place(makeCopybara().group, ...party.heroes[1])];
    for (const hero of this.heroes) {
      const m = medal();
      m.position.set(0, 0.75, 0.78);
      hero.add(m);
    }
    this.crowd = party.crowd.map(([make, x, z, yaw]) => place(make(), x, z, yaw));

    // Confetti
    const colors = [0xff5252, 0xffd23f, 0x40c4ff, 0x69f0ae, 0xe040fb].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    const piece = new THREE.PlaneGeometry(0.15, 0.25);
    this.confetti = Array.from({ length: 160 }, (_, i) => {
      const mesh = new THREE.Mesh(piece, colors[i % colors.length]);
      mesh.position.set(party.center[0] + (Math.random() - 0.5) * 12, Math.random() * 7, party.center[2] + (Math.random() - 0.5) * 8 + 1);
      mesh.userData.spin = Math.random() * 5;
      this.scene.add(mesh);
      return mesh;
    });

    // The words on top
    const root = (this.hud = document.createElement('div'));
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:"Arial Black",Arial,sans-serif;color:#fff;z-index:5;text-align:center;text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000;';
    root.innerHTML = `
      <div style="position:absolute;top:4%;width:100%;font-size:44px;color:#ffd23f">${t(party.title)}</div>
      <div class="pt-thanks" style="position:absolute;top:16%;left:10%;width:80%;font-size:20px"></div>
      <div class="pt-radio" style="position:absolute;bottom:14px;left:14px;width:min(440px,46vw);background:rgba(33,33,33,0.92);border:3px solid #ffd23f;border-radius:12px;padding:10px 14px;display:none;text-shadow:none">
        <div style="font-size:12px;color:#ffd23f">${t('radio.name')}</div><div style="font:bold 20px Arial,sans-serif;margin-top:4px">${t(party.radio)}</div></div>
      <div class="pt-end" style="position:absolute;bottom:14px;right:14px;display:none;text-align:right">
        <div style="font-size:26px;margin-bottom:10px">${t(party.end)}</div>
        <button style="pointer-events:auto;font:22px 'Arial Black';color:#fff;background:#1565c0;border:4px solid #ffd23f;border-radius:12px;padding:8px 24px;cursor:pointer">⬅ ${t('party.back')}</button>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('button').addEventListener('pointerdown', () => this.finish());
    this.timers = [
      setTimeout(() => (root.querySelector('.pt-thanks').textContent = t(party.thanks)), 1200),
      setTimeout(() => {
        audio.play('radio');
        setTimeout(() => audio.play('baby'), 250);
        root.querySelector('.pt-radio').style.display = 'block';
      }, 5500),
      setTimeout(() => {
        root.querySelector('.pt-end').style.display = 'block';
        this.ready = true;
      }, 8000),
    ];
    this.onKeyDown = (event) => {
      if (this.ready && ['Enter', 'Space', 'KeyX', 'Escape'].includes(event.code)) this.finish();
    };
    window.addEventListener('keydown', this.onKeyDown);
    audio.music(false);
    audio.play('cheer');

    this.last = performance.now();
    this.frame = requestAnimationFrame((now) => this.loop(now));
  }

  loop(now) {
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    const time = this.time;
    if (this.bolt) this.bolt.rotation.y = time * 1.5;
    // The heroes hop for joy, the crowd cheers
    this.heroes.forEach((hero, i) => (hero.position.y = Math.abs(Math.sin(time * 5 + i)) * 0.5));
    this.crowd.forEach((guest, i) => (guest.position.y = Math.abs(Math.sin(time * 4 + i * 2)) * 0.25));
    for (const c of this.confetti) {
      c.position.y -= dt * 2;
      c.position.x += Math.sin(time * 2 + c.userData.spin) * dt;
      c.rotation.x += dt * c.userData.spin;
      c.rotation.y += dt * 2;
      if (c.position.y < 0) c.position.y = 7;
    }
    // The camera slowly swings around the heroes
    const [ex, ey, ez] = this.party.eye;
    this.camera.position.set(ex + Math.sin(time * 0.25) * 2.5, ey, ez);
    this.camera.lookAt(...this.party.center);
    this.place.update(dt, time);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  finish() {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.frame);
    this.timers.forEach(clearTimeout);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.resize);
    this.hud.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.onDone();
  }
}
