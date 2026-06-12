// Tests for lib/capture/detect.ts — the capture state machine. Synthetic
// BoatState sequences with controlled ts/sog/position drive every transition:
// underway/stopped commit + hysteresis, passage origination, anchor-drag,
// CPA-danger entry. Time is injected via boat.ts; the passage UUID via newId.
import { describe, it, expect } from "vitest";
import { detectCapture, initCaptureState, DEFAULT_CAPTURE_CONFIG } from "./detect";
import { project } from "../geo";
import type { BoatState, Contact } from "../types";
import type { CaptureState } from "./types";

const ORIGIN = { lat: 47.9, lon: -125.1 };

function boat(opts: {
  ts: number;
  sog: number;
  pos?: { lat: number; lon: number };
  cog?: number;
  contacts?: Contact[];
}): BoatState {
  return {
    self: { position: opts.pos ?? ORIGIN, cog: opts.cog ?? 180, sog: opts.sog, heading: opts.cog ?? 180, depth: 30 },
    contacts: opts.contacts ?? [],
    source: "sim",
    ts: opts.ts,
  };
}

// Feed a sequence, threading state. Returns the final state + all emitted items.
function run(states: BoatState[], ids: string[] = []) {
  let st: CaptureState = initCaptureState();
  let n = 0;
  const newId = () => ids[n++] ?? `p${n}`;
  const events = [];
  const points = [];
  const ops = [];
  for (const b of states) {
    const r = detectCapture(st, b, newId);
    st = r.state;
    if (r.point) points.push(r.point);
    if (r.passageOp) ops.push(r.passageOp);
    events.push(...r.events);
  }
  return { st, events, points, ops };
}

describe("motion commit + hysteresis", () => {
  it("commits underway only after the sustain window, then opens a passage", () => {
    const { st, events, ops } = run(
      [
        boat({ ts: 0, sog: 6 }), // candidate starts
        boat({ ts: 10_000, sog: 6 }), // still pending (< 30s)
        boat({ ts: 30_000, sog: 6 }), // 30s elapsed → commit
      ],
      ["PASSAGE-1"],
    );
    expect(st.motion).toBe("underway");
    expect(ops).toEqual([{ op: "open", id: "PASSAGE-1", ts: 30_000, lat: ORIGIN.lat, lon: ORIGIN.lon }]);
    expect(events.filter((e) => e.type === "underway")).toHaveLength(1);
    expect(events[events.findIndex((e) => e.type === "underway")].passageId).toBe("PASSAGE-1");
  });

  it("does not commit if a reading falls back into the dead band", () => {
    const { st, ops } = run([
      boat({ ts: 0, sog: 6 }),
      boat({ ts: 10_000, sog: 0.5 }), // dead band cancels the candidate
      boat({ ts: 30_000, sog: 6 }), // restarts timing here
      boat({ ts: 50_000, sog: 6 }), // only 20s since restart → still pending
    ]);
    expect(st.motion).toBe("unknown");
    expect(ops).toHaveLength(0);
  });

  it("opens exactly one passage across an underway→stop→underway cycle (no auto-close in v1)", () => {
    const moving = (ts: number) => boat({ ts, sog: 6 });
    const stopped = (ts: number) => boat({ ts, sog: 0 });
    const { st, ops, events } = run(
      [
        moving(0), moving(30_000), // commit underway, passage opens
        stopped(60_000), stopped(90_000), // commit stopped
        moving(120_000), moving(150_000), // commit underway again — same passage stays open
      ],
      ["ONLY-ONE"],
    );
    expect(ops).toHaveLength(1);
    expect(st.passageId).toBe("ONLY-ONE");
    expect(events.filter((e) => e.type === "stopped")).toHaveLength(1);
    expect(events.filter((e) => e.type === "underway")).toHaveLength(2);
  });
});

describe("anchor drag", () => {
  it("sets the anchor ref on the stop and fires once when it leaves the circle", () => {
    const stopped = (ts: number, pos: { lat: number; lon: number }) => boat({ ts, sog: 0, pos });
    // 80 m drag is outside the ~50 m default circle.
    const dragged = project(ORIGIN, 90, 80 / 1852);
    const { st, events } = run([
      stopped(0, ORIGIN), stopped(30_000, ORIGIN), // commit stopped, anchor ref = ORIGIN
      stopped(60_000, dragged), // outside circle → one anchor_drag
      stopped(90_000, dragged), // still out → no repeat
    ]);
    const drags = events.filter((e) => e.type === "anchor_drag");
    expect(drags).toHaveLength(1);
    expect(st.anchor?.dragging).toBe(true);
    expect(drags[0].meta?.distNm).toBeGreaterThan(DEFAULT_CAPTURE_CONFIG.anchorRadiusNm);
  });

  it("re-arms after returning inside the circle", () => {
    const stopped = (ts: number, pos: { lat: number; lon: number }) => boat({ ts, sog: 0, pos });
    const out = project(ORIGIN, 90, 80 / 1852);
    const { events } = run([
      stopped(0, ORIGIN), stopped(30_000, ORIGIN),
      stopped(60_000, out), // drag #1
      stopped(90_000, ORIGIN), // back inside → re-arm (no event)
      stopped(120_000, out), // drag #2
    ]);
    expect(events.filter((e) => e.type === "anchor_drag")).toHaveLength(2);
  });
});

describe("CPA danger crossings", () => {
  // A contact 0.4 nm ahead closing head-on is inside the 0.5 nm danger band.
  const closer: Contact = {
    id: "316999", name: "MAERSK", type: "Cargo", aton: false,
    position: project(ORIGIN, 0, 0.4), cog: 180, sog: 8,
  };
  const movingWith = (ts: number, contacts: Contact[]) =>
    boat({ ts, sog: 6, cog: 0, contacts }); // own heading north toward the contact

  it("emits a cpa event once on entry to the danger band", () => {
    const { events } = run([
      movingWith(0, [closer]), movingWith(30_000, [closer]), // get underway
      movingWith(60_000, [closer]), // danger present → one cpa event
      movingWith(90_000, [closer]), // still danger → no repeat
    ]);
    const cpa = events.filter((e) => e.type === "cpa");
    expect(cpa).toHaveLength(1);
    expect(cpa[0].contactId).toBe("316999");
    expect(cpa[0].meta?.name).toBe("MAERSK");
  });

  it("ignores AtoN targets", () => {
    const buoy: Contact = { ...closer, id: "AID1", name: "Fl G 4s", type: "Nav Aid", aton: true, sog: 0 };
    const { events } = run([movingWith(0, [buoy]), movingWith(30_000, [buoy]), movingWith(60_000, [buoy])]);
    expect(events.filter((e) => e.type === "cpa")).toHaveLength(0);
  });
});

describe("track points", () => {
  it("stores points only while underway, at the configured cadence", () => {
    const { points } = run([
      boat({ ts: 0, sog: 0 }), boat({ ts: 30_000, sog: 0 }), // stopped: no points
      boat({ ts: 60_000, sog: 6 }), boat({ ts: 90_000, sog: 6 }), // commit underway at 90s
      boat({ ts: 92_000, sog: 6 }), // <5s since last → skipped
      boat({ ts: 98_000, sog: 6 }), // ≥5s → kept
    ]);
    // First underway sample (90s, lastTrackTs=0) is kept; 92s skipped; 98s kept.
    expect(points.map((p) => p.ts)).toEqual([90_000, 98_000]);
    expect(points.every((p) => p.sog === 6)).toBe(true);
  });
});
