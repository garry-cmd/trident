// Pure anchor-watch math. No React, no I/O.
//
// The set point is the ANCHOR, not the boat. That distinction is the whole
// ballgame: an anchor watch centred on wherever the boat happened to be when
// you tapped SET is offset from the real hook by a rode length, and that offset
// is the number-one cause of false drag alarms. Two honest ways to place it:
// at the drop moment the hook is under the bow; after backing down it lies
// ahead of the bow by the rode. Both project forward from the GPS antenna.
//
// Distances are metres (what an anchor alarm reads in); bearings degrees true.
import type { LatLon } from "./types";
import { distanceNm, bearingDeg, project } from "./geo";

export const NM_TO_M = 1852;
const M_TO_NM = 1 / NM_TO_M;

// Boat geometry. LOA is display/reference only — the number that drives the
// swing circle is the GPS-to-bow offset, because the watch measures the
// ANTENNA's position against the anchor. On Irene the antenna sits 38 ft aft of
// the bow roller on a 40 ft boat, so "rode + LOA" (which assumes a bow antenna)
// would be wrong by nearly a boat length.
export interface AnchorConfig {
  loaM: number;       // length overall — reference only
  bowOffsetM: number; // GPS antenna aft of the bow roller
  gpsMarginM: number; // slop for GPS error, rode stretch, yaw
}

// S/V Irene: 40 ft LOA, antenna 38 ft aft of the bow roller.
export const IRENE: AnchorConfig = { loaM: 12.2, bowOffsetM: 11.6, gpsMarginM: 5 };

export interface AnchorState {
  setPoint: LatLon | null; // the ANCHOR's position on the bottom
  setAt: number | null;    // ms epoch when the watch was armed
  rodeM: number;           // rode paid out, metres
  alarmRadiusM: number;    // drag-alarm radius from the anchor, metres
}

export type AnchorLevel = "unset" | "nofix" | "holding" | "caution" | "dragging";

export interface AnchorStatus {
  set: boolean;
  noFix: boolean;          // armed, but the current fix is invalid — can't measure drag
  distanceM: number;       // antenna's distance from the anchor
  bearingToSetDeg: number; // bearing from the boat back to the anchor (deg true)
  roomM: number;           // alarmRadius - distance; negative once past the ring
  dragging: boolean;       // sustained breach confirmed (see evalDrag)
  fraction: number;        // distanceM / alarmRadiusM (1.0 = sitting on the ring)
  level: AnchorLevel;
}

export const ANCHOR_UNSET: AnchorStatus = {
  set: false, noFix: false, distanceM: 0, bearingToSetDeg: 0,
  roomM: 0, dragging: false, fraction: 0, level: "unset",
};

// A fix at exactly null-island (0,0) — or non-finite — is "no fix", not a real
// position; armed + no fix must never compute a (huge, false) drag.
function validFix(p: LatLon): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lon) && (Math.abs(p.lat) > 1e-6 || Math.abs(p.lon) > 1e-6);
}

// ── Placing the anchor ──────────────────────────────────────────────────────
// Both project FORWARD along heading: the bow is ahead of the antenna, and the
// hook is ahead of the bow by the rode. Uses rode length as the horizontal run
// — at any normal scope the vertical component is under 2%, well inside the
// GPS margin, and pretending otherwise would need a depth we don't have yet.

// Hook is already on the bottom ahead of you — you've backed down and settled.
export function anchorAhead(pos: LatLon, headingDeg: number, rodeM: number, cfg: AnchorConfig = IRENE): LatLon {
  return project(pos, headingDeg, (cfg.bowOffsetM + Math.max(0, rodeM)) * M_TO_NM);
}

// Hook is under the bow right now — you're dropping it as you tap.
export function anchorAtBow(pos: LatLon, headingDeg: number, cfg: AnchorConfig = IRENE): LatLon {
  return project(pos, headingDeg, cfg.bowOffsetM * M_TO_NM);
}

