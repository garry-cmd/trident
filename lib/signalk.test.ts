// Tests for lib/signalk.ts applyDelta — the pure core that turns Signal K
// deltas into BoatState. SK is SI: radians for angles, m/s for speed. These
// guard the unit conversions and the self-vs-contact routing.
import { describe, it, expect } from "vitest";
import { applyDelta, emptyLiveState } from "./signalk";

const d = (context: string | undefined, values: { path: string; value: unknown }[]) => ({ context, updates: [{ values }] });

describe("applyDelta — self", () => {
  it("sets self position from navigation.position", () => {
    const s = applyDelta(emptyLiveState(), d("vessels.self", [{ path: "navigation.position", value: { latitude: 48.05, longitude: -122.95 } }]));
    expect(s.self.position).toEqual({ lat: 48.05, lon: -122.95 });
  });

  it("converts COG radians -> degrees and SOG m/s -> knots", () => {
    const s = applyDelta(emptyLiveState(), d(undefined, [
      { path: "navigation.courseOverGroundTrue", value: Math.PI }, // 180 deg
      { path: "navigation.speedOverGround", value: 5 }, // 5 m/s
    ]));
    expect(s.self.cog).toBeCloseTo(180, 6);
    expect(s.self.sog).toBeCloseTo(9.719, 2);
  });

  it("treats missing context as self", () => {
    const s = applyDelta(emptyLiveState(), d(undefined, [{ path: "navigation.headingTrue", value: Math.PI / 2 }]));
    expect(s.self.heading).toBeCloseTo(90, 6);
  });
});

describe("applyDelta — contacts", () => {
  const ctx = "vessels.urn:mrn:imo:mmsi:367123450";

  it("creates a new contact keyed by mmsi", () => {
    const s = applyDelta(emptyLiveState(), d(ctx, [{ path: "navigation.position", value: { latitude: 48.1, longitude: -122.9 } }]));
    expect(s.contacts).toHaveLength(1);
    expect(s.contacts[0].id).toBe("367123450");
    expect(s.contacts[0].position).toEqual({ lat: 48.1, lon: -122.9 });
  });

  it("updates an existing contact rather than duplicating", () => {
    let s = applyDelta(emptyLiveState(), d(ctx, [{ path: "name", value: "MARIA ELENA" }]));
    s = applyDelta(s, d(ctx, [{ path: "navigation.speedOverGround", value: 3 }]));
    expect(s.contacts).toHaveLength(1);
    expect(s.contacts[0].name).toBe("MARIA ELENA");
    expect(s.contacts[0].sog).toBeCloseTo(5.83, 1);
  });

  it("flags an aton context", () => {
    const s = applyDelta(emptyLiveState(), d("atons.urn:mrn:imo:mmsi:993672000", [{ path: "navigation.position", value: { latitude: 48, longitude: -122 } }]));
    expect(s.contacts[0].aton).toBe(true);
  });

  it("ignores deltas with no values", () => {
    const before = emptyLiveState();
    const after = applyDelta(before, { context: "vessels.self", updates: [{}] });
    expect(after).toBe(before);
  });
});
