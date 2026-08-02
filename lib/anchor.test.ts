import { describe, it, expect } from "vitest";
import {
  anchorStatus, anchorAhead, anchorAtBow, radiusForRode,
  evalDrag, breachMs, DRAG_INIT, DEFAULT_DRAG, IRENE,
  ANCHOR_UNSET, NM_TO_M, type AnchorState, type DragState,
} from "./anchor";
import { project, distanceNm, bearingDeg } from "./geo";
import type { LatLon } from "./types";

const SET: LatLon = { lat: 19.7, lon: -105.3 };
const base = (over: Partial<AnchorState> = {}): AnchorState => ({
  setPoint: SET,
  setAt: 1000,
  rodeM: 35,
  alarmRadiusM: 40,
  ...over,
});
const dragging: DragState = { dragging: true, outsideSince: 0, insideSince: null };

describe("anchorStatus", () => {
  it("returns the inactive state when no point is set", () => {
    expect(anchorStatus(SET, base({ setPoint: null }))).toEqual(ANCHOR_UNSET);
  });

  it("is zero distance with full room at the anchor", () => {
    const s = anchorStatus(SET, base());
    expect(s.set).toBe(true);
    expect(s.distanceM).toBeCloseTo(0, 3);
    expect(s.roomM).toBeCloseTo(40, 3);
    expect(s.dragging).toBe(false);
    expect(s.level).toBe("holding");
  });

  it("measures distance in metres and bears back to the anchor", () => {
    const boat = project(SET, 0, 30 / NM_TO_M); // 30 m due north of the hook
    const s = anchorStatus(boat, base());
    expect(s.distanceM).toBeCloseTo(30, 0);
    expect(s.bearingToSetDeg).toBeCloseTo(180, 0); // hook lies due south of the boat
    expect(s.roomM).toBeCloseTo(10, 0);
    expect(s.fraction).toBeCloseTo(30 / 40, 1);
  });

  it("reports caution inside the ring but near it", () => {
    const boat = project(SET, 45, 36 / NM_TO_M); // 0.9 of a 40 m radius
    expect(anchorStatus(boat, base()).level).toBe("caution");
  });

  // The whole point of the confirmation machine: crossing the ring is NOT the
  // alarm. A GPS spike puts you outside for one fix; only a sustained breach
  // (evalDrag) sets dragging, and anchorStatus reports what it was told.
  it("does not flag dragging on distance alone", () => {
    const boat = project(SET, 90, 50 / NM_TO_M);
    const s = anchorStatus(boat, base());
    expect(s.fraction).toBeGreaterThan(1);
    expect(s.dragging).toBe(false);
    expect(s.roomM).toBeLessThan(0);
  });

  it("reports dragging when the confirmed drag state says so", () => {
    const boat = project(SET, 90, 50 / NM_TO_M);
    const s = anchorStatus(boat, base(), dragging);
    expect(s.dragging).toBe(true);
    expect(s.level).toBe("dragging");
  });

  it("reports NO FIX rather than a huge false drag at null island", () => {
    const s = anchorStatus({ lat: 0, lon: 0 }, base(), dragging);
    expect(s.noFix).toBe(true);
    expect(s.dragging).toBe(false);
    expect(s.level).toBe("nofix");
    expect(s.distanceM).toBe(0);
  });

  it("guards against a zero alarm radius", () => {
    const boat = project(SET, 0, 10 / NM_TO_M);
    const s = anchorStatus(boat, base({ alarmRadiusM: 0 }));
    expect(Number.isFinite(s.fraction)).toBe(true);
  });
});