// Radius the ANTENNA swings on: rode ahead of the bow, plus the bow ahead of
// the antenna, plus margin. Max distance occurs with the boat aligned to the
// rode; yaw only reduces it. Rounded to 5 m so the displayed ring is a number
// you can hold in your head.
export function radiusForRode(rodeM: number, cfg: AnchorConfig = IRENE): number {
  return Math.round((Math.max(0, rodeM) + cfg.bowOffsetM + cfg.gpsMarginM) / 5) * 5;
}

// ── Drag confirmation ───────────────────────────────────────────────────────
// A single fix outside the ring is a GPS spike; drag is sustained. Breaching
// must hold contiguously before the alarm commits, and clearing must hold
// contiguously (and get well back inside) before it releases — same hysteresis
// shape as the CPA detector, for the same reason.
export interface DragConfig {
  breachSustainMs: number; // outside the ring this long, contiguously => dragging
  clearSustainMs: number;  // back inside clearFraction this long => released
  clearFraction: number;   // must return well inside the ring, not just to it
  cautionFraction: number; // visual caution band — no horn
}

export const DEFAULT_DRAG: DragConfig = {
  breachSustainMs: 60_000,
  clearSustainMs: 60_000,
  clearFraction: 0.9,
  cautionFraction: 0.85,
};

export interface DragState {
  dragging: boolean;
  outsideSince: number | null; // first ts of the current contiguous breach
  insideSince: number | null;  // first ts of the current contiguous recovery
}

export const DRAG_INIT: DragState = { dragging: false, outsideSince: null, insideSince: null };

// Fold one reading into the drag state machine. Pure — the caller owns the
// clock and must NOT advance this on an invalid fix (no fix is not "inside").
export function evalDrag(prev: DragState, fraction: number, ts: number, cfg: DragConfig = DEFAULT_DRAG): DragState {
  if (!prev.dragging) {
    if (fraction > 1) {
      const since = prev.outsideSince ?? ts;
      if (ts - since >= cfg.breachSustainMs) {
        return { dragging: true, outsideSince: since, insideSince: null };
      }
      return { ...prev, outsideSince: since, insideSince: null };
    }
    return prev.outsideSince === null ? prev : { ...prev, outsideSince: null };
  }
  // Dragging: only a sustained return well inside the ring releases it.
  if (fraction <= cfg.clearFraction) {
    const since = prev.insideSince ?? ts;
    if (ts - since >= cfg.clearSustainMs) {
      return { dragging: false, outsideSince: null, insideSince: null };
    }
    return { ...prev, insideSince: since };
  }
  return prev.insideSince === null ? prev : { ...prev, insideSince: null };
}

// How long the current contiguous breach has run, ms (0 when not breaching).
export function breachMs(d: DragState, ts: number): number {
  return d.outsideSince === null ? 0 : Math.max(0, ts - d.outsideSince);
}

// ── Status ──────────────────────────────────────────────────────────────────
// Current status for a boat position against an armed watch. `dragging` comes
// from the confirmed DragState, never from the raw instantaneous distance.
export function anchorStatus(pos: LatLon, a: AnchorState, drag: DragState = DRAG_INIT, cfg: DragConfig = DEFAULT_DRAG): AnchorStatus {
  if (!a.setPoint) return ANCHOR_UNSET;
  if (!validFix(pos)) {
    return { set: true, noFix: true, distanceM: 0, bearingToSetDeg: 0, roomM: 0, dragging: false, fraction: 0, level: "nofix" };
  }
  const distanceM = distanceNm(a.setPoint, pos) * NM_TO_M;
  const radius = a.alarmRadiusM > 0 ? a.alarmRadiusM : 1; // guard /0
  const fraction = distanceM / radius;
  const level: AnchorLevel = drag.dragging ? "dragging" : fraction >= cfg.cautionFraction ? "caution" : "holding";
  return {
    set: true,
    noFix: false,
    distanceM,
    bearingToSetDeg: bearingDeg(pos, a.setPoint),
    roomM: a.alarmRadiusM - distanceM,
    dragging: drag.dragging,
    fraction,
    level,
  };
}
