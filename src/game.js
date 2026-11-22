import * as THREE from 'three';
import { t } from './i18n.js';
import { audio } from './audio.js';
import { makeDetective, makeCopybara } from './models.js';
import { Hud } from './hud.js';

// The detective game in 3D (Three.js): one Game plays one LEVEL (the museum, the town, the sewer maze, the factory).
// You're a team (Ethan, 2026-11-22): SUPERCAPYBARA the detective finds clues (they sparkle near his magnifying glass)
// and asks questions; COPYBARA opens locked doors and arrests bad guys. Q switches who you control; the other follows.
// Keys: ← → turn, ↑ ↓ walk (or W A S D), X / E / ENTER = look / talk / open / use, Q = switch, N = notebook.
// iPad: the joystick, X and 🔄 buttons (hud.js).
//
// A level (see cases/case1.js and cases/case2.js) is an object with:
//   build(scene) → { solids, walls, doors, update(dt, time) }   the place (boxes you bump into, walls for the camera)
//   start { x, z, yaw }, heroes ['detective', 'copybara'] (or just one), background, fog [near, far], dark (flashlight)
//   clues [{ id, real, icon, x, z, y }]             things the detective looks at (texts clue.<id>.name/.text)
//   people [{ id, build, x, z, face }]              people the detective talks to (talk(game, id) says what)
//   things [{ id, x, z, who, prompt, use(game) }]   other things to use: who = 'detective' / 'copybara' / 'any'
//   triggers [{ x, z, r, run(game) }]               happen once when you walk there
//   suspects, thief, lineupTitle, enoughProof(found), accused(game)   the line-up (accuse!) and what happens next
//   intro(game), update(game, dt)                   at the start / every frame
// The game's state: 'walk', 'talk' (the talk box; X goes on), 'notebook', 'lineup', 'wait', 'end'.

const WALK_SPEED = { detective: 4.5, copybara: 6 }; // Copybara is the fast runner
const TURN_SPEED = 2.6;
const RADIUS = 0.5;
const REACH = 2.3; // how close you need to be to look at / talk to / use something
const SPARKLE_RANGE = 9; // clues sparkle when the detective is this close
const MAKERS = { detective: makeDetective, copybara: makeCopybara };

