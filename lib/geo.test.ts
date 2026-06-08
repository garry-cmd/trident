// Tests for lib/geo.ts. The critical property is the round-trip: project a
// point along a bearing/distance, and bearingDeg/distanceNm must recover them —
// that's what lets the simulator seed contacts at exact bearings from own.
import { describe, it, expect } from "vitest";
import { distanceNm, bearingDeg, project } from "./geo";

describe("distanceNm", () => {
  it("is zero for the same point", () => {
    expect(distanceNm({ lat: 48, lon: -122 }, { lat: 48, lon: -122 })).toBeCloseTo(0, 9);
  });
  it("makes 1 degree of latitude ~60 nm", () => {
    expect(distanceNm({ lat: 48, lon: -122 }, { lat: 49, lon: -122 })).toBeCloseTo(60.04, 1);
  });
});

describe("bearingDeg", () => {
  it("reads due north as 0 and due east as ~90", () => {
    expect(bearingDeg({ lat: 48, lon: -122 }, { lat: 49, lon: -122 })).toBeCloseTo(0, 6);
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90, 6);
  });
  it("returns a value in [0, 360)", () => {
    const b = bearingDeg({ lat: 48, lon: -122 }, { lat: 47, lon: -123 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("project — round-trips with bearingDeg + distanceNm", () => {
  const from = { lat: 48.05, lon: -122.95 };
  // Angular difference mod 360, so a due-north result of 359.999… reads as 0.
  const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  for (const [brg, dist] of [[128, 1.4], [42, 2.6], [312, 2.8], [0, 5], [270, 3]] as const) {
    it(`brg ${brg} / ${dist}nm recovers exactly`, () => {
      const dest = project(from, brg, dist);
      expect(angDiff(bearingDeg(from, dest), brg)).toBeCloseTo(0, 4);
      expect(distanceNm(from, dest)).toBeCloseTo(dist, 4);
    });
  }

  it("keeps longitude normalised to [-180, 180]", () => {
    const dest = project({ lat: 0, lon: 179.9 }, 90, 60);
    expect(dest.lon).toBeGreaterThanOrEqual(-180);
    expect(dest.lon).toBeLessThanOrEqual(180);
  });
});
