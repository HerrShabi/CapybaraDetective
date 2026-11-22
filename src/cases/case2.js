import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { buildTown, TOWN, TOWN_SPOTS } from '../town.js';
import { buildSewer, SEWER } from '../sewer.js';
import { buildFactory, FACTORY } from '../factory.js';
import { makeChefCat, makePizzaBoss, makeDisguise, makeChefPesto, makeDannyDough, makeWaiterMouse } from '../models2.js';

// CASE 2: THE MISSING PIZZA CHEF (Ethan, 2026-11-22; GAME_DESIGN.md "Case 2"), like the Three Investigators books.
// 1. town2: you walk from the museum to CHEF MOZZARELLA'S PIZZA to celebrate... she's GONE. Only her (stick-on)
//    mustache is left. Fake suspects: Chef Pesto (sauce on his apron, an angry note) and Danny Dough (his scooter).
//    Real clues: the mustache, floury footprints to the locked back door (Copybara), the GIANT spiky footprint and the
//    smell of pizza from the manhole. The "normal customer" in a trench coat is PIZZA BOSS in disguise! Accuse him and
//    he jumps into the sewer.
// 2. sewer2: the MAZE RUN. Only SuperCapybara (he knows mazes very well); follow the smell of pizza.
// 3. factory2: Pizza Boss's secret pizza factory. SuperCapybara pulls the DOUGH MACHINE lever (Pizza Boss is stuck in
//    dough), Copybara bursts in and arrests him, then opens the cage, and Chef Mozzarella gets her mustache back.

const at = (id) => TOWN_SPOTS[id];
const TOWN_CLUES = [
  { id: 'mustache', real: true, icon: '🥸' },
  { id: 'flour', real: true, icon: '👣' },
  { id: 'giantPrint', real: true, icon: '🦶' },
  { id: 'smell', real: true, icon: '🍕' },
  { id: 'apron', real: false, icon: '🍅' },
  { id: 'scooter', real: false, icon: '🛵' },
  { id: 'note', real: false, icon: '📝' },
].map((clue) => ({ ...clue, ...at(clue.id) }));
const allRealClues = (found) => TOWN_CLUES.filter((c) => c.real).every((c) => found.includes(c.id));

// Pizza Boss's escape: from the café table, into the shop, out the back door, down the manhole
const ESCAPE = [[-5, -20], [0, -36], [0, -40], [3, -46], [4, -49], [3, -53], [TOWN.manhole.x, TOWN.manhole.z]];

