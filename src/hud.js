import { t } from './i18n.js';

// The HTML on top of the 3D view: clue counter, who you are (+ switch button), the "X: ..." prompt, the talk box,
// the notebook, the line-up (accuse!), the ending, and iPad controls (a joystick and X / Q buttons).

const STYLE = `
  .hd { position: fixed; inset: 0; pointer-events: none; font-family: 'Arial Black', Arial, sans-serif; color: #fff; z-index: 5;
    text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; }
  .hd button { font-family: inherit; color: #fff; text-shadow: inherit; cursor: pointer; pointer-events: auto; }
  .hd-clues { position: absolute; top: 12px; left: 14px; font-size: 22px; background: #5d4037; border: 3px solid #ffd23f; border-radius: 10px; padding: 4px 12px; }
  .hd-who { position: absolute; top: 12px; right: 14px; font-size: 18px; background: #1a3a8a; border: 3px solid #ffd23f; border-radius: 10px; padding: 4px 12px; }
  .hd-keys { position: absolute; bottom: 10px; left: 14px; font-size: 12px; color: #eceff1; }
  .hd-prompt { position: absolute; bottom: 70px; width: 100%; text-align: center; font-size: 22px; color: #ffd23f; }
  .hd-message { position: absolute; top: 22%; width: 100%; text-align: center; font-size: 30px; color: #ffd23f; }
  .hd-goal { position: absolute; top: 60px; width: 100%; text-align: center; font-size: 16px; color: #b9f6ca; }
  .hd-talk { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); width: min(720px, 92vw); background: rgba(13,27,62,0.92);
    border: 4px solid #ffd23f; border-radius: 16px; padding: 12px 18px; display: none; pointer-events: auto; text-shadow: none; }
  .hd-talk .name { color: #ffd23f; font-size: 16px; text-shadow: -1px -1px 0 #000, 1px 1px 0 #000; }
  .hd-talk .text { font-family: Arial, sans-serif; font-weight: bold; font-size: 21px; margin-top: 6px; min-height: 52px; }
  .hd-talk .next { text-align: right; font-size: 13px; color: #90caf9; }
  .hd-panel { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(640px, 92vw); background: rgba(13,27,62,0.95);
    border: 4px solid #ffd23f; border-radius: 18px; padding: 16px 22px; display: none; pointer-events: auto; text-align: center; }
  .hd-panel h1 { margin: 0 0 10px; font-size: 26px; color: #ffd23f; }
  .hd-panel .clue { text-align: left; font-size: 16px; margin: 8px 0; text-shadow: none; }
  .hd-panel .clue b { color: #ffd23f; text-shadow: -1px -1px 0 #000, 1px 1px 0 #000; }
  .hd-panel .clue span { font-family: Arial, sans-serif; font-weight: bold; }
  .hd-panel .small { font-size: 13px; color: #cfd8dc; margin-top: 10px; }
  .hd-suspects { display: flex; justify-content: center; gap: 14px; margin: 10px 0; }
  .hd-suspects button { font-size: 16px; background: #2c2c54; border: 4px solid #fff; border-radius: 14px; padding: 8px 12px; min-width: 130px; }
  .hd-suspects button .face { font-size: 56px; display: block; }
  .hd-suspects button.on { background: #c62828; border-color: #ffd23f; transform: scale(1.1); }
  .hd-result { font-size: 20px; color: #ffd23f; min-height: 30px; margin-top: 8px; }
  .hd-end { position: absolute; inset: 0; background: rgba(0,0,0,0.75); display: none; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; pointer-events: auto; gap: 18px; }
  .hd-end .big { font-size: 44px; color: #ffd23f; }
  .hd-end .mid { font-size: 28px; }
  .hd-end button { font-size: 24px; background: #1565c0; border: 4px solid #ffd23f; border-radius: 12px; padding: 8px 26px; }
  .hd-stick { position: absolute; left: 0; bottom: 0; width: 45vw; height: 55vh; pointer-events: auto; display: none; touch-action: none; }
  .hd-knob { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%; background: rgba(255,255,255,0.25);
    border: 3px solid rgba(255,255,255,0.7); display: none; }
  .hd-touch { position: absolute; border-radius: 50%; background: rgba(13,27,62,0.6); border: 3px solid #ffd23f; font-size: 26px; display: none;
    width: 84px; height: 84px; }
`;

