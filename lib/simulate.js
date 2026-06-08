// Simulated AIS data source for dev. Swappable with a live Signal K source.
// Pure functions, no React. The shape returned here is what useTargets consumes.
import { DEFAULT_RANGE } from "./settings";

export const TICK_MS = 1000;
const SPEED_X = 8; // sim speed multiplier
const RESPAWN_NM = DEFAULT_RANGE * 2; // off-screen bound → respawn

// Own vessel. In production this comes from Signal K (navigation.*).
export const OWN = { sog: 6.2, cog: 185, heading: 185, depth: 142 };

export function initTargets() {
  return [
    { id: "1", name: "MARIA ELENA", type: "Fishing", brg: 128, dist: 1.4, cog: 325, sog: 4.2, vx: -0.015, vy: -0.022, aton: false },
    { id: "2", name: "MAERSK DURBAN", type: "Cargo", brg: 42, dist: 2.6, cog: 210, sog: 12.8, vx: -0.008, vy: 0.006, aton: false },
    { id: "3", name: "OCEAN PEARL", type: "Tanker", brg: 312, dist: 2.8, cog: 150, sog: 11.4, vx: 0.005, vy: 0.003, aton: false },
    { id: "4", name: "BAHIA SPORT", type: "Sailing", brg: 238, dist: 3.2, cog: 165, sog: 5.8, vx: 0.002, vy: 0.004, aton: false },
    { id: "5", name: "", type: "Class B", brg: 348, dist: 3.8, cog: 180, sog: 0.2, vx: 0.0, vy: 0.001, aton: false },
    { id: "6", name: "Fl G 4s", type: "Nav Aid", brg: 95, dist: 2.1, cog: 0, sog: 0, vx: 0, vy: 0, aton: true },
  ];
}

// Advance all targets one tick. AtoN are stationary. Targets that drift
// off-screen or pass through respawn to their initial position.
export function advanceTargets(prev) {
  const fresh = initTargets();
  return prev.map((t) => {
    if (t.aton) return t;
    const r = (t.brg * Math.PI) / 180;
    const x = Math.sin(r) * t.dist + t.vx * ((SPEED_X * TICK_MS) / 60000);
    const y = -Math.cos(r) * t.dist + t.vy * ((SPEED_X * TICK_MS) / 60000);
    const nd = Math.hypot(x, y);
    if (nd > RESPAWN_NM || nd < 0.03) return fresh.find((i) => i.id === t.id) || t;
    let nb = (Math.atan2(x, -y) * 180) / Math.PI;
    if (nb < 0) nb += 360;
    return { ...t, brg: nb, dist: nd };
  });
}