export class Game {
  // onSolved: the level is done (the next part starts); onQuit: back to the title.
  constructor(container, { level, onQuit, onSolved }) {
    this.container = container;
    this.level = level;
    this.onQuit = onQuit;
    this.onSolved = onSolved;
    this.state = 'walk';
    this.found = [];
    this.flags = {}; // anything a level wants to remember (who you've met...)
    this.keys = new Set();
    this.clock = 0;
    this.timers = [];

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    const background = level.background ?? 0x3e2723;
    this.scene.background = new THREE.Color(background);
    const [near, far] = level.fog ?? [30, 60];
    this.scene.fog = new THREE.Fog(background, near, far);
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 300);
    this.resize = () => {
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.resize();

    this.world = level.build(this.scene);
    this.clues = level.clues ?? [];
    this.things = [...(level.things ?? [])];
    this.triggers = (level.triggers ?? []).map((trigger) => ({ ...trigger }));
    this.createHeroes();
    this.createPeople();
    this.createSparkles();
    if (level.dark) {
      // A flashlight: a light that follows you around
      this.flashlight = new THREE.PointLight(0xfff3e0, 30, 18);
      this.scene.add(this.flashlight);
    }

    this.hud = new Hud({
      onSwitch: () => this.switchHero(),
      onAction: () => this.action(),
      onNotebook: () => this.toggleNotebook(),
    });
    this.hud.setClues(0, this.clues.length);
    this.hud.setWho(`name.${this.active.id}`, this.heroes.length > 1);

    this.onKeyDown = (event) => this.keyDown(event);
    this.onKeyUp = (event) => this.keys.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    audio.music(true);

    level.intro?.(this);
    this.last = performance.now();
    this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  // A timer that's cancelled if the game ends first
  later(ms, run) {
    this.timers.push(setTimeout(run, ms));
  }

  // ---------- Setup ----------

  createHeroes() {
    const start = this.level.start;
    this.heroes = [];
    (this.level.heroes ?? ['detective', 'copybara']).forEach((id, i) => this.addHero(id, start.x + (i ? 0.8 : -0.8), start.z, start.yaw));
    this.active = this.heroes[0];
    const back = new THREE.Vector3(-Math.sin(start.yaw) * 6, 4, -Math.cos(start.yaw) * 6);
    this.cameraPos = new THREE.Vector3(start.x, 0, start.z).add(back);
    this.cameraLook = new THREE.Vector3(start.x, 1, start.z);
  }

  // Adds a hero (a level can call this later: Copybara bursts into the factory)
  addHero(id, x, z, yaw) {
    const { group, legs } = MAKERS[id]();
    this.scene.add(group);
    const hero = { id, model: group, legs, pos: new THREE.Vector3(x, 0, z), yaw, walk: 0 };
    this.heroes.push(hero);
    this.placeHero(hero);
    this.hud?.setWho(`name.${this.active.id}`, this.heroes.length > 1);
    return hero;
  }

  createPeople() {
    this.people = (this.level.people ?? []).map((p) => {
      const model = p.build();
      model.position.set(p.x, 0, p.z);
      model.rotation.y = p.face ?? 0;
      this.scene.add(model);
      const solid = { minX: p.x - 0.5, maxX: p.x + 0.5, minZ: p.z - 0.5, maxZ: p.z + 0.5 };
      this.world.solids.push(solid);
      return { ...p, model, solid };
    });
  }

  // Removes a person (they ran off)
  removePerson(id) {
    const person = this.people.find((p) => p.id === id);
    if (!person) return;
    this.world.solids.splice(this.world.solids.indexOf(person.solid), 1);
    this.people = this.people.filter((p) => p !== person);
    return person;
  }

  // A sparkle over every clue (only the detective's magnifying glass can see it)
  createSparkles() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 9 : 30;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    ctx.fill();
    const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
    this.sparkles = this.clues.map((clue) => {
      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(0.7);
      sprite.position.set(clue.x, (clue.y ?? 0.2) + 0.5, clue.z);
      this.scene.add(sprite);
      return { clue, sprite, base: sprite.position.y };
    });
  }

  // ---------- Input ----------

  keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    this.keys.add(event.code);
    const code = event.code;
    if (this.state === 'lineup') {
      if (code === 'ArrowLeft' || code === 'KeyA') this.pickSuspect(this.suspect - 1);
      if (code === 'ArrowRight' || code === 'KeyD') this.pickSuspect(this.suspect + 1);
      if (['KeyX', 'KeyE', 'Enter', 'Space'].includes(code)) this.accuse();
      if (code === 'Escape') this.closePanel();
      return;
    }
    if (this.state === 'end' || this.state === 'wait') return;
    if (['KeyX', 'KeyE', 'Enter', 'Space'].includes(code)) this.action();
    if (code === 'KeyQ') this.switchHero();
    if (code === 'KeyN') this.toggleNotebook();
    if (code === 'Escape' && this.state === 'notebook') this.closePanel();
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  // ---------- Switching (Q) ----------

  switchHero(to) {
    if (this.state !== 'walk' || this.heroes.length < 2) return;
    this.active = to ? this.heroes.find((h) => h.id === to) : this.heroes.find((h) => h !== this.active);
    audio.play('switch');
    this.hud.setWho(`name.${this.active.id}`, true);
    this.hud.message(t(`switch.${this.active.id}`), 1300);
  }

  // ---------- Walking ----------

