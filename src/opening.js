import { t, setLanguage, getLanguage } from './i18n.js';
import { audio } from './audio.js';
import { isUnlocked } from './progress.js';

// Ethan's opening (2026-11-22): a black screen types "STEALING DU..." and right at "DU", before "DUDES" is done,
// a poster SLAMS over everything: SUPER CAPYBARA POLICE DETECTIVE. The poster is the title screen too.
// showOpening(onStart): calls onStart(caseNumber) when the player picks a case (the CASE buttons; ← → and ENTER,
// or a tap). Case 2 is locked until case 1 is solved (progress.js).

const STYLE = `
  .op { position: fixed; inset: 0; background: #000; display: flex; align-items: center; justify-content: center; z-index: 10; }
  .op-typed { font-family: 'Courier New', monospace; font-weight: bold; font-size: 9vmin; color: #f5f5f5; letter-spacing: 0.15em; }
  .op-typed .cursor { animation: op-blink 0.5s steps(1) infinite; }
  @keyframes op-blink { 50% { opacity: 0; } }
  .op-any { position: absolute; bottom: 6vmin; width: 100%; text-align: center; font-size: 4vmin; color: #555; }
  .op-poster { position: absolute; width: min(80vw, 125vh); aspect-ratio: 16 / 9; background: #ffd23f; border: 1.2vmin solid #0d1b3e;
    box-shadow: 0 0 0 0.8vmin #ffd23f, 0 3vmin 6vmin rgba(0,0,0,0.6); display: none; overflow: hidden; transform-origin: center; }
  .op-poster.slam { display: block; animation: op-slam 0.35s cubic-bezier(.2,1.6,.4,1) forwards; }
  @keyframes op-slam { from { transform: scale(3) rotate(-14deg); opacity: 0; } to { transform: scale(1) rotate(-3deg); opacity: 1; } }
  .op-shake { animation: op-shake 0.4s; }
  @keyframes op-shake { 0%,100% { transform: none; } 20% { transform: translate(-2vmin, 1vmin); } 40% { transform: translate(2vmin, -1vmin); }
    60% { transform: translate(-1vmin, -1vmin); } 80% { transform: translate(1vmin, 1vmin); } }
  .op-tape { position: absolute; left: -5%; width: 110%; height: 7%; background: repeating-linear-gradient(45deg, #111 0 2.5vmin, #ffd23f 2.5vmin 5vmin);
    display: flex; align-items: center; overflow: hidden; }
  .op-tape span { background: #ffd23f; color: #111; font-size: 2.4vmin; padding: 0 1vmin; white-space: nowrap; }
  .op-tape.top { top: 3%; transform: rotate(-2deg); }
  .op-tape.bottom { bottom: 3%; transform: rotate(2deg); }
  .op-words { position: absolute; inset: 12% 4% 14% 38%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .op-super { font-size: 7.5vmin; color: #d8343f; -webkit-text-stroke: 0.35vmin #0d1b3e; line-height: 1; }
  .op-police { font-size: 6.2vmin; color: #1a3a8a; -webkit-text-stroke: 0.25vmin #fff; line-height: 1.1; margin-top: 1vmin; }
  .op-badge { position: absolute; left: 5%; top: 16%; width: 33%; height: 70%; }
  .op-start { position: absolute; bottom: 4vmin; width: 100%; text-align: center; font-size: 3.2vmin; color: #fff; display: none;
    animation: op-blink 1.2s steps(1) infinite; }
  .op-cases { position: absolute; bottom: 9vmin; width: 100%; display: none; justify-content: center; gap: 2vmin; }
  .op-cases button { font: 2.6vmin 'Arial Black', Arial; color: #fff; background: #2c2c54; border: 0.5vmin solid #fff; border-radius: 1.4vmin;
    padding: 1vmin 2vmin; cursor: pointer; text-shadow: -2px -2px 0 #000, 2px 2px 0 #000; }
  .op-cases button.on { background: #c62828; border-color: #ffd23f; transform: scale(1.08); }
  .op-cases button.locked { opacity: 0.55; }
  .op-lang { position: absolute; top: 2vmin; right: 2vmin; display: none; gap: 1vmin; }
  .op-lang button { font: 2.2vmin 'Arial Black', Arial; color: #fff; background: #2c2c54; border: 0.4vmin solid #fff; border-radius: 1vmin; padding: 0.6vmin 1.6vmin; cursor: pointer; }
  .op-lang button.on { background: #2e7d32; border-color: #ffd23f; }
`;

