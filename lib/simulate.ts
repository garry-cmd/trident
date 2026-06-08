// Simulated AIS data source for dev. Swappable with a live Signal K source.
// Targets carry only absolute COG/SOG (as real AIS does); relative motion is
// derived against own vessel via the shared physics in ais.ts.
import type { Target, OwnVessel } from "./types";
import { DEFAULT_RANGE } from "./settings";
import { relativeVelocity } from "./ais";

export const TICK_MS = 1000;
const SPEED_X = 8; // sim speed multiplier
const RESPAWN_NM = DEFAULT_RANGE * 2; // off-screen bound -> respawn
const STEP_MIN = (SPEED_X * TICK_MS) / 60000; // sim minutes advanced per tick

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

// Own vessel. In production this comes from Signal K (navigation.*).
export const OWN: OwnVessel = { sog: 6.2, cog: 185, heading: 185, depth: 142 };

export function initTargets(): Target[] {
  return [
    { id: "1", name: "MARIA ELENA", type: "Fishing", brg: 128, dist: 1.4, cog: 223, sog: 6.6, aton: false },
    { id: "2", name: "MAERSK DURBAN", type: "Cargo", brg: 42, dist: 2.6, cog: 212, sog: 10.0, aton: false },
    { id: "3", name: "OCEAN PEARL", type: "Tanker", brg: 312, dist: 2.8, cog: 154, sog: 7.0, aton: false },
    { id: "4", name: "BAHIA SPORT", type: "Sailing", brg: 238, dist: 3.2, cog: 40, sog: 7.0, aton: false },
    { id: "5", name: "", type: "Class B", brg: 348, dist: 3.8, cog: 180, sog: 0.2, aton: false },
    { id: "6", name: "Fl G 4s", type: "Nav Aid", brg: 95, dist: 2.1, cog: 0, sog: 0, aton: true },
  ];
}

// Advance all targets one tick by their velocity relative to own. AtoN are
// stationary. Targets that drift off-screen or pass through respawn.
export function advanceTargets(prev: Target[], own: OwnVessel): Target[] {
  const fresh = initTargets();
  return prev.map((t) => {
    if (t.aton) return t;
    const { e, n } = relativeVelocity(t, own);
    const rE = t.dist * Math.sin(rad(t.brg)) + e * STEP_MIN;
    const rN = t.dist * Math.cos(rad(t.brg)) + n * STEP_MIN;
    const nd = Math.hypot(rE, rN);
    if (nd > RESPAWN_NM || nd < 0.03) return fresh.find((i) => i.id === t.id) || t;
    let nb = deg(Math.atan2(rE, rN));
    if (nb < 0) nb += 360;
    return { ...t, brg: nb, dist: nd };
  });
}
