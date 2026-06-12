// Downsample-on-sync — PURE. The local track_points buffer is hi-res (~1 pt/5s
// underway); the contract syncs logbook-resolution (~1 pt/min, ~0.4% of
// PowerSync's free tier). This is that reducer. It is NOT wired to a sync layer
// yet (PowerSync is gated on Keeply's spike) — it's built and tested now because
// the rule is defined and the function is the seam the sync client will call.
//
// Rule: keep the first point, then keep a point once it's ≥ intervalMs since the
// last kept point — OR the heading has turned more than cogDeltaDeg since the
// last kept point (so corners survive; pure time-decimation flattens turns).
import type { TrackPoint } from "./types";

export interface DownsampleConfig {
  intervalMs: number; // target spacing of kept points
  cogDeltaDeg: number; // force-keep when heading turns more than this since last kept
}

export const DEFAULT_DOWNSAMPLE: DownsampleConfig = {
  intervalMs: 60_000, // ~1 point per minute
  cogDeltaDeg: 15, // preserve track shape through turns
};

const turn = (a: number, b: number): number => {
  const d = Math.abs(((a - b) % 360 + 540) % 360 - 180);
  return d;
};

// Points are assumed ascending in ts (insertion order from an append-only table).
export function downsample(
  points: TrackPoint[],
  cfg: DownsampleConfig = DEFAULT_DOWNSAMPLE,
): TrackPoint[] {
  if (points.length <= 2) return points.slice();
  const kept: TrackPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const last = kept[kept.length - 1];
    const dueByTime = p.ts - last.ts >= cfg.intervalMs;
    const dueByTurn = turn(p.cog, last.cog) > cfg.cogDeltaDeg;
    if (dueByTime || dueByTurn) kept.push(p);
  }
  kept.push(points[points.length - 1]); // always keep the last fix
  return kept;
}