export class Hud {
  constructor({ onSwitch, onAction, onNotebook }) {
    this.root = document.createElement('div');
    this.root.className = 'hd';
    this.root.innerHTML = `
      <style>${STYLE}</style>
      <button class="hd-clues"></button>
      <button class="hd-who"></button>
      <div class="hd-goal"></div>
      <div class="hd-keys">${t('hud.keys')}</div>
      <div class="hd-prompt"></div>
      <div class="hd-message"></div>
      <div class="hd-talk"><div class="name"></div><div class="text"></div><div class="next">${t('prompt.next')}</div></div>
      <div class="hd-panel"></div>
      <div class="hd-end"></div>
      <div class="hd-stick"><div class="hd-knob"></div></div>
      <button class="hd-touch act" style="right:24px;bottom:30px">X</button>
      <button class="hd-touch swap" style="right:124px;bottom:20px;width:64px;height:64px;font-size:20px">🔄</button>
    `;
    document.body.appendChild(this.root);
    this.el = (name) => this.root.querySelector(`.hd-${name}`);
    this.el('who').addEventListener('pointerdown', onSwitch);
    this.el('clues').addEventListener('pointerdown', onNotebook);
    this.el('talk').addEventListener('pointerdown', onAction);
    this.root.querySelector('.act').addEventListener('pointerdown', onAction);
    this.root.querySelector('.swap').addEventListener('pointerdown', onSwitch);
    this.stick = { x: 0, y: 0 };
    if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) this.showTouch();
  }

  // iPad: a joystick where the left thumb lands (up = walk, left/right = turn), and X / switch buttons
  showTouch() {
    this.el('keys').style.display = 'none';
    this.root.querySelectorAll('.hd-touch').forEach((b) => (b.style.display = 'block'));
    const area = this.el('stick');
    const knob = this.el('knob');
    area.style.display = 'block';
    let origin = null;
    area.addEventListener('pointerdown', (event) => {
      origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
      knob.style.display = 'block';
      knob.style.left = `${event.clientX}px`;
      knob.style.top = `${event.clientY - area.getBoundingClientRect().top}px`;
    });
    area.addEventListener('pointermove', (event) => {
      if (!origin || event.pointerId !== origin.id) return;
      this.stick.x = Math.max(-1, Math.min(1, (event.clientX - origin.x) / 60));
      this.stick.y = Math.max(-1, Math.min(1, (event.clientY - origin.y) / 60));
    });
    const end = () => {
      origin = null;
      this.stick.x = this.stick.y = 0;
      knob.style.display = 'none';
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);
  }

  setClues(found, total) {
    this.el('clues').style.display = total ? 'block' : 'none';
    this.el('clues').textContent = `🔍 ${t('hud.clues', { found, total })}`;
  }

  // Who you control (with 🔄 = switch when there are two of you)
  setWho(nameKey, canSwitch = true) {
    this.el('who').textContent = `${canSwitch ? '🔄 ' : ''}${t(nameKey)}`;
    const swap = this.root.querySelector('.swap');
    swap.style.visibility = canSwitch ? 'visible' : 'hidden';
  }

  setGoal(text) {
    this.el('goal').textContent = text;
  }

  prompt(text) {
    if (this.lastPrompt === text) return;
    this.lastPrompt = text;
    this.el('prompt').textContent = text;
  }

  message(text, ms = 1600) {
    this.el('message').textContent = text;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (this.el('message').textContent = ''), ms);
  }

  // The talk box. Types the text out a little at a time; returns true while it's still typing.
  say(name, text, onType) {
    const box = this.el('talk');
    box.style.display = 'block';
    box.querySelector('.name').textContent = name;
    const textEl = box.querySelector('.text');
    textEl.textContent = '';
    clearInterval(this.typing);
    let i = 0;
    this.typingDone = false;
    this.typing = setInterval(() => {
      i += 1;
      textEl.textContent = text.slice(0, i);
      if (i % 3 === 0) onType?.();
      if (i >= text.length) {
        clearInterval(this.typing);
        this.typingDone = true;
      }
    }, 22);
    this.fullText = text;
  }

  // X while it's typing shows the whole line at once. Returns true if it did.
  finishTyping() {
    if (this.typingDone) return false;
    clearInterval(this.typing);
    this.el('talk').querySelector('.text').textContent = this.fullText;
    this.typingDone = true;
    return true;
  }

  hideTalk() {
    clearInterval(this.typing);
    this.el('talk').style.display = 'none';
  }

  showNotebook(clues, found) {
    const list = clues.filter((c) => found.includes(c.id));
    const panel = this.el('panel');
    panel.innerHTML = `
      <h1>${t('notebook.title')}</h1>
      ${list.length ? list.map((c) => `<div class="clue">${c.icon} <b>${t(`clue.${c.id}.name`)}</b><br><span>${t(`clue.${c.id}.text`)}</span></div>`).join('') : `<p>${t('notebook.empty')}</p>`}
      <div class="small">${t('notebook.close')}</div>
    `;
    panel.style.display = 'block';
  }

  // The line-up: pick who did it
  showLineup(suspects, selected, title, onPick) {
    const panel = this.el('panel');
    panel.innerHTML = `
      <h1>${title}</h1>
      <div class="hd-suspects">${suspects.map((s, i) => `<button data-i="${i}" class="${i === selected ? 'on' : ''}"><span class="face">${s.icon}</span>${t(`name.${s.id}`)}</button>`).join('')}</div>
      <div class="hd-result"></div>
      <div class="small">${t('accuse.pick')}</div>
    `;
    panel.style.display = 'block';
    panel.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onPick(Number(b.dataset.i));
    }));
  }

  lineupResult(text) {
    const el = this.el('panel').querySelector('.hd-result');
    if (el) el.textContent = text;
  }

  hidePanel() {
    this.el('panel').style.display = 'none';
  }

  // A big screen over everything: [big line, line, line (light blue)...]
  showEnd(lines) {
    const end = this.el('end');
    end.innerHTML = lines.map((line, i) => `<div class="${i ? 'mid' : 'big'}"${i === 2 ? ' style="color:#90caf9"' : ''}>${line}</div>`).join('');
    end.style.display = 'flex';
  }

  hideEnd() {
    this.el('end').style.display = 'none';
  }
}
