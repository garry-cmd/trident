import { describe, it, expect } from "vitest";
import {
  appendCrumb, pruneTrail, decimate, sanitizeTrail, trailMaxDistM,
  DEFAULT_TRAIL, type Crumb,
} from "./track";
import { project } from "./geo";
import type { LatLon } from "./types";

const NM_TO_M = 1852;
const HOOK: LatLon = { lat: 19.7, lon: -105.3 };
const t0 = 1_700_000_000_000;
const at = (brg: number, m: number, ts: number): Crumb => {
  const p = project(HOOK, brg, m / NM_TO_M);
  return { lat: p.lat, lon: p.lon, ts };
};

describe("appendCrumb", () => {
  it("takes the first fix", () => {
    const t = appendCrumb([], HOOK, t0);
    expect(t).toHaveLength(1);
  });

  // A boat sitting still on a 1 Hz feed would otherwise stack 43k identical
  // points over a night and erase the shape under its own ink.
  it("ignores a fix that has neither moved nor waited", () => {
    const t = appendCrumb([], HOOK, t0);
    const next = appendCrumb(t, HOOK, t0 + 1000);
    expect(next).toBe(t); // SAME reference — no re-render
  });

  it("takes a fix that has moved far enough", () => {
    const t = appendCrumb([], HOOK, t0);
    const moved = project(HOOK, 90, 5 / NM_TO_M);
    expect(appendCrumb(t, moved, t0 + 1000)).toHaveLength(2);
  });

  it("takes a fix that has waited long enough even without moving", () => {
    const t = appendCrumb([], HOOK, t0);
    expect(appendCrumb(t, HOOK, t0 + DEFAULT_TRAIL.minGapMs)).toHaveLength(2);
  });

  it("rejects null island and non-finite fixes", () => {
    expect(appendCrumb([], { lat: 0, lon: 0 }, t0)).toHaveLength(0);
    expect(appendCrumb([], { lat: NaN, lon: 1 }, t0)).toHaveLength(0);
  });

  // Signal K replays cached deltas with their ORIGINAL timestamps on reconnect;
  // an out-of-order crumb would draw a streak backwards through the fan.
  it("ignores an out-of-order fix", () => {
    const t = appendCrumb([], HOOK, t0);
    const moved = project(HOOK, 90, 20 / NM_TO_M);
    expect(appendCrumb(t, moved, t0 - 5000)).toBe(t);
  });

  it("prunes the window as it appends", () => {
    const old: Crumb[] = [at(0, 10, t0 - DEFAULT_TRAIL.windowMs - 1)];
    const moved = project(HOOK, 90, 20 / NM_TO_M);
    const next = appendCrumb(old, moved, t0);
    expect(next).toHaveLength(1);
    expect(next[0].ts).toBe(t0);
  });
});

describe("pruneTrail", () => {
  it("drops crumbs older than the window and keeps the rest", () => {
    const trail = [
      at(0, 10, t0 - DEFAULT_TRAIL.windowMs - 60_000),
      at(90, 10, t0 - 1000),
      at(180, 10, t0),
    ];
    expect(pruneTrail(trail, t0)).toHaveLength(2);
  });

  it("returns the same reference when nothing ages out", () => {
    const trail = [at(0, 10, t0)];
    expect(pruneTrail(trail, t0)).toBe(trail);
  });
});

describe("decimate", () => {
  it("leaves a trail under the cap alone", () => {
    const trail = [at(0, 10, t0)];
    expect(decimate(trail)).toBe(trail);
  });

  // Recent detail is what you're reading at 2am; an hour-old arc survives fine
  // at half resolution.
  it("halves the oldest portion and keeps the newest intact", () => {
    const n = DEFAULT_TRAIL.maxPoints + 100;
    const trail = Array.from({ length: n }, (_, i) => at(i % 360, 10, t0 + i * 1000));
    const out = decimate(trail);
    expect(out.length).toBeLessThan(n);
    expect(out[out.length - 1].ts).toBe(trail[n - 1].ts); // newest survives
    expect(out.length).toBeGreaterThanOrEqual(Math.floor(n / 2));
  });
});

describe("sanitizeTrail", () => {
  it("returns empty for anything that isn't an array", () => {
    expect(sanitizeTrail(null, t0)).toEqual([]);
    expect(sanitizeTrail({ lat: 1 }, t0)).toEqual([]);
  });

  it("drops malformed crumbs, sorts, and prunes", () => {
    const raw = [
      { lat: 1, lon: 2 },                                  // no ts
      { lat: "x", lon: 2, ts: t0 },                        // bad lat
      at(0, 10, t0),
      at(90, 10, t0 - 5000),
      at(180, 10, t0 - DEFAULT_TRAIL.windowMs - 1),        // aged out
    ];
    const out = sanitizeTrail(raw, t0);
    expect(out).toHaveLength(2);
    expect(out[0].ts).toBeLessThan(out[1].ts);
  });
});

describe("trailMaxDistM", () => {
  it("finds the farthest crumb from the hook", () => {
    const trail = [at(0, 12, t0), at(90, 41, t0 + 1), at(180, 8, t0 + 2)];
    expect(trailMaxDistM(trail, HOOK)).toBeCloseTo(41, 0);
  });

  it("is zero for an empty trail", () => {
    expect(trailMaxDistM([], HOOK)).toBe(0);
  });
});