  updateWalking(dt) {
    const hero = this.active;
    const stick = this.hud.stick;
    let turn = (this.down('ArrowLeft', 'KeyA') ? 1 : 0) - (this.down('ArrowRight', 'KeyD') ? 1 : 0) - stick.x;
    let move = (this.down('ArrowUp', 'KeyW') ? 1 : 0) - (this.down('ArrowDown', 'KeyS') ? 1 : 0) - stick.y;
    turn = THREE.MathUtils.clamp(turn, -1, 1);
    move = THREE.MathUtils.clamp(move, -1, 1);
    hero.yaw += turn * TURN_SPEED * dt;
    const speed = WALK_SPEED[hero.id] * move * (move < 0 ? 0.6 : 1);
    this.moveHero(hero, Math.sin(hero.yaw) * speed * dt, Math.cos(hero.yaw) * speed * dt);
    hero.walk = Math.abs(move) > 0.1 ? hero.walk + dt * 10 : 0;

    // The partner follows a little behind
    for (const partner of this.heroes) {
      if (partner === hero) continue;
      const behind = hero.pos.clone().add(new THREE.Vector3(-Math.sin(hero.yaw) * 2.2 + Math.cos(hero.yaw) * 1.2, 0, -Math.cos(hero.yaw) * 2.2 - Math.sin(hero.yaw) * 1.2));
      const toward = behind.sub(partner.pos);
      toward.y = 0;
      const distance = toward.length();
      if (distance > 0.6) {
        const step = Math.min(distance, (distance > 6 ? 8 : 5) * dt);
        toward.normalize();
        this.moveHero(partner, toward.x * step, toward.z * step);
        partner.yaw = Math.atan2(toward.x, toward.z);
        partner.walk += dt * 10;
      } else partner.walk = 0;
      // Way too far (stuck behind something): catch up
      if (partner.pos.distanceTo(hero.pos) > 14) partner.pos.copy(hero.pos).add(new THREE.Vector3(1, 0, 1));
    }
    this.heroes.forEach((h) => this.placeHero(h));

    // Walking into a trigger spot
    for (const trigger of this.triggers) {
      if (trigger.done || Math.hypot(hero.pos.x - trigger.x, hero.pos.z - trigger.z) > trigger.r) continue;
      trigger.done = true;
      trigger.run(this);
      if (this.state !== 'walk') break;
    }
  }

  // Moves with bumping: slides along walls and things
  moveHero(hero, dx, dz) {
    hero.pos.x += dx;
    hero.pos.z += dz;
    for (const s of this.world.solids) {
      const cx = THREE.MathUtils.clamp(hero.pos.x, s.minX, s.maxX);
      const cz = THREE.MathUtils.clamp(hero.pos.z, s.minZ, s.maxZ);
      const ox = hero.pos.x - cx;
      const oz = hero.pos.z - cz;
      const d = Math.hypot(ox, oz);
      if (d >= RADIUS) continue;
      if (d > 0.0001) {
        hero.pos.x = cx + (ox / d) * RADIUS;
        hero.pos.z = cz + (oz / d) * RADIUS;
      } else {
        // Inside the box: out the nearest side
        const sides = [hero.pos.x - s.minX, s.maxX - hero.pos.x, hero.pos.z - s.minZ, s.maxZ - hero.pos.z];
        const i = sides.indexOf(Math.min(...sides));
        if (i === 0) hero.pos.x = s.minX - RADIUS;
        if (i === 1) hero.pos.x = s.maxX + RADIUS;
        if (i === 2) hero.pos.z = s.minZ - RADIUS;
        if (i === 3) hero.pos.z = s.maxZ + RADIUS;
      }
    }
  }

  placeHero(hero) {
    hero.model.position.copy(hero.pos);
    hero.model.position.y = Math.abs(Math.sin(hero.walk)) * 0.06;
    hero.model.rotation.y = hero.yaw;
    hero.legs.forEach((leg, i) => (leg.rotation.x = Math.sin(hero.walk + (i % 2 ? Math.PI : 0)) * 0.5));
  }

