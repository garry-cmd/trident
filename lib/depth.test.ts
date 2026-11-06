import { describe, it, expect } from "vitest";
import { keelDepth } from "./depth";

describe("keelDepth", () => {
  it("subtracts the transducer-to-keel offset (Irene: 12.1 ft read = 8.1 ft under the keel)", () => {
    const ft = 0.3048;
    const r = keelDepth({ depth: 12.1 * ft }, 4 * ft);
    expect(r.ref).toBe("keel");
    expect(r.m / ft).toBeCloseTo(8.1, 6);
  });
  it("labels the raw value as below the sensor when no offset is set", () => {
    expect(keelDepth({ depth: 3 }, 0)).toEqual({ m: 3, ref: "sensor" });
  });
  it("prefers Signal K's own below-keel value", () => {
    expect(keelDepth({ depth: 3, depthKeel: 1.5 }, 1.2)).toEqual({ m: 1.5, ref: "keel" });
  });
  it("no reading stays no reading", () => {
    expect(Number.isNaN(keelDepth({ depth: NaN }, 1.2).m)).toBe(true);
  });
  it("can go negative (aground) rather than clamping to a reassuring zero", () => {
    expect(keelDepth({ depth: 1 }, 1.2).m).toBeCloseTo(-0.2, 6);
  });
});
