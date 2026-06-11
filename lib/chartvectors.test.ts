import { describe, it, expect } from "vitest";
import { buildVectorFeatures, type VecSelf, type VecContact, type VecColors } from "./chartvectors";
import { bearingDeg, distanceNm } from "./geo";

const colors: VecColors = { own: "#own", danger: "#dgr", caution: "#cau", safe: "#safe" };
const self: VecSelf = { position: { lat: 48.0, lon: -122.0 }, cog: 90, sog: 6 };

const contact = (over: Partial<VecContact> = {}): VecContact => ({
  id: "t1",
  lat: 48.05,
  lon: -122.0,
  cog: 180,
  sog: 8,
  cpa: 0.3,
  tcpa: 10,
  level: "danger",
  aton: false,
  ...over,
});

const byRole = (fc: ReturnType<typeof buildVectorFeatures>, role: string) =>
  fc.features.filter((f) => f.properties.role === role);

describe("buildVectorFeatures", () => {
  it("draws an own true-motion track along COG at SOG*window", () => {
    const fc = buildVectorFeatures(self, [], null, colors);
    const own = byRole(fc, "own");
    expect(own).toHaveLength(1);
    const [a, b] = (own[0].geometry as any).coordinates;
    const A = { lat: a[1], lon: a[0] };
    const B = { lat: b[1], lon: b[0] };
    // 6 kt over the default 6 min window = 0.6 nm, heading 090
    expect(bearingDeg(A, B)).toBeCloseTo(90, 0);
    expect(distanceNm(A, B)).toBeCloseTo(0.6, 2);
    expect(own[0].properties.color).toBe(colors.own);
  });

  it("omits the own track when stopped", () => {
    const fc = buildVectorFeatures({ ...self, sog: 0 }, [], null, colors);
    expect(byRole(fc, "own")).toHaveLength(0);
  });

  it("draws threat tracks for caution/danger but not safe or AtoN", () => {
    const cs = [
      contact({ id: "d", level: "danger" }),
      contact({ id: "c", level: "caution" }),
      contact({ id: "s", level: "safe" }),
      contact({ id: "a", level: "danger", aton: true }),
    ];
    const fc = buildVectorFeatures(self, cs, null, colors);
    const threats = byRole(fc, "threat");
    expect(threats).toHaveLength(2);
    expect(threats.map((f) => f.properties.color).sort()).toEqual([colors.caution, colors.danger].sort());
  });

  it("emits a CPA ring + connector only for the selected threat", () => {
    const cs = [contact({ id: "t1" }), contact({ id: "t2", lat: 48.06 })];
    const none = buildVectorFeatures(self, cs, null, colors);
    expect(byRole(none, "cpa-ring")).toHaveLength(0);
    expect(byRole(none, "cpa-connector")).toHaveLength(0);

    const sel = buildVectorFeatures(self, cs, "t1", colors);
    expect(byRole(sel, "cpa-ring")).toHaveLength(1);
    expect(byRole(sel, "cpa-connector")).toHaveLength(1);

    // ring sits where the target will be at TCPA: from its position, along its
    // COG, for sog*tcpa/60 nm.
    const c = cs[0];
    const ring = byRole(sel, "cpa-ring")[0];
    const [lon, lat] = (ring.geometry as any).coordinates;
    const expectedDist = (c.sog * c.tcpa) / 60;
    expect(distanceNm({ lat: c.lat, lon: c.lon }, { lat, lon })).toBeCloseTo(expectedDist, 2);
    expect(bearingDeg({ lat: c.lat, lon: c.lon }, { lat, lon })).toBeCloseTo(c.cog, 0);
  });

  it("skips the CPA marker when TCPA is non-positive or infinite", () => {
    const past = buildVectorFeatures(self, [contact({ tcpa: 0 })], "t1", colors);
    expect(byRole(past, "cpa-ring")).toHaveLength(0);
    const opening = buildVectorFeatures(self, [contact({ tcpa: Infinity })], "t1", colors);
    expect(byRole(opening, "cpa-ring")).toHaveLength(0);
  });

  it("honours a custom vector window", () => {
    const fc = buildVectorFeatures(self, [], null, colors, { vectorMin: 12 });
    const [a, b] = (byRole(fc, "own")[0].geometry as any).coordinates;
    // 6 kt over 12 min = 1.2 nm
    expect(distanceNm({ lat: a[1], lon: a[0] }, { lat: b[1], lon: b[0] })).toBeCloseTo(1.2, 2);
  });
});