  // The camera behind you; it moves in front of walls instead of going through them
  updateCamera(dt) {
    const hero = this.active;
    const forward = new THREE.Vector3(Math.sin(hero.yaw), 0, Math.cos(hero.yaw));
    const head = hero.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
    const height = this.level.cameraHeight ?? 3.6;
    const want = hero.pos.clone().addScaledVector(forward, -(this.level.cameraBack ?? 6)).add(new THREE.Vector3(0, height, 0));
    const ray = new THREE.Raycaster(head, want.clone().sub(head).normalize(), 0, want.distanceTo(head));
    const hit = ray.intersectObjects(this.world.walls, false)[0];
    if (hit) want.copy(hit.point).addScaledVector(ray.ray.direction, -0.4);
    const k = 1 - Math.exp(-8 * dt);
    this.cameraPos.lerp(want, k);
    this.cameraLook.lerp(hero.pos.clone().addScaledVector(forward, 2).add(new THREE.Vector3(0, 1, 0)), k);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraLook);
  }

  // ---------- What's in reach ----------

  // The nearest thing you can do something with: { kind: 'clue' | 'person' | 'door' | 'thing', ... }
  nearby() {
    const p = this.active.pos;
    const near = [];
    for (const clue of this.clues) if (!this.found.includes(clue.id)) near.push({ kind: 'clue', id: clue.id, d: Math.hypot(p.x - clue.x, p.z - clue.z) });
    for (const person of this.people) if (!person.silent) near.push({ kind: 'person', id: person.id, d: Math.hypot(p.x - person.x, p.z - person.z) - 0.5 });
    for (const door of this.world.doors ?? []) if (!door.open) near.push({ kind: 'door', id: door.id, door, d: Math.hypot(p.x - door.x, p.z - door.z) });
    for (const thing of this.things) if (!thing.done) near.push({ kind: 'thing', id: thing.id, thing, d: Math.hypot(p.x - thing.x, p.z - thing.z) - (thing.size ?? 0) });
    return near.filter((n) => n.d < REACH).sort((a, b) => a.d - b.d)[0] ?? null;
  }

  // Can the hero you control do it?
  canDo(near) {
    const id = this.active.id;
    if (near.kind === 'clue' || near.kind === 'person') return id === 'detective';
    if (near.kind === 'door') return id === 'copybara';
    return near.thing.who === 'any' || near.thing.who === id;
  }

  updatePrompt() {
    const near = this.nearby();
    let text = '';
    if (near) {
      const can = this.canDo(near);
      if (near.kind === 'clue') text = can ? t('prompt.clue') : t('prompt.clueNeedsDetective');
      if (near.kind === 'person') text = can ? t('prompt.talk') : t('prompt.talkNeedsDetective');
      if (near.kind === 'door') text = can ? t('prompt.door') : t('prompt.doorNeedsCop');
      if (near.kind === 'thing') text = can ? t(near.thing.prompt) : t(near.thing.who === 'copybara' ? 'prompt.needsCop' : 'prompt.needsDetective');
    }
    this.hud.prompt(text);
  }

  // X: look / talk / open / use (or go on in the talk box, or close the notebook)
  action() {
    audio.unlock();
    if (this.state === 'talk') return this.nextLine();
    if (this.state === 'notebook') return this.closePanel();
    if (this.state === 'lineup') return this.accuse();
    if (this.state !== 'walk') return;
    const near = this.nearby();
    if (!near) return;
    if (!this.canDo(near)) return audio.play('nope');
    if (near.kind === 'clue') this.findClue(near.id);
    else if (near.kind === 'person') this.talkTo(near.id);
    else if (near.kind === 'door') this.unlock(near.door);
    else {
      if (!near.thing.again) near.thing.done = true;
      near.thing.use(this);
    }
  }

  findClue(id) {
    this.found.push(id);
    audio.play('clue');
    this.hud.setClues(this.found.length, this.clues.length);
    const clue = this.clues.find((c) => c.id === id);
    this.startTalk([[null, `clue.${id}.text`, `${clue.icon} ${t(`clue.${id}.name`)}`]]);
    this.level.foundClue?.(this, id);
  }

  unlock(door) {
    door.open = true;
    this.world.solids.splice(this.world.solids.indexOf(door.solid), 1);
    audio.play('door');
    this.hud.message(t(door.message ?? 'door.opened'), 2000);
    this.level.opened?.(this, door);
  }

  // ---------- Talking ----------

  talkTo(id) {
    const person = this.people.find((p) => p.id === id);
    // They turn to look at you
    if (person) person.model.rotation.y = Math.atan2(this.active.pos.x - person.x, this.active.pos.z - person.z);
    const { lines, after } = this.level.talk(this, id);
    this.say(lines, after);
  }

  // lines: [[speaker id or null, i18n key, optional title], ...]; after(): when the talk is over
  say(lines, after = null) {
    this.afterTalk = after;
    this.state = 'talk';
    this.lines = lines;
    this.lineIndex = -1;
    this.hud.prompt('');
    this.nextLine();
  }

  startTalk(lines) {
    this.say(lines);
  }

  nextLine() {
    if (this.lineIndex >= 0 && this.hud.finishTyping()) return;
    this.lineIndex += 1;
    if (this.lineIndex >= this.lines.length) {
      this.hud.hideTalk();
      this.state = 'walk';
      const after = this.afterTalk;
      this.afterTalk = null;
      after?.();
      return;
    }
    const [speaker, key, title] = this.lines[this.lineIndex];
    this.hud.say(title ?? t(`name.${speaker}`), t(key), () => audio.play('talk'));
  }

  // ---------- Notebook, line-up ----------

  toggleNotebook() {
    if (this.state === 'notebook') return this.closePanel();
    if (this.state !== 'walk' || !this.clues.length) return;
    this.state = 'notebook';
    audio.play('click');
    this.hud.showNotebook(this.clues, this.found);
  }

  closePanel() {
    this.hud.hidePanel();
    this.state = 'walk';
  }

  openLineup() {
    this.state = 'lineup';
    this.suspect = 0; // (not on the right one: that would give it away)
    this.showLineup();
  }

  showLineup() {
    this.hud.showLineup(this.level.suspects, this.suspect, t(this.level.lineupTitle), (i) => (i === this.suspect ? this.accuse() : this.pickSuspect(i)));
  }

  pickSuspect(i) {
    this.suspect = (i + this.level.suspects.length) % this.level.suspects.length;
    audio.play('click');
    this.showLineup();
  }

  // "IT WAS YOU!" Wrong = not them; the right one without enough clues = not enough proof.
  accuse() {
    if (this.state !== 'lineup') return;
    const who = this.level.suspects[this.suspect].id;
    if (who !== this.level.thief) {
      audio.play('nope');
      this.hud.lineupResult(t('accuse.wrong'));
      return this.closeLineupSoon();
    }
    if (!this.level.enoughProof(this.found)) {
      audio.play('nope');
      this.hud.lineupResult(t('accuse.noProof'));
      return this.closeLineupSoon();
    }
    this.state = 'end';
    this.hud.hidePanel();
    this.hud.prompt('');
    this.level.accused(this);
  }

  closeLineupSoon() {
    this.state = 'wait';
    this.later(2200, () => {
      this.hud.hidePanel();
      this.state = 'walk';
    });
  }

  // The level is done: on to the next part
  solved(delay = 0) {
    this.state = 'end';
    this.hud.prompt('');
    this.later(delay, () => this.quit(this.onSolved));
  }

  // ---------- Every frame ----------

  loop(time) {
    const dt = Math.max(0, Math.min(0.05, (time - this.last) / 1000));
    this.last = time;
    this.clock += dt;
    if (this.state === 'walk') {
      this.updateWalking(dt);
      this.updatePrompt();
    }
    // Clues sparkle near the detective's magnifying glass
    const detective = this.heroes.find((h) => h.id === 'detective');
    for (const s of this.sparkles) {
      const close = detective && Math.hypot(detective.pos.x - s.clue.x, detective.pos.z - s.clue.z) < SPARKLE_RANGE;
      s.sprite.visible = !this.found.includes(s.clue.id) && this.active === detective && close;
      s.sprite.position.y = s.base + Math.sin(this.clock * 3 + s.clue.x) * 0.15;
      s.sprite.material.rotation = this.clock;
    }
    // The people bob a little
    for (const person of this.people) if (!person.still) person.model.position.y = Math.abs(Math.sin(this.clock * 2 + person.x)) * 0.05;
    if (this.flashlight) this.flashlight.position.copy(this.active.pos).add(new THREE.Vector3(Math.sin(this.active.yaw) * 3, 2.6, Math.cos(this.active.yaw) * 3));
    this.world.update?.(dt, this.clock);
    this.level.update?.(this, dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  // Takes everything down, then next() (the title, or the next part)
  quit(next = this.onQuit) {
    if (this.gone) return;
    this.gone = true;
    cancelAnimationFrame(this.frame);
    this.timers.forEach(clearTimeout);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    audio.music(false);
    this.hud.root.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    next();
  }
}
