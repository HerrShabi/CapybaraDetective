import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { makeGuard, makeMonkey, makeSheep, makeOwl } from '../models.js';
import { buildMuseum, SPOTS, START } from '../museum.js';

// CASE 1: THE GOLDEN BOLT (Ethan, 2026-11-22). The Golden Bolt was stolen from the city museum.
// The thief is the GUARD (the twist!). Real clues point to him; fake clues trick you.
// Texts are in i18n.js: clue.<id>.name/.text, talk.<person>.<line>. After the accusation: the chase (chase.js).

const CLUES = [
  { id: 'footprints', real: true, icon: '👣' },
  { id: 'uniform', real: true, icon: '🧵' },
  { id: 'video', real: true, icon: '📹' },
  { id: 'banana', real: false, icon: '🍌' },
  { id: 'wool', real: false, icon: '🐑' },
].map((clue) => ({ ...clue, ...SPOTS[clue.id] }));

const allRealClues = (found) => CLUES.filter((c) => c.real).every((c) => found.includes(c.id));

export const case1 = {
  id: 1,
  build: (scene) => buildMuseum(scene),
  start: START,
  clues: CLUES,
  people: [
    { id: 'director', build: makeOwl },
    { id: 'guard', build: makeGuard },
    { id: 'monkey', build: makeMonkey },
    { id: 'sheep', build: makeSheep },
  ].map((p) => ({ ...p, x: SPOTS[p.id].x, z: SPOTS[p.id].z, face: SPOTS[p.id].face })),
  suspects: [
    { id: 'monkey', icon: '🐒' },
    { id: 'guard', icon: '🐶' },
    { id: 'sheep', icon: '🐑' },
  ],
  thief: 'guard',
  lineupTitle: 'accuse.title',
  enoughProof: allRealClues,

  // The director talks to you first
  intro: (game) => game.talkTo('director'),

  // What each person says, depending on the clues you've found
  talk(game, person) {
    const has = (id) => game.found.includes(id);
    if (person === 'director') {
      if (!game.flags.metDirector) {
        game.flags.metDirector = true;
        return { lines: [['director', 'talk.director.1'], ['director', 'talk.director.2'], ['director', 'talk.director.3']] };
      }
      if (game.found.length >= 3) return { lines: [['director', 'talk.director.ready']], after: () => game.openLineup() };
      return { lines: [['director', 'talk.director.again']] };
    }
    if (person === 'guard') {
      const lines = [['guard', 'talk.guard.1'], ['guard', 'talk.guard.2']];
      if (has('uniform')) lines.push(['guard', 'talk.guard.uniform']);
      if (has('video')) lines.push(['guard', 'talk.guard.video']);
      return { lines };
    }
    if (person === 'monkey') return { lines: has('banana') ? [['monkey', 'talk.monkey.1'], ['monkey', 'talk.monkey.banana']] : [['monkey', 'talk.monkey.1']] };
    return { lines: has('wool') ? [['sheep', 'talk.sheep.1'], ['sheep', 'talk.sheep.wool']] : [['sheep', 'talk.sheep.1']] };
  },

  foundClue(game) {
    if (allRealClues(game.found) && game.flags.metDirector) game.hud.setGoal(t('hud.goTell'));
  },

  // You got him! He runs off... and the chase is on.
  accused(game) {
    audio.play('solved');
    game.later(900, () => audio.play('siren'));
    game.flags.running = game.removePerson('guard');
    game.hud.showEnd([`🚨 ${t('accuse.right')} 🚨`, `🐶 ${t('accuse.confess')}`, t('accuse.chase')]);
    game.solved(3500);
  },

  update(game, dt) {
    const g = game.flags.running?.model;
    if (!g) return;
    g.rotation.y = Math.PI;
    g.position.z -= dt * 6;
    g.position.y = Math.abs(Math.sin(game.clock * 14)) * 0.2;
  },
};
