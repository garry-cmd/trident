// Tests for lib/simulate.ts motion. The sim shares relativeVelocity() with the
// display path, so these guard the "both model identical physics" contract:
// AtoN never moves, real targets advance, and off-screen targets respawn.
import { describe, it, expect } from "vitest";
import { initTargets, advanceTargets, OWN } from "./simulate";
import { DEFAULT_RANGE } from "./settings";

describe("initTargets", () => {
  it("seeds a stable fleet with exactly one AtoN", () => {
    const t = initTargets();
    expect(t.length).toBeGreaterThan(0);
    expect(t.filter((x) => x.aton)).toHaveLength(1);
    expect(new Set(t.map((x) => x.id)).size).toBe(t.length); // unique ids
  });
});

describe("advanceTargets", () => {
  it("leaves AtoN exactly where it is", () => {
    const before = initTargets();
    const aton = before.find((t) => t.aton)!;
    const after = advanceTargets(before, OWN);
    const same = after.find((t) => t.id === aton.id)!;
    expect(same.brg).toBe(aton.brg);
    expect(same.dist).toBe(aton.dist);
  });

  it("moves a vessel that has relative motion", () => {
    const before = initTargets().filter((t) => !t.aton);
    const after = advanceTargets(before, OWN);
    // At least one moving target should have changed bearing or range.
    const moved = after.some((t, i) => t.brg !== before[i].brg || t.dist !== before[i].dist);
    expect(moved).toBe(true);
  });

  it("respawns a target that has drifted beyond the off-screen bound", () => {
    const far = [
      {
        id: "1", // matches a seed id so respawn can find it
        name: "GHOST",
        type: "Cargo",
        brg: 0,
        dist: DEFAULT_RANGE * 10, // way outside RESPAWN_NM
        cog: 0,
        sog: 0.0001,
        aton: false,
      },
    ];
    const [respawned] = advanceTargets(far, OWN);
    expect(respawned.dist).toBeLessThan(DEFAULT_RANGE * 10);
    expect(respawned.name).toBe("MARIA ELENA"); // re-seeded from initTargets id "1"
  });

  it("keeps bearings normalised to [0,360)", () => {
    let fleet = initTargets();
    for (let i = 0; i < 50; i++) fleet = advanceTargets(fleet, OWN);
    fleet.forEach((t) => {
      expect(t.brg).toBeGreaterThanOrEqual(0);
      expect(t.brg).toBeLessThan(360);
    });
  });
});
