// Rolling position trail — the breadcrumb behind the boat at anchor. PURE.
//
// This is not decoration. A holding anchor traces a fan or arc centred on the
// hook; a dragging anchor traces a path that walks. The SHAPE answers "am I
// still where I was?" faster than any number, and it answers it before a
// threshold is crossed. Everything here exists to keep that shape readable:
// bounded window (a five-day stay would otherwise draw a solid disc), spatial
// gating (a boat sitting still must not stack 40k identical points), and a hard
// cap so the trail can be persisted without blowing localStorage.
import type { LatLon } from "./types";
import { distanceNm } from "./geo";

const NM_TO_M = 1852;

export interface Crumb {
  lat: number;
  lon: number;
  ts: number; // ms epoch
}

export interface TrailConfig {
  windowMs: number;  // how far back the trail is kept
  minMoveM: number;  // append only after moving this far...
  minGapMs: number;  // ...or after this long, whichever comes first
  maxPoints: number; // hard cap; older half is decimated past this
}

// 12 h rolling window: long enough to show a full tide + wind cycle as an arc,
// short enough that a multi-night stay doesn't fill the ring with ink.
export const DEFAULT_TRAIL: TrailConfig = {
  windowMs: 12 * 60 * 60 * 1000,
  minMoveM: 2,
  minGapMs: 15_000,
  maxPoints: 1500,
};

function isCrumb(v: unknown): v is Crumb {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.lat === "number" && Number.isFinite(c.lat) &&
    typeof c.lon === "number" && Number.isFinite(c.lon) &&
    typeof c.ts === "number" && Number.isFinite(c.ts)
  );
}

// Drop everything older than the window. Returns the SAME array reference when
// nothing was removed, so React sees no change and the scope doesn't re-render.
export function pruneTrail(trail: Crumb[], now: number, cfg: TrailConfig = DEFAULT_TRAIL): Crumb[] {
  const cutoff = now - cfg.windowMs;
  let i = 0;
  while (i < trail.length && trail[i].ts < cutoff) i++;
  return i === 0 ? trail : trail.slice(i);
}

// Halve the oldest portion when the cap is hit. Recent detail is what you're
// reading at 2am; an hour-old arc survives fine at half resolution.
export function decimate(trail: Crumb[], cfg: TrailConfig = DEFAULT_TRAIL): Crumb[] {
  if (trail.length <= cfg.maxPoints) return trail;
  const half = Math.floor(trail.length / 2);
  const old = trail.slice(0, half).filter((_, i) => i % 2 === 0);
  return old.concat(trail.slice(half));
}

// Fold one fix into the trail. Appends only when the boat has actually moved or
// enough time has passed; returns the SAME array reference otherwise.
export function appendCrumb(trail: Crumb[], pos: LatLon, ts: number, cfg: TrailConfig = DEFAULT_TRAIL): Crumb[] {
  if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lon)) return trail;
  if (Math.abs(pos.lat) < 1e-6 && Math.abs(pos.lon) < 1e-6) return trail; // null island = no fix
  const last = trail[trail.length - 1];
  if (last) {
    if (ts <= last.ts) return trail; // out-of-order / replayed delta
    const movedM = distanceNm({ lat: last.lat, lon: last.lon }, pos) * NM_TO_M;
    if (movedM < cfg.minMoveM && ts - last.ts < cfg.minGapMs) return trail;
  }
  const next = pruneTrail(trail, ts, cfg).concat({ lat: pos.lat, lon: pos.lon, ts });
  return decimate(next, cfg);
}

// Validate a parsed blob from storage. A corrupt or stale trail must never
// brick the watch screen — anything unrecognisable is simply dropped.
export function sanitizeTrail(raw: unknown, now: number, cfg: TrailConfig = DEFAULT_TRAIL): Crumb[] {
  if (!Array.isArray(raw)) return [];
  const clean = raw.filter(isCrumb).sort((a, b) => a.ts - b.ts);
  return decimate(pruneTrail(clean, now, cfg), cfg);
}

// The farthest any crumb sits from a reference point, metres. Used to frame the
// scope so a drag that has run outside the ring stays on canvas.
export function trailMaxDistM(trail: Crumb[], from: LatLon): number {
  let max = 0;
  for (const c of trail) {
    const d = distanceNm(from, { lat: c.lat, lon: c.lon }) * NM_TO_M;
    if (d > max) max = d;
  }
  return max;
}
