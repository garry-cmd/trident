import { describe, it, expect } from "vitest";
import { formatDepth, formatLatLon, toDist, fromDist, distValue, distLabel, distStep, snapDist } from "./units";

describe("formatDepth", () => {
  it("passes metres through", () => {
    expect(formatDepth(24, "m")).toEqual({ value: "24.0", unit: "m" });
  });
  it("converts metres to feet", () => {
    // 24 m * 3.28084 = 78.74 ft
    expect(formatDepth(24, "ft")).toEqual({ value: "78.7", unit: "ft" });
  });
  it("drops the decimal at/above 100", () => {
    expect(formatDepth(40, "ft")).toEqual({ value: "131", unit: "ft" }); // 131.2 -> 131
  });
  it("handles non-finite", () => {
    expect(formatDepth(NaN, "m").value).toBe("\u2014");
  });
});

describe("formatLatLon", () => {
  it("formats N/W with zero-padded minutes", () => {
    // 48.05 -> 48\u00B003.0'N ; -122.95 -> 122\u00B057.0'W
    expect(formatLatLon(48.05, -122.95)).toBe("48\u00B003.0'N 122\u00B057.0'W");
  });
  it("uses S/E for negative lat / positive lon", () => {
    expect(formatLatLon(-33.5, 151.25)).toBe("33\u00B030.0'S 151\u00B015.0'E");
  });
});

describe("anchor distance units", () => {
  it("round-trips metres through either unit", () => {
    for (const u of ["ft", "m"] as const) {
      expect(fromDist(toDist(42.5, u), u)).toBeCloseTo(42.5, 6);
    }
  });

  it("converts metres to feet for display", () => {
    expect(distValue(55, "ft")).toBe(180); // 55 m -> 180 ft
    expect(distValue(55, "m")).toBe(55);
    expect(distLabel("ft")).toBe("ft");
  });

  it("steps by round numbers in whatever unit is on screen", () => {
    expect(distStep("ft")).toBe(10);
    expect(distStep("m")).toBe(5);
  });

  // The stepper must land on clean displayed numbers, not on the awkward
  // conversion of the other unit's step (35 m is 114.8 ft; +10 ft must read 120,
  // not 124.8).
  it("snaps to whole display-unit steps and returns metres", () => {
    const next = snapDist(35, "ft", 1);
    expect(distValue(next, "ft")).toBe(120);
    expect(distValue(snapDist(35, "ft", -1), "ft")).toBe(100);
    expect(snapDist(37, "m", 1)).toBeCloseTo(40, 6);
  });

  it("snaps with no delta without drifting the stored value off a clean step", () => {
    const a = snapDist(35, "ft", 0);
    expect(snapDist(a, "ft", 0)).toBeCloseTo(a, 6);
  });
});
