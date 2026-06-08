// Tests for lib/ais.ts — the collision math. A bug here is a missed collision
// warning, so every geometry is hand-derived and asserted against a known
// answer, never against the implementation's own output.
//
// Coordinate convention under test:
//   cpaTcpa is frame-agnostic (r and v just share one frame).
//   enrichTarget emits the SCREEN frame: x = East, y = -North (north is up).
import { describe, it, expect } from "vitest";
import {
  cpaTcpa,
  threat,
  tColor,
  relativeVelocity,
  enrichTarget,
  enrichTargets,
  CPA_DANGER,
  CPA_CAUTION,
} from "./ais";
import type { Target, OwnVessel } from "./types";

// Own vessel sitting still, pointing north — makes a target's relative motion
// equal to its absolute motion, so geometries are easy to reason about.
const STILL: OwnVessel = { sog: 0, cog: 0, heading: 0, depth: 0 };

describe("cpaTcpa — closest point of approach + time", () => {
  it("head-on: target 1nm ahead closing at 1nm/min hits at t=1", () => {
    // r=(0,1), v=(0,-1): straight in toward the origin.
    const { cpa, tcpa } = cpaTcpa(0, 1, 0, -1);
    expect(cpa).toBeCloseTo(0, 10);
    expect(tcpa).toBeCloseTo(1, 10);
  });

  it("crossing: passes 1nm ahead at t=1", () => {
    // r=(-1,1), v=(1,0): moving east, crosses the y-axis 1nm 'up'.
    const { cpa, tcpa } = cpaTcpa(-1, 1, 1, 0);
    expect(cpa).toBeCloseTo(1, 10);
    expect(tcpa).toBeCloseTo(1, 10);
  });

  it("opening: target already moving away -> tcpa clamped to 0, cpa = current range", () => {
    // r=(0,1), v=(0,1): receding. dv>0 => t<0 => clamp.
    const { cpa, tcpa } = cpaTcpa(0, 1, 0, 1);
    expect(tcpa).toBe(0);
    expect(cpa).toBeCloseTo(1, 10);
  });

  it("parallel / zero relative velocity -> never approaches", () => {
    const { cpa, tcpa } = cpaTcpa(0, 2, 0, 0);
    expect(cpa).toBeCloseTo(2, 10);
    expect(tcpa).toBe(Infinity);
  });

  it("oblique approach: r=(3,4), v=(-1,0) -> cpa=4 at t=3", () => {
    // Closest when x-component zeroes out: x(t)=3-t=0 at t=3, y stays 4.
    const { cpa, tcpa } = cpaTcpa(3, 4, -1, 0);
    expect(tcpa).toBeCloseTo(3, 10);
    expect(cpa).toBeCloseTo(4, 10);
  });

  it("near-zero velocity below threshold is treated as stationary", () => {
    const { cpa, tcpa } = cpaTcpa(1, 1, 1e-4, 1e-4); // v2 = 2e-8 < 1e-5
    expect(tcpa).toBe(Infinity);
    expect(cpa).toBeCloseTo(Math.hypot(1, 1), 10);
  });
});

describe("threat — CPA banding", () => {
  it("classifies the three bands", () => {
    expect(threat(0.2)).toBe("danger");
    expect(threat(0.75)).toBe("caution");
    expect(threat(2)).toBe("safe");
  });

  it("boundaries are half-open: DANGER lower bound is caution, CAUTION upper bound is safe", () => {
    expect(threat(CPA_DANGER)).toBe("caution"); // 0.5 exactly
    expect(threat(CPA_DANGER - 1e-9)).toBe("danger");
    expect(threat(CPA_CAUTION)).toBe("safe"); // 1.0 exactly
    expect(threat(CPA_CAUTION - 1e-9)).toBe("caution");
  });

  it("respects injected custom thresholds (Settings can retune the bands)", () => {
    const tight = { cpaCaution: 0.4, cpaDanger: 0.2, guardNm: 1, tcpaAlert: 6 };
    // 0.7nm is caution under the default 1.0 caution band but...
    expect(threat(0.7)).toBe("caution");
    // ...safe under a tightened 0.4nm caution band.
    expect(threat(0.7, tight)).toBe("safe");
    expect(threat(0.3, tight)).toBe("caution");
    expect(threat(0.1, tight)).toBe("danger");
  });
});

