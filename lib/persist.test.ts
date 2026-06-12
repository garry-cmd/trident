import { describe, it, expect } from "vitest";
import { sanitize } from "./persist";
import { DEFAULT_THRESHOLDS } from "./settings";

describe("sanitize", () => {
  it("returns empty for non-objects", () => {
    expect(sanitize(null)).toEqual({});
    expect(sanitize(undefined)).toEqual({});
    expect(sanitize("nope")).toEqual({});
    expect(sanitize(42)).toEqual({});
  });

  it("keeps valid known fields", () => {
    const s = sanitize({
      theme: "night",
      depthUnit: "m",
      displayMode: "north-up",
      alarmEnabled: false,
      filterRange: 2,
    });
    expect(s.theme).toBe("night");
    expect(s.depthUnit).toBe("m");
    expect(s.displayMode).toBe("north-up");
    expect(s.alarmEnabled).toBe(false);
    expect(s.filterRange).toBe(2);
  });

  it("drops invalid enum values", () => {
    const s = sanitize({ theme: "rainbow", depthUnit: "furlongs", displayMode: "spin" });
    expect(s.theme).toBeUndefined();
    expect(s.depthUnit).toBeUndefined();
    expect(s.displayMode).toBeUndefined();
  });

  it("ignores unknown keys and never restores paused/viewRange", () => {
    const s = sanitize({ hackerField: 1, paused: true, viewRange: 99 });
    expect(s).toEqual({});
  });

  it("merges thresholds onto defaults and clamps to bounds", () => {
    const s = sanitize({ thresholds: { cpaCaution: 999, tcpaAlert: 10 } });
    expect(s.thresholds?.cpaCaution).toBe(3); // clamped to max
    expect(s.thresholds?.tcpaAlert).toBe(10);
    expect(s.thresholds?.guardNm).toBe(DEFAULT_THRESHOLDS.guardNm); // missing -> default
  });

  it("keeps the danger band inside the caution band", () => {
    const s = sanitize({ thresholds: { cpaCaution: 0.6, cpaDanger: 1.5 } });
    expect(s.thresholds!.cpaDanger).toBeLessThanOrEqual(s.thresholds!.cpaCaution);
  });

  it("drops non-finite numbers", () => {
    const s = sanitize({ filterRange: NaN, thresholds: { cpaCaution: Infinity } });
    expect(s.filterRange).toBeUndefined();
    expect(s.thresholds?.cpaCaution).toBe(DEFAULT_THRESHOLDS.cpaCaution);
  });
});

describe("sanitize — alarms", () => {
  it("merges onto defaults, clamps to bounds, fences lost>stale and danger>=caution", () => {
    const s = sanitize({ alarms: { piTempCaution: 999, feedStaleSec: 40, feedLostSec: 20, baroFallCaution: 5, baroFallDanger: 2 } });
    expect(s.alarms?.piTempCaution).toBe(90); // clamped to max
    expect(s.alarms?.feedStaleSec).toBe(40);
    expect(s.alarms!.feedLostSec).toBeGreaterThan(s.alarms!.feedStaleSec); // fenced
    expect(s.alarms!.baroFallDanger).toBeGreaterThanOrEqual(s.alarms!.baroFallCaution); // fenced
  });
  it("fills missing alarm keys from defaults", () => {
    const s = sanitize({ alarms: { battMinV: 12.5 } });
    expect(s.alarms?.battMinV).toBe(12.5);
    expect(s.alarms?.piTempCaution).toBe(80); // default
  });
});
