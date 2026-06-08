// AIS collision math + threat classification. Pure, no React, testable.
import { C } from "./theme";

export const CPA_DANGER = 0.5; // nm
export const CPA_CAUTION = 1.0; // nm
export const GUARD_NM = 2; // nm — guard ring radius

// Closest Point of Approach + Time to CPA.
// rx,ry = relative position (nm), vx,vy = relative velocity (nm/min).
export function cpaTcpa(rx, ry, vx, vy) {
  const dv = rx * vx + ry * vy;
  const v2 = vx * vx + vy * vy;
  if (v2 < 1e-5) return { cpa: Math.hypot(rx, ry), tcpa: Infinity };
  const t = -dv / v2;
  if (t < 0) return { cpa: Math.hypot(rx, ry), tcpa: 0 };
  return { cpa: Math.hypot(rx + vx * t, ry + vy * t), tcpa: t };
}

export function threat(cpa) {
  return cpa < CPA_DANGER ? "danger" : cpa < CPA_CAUTION ? "caution" : "safe";
}

export function tColor(level) {
  return level === "danger" ? C.dangerBr : level === "caution" ? C.cautionBr : C.safeBr;
}

// Enrich a raw target with relative position, CPA/TCPA, and threat level.
export function enrichTarget(t) {
  const r = (t.brg * Math.PI) / 180;
  const rx = Math.sin(r) * t.dist;
  const ry = -Math.cos(r) * t.dist;
  const { cpa, tcpa } = t.aton
    ? { cpa: t.dist, tcpa: Infinity }
    : cpaTcpa(rx, ry, t.vx, t.vy);
  return { ...t, rx, ry, cpa, tcpa, level: t.aton ? "safe" : threat(cpa) };
}

export const enrichTargets = (arr) => arr.map(enrichTarget);
