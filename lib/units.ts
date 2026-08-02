// Display-unit formatting. Pure, no React. The model stores depth in metres
// (Signal K native); the user chooses the readout unit in Settings, so the
// conversion happens here at the display edge — the stored value stays metric.
export type DepthUnit = "ft" | "m";
export type DistUnit = "ft" | "m";

export const M_TO_FT = 3.28084;

export function formatDepth(meters: number, unit: DepthUnit): { value: string; unit: string } {
  if (!isFinite(meters)) return { value: "\u2014", unit };
  const v = unit === "ft" ? meters * M_TO_FT : meters;
  return { value: v.toFixed(v >= 100 ? 0 : 1), unit };
}

// Decimal degrees -> "DD\u00B0MM.M'H" (the format chartplotters show). Minutes
// are zero-padded to two integer digits ("03.0", not "3.0").
export function formatLatLon(lat: number, lon: number): string {
  const part = (deg: number, pos: string, neg: string) => {
    const h = deg >= 0 ? pos : neg;
    const a = Math.abs(deg);
    const d = Math.floor(a);
    const m = (a - d) * 60;
    return `${d}\u00B0${m.toFixed(1).padStart(4, "0")}'${h}`;
  };
  return `${part(lat, "N", "S")} ${part(lon, "E", "W")}`;
}

// ── Anchor-watch distances ──────────────────────────────────────────────────
// Everything in lib/anchor.ts is metres (the model, the maths, storage). These
// convert only at the display edge, and they round to whole units because a
// swing circle read at 2am does not want a decimal point.

export function toDist(meters: number, unit: DistUnit): number {
  return unit === "ft" ? meters * M_TO_FT : meters;
}

export function fromDist(value: number, unit: DistUnit): number {
  return unit === "ft" ? value / M_TO_FT : value;
}

// Whole display units — what a readout or a ring label shows.
export function distValue(meters: number, unit: DistUnit): number {
  return Math.round(toDist(meters, unit));
}

export function distLabel(unit: DistUnit): string {
  return unit === "ft" ? "ft" : "m";
}

// Stepper granularity in DISPLAY units, so a tap moves by a round number in
// whatever unit is on screen (10 ft or 5 m) rather than by an awkward
// conversion of the other unit's step.
export function distStep(unit: DistUnit): number {
  return unit === "ft" ? 10 : 5;
}

// Snap a metric value to the nearest whole step of the display unit and return
// metres. Keeps the stored value honest while the on-screen number stays clean.
export function snapDist(meters: number, unit: DistUnit, deltaSteps = 0): number {
  const step = distStep(unit);
  const cur = Math.round(toDist(meters, unit) / step) * step;
  return fromDist(cur + deltaSteps * step, unit);
}