export const town2 = {
  id: 'town2',
  build: (scene) => buildTown(scene),
  start: TOWN.start,
  background: 0x8fd3ff,
  fog: [45, 110],
  clues: TOWN_CLUES,
  people: [
    { id: 'waiter', build: makeWaiterMouse },
    { id: 'pesto', build: makeChefPesto },
    { id: 'danny', build: makeDannyDough },
    { id: 'customer', build: makeDisguise },
  ].map((p) => ({ ...p, x: at(p.id).x, z: at(p.id).z, face: at(p.id).face })),
  suspects: [
    { id: 'pesto', icon: '🦜' },
    { id: 'customer', icon: '🕴️' },
    { id: 'danny', icon: '🦝' },
  ],
  thief: 'customer',
  lineupTitle: 'accuse.title2',
  enoughProof: allRealClues,

  intro(game) {
    game.hud.setGoal(t('c2.goal.walk'));
  },

  // Walking into the pizza shop: she's GONE!
  triggers: [
    {
      x: 0, z: -40, r: 2.6,
      run(game) {
        game.hud.setGoal('');
        audio.play('nope');
        game.flags.metWaiter = true;
        game.say([[null, 'c2.gone', '😱'], ['waiter', 'talk.waiter.1'], ['waiter', 'talk.waiter.2'], ['waiter', 'talk.waiter.3']]);
      },
    },
  ],

  talk(game, person) {
    const has = (id) => game.found.includes(id);
    if (person === 'waiter') {
      if (!game.flags.metWaiter) {
        game.flags.metWaiter = true;
        return { lines: [['waiter', 'talk.waiter.1'], ['waiter', 'talk.waiter.2'], ['waiter', 'talk.waiter.3']] };
      }
      if (game.found.length >= 4) return { lines: [['waiter', 'talk.waiter.ready']], after: () => game.openLineup() };
      return { lines: [['waiter', 'talk.waiter.again']] };
    }
    if (person === 'pesto') {
      const lines = [['pesto', 'talk.pesto.1']];
      if (has('apron')) lines.push(['pesto', 'talk.pesto.apron']);
      if (has('note')) lines.push(['pesto', 'talk.pesto.note']);
      return { lines };
    }
    if (person === 'danny') return { lines: has('scooter') ? [['danny', 'talk.danny.1'], ['danny', 'talk.danny.scooter']] : [['danny', 'talk.danny.1']] };
    const lines = [['customer', 'talk.customer.1']];
    if (has('giantPrint')) lines.push(['customer', 'talk.customer.feet']);
    if (has('smell')) lines.push(['customer', 'talk.customer.smell']);
    return { lines };
  },

  foundClue(game) {
    if (allRealClues(game.found) && game.flags.metWaiter) game.hud.setGoal(t('c2.goal.tell'));
  },

  // IT WAS YOU! The disguise flies off: PIZZA BOSS! He runs for the manhole.
  accused(game) {
    const customer = game.removePerson('customer');
    const boss = makePizzaBoss();
    boss.position.copy(customer.model.position);
    customer.model.removeFromParent();
    game.scene.add(boss);
    audio.play('bam');
    game.hud.showEnd([`🍕 ${t('c2.reveal')} 🍕`, `"${t('c2.bossEscape')}"`, t('c2.intoSewer')]);
    game.flags.escape = { model: boss, i: 0 };
    game.solved(5500);
  },

  update(game, dt) {
    const run = game.flags.escape;
    if (!run || run.i >= ESCAPE.length) {
      if (run) run.model.position.y = Math.max(-3, run.model.position.y - dt * 4); // down the manhole
      return;
    }
    const [x, z] = ESCAPE[run.i];
    const m = run.model.position;
    const dx = x - m.x;
    const dz = z - m.z;
    const d = Math.hypot(dx, dz);
    const step = dt * 9;
    if (d <= step) run.i += 1;
    else {
      m.x += (dx / d) * step;
      m.z += (dz / d) * step;
      run.model.rotation.y = Math.atan2(dx, dz);
    }
    m.y = Math.abs(Math.sin(game.clock * 14)) * 0.3;
  },
};

// ---------- The sewer maze ----------

export const sewer2 = {
  id: 'sewer2',
  build: (scene) => buildSewer(scene),
  start: SEWER.start,
  heroes: ['detective'],
  dark: true,
  background: 0x050805,
  fog: [3, 22],
  cameraBack: 3.6,
  cameraHeight: 2.7,
  intro(game) {
    game.hud.setGoal(t('c2.goal.smell'));
    game.say([[null, 'c2.sewer1', '🕳️'], ['copybara', 'talk.copybara.wait'], ['detective', 'talk.detective.maze']]);
  },
  triggers: [
    {
      ...SEWER.exit,
      r: 2,
      run(game) {
        game.hud.setGoal('');
        audio.play('clue');
        game.say([['detective', 'talk.detective.door']], () => game.solved(300));
      },
    },
  ],
  talk: () => ({ lines: [] }),
};

// ---------- Pizza Boss's factory ----------

