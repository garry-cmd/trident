// Pure geometry for the chart's vector layer. No React, no MapLibre — given the
// world state it returns a GeoJSON FeatureCollection the chart drops into a
// source. Kept here (not in the component) so the projection math is testable.
//
// Frame: TRUE-MOTION. A chart is ground-referenced, so every track is the
// vessel's own COG projected forward over a fixed time window — the eye sees
// the lines converge. This deliberately sidesteps the radar's relative-frame
// CPA marker (the parked dual-frame decision): on a chart, true motion is the
// honest native frame.
import { project } from "./geo";
import type { LatLon } from "./types";

type Coord = [number, number];
interface VecFeature {
  type: "Feature";
  properties: { role: string; color: string };
  geometry:
    | { type: "LineString"; coordinates: Coord[] }
    | { type: "Point"; coordinates: Coord };
}
export interface VectorFC {
  type: "FeatureCollection";
  features: VecFeature[];
}

export interface VecSelf {
  position: LatLon;
  cog: number;
  sog: number;
}
export interface VecContact {
  id: string;
  lat: number;
  lon: number;
  cog: number;
  sog: number;
  cpa: number;
  tcpa: number;
  level: "danger" | "caution" | "safe";
  aton?: boolean;
}
export interface VecColors {
  own: string;
  danger: string;
  caution: string;
  safe: string;
}
export interface VecOpts {
  vectorMin?: number;
}

const MIN_SOG = 0.1; // kt — below this a vessel is effectively stopped, no track
const TCPA_CAP = 600; // min — ignore absurdly distant closest-approach projections

const levelColor = (level: VecContact["level"], c: VecColors): string =>
  level === "danger" ? c.danger : level === "caution" ? c.caution : c.safe;

const lineFeature = (a: LatLon, b: LatLon, role: string, color: string): VecFeature => ({
  type: "Feature",
  properties: { role, color },
  geometry: { type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] },
});

const pointFeature = (a: LatLon, role: string, color: string): VecFeature => ({
  type: "Feature",
  properties: { role, color },
  geometry: { type: "Point", coordinates: [a.lon, a.lat] },
});

// Build the chart vectors for one frame.
// - own true-motion track (always, if moving)
// - one true-motion track per caution/danger contact (safe + AtoN stay quiet)
// - for the SELECTED threat only: a closest-approach ring at where the target
//   will be at TCPA, plus a hairline to where own vessel will be — the gap is
//   the CPA, drawn to scale. CPA detail stays gated behind selection ("detail
//   only on tap"), so the picture is calm until you ask a question of it.
export function buildVectorFeatures(
  self: VecSelf | null | undefined,
  contacts: VecContact[],
  selId: string | null,
  colors: VecColors,
  opts: VecOpts = {}
): VectorFC {
  const vectorMin = opts.vectorMin ?? 6;
  const features: VecFeature[] = [];

  if (self && self.sog > MIN_SOG) {
    const end = project(self.position, self.cog, (self.sog * vectorMin) / 60);
    features.push(lineFeature(self.position, end, "own", colors.own));
  }

  for (const c of contacts) {
    if (c.aton || c.level === "safe" || c.sog <= MIN_SOG) continue;
    const pos = { lat: c.lat, lon: c.lon };
    const end = project(pos, c.cog, (c.sog * vectorMin) / 60);
    features.push(lineFeature(pos, end, "threat", levelColor(c.level, colors)));
  }

  if (self && selId) {
    const c = contacts.find((x) => x.id === selId);
    if (c && !c.aton && isFinite(c.tcpa) && c.tcpa > 0 && c.tcpa < TCPA_CAP) {
      const col = levelColor(c.level, colors);
      const ownAtCpa = project(self.position, self.cog, (self.sog * c.tcpa) / 60);
      const tgtAtCpa = project({ lat: c.lat, lon: c.lon }, c.cog, (c.sog * c.tcpa) / 60);
      features.push(lineFeature(ownAtCpa, tgtAtCpa, "cpa-connector", col));
      features.push(pointFeature(tgtAtCpa, "cpa-ring", col));
    }
  }

  return { type: "FeatureCollection", features };
}
