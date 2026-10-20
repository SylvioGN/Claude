// An original little tarantella in 6/8 for the park: a mandolin melody (tremolo on the long notes,
// a second mandolin in thirds on the last section), a soft guitar "oom-pah-pah", bass and a
// tamburello. Written in C, played in D major. Notes are scheduled just ahead of time from update().
import { mtof } from './synth.js';

export const EIGHTH = 0.2; // seconds: 100 dotted-quarter beats a minute, lively but not frantic
const KEY = 2;

// One bar = chord | six eighths of melody: "midi", "midi:length" or "r" (rest).
const A1 = [
  'C|79 76 79 84:2 79', 'C|81 79 77 76:3', 'F|77 81 84 81:2 77', 'C|79 76 72 79:3',
  'G|71 74 79 83:2 81', 'G7|79 77 74 71:2 74', 'C|76 79 84 88:2 86', 'C|84:3 r 79 79',
];
const A2 = [
  'C|79 76 79 84:2 79', 'C|81 79 77 76:3', 'F|77 81 84 81:2 77', 'C|79 76 72 79:3',
  'G|83 81 79 77 76 74', 'G7|79 77 74 71:3', 'C|72 76 79 84 79 76', 'C|72:3 r:3',
];
const B = [
  'Am|81 83 84 83 81 76', 'Am|81 84 88 84:2 81', 'Dm|77 81 86 84 81 77', 'Am|76 81 84 81:3',
  'E7|80 83 86 83 80 76', 'E7|76 80 83 86:2 83', 'Am|84 83 81 76 81 84', 'G7|83:2 81 79 77 74',
];

const CHORDS = {
  C: { notes: [60, 64, 67], bass: [48, 43] },
  F: { notes: [60, 65, 69], bass: [41, 48] },
  G: { notes: [59, 62, 67], bass: [43, 50] },
  G7: { notes: [59, 65, 67], bass: [43, 50] },
  Am: { notes: [57, 60, 64], bass: [45, 52] },
  Dm: { notes: [57, 62, 65], bass: [50, 45] },
  E7: { notes: [56, 62, 64], bass: [40, 47] },
};

// Sections in loop order: [bars, tambourine?, harmony in thirds?]
const FORM = [[A1, false, false], [A2, true, false], [B, true, false], [A2, true, true]];

// Diatonic third below in C major (G# from the E7 bars goes to E).
const SCALE = [0, 2, 4, 5, 7, 9, 11];
function thirdBelow(m) {
  const pc = m % 12;
  if (pc === 8) return m - 4;
  const i = SCALE.indexOf(pc);
  if (i < 0) return m - 3;
  const j = i - 2;
  return m - pc + (j < 0 ? SCALE[j + 7] - 12 : SCALE[j]);
}

// Flatten the form into a list of eighth-note steps.
function compile() {
  const steps = [];
  for (const [bars, tamb, harm] of FORM) {
    for (const bar of bars) {
      const [chord, mel] = bar.split('|');
      const row = [];
      for (const tok of mel.trim().split(/\s+/)) {
        const [n, l] = tok.split(':');
        const len = Number(l || 1);
        row.push(n === 'r' ? null : { midi: Number(n) + KEY, len, harm: harm ? thirdBelow(Number(n)) + KEY : 0 });
        for (let k = 1; k < len; k++) row.push(undefined);
      }
      for (let i = 0; i < 6; i++) steps.push({ beat: i, chord: CHORDS[chord], note: row[i] || null, tamb });
    }
  }
  return steps;
}
export const STEPS = compile();
export const LOOP_SECONDS = STEPS.length * EIGHTH;

// Every note the song needs, so the plucked-string buffers can be made before the music starts.
export function songNotes() {
  const out = [];
  for (const s of STEPS) {
    if (s.note) { out.push([s.note.midi, 3]); if (s.note.harm) out.push([s.note.harm, 3]); }
    for (const m of s.chord.notes) out.push([m + KEY, 1]);
  }
  return out;
}

