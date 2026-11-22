// Every sound is made with the Web Audio API (no sound files), like SuperCapybara.
// audio.play('<effect>'), audio.music(true/false). Sound only starts after the first key press or tap.

const NOTES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const freq = (note) => {
  const [, name, octave] = note.match(/^([A-G][b#]?)(\d)$/);
  return 440 * 2 ** ((NOTES[name] + (Number(octave) + 1) * 12 - 69) / 12);
};

// The sneaky detective song: a walking bass and a little tiptoe melody. '.' = rest.
const SONG = {
  bpm: 112,
  bass: 'C2 . G2 . Bb2 . A2 Ab2 G2 . C2 . Eb2 . F2 Gb2 G2 . . . F2 . Eb2 . C2 . Bb1 . C2 . . .',
  lead: '. . . . G4 . . Bb4 . . . . . . . . . . . . Eb5 . D5 . C5 . . . . . . .',
};

class Audio {
  unlock() {
    if (this.ctx) return this.ctx.resume?.();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.6;
    this.out.connect(this.ctx.destination);
    if (this.wantMusic) this.music(true);
  }

  tone({ wave = 'square', from, to = from, delay = 0, length = 0.15, volume = 0.1 }) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0005, start + length);
    osc.connect(gain).connect(this.out);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  noise({ delay = 0, length = 0.1, volume = 0.2, filter = 'lowpass', frequency = 1000 }) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delay;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * length), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const shape = this.ctx.createBiquadFilter();
    shape.type = filter;
    shape.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0005, start + length);
    source.connect(shape).connect(gain).connect(this.out);
    source.start(start);
  }

  play(name) {
    switch (name) {
      case 'type': // a typewriter key
        this.noise({ length: 0.04, volume: 0.35, filter: 'highpass', frequency: 2500 });
        this.tone({ wave: 'square', from: 1800, length: 0.02, volume: 0.03 });
        break;
      case 'bam': // the poster slams onto the screen
        this.tone({ wave: 'sine', from: 160, to: 35, length: 0.6, volume: 0.6 });
        this.noise({ length: 0.5, volume: 0.6, frequency: 600 });
        this.tone({ wave: 'sawtooth', from: 220, to: 110, length: 0.5, volume: 0.08, delay: 0.05 });
        ['C4', 'Eb4', 'G4', 'C5'].forEach((n, i) => this.tone({ wave: 'square', from: freq(n), length: 0.35, volume: 0.06, delay: 0.25 + i * 0.09 }));
        break;
      case 'click':
        this.tone({ from: 880, length: 0.05, volume: 0.07 });
        break;
      case 'clue': // found a clue: a twinkly "aha!"
        ['E5', 'G5', 'C6', 'E6'].forEach((n, i) => this.tone({ wave: 'triangle', from: freq(n), length: 0.25, volume: 0.12, delay: i * 0.07 }));
        break;
      case 'talk': // one little blip per few letters
        this.tone({ wave: 'square', from: 300 + Math.random() * 200, length: 0.05, volume: 0.04 });
        break;
      case 'door':
        this.tone({ wave: 'triangle', from: 1200, to: 1500, length: 0.08, volume: 0.1 });
        this.tone({ wave: 'triangle', from: 1500, to: 1800, length: 0.08, volume: 0.1, delay: 0.1 });
        this.noise({ length: 0.6, volume: 0.15, frequency: 400, delay: 0.25 });
        break;
      case 'switch':
        this.tone({ wave: 'sine', from: 300, to: 900, length: 0.2, volume: 0.15 });
        break;
      case 'nope':
        this.tone({ wave: 'sawtooth', from: 180, to: 120, length: 0.35, volume: 0.1 });
        break;
      case 'solved':
        ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'].forEach((n, i) => this.tone({ wave: 'square', from: freq(n), length: 0.2, volume: 0.09, delay: i * 0.11 }));
        break;
      case 'crash': // bumping into something
        this.noise({ length: 0.35, volume: 0.5, frequency: 900 });
        this.tone({ wave: 'square', from: 140, to: 60, length: 0.25, volume: 0.12 });
        break;
      case 'splat': // a fruit stand: SPLAT
        this.noise({ length: 0.25, volume: 0.45, frequency: 500 });
        this.tone({ wave: 'sine', from: 400, to: 120, length: 0.2, volume: 0.2 });
        break;
      case 'baby': // Baby Capybara babbling on the radio
        for (let i = 0; i < 4; i++) this.tone({ wave: 'triangle', from: 600 + Math.random() * 400, to: 500 + Math.random() * 300, length: 0.09, volume: 0.09, delay: i * 0.11 });
        this.noise({ length: 0.5, volume: 0.04, filter: 'bandpass', frequency: 2000 });
        break;
      case 'radio': // the radio crackles on
        this.noise({ length: 0.25, volume: 0.15, filter: 'bandpass', frequency: 1800 });
        this.tone({ wave: 'square', from: 1200, length: 0.05, volume: 0.05, delay: 0.25 });
        break;
      case 'splash':
        this.noise({ length: 0.6, volume: 0.4, frequency: 700 });
        this.noise({ length: 0.3, volume: 0.2, filter: 'highpass', frequency: 3000, delay: 0.1 });
        break;
      case 'paddle':
        this.noise({ length: 0.15, volume: 0.08, frequency: 800 });
        break;
      case 'putt': // the boat running out of gas
        for (let i = 0; i < 5; i++) this.tone({ wave: 'sawtooth', from: 70, to: 50, length: 0.1, volume: 0.15 - i * 0.025, delay: i * 0.35 + i * i * 0.05 });
        break;
      case 'cuffs': // CLICK!
        this.tone({ wave: 'square', from: 2400, length: 0.03, volume: 0.15 });
        this.tone({ wave: 'square', from: 1800, length: 0.03, volume: 0.15, delay: 0.08 });
        this.noise({ length: 0.08, volume: 0.2, filter: 'highpass', frequency: 4000, delay: 0.08 });
        break;
      case 'bars': // jail bars slam down
        this.noise({ length: 0.4, volume: 0.4, frequency: 300 });
        this.tone({ wave: 'square', from: 220, to: 200, length: 0.4, volume: 0.08 });
        break;
      case 'cheer':
        for (let i = 0; i < 6; i++) this.noise({ length: 0.3, volume: 0.12, filter: 'bandpass', frequency: 1200 + i * 300, delay: i * 0.08 });
        this.play('solved');
        break;
      case 'siren':
        for (let i = 0; i < 4; i++) this.tone({ wave: 'sine', from: i % 2 ? 660 : 880, length: 0.3, volume: 0.1, delay: i * 0.3 });
        break;
    }
  }

  // The detective song, looping
  music(on) {
    this.wantMusic = on;
    clearInterval(this.songTimer);
    this.songTimer = null;
    if (!on || !this.ctx) return;
    const bass = SONG.bass.split(' ');
    const lead = SONG.lead.split(' ');
    const step = 60 / SONG.bpm / 2;
    let i = 0;
    let next = this.ctx.currentTime + 0.1;
    this.songTimer = setInterval(() => {
      while (next < this.ctx.currentTime + 0.2) {
        const delay = next - this.ctx.currentTime;
        const b = bass[i % bass.length];
        const l = lead[i % lead.length];
        if (b !== '.') this.tone({ wave: 'triangle', from: freq(b), length: step * 0.9, volume: 0.22, delay });
        if (l !== '.') this.tone({ wave: 'square', from: freq(l), length: step * 1.5, volume: 0.035, delay });
        if (i % 2 === 0) this.noise({ length: 0.03, volume: 0.05, filter: 'highpass', frequency: 7000, delay });
        next += step;
        i++;
      }
    }, 40);
  }
}

export const audio = new Audio();
