import { describe, it, expect } from "vitest";
import { anchorStatus, maxSwingM, ANCHOR_UNSET, NM_TO_M, type AnchorState } from "./anchor";
import { project } from "./geo";
import type { LatLon } from "./types";

const SET: LatLon = { lat: 19.7, lon: -105.3 };
const base = (over: Partial<AnchorState> = {}): AnchorState => ({
  setPoint: SET,
  setAt: 1000,
  alarmRadiusM: 40,
  ...over,
});

describe("anchorStatus", () => {
  it("returns the inactive state when no point is set", () => {
    expect(anchorStatus(SET, base({ setPoint: null }))).toEqual(ANCHOR_UNSET);
  });

  it("is zero distance and not dragging at the set point", () => {
    const s = anchorStatus(SET, base());
    expect(s.set).toBe(true);
    expect(s.distanceM).toBeCloseTo(0, 3);
    expect(s.dragging).toBe(false);
    expect(s.fraction).toBeCloseTo(0, 3);
  });

  it("measures distance in metres and bears back to the set point", () => {
    // Boat 30 m due north of the set point.
    const boat = project(SET, 0, 30 / NM_TO_M);
    const s = anchorStatus(boat, base());
    expect(s.distanceM).toBeCloseTo(30, 0); // within ~1 m
    expect(s.bearingToSetDeg).toBeCloseTo(180, 0); // set point lies due south of the boat
    expect(s.dragging).toBe(false); // 30 < 40
    expect(s.fraction).toBeCloseTo(30 / 40, 1);
  });

  it("flags dragging once distance exceeds the alarm radius", () => {
    const boat = project(SET, 90, 50 / NM_TO_M); // 50 m east, radius 40
    const s = anchorStatus(boat, base());
    expect(s.distanceM).toBeCloseTo(50, 0);
    expect(s.dragging).toBe(true);
    expect(s.fraction).toBeGreaterThan(1);
  });

  it("guards against a zero alarm radius", () => {
    const boat = project(SET, 0, 10 / NM_TO_M);
    const s = anchorStatus(boat, base({ alarmRadiusM: 0 }));
    expect(Number.isFinite(s.fraction)).toBe(true);
    expect(s.dragging).toBe(true); // any distance exceeds a 0 m radius
  });
});

describe("maxSwingM", () => {
  it("keeps the running maximum", () => {
    let m = 0;
    m = maxSwingM(m, 12);
    m = maxSwingM(m, 8);
    m = maxSwingM(m, 21);
    m = maxSwingM(m, 19);
    expect(m).toBe(21);
  });
});

describe("anchorStatus — no fix", () => {
  it("reports set+noFix (never a false drag) when position is null-island", () => {
    const s = anchorStatus({ lat: 0, lon: 0 }, base());
    expect(s.set).toBe(true);
    expect(s.noFix).toBe(true);
    expect(s.dragging).toBe(false);
    expect(s.distanceM).toBe(0);
  });
  it("treats non-finite position as no fix", () => {
    const s = anchorStatus({ lat: NaN, lon: NaN }, base());
    expect(s.noFix).toBe(true);
    expect(s.dragging).toBe(false);
  });
});
