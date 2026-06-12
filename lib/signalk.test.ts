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

// Real-world AIS shapes. These mirror the exact deltas @signalk/nmea0183-signalk
// emits from a Vesper's VDM stream — the format the boat actually produces. The
// static report (VDM type 5) delivers name + mmsi as EMPTY-PATH subtree merges,
// which a naive path switch silently drops. See the "no ship-names" gotcha.
describe("applyDelta — real AIS delta shapes", () => {
  const ctx = "vessels.urn:mrn:imo:mmsi:244830550";

  it("reads a contact name from an empty-path subtree merge", () => {
    const s = applyDelta(emptyLiveState(), d(ctx, [{ path: "", value: { name: "MARIANNE" } }]));
    expect(s.contacts).toHaveLength(1);
    expect(s.contacts[0].id).toBe("244830550");
    expect(s.contacts[0].name).toBe("MARIANNE");
  });

  it("ignores an empty-path mmsi subtree without clobbering the contact", () => {
    let s = applyDelta(emptyLiveState(), d(ctx, [{ path: "", value: { name: "MARIANNE" } }]));
    s = applyDelta(s, d(ctx, [{ path: "", value: { mmsi: "244830550" } }]));
    expect(s.contacts).toHaveLength(1);
    expect(s.contacts[0].name).toBe("MARIANNE"); // not wiped by the mmsi merge
  });

  it("sets vessel type from design.aisShipType {id,name}", () => {
    const s = applyDelta(emptyLiveState(), d(ctx, [
      { path: "design.aisShipType", value: { id: 79, name: "Cargo ship (no additional information)" } },
    ]));
    expect(s.contacts[0].type).toBe("Cargo ship (no additional information)");
  });

  it("builds a complete named target from a static report then a position report", () => {
    // VDM type 5 (static): empty-path name + ship type
    let s = applyDelta(emptyLiveState(), d(ctx, [
      { path: "", value: { name: "MARIANNE" } },
      { path: "design.aisShipType", value: { id: 79, name: "Cargo" } },
    ]));
    // VDM type 1 (position): leaf paths, SI units
    s = applyDelta(s, d(ctx, [
      { path: "navigation.position", value: { latitude: 48.1, longitude: -122.9 } },
      { path: "navigation.courseOverGroundTrue", value: Math.PI }, // 180°
      { path: "navigation.speedOverGround", value: 5 }, // 9.72 kt
    ]));
    expect(s.contacts).toHaveLength(1);
    const c = s.contacts[0];
    expect(c.name).toBe("MARIANNE");
    expect(c.type).toBe("Cargo");
    expect(c.position).toEqual({ lat: 48.1, lon: -122.9 });
    expect(c.cog).toBeCloseTo(180, 6);
    expect(c.sog).toBeCloseTo(9.719, 2);
  });
});

describe("applyDelta — rpi telemetry", () => {
  it("folds environment.rpi.* into telemetry.pi with K->C and fraction->%", () => {
    let s = applyDelta(emptyLiveState(), d(undefined, [
      { path: "environment.rpi.cpu.temperature", value: 318.15 },   // 45 C
      { path: "environment.rpi.cpu.utilisation", value: 0.37 },     // 37 %
      { path: "environment.rpi.memory.utilisation", value: 0.42 },  // 42 %
      { path: "environment.rpi.sd.utilisation", value: 0.12 },      // 12% used -> 88% free
    ]));
    expect(s.telemetry?.pi).toEqual({ cpuTempC: 45, loadPct: 37, ramPct: 42, diskFreePct: 88, undervolt: false });
  });

  it("accumulates across separate deltas (5s sample cadence)", () => {
    let s = applyDelta(emptyLiveState(), d(undefined, [{ path: "environment.rpi.cpu.temperature", value: 323.15 }]));
    s = applyDelta(s, d(undefined, [{ path: "environment.rpi.cpu.utilisation", value: 0.5 }]));
    expect(s.telemetry?.pi?.cpuTempC).toBe(50);
    expect(s.telemetry?.pi?.loadPct).toBe(50);
  });

  it("ignores non-numeric and unknown rpi paths; never invents undervolt", () => {
    const s = applyDelta(emptyLiveState(), d(undefined, [
      { path: "environment.rpi.cpu.temperature", value: 300 },
      { path: "environment.rpi.gpu.temperature", value: 305 }, // unmapped, ignored
      { path: "environment.rpi.cpu.utilisation", value: "bad" }, // non-numeric, ignored
    ]));
    expect(s.telemetry?.pi?.undervolt).toBe(false);
    expect(s.telemetry?.pi?.loadPct).toBe(0);
  });

  it("does not disturb AIS/nav routing in the same delta", () => {
    const s = applyDelta(emptyLiveState(), d(undefined, [
      { path: "navigation.position", value: { latitude: 48, longitude: -122 } },
      { path: "environment.rpi.cpu.temperature", value: 310.15 },
    ]));
    expect(s.self.position).toEqual({ lat: 48, lon: -122 });
    expect(s.telemetry?.pi?.cpuTempC).toBe(37);
  });
});
