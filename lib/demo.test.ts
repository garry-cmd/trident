import { describe, it, expect } from "vitest";
import { demoTelemetry, EMPTY_TELEMETRY } from "./demo";

describe("EMPTY_TELEMETRY", () => {
  it("has every block null (fully gated)", () => {
    for (const v of Object.values(EMPTY_TELEMETRY)) expect(v).toBeNull();
  });
});

describe("demoTelemetry", () => {
  it("populates every block with finite, plausible values", () => {
    const tel = demoTelemetry(123_456);
    expect(tel.battery).not.toBeNull();
    expect(tel.battery!.soc).toBeGreaterThanOrEqual(0);
    expect(tel.battery!.soc).toBeLessThanOrEqual(100);
    expect(Number.isFinite(tel.battery!.voltage)).toBe(true);
    expect(tel.solar!.watts).toBeGreaterThanOrEqual(0); // solar never negative
    expect(tel.baro!.history).toHaveLength(24);
    expect(Number.isFinite(tel.baro!.mb)).toBe(true);
    expect(tel.wind!.dirDeg).toBeGreaterThanOrEqual(0);
    expect(tel.wind!.dirDeg).toBeLessThan(360);
    expect(tel.pi!.undervolt).toBe(false);
    expect(tel.depthM).toBeGreaterThan(0);
  });

  it("varies over time (it's a live-feeling feed)", () => {
    const a = demoTelemetry(0);
    const b = demoTelemetry(300_000);
    expect(a.battery!.soc !== b.battery!.soc || a.baro!.mb !== b.baro!.mb).toBe(true);
  });
});
