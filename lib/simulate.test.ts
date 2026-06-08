// Tests for lib/simulate.ts. The sim now emits the lat/lon BoatState. These
// guard the shared contract: self and contacts move over ground, AtoN stay
// put, off-screen contacts respawn on-screen, and the derived radar geometry
// matches the seeds.
import { describe, it, expect } from "vitest";
import { initState, advanceState } from "./simulate";
import { deriveTargets } from "./state";
import { project } from "./geo";
import { DEFAULT_RANGE } from "./settings";

describe("initState", () => {
  it("emits a sim-sourced state with a stable fleet and exactly one AtoN", () => {
    const s = initState();
    expect(s.source).toBe("sim");
    expect(s.contacts.length).toBeGreaterThan(0);
    expect(s.contacts.filter((c) => c.aton)).toHaveLength(1);
    expect(new Set(s.contacts.map((c) => c.id)).size).toBe(s.contacts.length);
    expect(s.contacts.some((c) => c.name === "MARIA ELENA")).toBe(true);
  });
});

describe("advanceState", () => {
  it("moves own vessel over ground", () => {
    const before = initState();
    const after = advanceState(before);
    const moved = before.self.position.lat !== after.self.position.lat || before.self.position.lon !== after.self.position.lon;
    expect(moved).toBe(true);
  });

  it("leaves the AtoN's position fixed", () => {
    const before = initState();
    const aton = before.contacts.find((c) => c.aton)!;
    const after = advanceState(before);
    const same = after.contacts.find((c) => c.id === aton.id)!;
    expect(same.position).toEqual(aton.position);
  });

  it("moves a vessel with way on", () => {
    const before = initState();
    const movers = before.contacts.filter((c) => !c.aton && c.sog > 1);
    const after = advanceState(before);
    const changed = movers.some((m) => {
      const a = after.contacts.find((c) => c.id === m.id)!;
      return a.position.lat !== m.position.lat || a.position.lon !== m.position.lon;
    });
    expect(changed).toBe(true);
  });

  it("respawns a contact that has drifted beyond the off-screen bound", () => {
    const base = initState();
    // Place contact id "1" ~100nm from own, barely moving, so it trips respawn.
    const far = { ...base, contacts: [{ id: "1", name: "GHOST", type: "Cargo", aton: false, position: project(base.self.position, 0, 100), cog: 0, sog: 0.0001 }] };
    const after = advanceState(far);
    const c = after.contacts[0];
    const { targets } = deriveTargets(after);
    expect(targets[0].dist).toBeLessThan(DEFAULT_RANGE * 2);
    expect(c.name).toBe("MARIA ELENA"); // re-seeded from seed id "1"
  });

  it("keeps derived bearings normalised to [0,360) over many ticks", () => {
    let s = initState();
    for (let i = 0; i < 50; i++) s = advanceState(s);
    const { targets } = deriveTargets(s);
    targets.forEach((t) => {
      expect(t.brg).toBeGreaterThanOrEqual(0);
      expect(t.brg).toBeLessThan(360);
    });
  });
});