// The detective's picture on the poster: a capybara with a detective hat and a big magnifying glass (SVG)
const BADGE = `
<svg viewBox="0 0 200 220" class="op-badge">
  <circle cx="100" cy="115" r="92" fill="#1a3a8a" stroke="#0d1b3e" stroke-width="6"/>
  <ellipse cx="100" cy="190" rx="70" ry="40" fill="#c8a165"/>
  <rect x="62" y="150" width="76" height="70" fill="#d8343f"/>
  <path d="M92 165 l12 0 l-8 16 l12 0 l-20 26 l6 -20 l-10 0 z" fill="#ffd23f"/>
  <rect x="45" y="70" width="110" height="88" rx="30" fill="#9b6b3d"/>
  <rect x="70" y="120" width="60" height="38" rx="12" fill="#6e4a2a"/>
  <circle cx="78" cy="102" r="7" fill="#000"/><circle cx="122" cy="102" r="7" fill="#000"/>
  <rect x="52" y="62" width="14" height="14" fill="#6e4a2a"/><rect x="134" y="62" width="14" height="14" fill="#6e4a2a"/>
  <path d="M38 72 q62 -60 124 0 z" fill="#8d6e63"/>
  <rect x="30" y="66" width="140" height="12" rx="6" fill="#6d4c41"/>
  <line x1="150" y1="160" x2="182" y2="200" stroke="#5d4037" stroke-width="12" stroke-linecap="round"/>
  <circle cx="138" cy="140" r="30" fill="rgba(200,240,255,0.55)" stroke="#ffd23f" stroke-width="9"/>
  <path d="M124 128 q8 -10 18 -6" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;

export function showOpening(onStart) {
  const root = document.createElement('div');
  root.className = 'op';
  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="op-typed"><span class="text"></span><span class="cursor">_</span></div>
    <div class="op-any">▶</div>
    <div class="op-poster">
      <div class="op-tape top"><span>${t('title.tape').repeat(8)}</span></div>
      ${BADGE}
      <div class="op-words">
        <div class="op-super">${t('title.super')}</div>
        <div class="op-police">🔍 ${t('title.police')} 🚓</div>
      </div>
      <div class="op-tape bottom"><span>${t('title.tape').repeat(8)}</span></div>
    </div>
    <div class="op-start outline">${t('title.start')}</div>
    <div class="op-cases"><button data-case="1"></button><button data-case="2"></button></div>
    <div class="op-lang"><button data-lang="en">ENGLISH</button><button data-lang="de">DEUTSCH</button></div>
  `;
  document.body.appendChild(root);
  const typed = root.querySelector('.text');
  const poster = root.querySelector('.op-poster');
  let ready = false;
  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  // Browsers only allow sound after a key press or tap, so the black screen first waits for one
  // (a small "press any key"), then types "STEALING DU" one letter at a time... and at "DU": BAM!
  let typing = false;
  const startTyping = () => {
    if (typing) return;
    typing = true;
    audio.unlock();
    root.querySelector('.op-any').remove();
    const word = t('opening.typed');
    [...word].forEach((letter, i) => later(500 + i * 170, () => {
      typed.textContent += letter;
      if (letter !== ' ') audio.play('type');
    }));
    later(500 + word.length * 170 + 120, slam);
  };

  function slam() {
    if (poster.classList.contains('slam')) return;
    timers.forEach(clearTimeout);
    root.querySelector('.op-typed').style.display = 'none';
    poster.classList.add('slam');
    root.classList.add('op-shake');
    audio.play('bam');
    setTimeout(() => {
      ready = true;
      root.querySelector('.op-start').style.display = 'block';
      root.querySelector('.op-lang').style.display = 'flex';
      root.querySelector('.op-cases').style.display = 'flex';
      showLanguage();
      showCases();
    }, 700);
  }

  // The CASE buttons (the newest case you can play is picked)
  let picked = isUnlocked(2) ? 2 : 1;
  function showCases() {
    root.querySelectorAll('[data-case]').forEach((button) => {
      const n = Number(button.dataset.case);
      button.textContent = isUnlocked(n) ? t(`title.case${n}`) : `${t(`title.case${n}`)} ${t('title.locked')}`;
      button.classList.toggle('on', n === picked);
      button.classList.toggle('locked', !isUnlocked(n));
    });
  }
  root.querySelectorAll('[data-case]').forEach((button) => button.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    if (!ready) return;
    picked = Number(button.dataset.case);
    go();
  }));

  function showLanguage() {
    root.querySelectorAll('[data-lang]').forEach((button) => button.classList.toggle('on', button.dataset.lang === getLanguage()));
  }
  root.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    setLanguage(button.dataset.lang);
    audio.play('click');
    // Redo the words in the new language
    root.querySelector('.op-super').textContent = t('title.super');
    root.querySelector('.op-police').textContent = `🔍 ${t('title.police')} 🚓`;
    root.querySelectorAll('.op-tape span').forEach((span) => (span.textContent = t('title.tape').repeat(8)));
    root.querySelector('.op-start').textContent = t('title.start');
    showLanguage();
    showCases();
  }));

  // The first key press / tap starts the typing; during the typing it skips to the poster; then it starts the game.
  const go = () => {
    if (!typing) return startTyping();
    if (!ready) return slam();
    if (!isUnlocked(picked)) {
      audio.play('nope');
      return;
    }
    cleanup();
    root.remove();
    onStart(picked);
  };
  const onKey = (event) => {
    if (ready && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD'].includes(event.code)) {
      picked = picked === 1 ? 2 : 1;
      audio.play('click');
      return showCases();
    }
    if (!typing || ['Enter', 'Space', 'KeyX', 'Escape'].includes(event.code)) go();
  };
  root.addEventListener('pointerdown', go);
  window.addEventListener('keydown', onKey);
  const cleanup = () => {
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
  };
}
