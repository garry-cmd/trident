// Web Audio helpers. The AudioContext is a lazily-created singleton that must
// be first touched inside a user gesture (browser autoplay policy). Until then
// getAudioCtx() returns null and tones are silently skipped.
let ctx = null;

export function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playAlarm() {
  const c = getAudioCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  o.frequency.setValueAtTime(880, c.currentTime);
  o.frequency.setValueAtTime(660, c.currentTime + 0.15);
  o.frequency.setValueAtTime(880, c.currentTime + 0.3);
  g.gain.setValueAtTime(0.3, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.5);
}

export function playTimerBeep() {
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
