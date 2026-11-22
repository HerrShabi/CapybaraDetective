import { showOpening } from './opening.js';
import { Game } from './game.js';
import { Chase } from './chase.js';
import { Party } from './party.js';
import { markSolved } from './progress.js';
import { case1 } from './cases/case1.js';
import { town2, sewer2, factory2 } from './cases/case2.js';

// SUPER CAPYBARA: POLICE DETECTIVE (Ethan's 4th game, 2026-11-22).
// The opening (STEALING DU— BAM! poster) is the title screen, with a button per case.
// Case 1: the museum (Game) → the police car chase and the swim (Chase) → the medal party (Party).
// Case 2: the town (Game) → the sewer maze (Game) → Pizza Boss's factory (Game) → the pizza party (Party).
// Each part takes itself down and starts the next; the end goes back to the title.

const container = document.getElementById('game');
const dev = (thing) => {
  if (import.meta.env.DEV) window.game = thing;
  return thing;
};

function title() {
  showOpening((n) => (n === 2 ? case2() : case1Start()));
}

// Plays the levels one after another, then `done`
function play(levels, done) {
  const [level, ...rest] = levels;
  if (!level) return done();
  dev(new Game(container, { level, onQuit: title, onSolved: () => play(rest, done) }));
}

function case1Start() {
  play([case1], () =>
    dev(new Chase(container, {
      onDone: () => {
        markSolved(1);
        dev(new Party(container, { which: 1, onDone: title }));
      },
    })),
  );
}

function case2() {
  play([town2, sewer2, factory2], () => {
    markSolved(2);
    dev(new Party(container, { which: 2, onDone: title }));
  });
}

if (import.meta.env.DEV) window.detective = { case1: case1Start, case2, title };
title();

// Offline play: the built game registers the service worker that vite.config.js writes (not while developing).
// When a new version has been published, the new service worker takes over and the game reloads once, so
// phones and tablets show the update right away. It also checks for a new version whenever it comes back to the front.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOldVersion = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadOldVersion || reloading) return; // the very first install: nothing to refresh
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    });
  });
}
