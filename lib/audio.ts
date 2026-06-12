// Web Audio helpers. The AudioContext is a lazily-created singleton that must
// be first touched inside a user gesture (browser autoplay policy). Until then
// getAudioCtx() returns null and tones are silently skipped.
let ctx: AudioContext | null = null;

export function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playAlarm(): void {
  const c = getAudioCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const dur = 1.6; // loop fires every 2s — a long burst makes it near-continuous

  // Compressor pushes perceived loudness to the ceiling without hard clipping.
  const comp = c.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-18, t0);
  comp.knee.setValueAtTime(6, t0);
  comp.ratio.setValueAtTime(12, t0);
  comp.attack.setValueAtTime(0.002, t0);
  comp.release.setValueAtTime(0.1, t0);
  comp.connect(c.destination);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.98, t0 + 0.015); // fast attack to near-max
  g.gain.setValueAtTime(0.98, t0 + dur - 0.06);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); // short release, no click
  g.connect(comp);

  // Square waves carry far more energy/harmonics than a sine — much louder to
  // the ear. Two oscillators, one detuned, beat together for an urgent rasp.
  // Frequencies warble in the 1.7–2.4kHz band where human hearing peaks.
  const HI = 2400, LO = 1700, STEP = 0.13;
  const mk = (detune: number) => {
    const o = c.createOscillator();
    o.type = "square";
    o.detune.setValueAtTime(detune, t0);
    for (let t = 0, k = 0; t < dur; t += STEP, k++) {
      o.frequency.setValueAtTime(k % 2 === 0 ? HI : LO, t0 + t);
    }
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur);
  };
  mk(0);
  mk(9); // detuned partner -> beating, perceptually louder and rougher
}

export function playTimerBeep(): void {
  const c = getAudioCtx();
  if (!c) return;
  for (let i = 0; i < 3; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.frequency.setValueAtTime(1200, c.currentTime + i * 0.3);
    g.gain.setValueAtTime(0.2, c.currentTime + i * 0.3);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.3 + 0.2);
    o.start(c.currentTime + i * 0.3);
    o.stop(c.currentTime + i * 0.3 + 0.25);
  }
}
