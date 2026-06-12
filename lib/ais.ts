// AIS collision math + threat classification. Pure, no React, testable.
//
// Relative velocity is derived from absolute COG/SOG (target minus own), which
// is how real AIS works — targets broadcast their own course/speed, never a
// pre-computed relative vector.
import type { Target, OwnVessel, EnrichedTarget, ThreatLevel, LevelFilter, Thresholds } from "./types";
import { C } from "./theme";
import { DEFAULT_THRESHOLDS } from "./settings";

// Legacy constant exports, now derived from the single default source so older
// imports (and tests) keep working. Live values come through the `th` param.
export const CPA_DANGER = DEFAULT_THRESHOLDS.cpaDanger; // nm
export const CPA_CAUTION = DEFAULT_THRESHOLDS.cpaCaution; // nm
export const GUARD_NM = DEFAULT_THRESHOLDS.guardNm; // nm — guard ring radius

const rad = (d: number) => (d * Math.PI) / 180;

// Closest Point of Approach + Time to CPA. Frame-agnostic: r and v must share
// one coordinate frame. rx,ry in nm; vx,vy in nm/min; tcpa in min.
export function cpaTcpa(rx: number, ry: number, vx: number, vy: number): { cpa: number; tcpa: number } {
  const dv = rx * vx + ry * vy;
  const v2 = vx * vx + vy * vy;
  if (v2 < 1e-5) return { cpa: Math.hypot(rx, ry), tcpa: Infinity };
  const t = -dv / v2;
  if (t < 0) return { cpa: Math.hypot(rx, ry), tcpa: 0 };
  return { cpa: Math.hypot(rx + vx * t, ry + vy * t), tcpa: t };
}

export function threat(cpa: number, th: Thresholds = DEFAULT_THRESHOLDS): ThreatLevel {
  return cpa < th.cpaDanger ? "danger" : cpa < th.cpaCaution ? "caution" : "safe";
}

export function tColor(level: ThreatLevel): string {
  return level === "danger" ? C.dangerBr : level === "caution" ? C.cautionBr : C.safeBr;
}

// Threat-level display filter. Each mode shows its level AND everything more
// dangerous, so a danger target is visible in every mode — you can only ever
// hide lower-threat traffic, never a danger.
const LEVEL_RANK: Record<ThreatLevel, number> = { safe: 0, caution: 1, danger: 2 };
export function passesLevel(level: ThreatLevel, filter: LevelFilter): boolean {
  if (filter === "all") return true;
  return LEVEL_RANK[level] >= (filter === "danger" ? 2 : 1);
}

// Velocity of `mover` relative to `own`, in the math frame (East, North),
// units nm/min. Shared by enrichment (display) and the simulator (motion) so
// both model identical physics.
export function relativeVelocity(mover: { cog: number; sog: number }, own: OwnVessel): { e: number; n: number } {
  const k = 1 / 60; // kt -> nm/min
  const e = mover.sog * k * Math.sin(rad(mover.cog)) - own.sog * k * Math.sin(rad(own.cog));
  const n = mover.sog * k * Math.cos(rad(mover.cog)) - own.sog * k * Math.cos(rad(own.cog));
  return { e, n };
}

// Enrich a raw target against own vessel. Output rx,ry,vx,vy are in the screen
// frame (x = East, y = -North) the radar renderer expects.
export function enrichTarget(t: Target, own: OwnVessel, th: Thresholds = DEFAULT_THRESHOLDS): EnrichedTarget {
  const r = rad(t.brg);
  const rx = Math.sin(r) * t.dist; // East
  const ry = -Math.cos(r) * t.dist; // -North (screen)
  if (t.aton) {
    return { ...t, rx, ry, vx: 0, vy: 0, cpa: t.dist, tcpa: Infinity, level: "safe" };
  }
  const { e, n } = relativeVelocity(t, own);
  const vx = e; // East
  const vy = -n; // -North (screen)
  const { cpa, tcpa } = cpaTcpa(rx, ry, vx, vy);
  return { ...t, rx, ry, vx, vy, cpa, tcpa, level: threat(cpa, th) };
}

export const enrichTargets = (arr: Target[], own: OwnVessel, th: Thresholds = DEFAULT_THRESHOLDS): EnrichedTarget[] =>
  arr.map((t) => enrichTarget(t, own, th));
