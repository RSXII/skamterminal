// FCOS sound engine. Clicks are synthesized with WebAudio so no audio
// assets are needed. Volume is a module-level singleton persisted to
// localStorage and controlled from the taskbar slider.

const VOLUME_KEY = "fcos.volume";

let ctx: AudioContext | null = null;
let volume = 0.5;
let loaded = false;

function ensureVolumeLoaded() {
  if (loaded || typeof window === "undefined") return;
  const stored = window.localStorage.getItem(VOLUME_KEY);
  if (stored !== null) {
    const v = parseFloat(stored);
    if (!Number.isNaN(v)) volume = Math.min(1, Math.max(0, v));
  }
  loaded = true;
}

export function getVolume(): number {
  ensureVolumeLoaded();
  return volume;
}

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/** Short UI tick — played when the user clicks interactive elements. */
export function playClick() {
  ensureVolumeLoaded();
  if (volume <= 0) return;
  const ac = getContext();
  if (!ac) return;

  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(2100, t);
  osc.frequency.exponentialRampToValueAtTime(720, t + 0.028);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.12 * volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 4200;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** Deeper confirmation tone — login success, window open. */
export function playChime() {
  ensureVolumeLoaded();
  if (volume <= 0) return;
  const ac = getContext();
  if (!ac) return;

  const t = ac.currentTime;
  [523.25, 784].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.09);
    gain.gain.linearRampToValueAtTime(0.09 * volume, t + i * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.35);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t + i * 0.09);
    osc.stop(t + i * 0.09 + 0.4);
  });
}

/** Error / denial buzz. */
export function playError() {
  ensureVolumeLoaded();
  if (volume <= 0) return;
  const ac = getContext();
  if (!ac) return;

  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.linearRampToValueAtTime(110, t + 0.18);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.1 * volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}
