// Display-unit formatting. Pure, no React. The model stores depth in metres
// (Signal K native); the user chooses the readout unit in Settings, so the
// conversion happens here at the display edge — the stored value stays metric.
export type DepthUnit = "ft" | "m";

const M_TO_FT = 3.28084;

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
