// Simulated data source for dev — now emits the canonical lat/lon BoatState,
// the same shape a live Signal K feed produces (lib/signalk.ts). Self and every
// contact move absolutely over ground along their own COG/SOG; the radar's
// relative picture is derived in lib/state.ts. Swapping to live is a one-line
// source change in useBoatState; nothing here is in the collision path.
import type { BoatState, Contact, LatLon } from "./types";
import { DEFAULT_RANGE } from "./settings";
import { project, distanceNm } from "./geo";

export const TICK_MS = 1000;
const SPEED_X = 8; // sim speed multiplier
const RESPAWN_NM = DEFAULT_RANGE * 2; // off-screen bound -> respawn
const STEP_MIN = (SPEED_X * TICK_MS) / 60000; // sim minutes advanced per tick

// Distance a vessel travels in one tick. sog is knots (nm/hour); STEP_MIN is
// minutes — hence the /60. Exported so tests can assert the cadence and catch
// unit regressions (this is exactly where a 60x speed bug hid once).
export const nmPerTick = (sogKt: number): number => (sogKt * STEP_MIN) / 60;

// Own vessel start. In production this comes from Signal K (navigation.*).
const SELF_START: LatLon = { lat: 47.9, lon: -125.1 }; // open Pacific, ~20nm off the WA (Olympic Peninsula) coast
const SELF = { cog: 185, sog: 6.2, heading: 185, depth: 24 }; // depth in metres

// Seeds carry each contact's bearing/range FROM own at spawn, so they can be
// projected onto lat/lon relative to wherever own currently is — at init, and
// again on respawn after own has wandered.
interface Seed { id: string; name: string; type: string; aton: boolean; brg0: number; dist0: number; cog: number; sog: number; }
const SEEDS: Seed[] = [
  { id: "1", name: "MARIA ELENA", type: "Fishing", brg0: 128, dist0: 1.4, cog: 223, sog: 6.6, aton: false },
  { id: "2", name: "MAERSK DURBAN", type: "Cargo", brg0: 42, dist0: 2.6, cog: 212, sog: 10.0, aton: false },
  { id: "3", name: "OCEAN PEARL", type: "Tanker", brg0: 312, dist0: 2.8, cog: 154, sog: 7.0, aton: false },
  { id: "4", name: "BAHIA SPORT", type: "Sailing", brg0: 238, dist0: 3.2, cog: 40, sog: 7.0, aton: false },
  { id: "5", name: "", type: "Class B", brg0: 348, dist0: 3.8, cog: 180, sog: 0.2, aton: false },
  { id: "6", name: "Fl G 4s", type: "Nav Aid", brg0: 95, dist0: 2.1, cog: 0, sog: 0, aton: true },
];

const spawn = (s: Seed, from: LatLon): Contact => ({
  id: s.id, name: s.name, type: s.type, aton: s.aton,
  position: project(from, s.brg0, s.dist0), cog: s.cog, sog: s.sog,
  lastSeen: Date.now(),
});

export function initState(): BoatState {
  return {
    self: { position: SELF_START, ...SELF },
    contacts: SEEDS.map((s) => spawn(s, SELF_START)),
    source: "sim",
    ts: Date.now(),
  };
}

// Advance one tick: self and each non-AtoN contact move along their own course.
// A contact that drifts past the off-screen bound (or passes through own)
// respawns at its seed bearing/range from the CURRENT own position.
export function advanceState(prev: BoatState): BoatState {
  const self = { ...prev.self, position: project(prev.self.position, prev.self.cog, nmPerTick(prev.self.sog)) };
  // Every sim contact "reports" each tick, so lastSeen stays fresh — the sim
  // never shows LOST targets (that behavior is exercised by the replay bench).
  const contacts = prev.contacts.map((c) => {
    if (c.aton) return { ...c, lastSeen: Date.now() };
    const next = project(c.position, c.cog, nmPerTick(c.sog));
    const d = distanceNm(self.position, next);
    if (d > RESPAWN_NM || d < 0.03) {
      const seed = SEEDS.find((s) => s.id === c.id);
      if (seed) return spawn(seed, self.position);
    }
    return { ...c, position: next, lastSeen: Date.now() };
  });
  return { self, contacts, source: "sim", ts: Date.now() };
}
