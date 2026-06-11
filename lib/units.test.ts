import { describe, it, expect } from "vitest";
import { formatDepth, formatLatLon } from "./units";

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
