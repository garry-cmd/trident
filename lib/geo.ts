// Pure spherical geo math. No React, no state. Distances in nautical miles,
// bearings in degrees true. These are mutually consistent great-circle
// formulas: project(a, brg, d) then bearingDeg(a, b) returns brg, and
// distanceNm(a, b) returns d — the round-trip the sim relies on to seed
// contacts at exact bearings/ranges from own vessel.
import type { LatLon } from "./types";

const R_NM = 3440.065; // Earth radius in nautical miles
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceNm(a: LatLon, b: LatLon): number {
  const φ1 = rad(a.lat), φ2 = rad(b.lat);
  const dφ = rad(b.lat - a.lat), dλ = rad(b.lon - a.lon);
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Initial great-circle bearing from a to b, degrees true in [0, 360).
export function bearingDeg(a: LatLon, b: LatLon): number {
  const φ1 = rad(a.lat), φ2 = rad(b.lat), dλ = rad(b.lon - a.lon);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Destination point from `start`, heading `brg` (deg true), travelling `distNm`.
export function project(start: LatLon, brg: number, distNm: number): LatLon {
  const δ = distNm / R_NM; // angular distance
  const θ = rad(brg);
  const φ1 = rad(start.lat), λ1 = rad(start.lon);
  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(Math.min(1, Math.max(-1, sinφ2)));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * sinφ2);
  return { lat: deg(φ2), lon: ((deg(λ2) + 540) % 360) - 180 };
}
