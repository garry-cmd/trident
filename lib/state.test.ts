// Tests for lib/state.ts. deriveTargets must reproduce the bearing/range a
// contact was placed at, and pass own + flags through untouched.
import { describe, it, expect } from "vitest";
import { deriveTargets } from "./state";
import { project } from "./geo";
import { initState } from "./simulate";
import type { BoatState } from "./types";

const self = { position: { lat: 48.05, lon: -122.95 }, cog: 185, sog: 6.2, heading: 185, depth: 142 };

describe("deriveTargets", () => {
  it("recovers each contact's bearing and range from its position", () => {
    const state: BoatState = {
      self,
      contacts: [
        { id: "a", name: "A", type: "Cargo", aton: false, position: project(self.position, 128, 1.4), cog: 223, sog: 6.6 },
        { id: "b", name: "BUOY", type: "Nav Aid", aton: true, position: project(self.position, 95, 2.1), cog: 0, sog: 0 },
      ],
      source: "sim",
      ts: 0,
    };
    const { targets } = deriveTargets(state);
    expect(targets[0].brg).toBeCloseTo(128, 3);
    expect(targets[0].dist).toBeCloseTo(1.4, 3);
    expect(targets[0].cog).toBe(223);
    expect(targets[1].aton).toBe(true);
  });

  it("passes own vessel through unchanged", () => {
    const { own } = deriveTargets({ self, contacts: [], source: "sim", ts: 0 });
    expect(own).toEqual({ sog: 6.2, cog: 185, heading: 185, depth: 142 });
  });

  it("reproduces every seeded radar position from the simulator", () => {
    // The whole fleet must render exactly where seeded on load (the screenshot
    // geometry). Seeds: id -> [brg, dist].
    const seeds: Record<string, [number, number]> = {
      "1": [128, 1.4], "2": [42, 2.6], "3": [312, 2.8],
      "4": [238, 3.2], "5": [348, 3.8], "6": [95, 2.1],
    };
    const { targets } = deriveTargets(initState());
    for (const t of targets) {
      const [brg, dist] = seeds[t.id];
      const angDiff = Math.abs(((t.brg - brg + 540) % 360) - 180);
      expect(angDiff).toBeLessThan(0.01);
      expect(t.dist).toBeCloseTo(dist, 2);
    }
  });
});
