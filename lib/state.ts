// The bridge from the canonical lat/lon world model to the radar's
// bearing/range view. Pure: same input always yields the same targets. This is
// the only place positions become brg/dist; ais.ts then derives relative
// motion + CPA exactly as before, so nothing downstream knows or cares whether
// the source was the simulator or a live Signal K feed.
import type { BoatState, Target, OwnVessel } from "./types";
import { distanceNm, bearingDeg } from "./geo";

export function deriveTargets(state: BoatState): { targets: Target[]; own: OwnVessel } {
  const { self } = state;
  const own: OwnVessel = { sog: self.sog, cog: self.cog, heading: self.heading, depth: self.depth };
  const targets: Target[] = state.contacts.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    aton: c.aton,
    brg: bearingDeg(self.position, c.position),
    dist: distanceNm(self.position, c.position),
    cog: c.cog,
    sog: c.sog,
    ageSec: Math.max(0, (state.ts - c.lastSeen) / 1000),
  }));
  return { targets, own };
}
