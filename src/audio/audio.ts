/**
 * Sound: synthesised effects and calm generative music, built entirely with
 * the Web Audio API (no sound files to download or license).
 */

let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode, reverb: ConvolverNode, reverbSend: GainNode;
let sfxVolume = 0.8, musicVolume = 0.45;
let hapticsOn = true;

function ac(): AudioContext | null {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return ctx; }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
  } catch { return null; }
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVolume; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = musicVolume; musicBus.connect(comp);
  reverb = ctx.createConvolver(); reverb.buffer = impulse(ctx, 3.2, 2.4); reverb.connect(comp);
  reverbSend = ctx.createGain(); reverbSend.gain.value = 0.35; reverbSend.connect(reverb);
  return ctx;
}

/** Synthetic room reverb: decaying stereo noise. */
function impulse(c: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** A short filtered noise burst: the sound of cardboard. */
function tick(freq: number, q: number, dur: number, vol: number, when = 0, send = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const src = c.createBufferSource(); src.buffer = noise(c);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(sfxBus);
  if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s).connect(reverbSend); }
  src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.02);
}

function tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0, send = 0.4, bus?: GainNode) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus ?? sfxBus);
  if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s).connect(reverbSend); }
  o.start(t); o.stop(t + dur + 0.05);
}

function vibrate(ms: number | number[]) {
  if (!hapticsOn) return;
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

/** Notes of a major pentatonic scale, for pleasant rising feedback. */
const PENTA = [0, 2, 4, 7, 9];
const note = (base: number, step: number) => base * Math.pow(2, (PENTA[step % 5] + 12 * Math.floor(step / 5)) / 12);

let snapStreak = 0, lastSnap = 0;

export const sfx = {
  pick() { tick(2600, 1.2, 0.035, 0.18); tick(5200, 2, 0.02, 0.06, 0.004); },
  drop() { tick(900, 0.9, 0.06, 0.16); },
  /** Pieces joined. Repeated joins climb a little scale. */
  snap(joined = 1) {
    const now = performance.now();
    snapStreak = now - lastSnap < 4000 ? Math.min(snapStreak + 1, 9) : 0;
    lastSnap = now;
    tick(1800, 1.5, 0.05, 0.42);
    tick(420, 1, 0.09, 0.3, 0.003);
    tone(note(523, snapStreak), note(523, snapStreak) * 0.995, 0.35, 0.05 + Math.min(joined, 8) * 0.006, 'sine', 0.01, 0.6);
    vibrate(10);
  },
  /** A group locked onto the board. */
  board() {
    tick(1400, 1.2, 0.06, 0.4);
    tick(300, 1, 0.12, 0.35, 0.004);
    tone(392, 390, 0.5, 0.06, 'triangle', 0.01, 0.7);
    vibrate([8, 30, 8]);
  },
  rotate() { tick(3200, 2, 0.03, 0.12); tick(2400, 2, 0.03, 0.08, 0.04); },
  tray() { tick(1200, 1, 0.05, 0.12); },
  tap() { tick(3000, 3, 0.025, 0.1); },
  hint() { [0, 2, 4].forEach((s, i) => tone(note(784, s), note(784, s), 0.4, 0.05, 'sine', i * 0.07, 0.8)); },
  complete() {
    const chord = [0, 2, 4, 5, 7, 9];
    chord.forEach((s, i) => tone(note(392, s), note(392, s) * 1.002, 1.6, 0.07, i % 2 ? 'triangle' : 'sine', i * 0.11, 0.9));
    tone(196, 196, 2.4, 0.06, 'sine', 0.5, 0.9);
    vibrate([15, 60, 15, 60, 40]);
  },
  levelUp() { [0, 1, 2, 3, 4, 5].forEach((s, i) => tone(note(523, s), note(523, s), 0.5, 0.06, 'triangle', i * 0.06, 0.8)); },
};

export function setVolumes(s: number, m: number) {
  sfxVolume = s; musicVolume = m;
  if (ctx) { sfxBus.gain.value = s; musicBus.gain.setTargetAtTime(m, ctx.currentTime, 0.3); }
  if (m <= 0.001) music.stop(); else if (musicWanted) music.start();
}
export function setHaptics(on: boolean) { hapticsOn = on; }
/** Call from a user gesture: browsers only allow sound after one. */
export function unlockAudio() { ac(); }

// ---------------------------------------------------------------- music
/**
 * Generative ambient music: slow chords on soft pads with a gentle,
 * never-repeating melody on top. Moods change the scale and tempo.
 */
let musicWanted = false;
let timer: number | null = null;
let step = 0;
const CHORDS = [
  [0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17], // Imaj7 vi IV V
  [0, 4, 7, 14], [4, 7, 11, 14], [5, 9, 12, 19], [2, 5, 9, 12],
];
const MELODY = [0, 2, 4, 7, 9, 12, 14, 16];

function midi(n: number) { return 440 * Math.pow(2, (n - 69) / 12); }

function pad(freq: number, when: number, dur: number, vol: number) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  for (const det of [-6, 6]) {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(musicBus);
    const s = c.createGain(); s.gain.value = 0.8; g.connect(s).connect(reverbSend);
    o.start(t); o.stop(t + dur + 0.1);
  }
}

function pluck(freq: number, when: number, vol: number) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.value = freq; o2.type = 'triangle'; o2.frequency.value = freq * 2;
  const g2 = c.createGain(); g2.gain.value = 0.15;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
  const s = c.createGain(); s.gain.value = 1; g.connect(s).connect(reverbSend);
  o.start(t); o2.start(t); o.stop(t + 2.3); o2.stop(t + 2.3);
}

function bar() {
  const beat = 60 / 64; // slow tempo
  const chord = CHORDS[step % CHORDS.length];
  const root = 52; // E3
  for (const n of chord) pad(midi(root + n), 0, beat * 8.4, 0.022);
  pad(midi(root - 12 + chord[0]), 0, beat * 8.4, 0.03);
  // sparse melody: 2–5 notes per bar, chosen from the chord's scale
  const notes = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < notes; i++) {
    const when = Math.floor(Math.random() * 8) * beat + (Math.random() < 0.3 ? beat / 2 : 0);
    const m = MELODY[Math.floor(Math.random() * MELODY.length)];
    pluck(midi(root + 12 + chord[0] + m), when, 0.05 + Math.random() * 0.03);
  }
  step++;
  timer = window.setTimeout(bar, beat * 8 * 1000);
}

export const music = {
  start() {
    musicWanted = true;
    if (timer !== null || musicVolume <= 0.001 || !ac()) return;
    step = Math.floor(Math.random() * CHORDS.length);
    bar();
  },
  stop() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  },
  pause() { this.stop(); },
  want(on: boolean) { musicWanted = on; on ? this.start() : this.stop(); },
};

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { music.stop(); void ctx.suspend(); }
  else { void ctx.resume(); if (musicWanted) music.start(); }
});
