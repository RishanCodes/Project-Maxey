/**
 * Sound effects, synthesized with the Web Audio API (no audio files to download or cache).
 * - Off by default only if the user turned it off; the choice is per device (localStorage).
 * - iOS: audio can only start after a tap, so the first tap anywhere "unlocks" it. The page is
 *   marked as ambient audio, so it mixes with music instead of pausing it, and the ring/silent
 *   switch mutes it.
 * - Every call is safe to make anywhere: it does nothing on the server, when sound is off,
 *   or when the browser has no Web Audio.
 */

const KEY = "bf-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function soundEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* storage blocked: stays default */ }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "ambient";
  } catch { /* not supported */ }
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(comp).connect(ctx.destination);
  return ctx;
}

/** Call once on app start: the first user gesture creates and resumes the audio context. */
export function installSoundUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    if (!soundEnabled()) return;
    const c = audio();
    if (c && c.state !== "running") c.resume().catch(() => {});
  };
  const opts = { capture: true, passive: true } as const;
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("keydown", unlock, opts);
  return () => { window.removeEventListener("pointerdown", unlock, opts); window.removeEventListener("keydown", unlock, opts); };
}

interface Tone { f: number; at?: number; dur?: number; type?: OscillatorType; gain?: number; attack?: number; to?: number; detune?: number }

function tone(c: AudioContext, t0: number, { f, at = 0, dur = 0.2, type = "sine", gain = 0.3, attack = 0.004, to, detune = 0 }: Tone) {
  const o = c.createOscillator(), g = c.createGain();
  const s = t0 + at;
  o.type = type; o.frequency.setValueAtTime(f, s); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(to, s + dur * 0.9);
  g.gain.setValueAtTime(0.0001, s);
  g.gain.exponentialRampToValueAtTime(gain, s + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  o.connect(g).connect(master!);
  o.start(s); o.stop(s + dur + 0.02);
}

/** A short filtered noise burst: the "snap" at the front of a hit. */
function snap(c: AudioContext, t0: number, { at = 0, dur = 0.03, gain = 0.12, freq = 3500 } = {}) {
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 0.9;
  g.gain.value = gain;
  src.buffer = buf; src.connect(bp).connect(g).connect(master!);
  src.start(t0 + at);
}

/** Two layered tones: the note plus a soft octave above, so it rings instead of beeping. */
const bell = (c: AudioContext, t0: number, f: number, at: number, dur: number, gain: number) => {
  tone(c, t0, { f, at, dur, gain, type: "sine" });
  tone(c, t0, { f: f * 2, at, dur: dur * 0.6, gain: gain * 0.22, type: "triangle" });
};

const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, B6: 1975.53, C7: 2093 } as const;

const SOUNDS = {
  /** Light tick: a routine step, a small toggle. */
  tick: (c: AudioContext, t: number) => { tone(c, t, { f: 1800, dur: 0.045, gain: 0.12, type: "triangle", to: 1400 }); },
  /** Task done: a bright two-note pop. */
  complete: (c: AudioContext, t: number) => { snap(c, t, { gain: 0.08 }); bell(c, t, N.E6, 0, 0.22, 0.26); bell(c, t, N.B6, 0.07, 0.34, 0.22); },
  /** Habit done: a quick three-note rise. */
  habit: (c: AudioContext, t: number) => { snap(c, t, { gain: 0.06 }); bell(c, t, N.G5, 0, 0.18, 0.2); bell(c, t, N.B5, 0.06, 0.2, 0.2); bell(c, t, N.D6, 0.12, 0.42, 0.24); },
  /** Undo or uncheck: a soft drop. */
  undo: (c: AudioContext, t: number) => { tone(c, t, { f: 620, to: 380, dur: 0.14, gain: 0.14, type: "sine" }); },
  /** Saved (check-in): a warm two-note confirm. */
  save: (c: AudioContext, t: number) => { bell(c, t, N.C6, 0, 0.2, 0.18); bell(c, t, N.G6, 0.08, 0.36, 0.18); },
  /** Training logged: a ball-bounce thump under a bright hit. */
  training: (c: AudioContext, t: number) => {
    tone(c, t, { f: 150, to: 55, dur: 0.18, gain: 0.5, type: "sine", attack: 0.002 });
    snap(c, t, { gain: 0.14, freq: 1800, dur: 0.04 });
    bell(c, t, N.E6, 0.05, 0.25, 0.2); bell(c, t, N.B6, 0.11, 0.4, 0.2);
  },
  /** Milestone: a climbing arpeggio. */
  milestone: (c: AudioContext, t: number) => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(c, t, f, i * 0.07, i === 3 ? 0.6 : 0.2, 0.2)); },
  /** Focus session finished: a calm, ringing chime. */
  focus: (c: AudioContext, t: number) => {
    for (const [f, g, d] of [[N.A5, 0.22, 1.6], [N.A5 * 2.76, 0.06, 0.9], [N.A5 * 5.4, 0.03, 0.5]] as const) tone(c, t, { f, dur: d, gain: g });
    for (const [f, g, d] of [[N.E6, 0.16, 1.4], [N.E6 * 2.76, 0.04, 0.7]] as const) tone(c, t, { f, at: 0.22, dur: d, gain: g });
  },
  /** Level up: a fanfare that resolves on a held chord. */
  levelUp: (c: AudioContext, t: number) => {
    snap(c, t, { gain: 0.1, freq: 5000 });
    [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => bell(c, t, f, i * 0.06, 0.18, 0.17));
    for (const [f, dt] of [[N.C6, -6], [N.E6, 4], [N.G6, -3], [N.C7, 5]] as const) {
      tone(c, t, { f, at: 0.32, dur: 1.1, gain: 0.1, type: "triangle", attack: 0.02, detune: dt });
      tone(c, t, { f, at: 0.32, dur: 1.2, gain: 0.08, type: "sine", attack: 0.02 });
    }
  },
  /** Achievement unlocked: a fast sparkle. */
  unlock: (c: AudioContext, t: number) => { [N.G6, N.B6, N.D6 * 2, N.G6 * 2, N.B6 * 2].forEach((f, i) => tone(c, t, { f, at: i * 0.045, dur: 0.3, gain: 0.09, type: "triangle", detune: i % 2 ? 6 : -6 })); bell(c, t, N.G5, 0.2, 0.7, 0.14); },
} satisfies Record<string, (c: AudioContext, t: number) => void>;

export type SoundName = keyof typeof SOUNDS;
export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];

const HAPTIC: Partial<Record<SoundName, number | number[]>> = { complete: 12, habit: 12, training: [10, 40, 14], milestone: [10, 30, 10], levelUp: [14, 50, 14, 50, 24], unlock: [10, 30, 10] };

/** Plays a sound (and a light vibration where the device supports it). Never throws. */
export function play(name: SoundName, opts: { force?: boolean } = {}) {
  if (!opts.force && !soundEnabled()) return;
  try {
    const h = HAPTIC[name];
    if (h && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(h);
  } catch { /* ignore */ }
  try {
    const c = audio();
    if (!c || !master) return;
    const go = () => SOUNDS[name](c, c.currentTime + 0.01);
    if (c.state === "running") go();
    else c.resume().then(go).catch(() => {});
  } catch { /* audio unavailable */ }
}