export class Music {
  // lite: fewer voices for low-end phones (no second mandolin)
  constructor(synth, out, lite = false) {
    this.s = synth;
    this.lite = lite;
    const ac = synth.ac;
    this.out = out;
    // gentle body resonance for the strings, and a darker bus for the accompaniment
    this.strings = ac.createBiquadFilter();
    this.strings.type = 'peaking';
    this.strings.frequency.value = 2300;
    this.strings.gain.value = 3;
    this.strings.connect(out);
    this.accomp = ac.createBiquadFilter();
    this.accomp.type = 'lowpass';
    this.accomp.frequency.value = 1800;
    this.accomp.connect(out);
    this.step = 0;
    this.next = 0;
    this.playing = false;
  }

  start(t) {
    this.playing = true;
    this.step = 0;
    this.next = t + 0.1;
  }

  stop() { this.playing = false; }

  // Schedule every step that starts before now + ahead. After a long stall, skip ahead instead of
  // playing a burst of late notes.
  schedule(now, ahead = 0.35) {
    if (!this.playing) return;
    if (this.next < now - 0.05) this.next = now + 0.05;
    while (this.next < now + ahead) {
      this.playStep(STEPS[this.step], this.next);
      this.next += EIGHTH;
      this.step = (this.step + 1) % STEPS.length;
    }
  }

  playStep(st, t) {
    const s = this.s, r = s.rand;
    const hum = () => (r() - 0.5) * 0.008;
    const accent = st.beat === 0 ? 1.15 : st.beat === 3 ? 1.05 : 0.9;

    if (st.note) this.mandolin(t + hum(), st.note.midi, st.note.len, 0.55 * accent);
    if (st.note?.harm && !this.lite) this.mandolin(t + 0.012 + hum(), st.note.harm, st.note.len, 0.3 * accent);

    const ch = st.chord;
    if (st.beat === 0 || st.beat === 3) this.bass(t, mtof(ch.bass[st.beat === 0 ? 0 : 1] + KEY));
    else {
      const v = st.beat === 1 || st.beat === 4 ? 0.1 : 0.065;
      ch.notes.forEach((m, i) => s.pluck(this.accomp, t + i * 0.011 + hum(), m + KEY, { vel: v, bright: 1, stop: 0.16 }));
    }

    if (st.tamb) {
      if (st.beat === 0 || st.beat === 3) s.noise(this.out, t, { type: 'highpass', f: 6500, q: 0.8, dur: st.beat === 0 ? 0.16 : 0.1, a: 0.012, peak: st.beat === 0 ? 0.07 : 0.05 });
      else if (st.beat === 2 || st.beat === 5) s.noise(this.out, t, { type: 'bandpass', f: 8500, q: 1.2, dur: 0.045, a: 0.002, peak: 0.05 });
    }
  }

  // Mandolin: paired strings (slightly detuned), tremolo picking on notes of two eighths or more.
  mandolin(t, midi, len, vel) {
    const s = this.s;
    const dur = len * EIGHTH;
    if (len < 2) {
      s.pluck(this.strings, t, midi, { vel, bright: 3, stop: dur + 0.12 });
      s.pluck(this.strings, t + 0.006, midi, { vel: vel * 0.6, bright: 3, detune: 5, stop: dur + 0.12 });
      return;
    }
    // tremolo: down and up strokes alternate between the two strings of the pair
    const strokes = len * 3;
    const gap = dur / strokes;
    for (let i = 0; i < strokes; i++) {
      const last = i === strokes - 1;
      const v = vel * (i === 0 ? 1 : i % 2 ? 0.66 : 0.76) * (last ? 0.8 : 1);
      s.pluck(this.strings, t + i * gap, midi, { vel: v, bright: 3, detune: i % 2 ? 5 : 0, stop: last ? gap + 0.18 : gap + 0.01 });
    }
  }

  bass(t, f) {
    const s = this.s;
    s.tone(this.accomp, t, { type: 'triangle', f, dur: 0.4, peak: 0.24, a: 0.012 });
    s.tone(this.accomp, t, { f: f * 2, dur: 0.25, peak: 0.07, a: 0.01 });
  }
}