export const factory2 = {
  id: 'factory2',
  build(scene) {
    const world = buildFactory(scene);
    // The cage door: Copybara can open it after Pizza Boss is arrested (see arrest)
    world.cage = { id: 'cage', x: FACTORY.cage.x + 1.2, z: FACTORY.cage.z + 1.8, open: false, message: 'door.openedCage' };
    return world;
  },
  start: FACTORY.start,
  heroes: ['detective'],
  background: 0x263238,
  fog: [30, 70],
  people: [
    { id: 'boss', build: makePizzaBoss, x: FACTORY.boss.x, z: FACTORY.boss.z, face: 0 },
    { id: 'chef', build: () => makeChefCat(false), x: FACTORY.cage.x, z: FACTORY.cage.z, face: 0.6 },
  ],
  things: [
    {
      id: 'lever',
      ...FACTORY.lever,
      size: 0.4,
      who: 'detective',
      prompt: 'prompt.lever',
      use(game) {
        // SuperCapybara's trick: SPLAT, Pizza Boss is stuck in dough!
        game.world.pourDough();
        audio.play('splat');
        game.flags.stuck = true;
        const boss = game.people.find((p) => p.id === 'boss');
        boss.still = true;
        game.state = 'wait';
        game.later(900, () => {
          audio.play('siren');
          game.say([[null, 'c2.doughHit', '🍕💥'], ['boss', 'talk.boss.stuck'], [null, 'c2.copybaraIn', '🚔']], () => {
            // Copybara bursts in, and you're him now
            const cop = game.addHero('copybara', FACTORY.copybaraIn.x, FACTORY.copybaraIn.z, Math.PI);
            game.active = cop;
            game.hud.setWho('name.copybara', true);
            game.things.push(ARREST);
            game.hud.setGoal(t('c2.goal.arrest'));
          });
        });
      },
    },
  ],
  intro(game) {
    game.say([['boss', 'talk.boss.1'], ['boss', 'talk.boss.2'], ['detective', 'talk.detective.lever']]);
    game.hud.setGoal(t('c2.goal.trick'));
  },
  talk(game, person) {
    if (person === 'chef') return { lines: [['chef', game.flags.arrested ? 'talk.chef.almost' : 'talk.chef.help']] };
    if (game.flags.stuck) return { lines: [['boss', 'talk.boss.stuck']] };
    return { lines: [['boss', 'talk.boss.1']] };
  },
  // Copybara opened the cage: Chef Mozzarella is free, and she gets her mustache back
  opened(game) {
    game.flags.cageOpen = true;
    const chef = game.people.find((p) => p.id === 'chef');
    const withMustache = makeChefCat(true);
    withMustache.position.copy(chef.model.position);
    withMustache.rotation.copy(chef.model.rotation);
    chef.model.removeFromParent();
    chef.model = withMustache;
    game.scene.add(withMustache);
    game.hud.setGoal('');
    audio.play('solved');
    game.say([['chef', 'talk.chef.free'], ['chef', 'talk.chef.mustache'], ['chef', 'talk.chef.party']], () => game.solved(400));
  },
  update(game, dt) {
    const door = game.world.cageDoor;
    if (game.flags.cageOpen && door.rotation.y > -2.4) door.rotation.y -= dt * 2;
    // Pizza Boss stomps around grumpily until he's stuck
    const boss = game.people.find((p) => p.id === 'boss');
    if (boss && !game.flags.stuck) boss.model.position.y = Math.abs(Math.sin(game.clock * 3)) * 0.15;
  },
};

// Copybara arrests Pizza Boss (stuck in the dough): CLICK! Then the cage can be opened.
const ARREST = {
  id: 'arrest',
  ...FACTORY.boss,
  size: 1.2,
  who: 'copybara',
  prompt: 'prompt.arrest',
  use(game) {
    audio.play('cuffs');
    game.flags.arrested = true;
    const boss = game.people.find((p) => p.id === 'boss');
    boss.silent = true;
    const cuffs = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 16), new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.7 }));
    cuffs.position.set(0, 1.6, 0.5);
    boss.model.add(cuffs);
    game.hud.message(t('c2.gotcha'), 2400);
    // Now the cage
    const cage = game.world.cage;
    cage.solid = game.world.solids.find((s) => s.minX === FACTORY.cage.x - 1.5 && s.minZ === FACTORY.cage.z - 1.5);
    game.world.doors.push(cage);
    game.hud.setGoal(t('c2.goal.cage'));
  },
};
