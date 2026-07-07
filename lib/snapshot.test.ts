// applySnapshot against a fixture captured from a REAL signalk-server 2.30.0
// REST API (fed by the Vesper replay harness) — the exact shape the Pi serves.
// The rules under test: snapshot creates unseen contacts, fills blanks on
// known ones, and never overwrites live-delta data.
import { describe, it, expect } from "vitest";
import { applySnapshot, type SkRestModel } from "./snapshot";
import { emptyLiveState } from "./signalk";

// Trimmed verbatim from GET /signalk/v1/api/ on signalk-server 2.30.0.
const FIXTURE: SkRestModel = {
  self: "vessels.urn:mrn:imo:mmsi:338999999",
  vessels: {
    "urn:mrn:imo:mmsi:338999999": {
      name: "IRENE-BENCH",
      navigation: {
        position: { value: { latitude: 20.72, longitude: -105.4 } },
        courseOverGroundTrue: { value: 4.223696790790672 },
        speedOverGround: { value: 2.7780007037601786 },
      },
    },
    "urn:mrn:imo:mmsi:636014001": {
      name: "PACIFIC HARMONY",
      navigation: {
        position: { value: { latitude: 20.688391666666668, longitude: -105.40952833333333 } },
        courseOverGroundTrue: { value: 6.108652383374939 },
        speedOverGround: { value: 6.173334897244841 },
      },
      design: { aisShipType: { value: { name: "Cargo ship" } } },
    },
    "urn:mrn:imo:mmsi:636014222": {
      name: "CORONADO TRADER",
      navigation: { position: { value: { latitude: 20.735, longitude: -105.365 } } },
    },
  },
  atons: {
    "urn:mrn:imo:mmsi:993381234": {
      name: "PUNTA MITA BUOY",
      navigation: { position: { value: { latitude: 20.77, longitude: -105.53 } } },
    },
  },
};

describe("applySnapshot", () => {
  it("creates contacts for vessels the stream hasn't mentioned, skipping self", () => {
    const s = applySnapshot(emptyLiveState(), FIXTURE);
    const ids = s.contacts.map((c) => c.id).sort();
    expect(ids).toEqual(["338999999" /* never */, "636014001", "636014222", "993381234"].slice(1).sort());
    const cargo = s.contacts.find((c) => c.id === "636014001")!;
    expect(cargo.name).toBe("PACIFIC HARMONY");
    expect(cargo.type).toBe("Cargo ship");
    expect(cargo.position.lat).toBeCloseTo(20.6884, 3);
    expect(cargo.sog).toBeCloseTo(12, 1);
    expect(cargo.cog).toBeCloseTo(350, 0);
  });

  it("flags atons", () => {
    const s = applySnapshot(emptyLiveState(), FIXTURE);
    const buoy = s.contacts.find((c) => c.id === "993381234")!;
    expect(buoy.aton).toBe(true);
    expect(buoy.name).toBe("PUNTA MITA BUOY");
  });

  it("fills blanks on known contacts but never overwrites live data", () => {
    const live = emptyLiveState();
    live.contacts.push({
      id: "636014001",
      name: "", // stream hasn't delivered the static yet
      type: "Vessel",
      aton: false,
      position: { lat: 20.7, lon: -105.41 }, // live position — fresher than snapshot
      cog: 351,
      sog: 12.1,
    });
    const s = applySnapshot(live, FIXTURE);
    const cargo = s.contacts.find((c) => c.id === "636014001")!;
    expect(cargo.name).toBe("PACIFIC HARMONY"); // blank filled
    expect(cargo.type).toBe("Cargo ship"); // default replaced
    expect(cargo.position.lat).toBe(20.7); // live position preserved
    expect(cargo.cog).toBe(351);
  });

  it("null-island position on a known contact is treated as missing", () => {
    const live = emptyLiveState();
    live.contacts.push({ id: "636014222", name: "", type: "Vessel", aton: false, position: { lat: 0, lon: 0 }, cog: 0, sog: 0 });
    const s = applySnapshot(live, FIXTURE);
    expect(s.contacts.find((c) => c.id === "636014222")!.position.lat).toBeCloseTo(20.735, 3);
  });

  it("tolerates an empty model", () => {
    const s = applySnapshot(emptyLiveState(), {});
    expect(s.contacts).toEqual([]);
  });
});
