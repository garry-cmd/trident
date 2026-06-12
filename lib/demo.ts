// DEMO data source for the Dash (URL ?demo=1). Synthesizes slowly-varying
// systems/environment telemetry so the whole dashboard can be exercised before
// the Cerbo / NGX-1 exist. NOT used unless the demo flag is set — the default
// UI stays gated and honest. Pure (time in, telemetry out), so it's testable
// and deterministic. When real sensors land, the live client fills the same
// Telemetry shape from Signal K and these panels render unchanged.
import type { Telemetry } from "./types";
import { EMPTY_TELEMETRY } from "./types";
export { EMPTY_TELEMETRY };

// Smooth 0..1 oscillator mapped to [lo, hi] on a period (seconds), with phase.
export function demoTelemetry(tMs: number): Telemetry {
  const t = tMs / 1000;
  const osc = (periodSec: number, lo: number, hi: number, phase = 0): number =>
    lo + (hi - lo) * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / periodSec + phase));

  // Power: SOC drifts, current swings charge/discharge, solar a daylight-ish bell.
  const soc = Math.round(osc(600, 64, 88));
  const current = Math.round(osc(140, -12, 16, 1));
  const voltage = +(12.1 + soc * 0.0125).toFixed(1);
  const solarW = Math.max(0, Math.round(osc(420, -140, 360)));
  const loadsA = Math.round(osc(90, 7, 16));

  // Weather: barometer with a 24-point trailing history (the sparkline) and a
  // 3-hour trend derived from it, so the number and the trace agree.
  const baroAt = (sec: number) => 1014 + 4 * Math.sin(sec / 130) - sec / 4200;
  const history = Array.from({ length: 24 }, (_, i) => +baroAt(t - (23 - i) * 450).toFixed(1));
  const mb = Math.round(history[history.length - 1]);
  const trend3h = +(history[history.length - 1] - history[history.length - 1 - 6]).toFixed(1);

  const windDir = Math.round(((220 + 25 * Math.sin(t / 200)) % 360 + 360) % 360);

  return {
    battery: { soc, voltage, current, timeToGoMin: current < 0 ? Math.round(soc * 9) : null },
    solar: { watts: solarW, yieldAh: +(8 + osc(900, 0, 14)).toFixed(1) },
    shore: { connected: false, amps: 0 },
    engineChargeA: 0,
    loadsA,
    baro: { mb, trend3h, history },
    wind: { speedKt: Math.round(osc(80, 8, 17)), dirDeg: windDir, backing: true },
    airTempC: Math.round(osc(1200, 17, 22)),
    seaTempC: Math.round(osc(1800, 19, 23)),
    pi: { cpuTempC: Math.round(osc(50, 49, 58)), loadPct: Math.round(osc(60, 16, 52)), ramPct: Math.round(osc(240, 31, 46)), diskFreePct: 88, undervolt: false },
    gps: { sats: Math.round(osc(110, 9, 12)), hdop: +osc(110, 0.8, 1.2).toFixed(1) },
    vhf: { channel: "16", dscWatch: true },
    autopilot: { engaged: true, targetHdg: 248, rudderDeg: Math.round(osc(40, -6, 6)) },
    depthM: Math.round(osc(70, 16, 44)),
  };
}
