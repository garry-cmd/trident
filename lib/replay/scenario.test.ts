// The whole live-AIS chain, proven end-to-end on the bench: scenario sentences
// → the REAL Signal K parser → applyDelta (with selfId routing, as the app
// does after the hello frame) → deriveTargets → enrichTargets. This is the
// closest we can get to the dock without the Vesper: if this passes, the only
// remaining unknowns are the radio and the WiFi.
import { describe, it, expect } from "vitest";
import Parser from "@signalk/nmea0183-signalk";
import { sentencesAt, advance, OWN, MMSI } from "./scenario";
import { applyDelta, emptyLiveState, type SKDelta } from "../signalk";
import { deriveTargets } from "../state";
import { enrichTargets } from "../ais";

const SELF_ID = `vessels.urn:mrn:imo:mmsi:${MMSI.own}`;

// Stream the scenario through the parser into BoatState, t = 0..until seconds.
function runTo(until: number) {
  const p = new Parser();
  let state = emptyLiveState();
  for (let t = 0; t <= until; t++) {
    for (const s of sentencesAt(t)) {
      const d = p.parse(s) as SKDelta | null;
      if (d) state = applyDelta(state, d, SELF_ID);
    }
  }
  return state;
}

describe("scenario → parser → applyDelta", () => {
  const state = runTo(30);

  it("routes GPS + VDO to self (no phantom own-ship contact)", () => {
    expect(state.contacts.find((c) => c.id === String(MMSI.own))).toBeUndefined();
    const expected = advance(OWN, 30);
    expect(state.self.position.lat).toBeCloseTo(expected.lat, 3);
    expect(state.self.position.lon).toBeCloseTo(expected.lon, 3);
    expect(state.self.heading).toBeCloseTo(242, 0);
    expect(state.self.sog).toBeCloseTo(5.4, 1);
    expect(state.self.depth).toBeGreaterThan(10);
  });

  it("tracks all four targets with real positions", () => {
    const ids = state.contacts.map((c) => c.id).sort();
    expect(ids).toEqual(
      [MMSI.cargo, MMSI.sailboat, MMSI.anchored, MMSI.buoy].map(String).sort(),
    );
    for (const c of state.contacts) expect(Math.abs(c.position.lat)).toBeGreaterThan(1);
  });

  it("names every target within 30 s (statics land early in the join phase)", () => {
    const byId = Object.fromEntries(state.contacts.map((c) => [c.id, c]));
    expect(byId[MMSI.cargo].name).toBe("PACIFIC HARMONY");
    expect(byId[MMSI.sailboat].name).toBe("SEA TURTLE");
    expect(byId[MMSI.anchored].name).toBe("CORONADO TRADER");
    expect(byId[MMSI.buoy].name).toBe("PUNTA MITA BUOY");
  });

  it("carries ship types and the AtoN flag", () => {
    const byId = Object.fromEntries(state.contacts.map((c) => [c.id, c]));
    expect(byId[MMSI.cargo].type).toBe("Cargo ship");
    expect(byId[MMSI.sailboat].type).toBe("Sailing");
    expect(byId[MMSI.buoy].aton).toBe(true);
  });
});

describe("scenario → CPA threat escalation", () => {
  it("PACIFIC HARMONY goes danger as the crossing closes; SEA TURTLE stays safe", () => {
    const state = runTo(306); // cargo is ~5 min from the t≈600 s meeting point
    const { targets, own } = deriveTargets(state);
    const enriched = enrichTargets(targets, own);
    const byId = Object.fromEntries(enriched.map((t) => [t.id, t]));

    const cargo = byId[MMSI.cargo];
    expect(cargo.level).toBe("danger");
    expect(cargo.tcpa).toBeGreaterThan(0); // still closing, time to act
    expect(byId[MMSI.sailboat].level).toBe("safe");
    expect(byId[MMSI.buoy].level).toBe("safe"); // AtoN never threatens
  });
});

describe("own-ship MMSI override (--own-mmsi)", () => {
  it("VDO transmits the override, and a selfId mismatch produces a phantom own-ship", () => {
    const REAL = 367000001;
    const p = new Parser();
    // Correctly configured: selfId matches what own-ship transmits → no phantom.
    let good = emptyLiveState();
    for (const s of sentencesAt(0, REAL)) {
      const d = p.parse(s) as SKDelta | null;
      if (d) good = applyDelta(good, d, `vessels.urn:mrn:imo:mmsi:${REAL}`);
    }
    expect(good.contacts.find((c) => c.id === String(REAL))).toBeUndefined();

    // Misconfigured SK (vessel MMSI unset/mismatched): own VDO becomes a
    // contact shadowing own position — the bug seen on the bench 2026-07-06.
    const p2 = new Parser();
    let bad = emptyLiveState();
    for (const s of sentencesAt(0, REAL)) {
      const d = p2.parse(s) as SKDelta | null;
      if (d) bad = applyDelta(bad, d, "vessels.urn:mrn:signalk:uuid:something-else");
    }
    expect(bad.contacts.find((c) => c.id === String(REAL))).toBeDefined();
  });
});