describe("tColor — threat to token", () => {
  it("maps each level to its bright token var", () => {
    expect(tColor("danger")).toBe("var(--danger-br)");
    expect(tColor("caution")).toBe("var(--caution-br)");
    expect(tColor("safe")).toBe("var(--safe-br)");
  });
});

describe("relativeVelocity — target minus own, East/North, nm/min", () => {
  it("60kt due north with own still -> 1 nm/min north", () => {
    const v = relativeVelocity({ cog: 0, sog: 60 }, STILL);
    expect(v.e).toBeCloseTo(0, 10);
    expect(v.n).toBeCloseTo(1, 10);
  });

  it("60kt due east with own still -> 1 nm/min east", () => {
    const v = relativeVelocity({ cog: 90, sog: 60 }, STILL);
    expect(v.e).toBeCloseTo(1, 10);
    expect(v.n).toBeCloseTo(0, 10);
  });

  it("identical course+speed -> zero relative velocity", () => {
    const own: OwnVessel = { sog: 6, cog: 30, heading: 30, depth: 0 };
    const v = relativeVelocity({ cog: 30, sog: 6 }, own);
    expect(v.e).toBeCloseTo(0, 10);
    expect(v.n).toBeCloseTo(0, 10);
  });

  it("stationary target seen from north-bound own appears to move south", () => {
    const own: OwnVessel = { sog: 60, cog: 0, heading: 0, depth: 0 };
    const v = relativeVelocity({ cog: 0, sog: 0 }, own);
    expect(v.e).toBeCloseTo(0, 10);
    expect(v.n).toBeCloseTo(-1, 10);
  });
});

describe("enrichTarget — screen-frame position + CPA + threat", () => {
  const base: Omit<Target, "brg" | "dist" | "cog" | "sog" | "aton"> = {
    id: "T",
    name: "TEST",
    type: "Cargo",
  };

  it("places a target due north 'up' (ry negative) and due east to the right (rx positive)", () => {
    const north = enrichTarget({ ...base, brg: 0, dist: 2, cog: 0, sog: 0, aton: false }, STILL);
    expect(north.rx).toBeCloseTo(0, 10);
    expect(north.ry).toBeCloseTo(-2, 10); // north is up = -y
    const east = enrichTarget({ ...base, brg: 90, dist: 2, cog: 0, sog: 0, aton: false }, STILL);
    expect(east.rx).toBeCloseTo(2, 10);
    expect(east.ry).toBeCloseTo(0, 10);
  });

  it("target dead ahead steaming straight at us -> cpa 0, danger", () => {
    // 2nm due north, cog 180 (south) at 60kt, own still: collision in 2 min.
    const t = enrichTarget({ ...base, brg: 0, dist: 2, cog: 180, sog: 60, aton: false }, STILL);
    expect(t.cpa).toBeCloseTo(0, 10);
    expect(t.tcpa).toBeCloseTo(2, 10);
    expect(t.level).toBe("danger");
  });

  it("AtoN is stationary, max-safe, and zero-velocity regardless of any cog/sog on it", () => {
    const a = enrichTarget({ ...base, brg: 95, dist: 2.1, cog: 99, sog: 9, aton: true }, STILL);
    expect(a.vx).toBe(0);
    expect(a.vy).toBe(0);
    expect(a.cpa).toBe(2.1);
    expect(a.tcpa).toBe(Infinity);
    expect(a.level).toBe("safe");
  });

  it("a far, slow, diverging target is safe", () => {
    // 3nm east, heading further east, own still -> opening.
    const t = enrichTarget({ ...base, brg: 90, dist: 3, cog: 90, sog: 5, aton: false }, STILL);
    expect(t.level).toBe("safe");
  });
});

describe("enrichTargets — batch", () => {
  it("enriches every target and preserves order + ids", () => {
    const arr: Target[] = [
      { id: "a", name: "", type: "Class B", brg: 10, dist: 1, cog: 200, sog: 5, aton: false },
      { id: "b", name: "BUOY", type: "Nav Aid", brg: 80, dist: 2, cog: 0, sog: 0, aton: true },
    ];
    const out = enrichTargets(arr, STILL);
    expect(out.map((t) => t.id)).toEqual(["a", "b"]);
    expect(out[1].level).toBe("safe"); // the AtoN
    out.forEach((t) => expect(typeof t.cpa).toBe("number"));
  });
});
