// AIS encoders proven against the REAL Signal K parser: every message type we
// emit must decode to the exact context and paths applyDelta consumes,
// including the two wire quirks that have already bitten us — names arriving
// as empty-path subtree merges, and own-ship (VDO) deltas carrying the MMSI
// URN context rather than vessels.self.
import { describe, it, expect } from "vitest";
import Parser from "@signalk/nmea0183-signalk";
import { msg1, msg5, msg18, msg21, msg24 } from "./ais";

const R2D = 180 / Math.PI;

// Feed sentences (multi-part aware: nulls while assembling) and return the
// completed deltas.
function parseAll(sentences: string[]) {
  const p = new Parser();
  return sentences.map((s) => p.parse(s)).filter((d): d is NonNullable<typeof d> => d != null);
}
const flat = (d: { updates?: { values?: { path: string; value: unknown }[] }[] }) =>
  (d.updates ?? []).flatMap((u) => u.values ?? []);
const get = (vs: { path: string; value: unknown }[], path: string) =>
  vs.find((v) => v.path === path)?.value;
// The empty-path name merge — the session-7 bug, now pinned by a test.
const mergedName = (vs: { path: string; value: unknown }[]) =>
  vs.filter((v) => v.path === "").map((v) => (v.value as { name?: string }).name).find((n) => n);

describe("type 1 — Class A position", () => {
  it("decodes to the vessel URN context with position/COG/SOG", () => {
    const [d] = parseAll(msg1({ mmsi: 636014001, lat: 20.7, lon: -105.42, sogKt: 12, cogT: 350, heading: 350 }));
    expect(d.context).toBe("vessels.urn:mrn:imo:mmsi:636014001");
    const vs = flat(d);
    const pos = get(vs, "navigation.position") as { latitude: number; longitude: number };
    expect(pos.latitude).toBeCloseTo(20.7, 4);
    expect(pos.longitude).toBeCloseTo(-105.42, 4);
    expect((get(vs, "navigation.courseOverGroundTrue") as number) * R2D).toBeCloseTo(350, 0);
    expect((get(vs, "navigation.speedOverGround") as number) * 1.943844).toBeCloseTo(12, 1);
    expect(get(vs, "sensors.ais.class")).toBe("A");
  });

  it("encodes navigation status (at anchor)", () => {
    const [d] = parseAll(msg1({ mmsi: 636014222, lat: 20.735, lon: -105.365, sogKt: 0, cogT: 0, navStatus: 1 }));
    expect(get(flat(d), "navigation.state")).toBe("anchored");
  });
});

describe("type 5 — Class A static (two-sentence)", () => {
  it("assembles across parts into name + ship type", () => {
    const sentences = msg5({ mmsi: 636014001, name: "PACIFIC HARMONY", callsign: "D5SIM2", shipType: 70 }, "MANZANILLO");
    expect(sentences).toHaveLength(2);
    const deltas = parseAll(sentences);
    expect(deltas).toHaveLength(1); // parser holds part 1, emits on part 2
    const vs = flat(deltas[0]);
    expect(mergedName(vs)).toBe("PACIFIC HARMONY");
    expect((get(vs, "design.aisShipType") as { name: string }).name).toBe("Cargo ship");
    expect(get(vs, "navigation.destination.commonName")).toBe("MANZANILLO");
  });
});

describe("type 18 — Class B position", () => {
  it("decodes position/COG/SOG as class B", () => {
    const [d] = parseAll(msg18({ mmsi: 338012345, lat: 20.75, lon: -105.42, sogKt: 4, cogT: 60 }));
    const vs = flat(d);
    expect(get(vs, "sensors.ais.class")).toBe("B");
    expect((get(vs, "navigation.speedOverGround") as number) * 1.943844).toBeCloseTo(4, 1);
  });

  it("as VDO carries self's MMSI URN — NOT vessels.self (why selfId routing exists)", () => {
    const [d] = parseAll(msg18({ mmsi: 338999999, lat: 20.72, lon: -105.4, sogKt: 5.4, cogT: 242 }, true));
    expect(d.context).toBe("vessels.urn:mrn:imo:mmsi:338999999");
  });
});

describe("type 24 — Class B static (part A + B)", () => {
  it("part A carries the name, part B the type", () => {
    const [a, b] = parseAll(msg24({ mmsi: 338012345, name: "SEA TURTLE", callsign: "SIM0002", shipType: 36 }));
    expect(mergedName(flat(a))).toBe("SEA TURTLE");
    expect((get(flat(b), "design.aisShipType") as { name: string }).name).toBe("Sailing");
  });
});

describe("type 21 — AtoN", () => {
  it("decodes under the atons context with name and position", () => {
    const [d] = parseAll(msg21(993381234, "PUNTA MITA BUOY", 20.77, -105.53));
    expect(d.context).toBe("atons.urn:mrn:imo:mmsi:993381234");
    const vs = flat(d);
    expect(mergedName(vs)).toBe("PUNTA MITA BUOY");
    const pos = get(vs, "navigation.position") as { latitude: number; longitude: number };
    expect(pos.latitude).toBeCloseTo(20.77, 4);
    expect(pos.longitude).toBeCloseTo(-105.53, 4);
  });
});
