// Tests for lib/capture/downsample.ts — the downsample-on-sync reducer.
import { describe, it, expect } from "vitest";
import { downsample, DEFAULT_DOWNSAMPLE } from "./downsample";
import type { TrackPoint } from "./types";

const pt = (ts: number, cog = 180): TrackPoint => ({
  passageId: "p", ts, lat: 47.9, lon: -125.1, sog: 6, cog,
});

describe("downsample", () => {
  it("returns short tracks unchanged", () => {
    const pts = [pt(0), pt(1000)];
    expect(downsample(pts)).toEqual(pts);
  });

  it("thins ~5s points to ~1/min, keeping first and last", () => {
    // 0..300s at 5s spacing = 61 points; expect ~1/min ≈ 6, plus endpoints.
    const pts = Array.from({ length: 61 }, (_, i) => pt(i * 5000));
    const out = downsample(pts);
    expect(out[0].ts).toBe(0);
    expect(out[out.length - 1].ts).toBe(300_000);
    expect(out.length).toBeGreaterThanOrEqual(5);
    expect(out.length).toBeLessThanOrEqual(8);
    // every kept interior gap respects the target spacing
    for (let i = 1; i < out.length - 1; i++) {
      expect(out[i].ts - out[i - 1].ts).toBeGreaterThanOrEqual(DEFAULT_DOWNSAMPLE.intervalMs);
    }
  });

  it("force-keeps a sharp turn even within the time window", () => {
    const pts = [pt(0, 180), pt(5000, 180), pt(10_000, 250), pt(15_000, 250), pt(20_000, 250)];
    const out = downsample(pts);
    // the 70° turn at t=10s must survive despite being <60s from the first point
    expect(out.some((p) => p.ts === 10_000)).toBe(true);
  });
});
