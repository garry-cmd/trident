// Pure anchor-watch math. No React, no I/O. The set point is an explicit user
// action (drop the hook, tap SET) — not guessed from speed — so the watch is
// deterministic and honest. Everything here is derived from current position
// against that point. Distances are in metres (what an anchor alarm reads in).
import type { LatLon } from "./types";
import { distanceNm, bearingDeg } from "./geo";

export const NM_TO_M = 1852;

export interface AnchorState {
  setPoint: LatLon | null; // boat GPS position captured at SET (v1: antenna = drop point)
  setAt: number | null;    // ms epoch when the anchor was set
  alarmRadiusM: number;    // drag-alarm radius, metres
}

export interface AnchorStatus {
  set: boolean;
  noFix: boolean;          // set, but current position is invalid (GPS dropout) — watch can't measure drag
  distanceM: number;       // boat's distance from the set point
  bearingToSetDeg: number; // bearing from the boat back to the set point (deg true)
  dragging: boolean;       // distance has exceeded the alarm radius
  fraction: number;        // distanceM / alarmRadiusM (>= 0; 1.0 = sitting on the ring)
}

export const ANCHOR_UNSET: AnchorStatus = {
  set: false,
  noFix: false,
  distanceM: 0,
  bearingToSetDeg: 0,
  dragging: false,
  fraction: 0,
};

// A GPS fix at exactly null-island (0,0) — or non-finite — is "no fix", not a
// real position; anchored + no fix must never compute a (huge, false) drag.
function validFix(p: LatLon): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lon) && (Math.abs(p.lat) > 1e-6 || Math.abs(p.lon) > 1e-6);
}

// Current anchor status for a boat position against a set point. When no point
// is set the watch is inactive (ANCHOR_UNSET) — never a fake "holding".
export function anchorStatus(pos: LatLon, a: AnchorState): AnchorStatus {
  if (!a.setPoint) return ANCHOR_UNSET;
  // Anchored but no valid fix: report the watch as active-but-blind, never a
  // false drag or a false "holding".
  if (!validFix(pos)) return { set: true, noFix: true, distanceM: 0, bearingToSetDeg: 0, dragging: false, fraction: 0 };
  const distanceM = distanceNm(a.setPoint, pos) * NM_TO_M;
  const radius = a.alarmRadiusM > 0 ? a.alarmRadiusM : 1; // guard /0
  return {
    set: true,
    noFix: false,
    distanceM,
    bearingToSetDeg: bearingDeg(pos, a.setPoint),
    dragging: distanceM > a.alarmRadiusM,
    fraction: distanceM / radius,
  };
}

// Max swing accumulates across the whole anchorage (the hook holds the running
// value); this is the pure step so the accumulation logic stays testable.
export function maxSwingM(prevMaxM: number, distanceM: number): number {
  return Math.max(prevMaxM, distanceM);
}