describe("placing the anchor", () => {
  it("puts the hook ahead of the bow by the rode when set after backing down", () => {
    const boat: LatLon = { lat: 19.7, lon: -105.3 };
    const hook = anchorAhead(boat, 0, 35, IRENE); // heading due north
    const d = distanceNm(boat, hook) * NM_TO_M;
    expect(d).toBeCloseTo(35 + IRENE.bowOffsetM, 0);
    // Ahead, not astern. Bearing wraps, so compare the signed difference.
    const off = ((bearingDeg(boat, hook) + 180) % 360) - 180;
    expect(Math.abs(off)).toBeLessThan(0.5);
  });

  it("puts the hook one bow-offset ahead when dropping under the bow", () => {
    const boat: LatLon = { lat: 19.7, lon: -105.3 };
    const hook = anchorAtBow(boat, 270, IRENE);
    expect(distanceNm(boat, hook) * NM_TO_M).toBeCloseTo(IRENE.bowOffsetM, 0);
    expect(bearingDeg(boat, hook)).toBeCloseTo(270, 0);
  });

  // Irene's antenna is 38 ft aft of the bow on a 40 ft boat, so the classic
  // "rode + LOA" rule (which assumes a bow antenna) is the wrong number.
  it("derives the radius from the rode plus the GPS-to-bow offset, not LOA", () => {
    expect(radiusForRode(35, IRENE)).toBe(Math.round((35 + 11.6 + 5) / 5) * 5);
    expect(radiusForRode(35, IRENE)).toBeGreaterThan(35 + IRENE.loaM * 0.5);
  });

  it("never returns a negative radius for a nonsense rode", () => {
    expect(radiusForRode(-10, IRENE)).toBeGreaterThan(0);
  });

  it("keeps a boat settled on its rode inside the ring it derived", () => {
    const boat: LatLon = { lat: 19.7, lon: -105.3 };
    const rode = 35;
    const hook = anchorAhead(boat, 30, rode, IRENE);
    const s = anchorStatus(boat, base({ setPoint: hook, alarmRadiusM: radiusForRode(rode, IRENE) }));
    expect(s.fraction).toBeLessThan(1); // settled, not alarming
    expect(s.roomM).toBeGreaterThan(0);
  });
});

describe("evalDrag", () => {
  const t0 = 1_000_000;
  const sustain = DEFAULT_DRAG.breachSustainMs;

  it("stays quiet inside the ring", () => {
    const d = evalDrag(DRAG_INIT, 0.8, t0);
    expect(d.dragging).toBe(false);
    expect(d.outsideSince).toBeNull();
  });

  it("does not alarm on a single fix outside the ring", () => {
    const d = evalDrag(DRAG_INIT, 1.4, t0);
    expect(d.dragging).toBe(false);
    expect(d.outsideSince).toBe(t0);
  });

  it("commits the alarm only after a sustained breach", () => {
    let d = evalDrag(DRAG_INIT, 1.2, t0);
    d = evalDrag(d, 1.3, t0 + sustain - 1);
    expect(d.dragging).toBe(false);
    d = evalDrag(d, 1.3, t0 + sustain);
    expect(d.dragging).toBe(true);
  });

  it("resets the breach clock when the boat comes back inside — a spike never accumulates", () => {
    let d = evalDrag(DRAG_INIT, 1.5, t0);          // spike out
    d = evalDrag(d, 0.7, t0 + 1000);               // back in
    expect(d.outsideSince).toBeNull();
    d = evalDrag(d, 1.5, t0 + 2000);               // out again
    d = evalDrag(d, 1.5, t0 + sustain);            // not yet sustain from THIS breach
    expect(d.dragging).toBe(false);
  });

  it("holds the alarm while still outside, and does not release at the ring itself", () => {
    let d: DragState = { dragging: true, outsideSince: t0, insideSince: null };
    d = evalDrag(d, 0.95, t0 + 10_000); // inside the ring but above clearFraction
    expect(d.dragging).toBe(true);
    d = evalDrag(d, 0.95, t0 + 10_000 + DEFAULT_DRAG.clearSustainMs);
    expect(d.dragging).toBe(true);
  });

  it("releases only after a sustained return well inside the ring", () => {
    let d: DragState = { dragging: true, outsideSince: t0, insideSince: null };
    d = evalDrag(d, 0.5, t0 + 1000);
    expect(d.dragging).toBe(true);
    d = evalDrag(d, 0.5, t0 + 1000 + DEFAULT_DRAG.clearSustainMs);
    expect(d.dragging).toBe(false);
    expect(d.outsideSince).toBeNull();
  });

  it("restarts the recovery clock if it goes back out mid-release", () => {
    let d: DragState = { dragging: true, outsideSince: t0, insideSince: null };
    d = evalDrag(d, 0.5, t0 + 1000);
    d = evalDrag(d, 1.2, t0 + 2000); // back outside
    expect(d.insideSince).toBeNull();
    d = evalDrag(d, 0.5, t0 + 3000);
    d = evalDrag(d, 0.5, t0 + 3000 + DEFAULT_DRAG.clearSustainMs - 1);
    expect(d.dragging).toBe(true);
  });

  it("reports how long the current breach has run", () => {
    const d = evalDrag(DRAG_INIT, 1.1, t0);
    expect(breachMs(d, t0 + 25_000)).toBe(25_000);
    expect(breachMs(DRAG_INIT, t0)).toBe(0);
  });
});
