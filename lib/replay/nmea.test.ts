// The GPS/instrument builders, proven two ways: field formatting is checked
// directly, and every sentence is round-tripped through the REAL Signal K
// NMEA 0183 parser (@signalk/nmea0183-signalk — the exact library the SK
// server on the Pi uses) to assert it decodes to the paths and values
// applyDelta consumes. If the parser and our encoders ever disagree, these
// tests break on the bench instead of at the dock.
import { describe, it, expect } from "vitest";
import Parser from "@signalk/nmea0183-signalk";
import { checksum, frame, nmeaLat, nmeaLon, rmc, hdg, dpt } from "./nmea";

const R2D = 180 / Math.PI;

function values(sentence: string): { path: string; value: unknown }[] {
  const d = new Parser().parse(sentence);
  return (d?.updates ?? []).flatMap((u) => u.values ?? []);
}
const get = (vs: { path: string; value: unknown }[], path: string) =>
  vs.find((v) => v.path === path)?.value;

describe("framing", () => {
  it("computes the standard XOR checksum", () => {
    // Known-good reference sentence
    expect(checksum("GPGLL,4916.45,N,12311.12,W,225444,A,")).toBe("1D");
  });

  it("frames with lead char and checksum", () => {
    expect(frame("XX,1")).toMatch(/^\$XX,1\*[0-9A-F]{2}$/);
  });
});

describe("coordinate formatting", () => {
  it("encodes ddmm.mmmm with hemisphere", () => {
    expect(nmeaLat(20.658333)).toEqual({ v: "2039.5000", h: "N" });
    expect(nmeaLon(-105.254167)).toEqual({ v: "10515.2500", h: "W" });
    expect(nmeaLat(-9.05)).toEqual({ v: "0903.0000", h: "S" });
  });
});

describe("round-trip through the real SK parser", () => {
  it("RMC → position, COG, SOG", () => {
    const vs = values(rmc(0, { lat: 20.72, lon: -105.4, cogT: 242, sogKt: 5.4 }));
    const pos = get(vs, "navigation.position") as { latitude: number; longitude: number };
    expect(pos.latitude).toBeCloseTo(20.72, 5);
    expect(pos.longitude).toBeCloseTo(-105.4, 5);
    expect((get(vs, "navigation.courseOverGroundTrue") as number) * R2D).toBeCloseTo(242, 1);
    expect((get(vs, "navigation.speedOverGround") as number) * 1.943844).toBeCloseTo(5.4, 1);
  });

  it("HDG with variation → navigation.headingTrue (the path applySelf reads)", () => {
    const vs = values(hdg(234, 8)); // 234 mag + 8E = 242 true
    expect((get(vs, "navigation.headingTrue") as number) * R2D).toBeCloseTo(242, 1);
  });

  it("DPT → environment.depth.belowTransducer", () => {
    const vs = values(dpt(12.5));
    expect(get(vs, "environment.depth.belowTransducer")).toBeCloseTo(12.5, 3);
  });
});
