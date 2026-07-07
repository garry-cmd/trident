// The scripted replay scenario: what a real Vesper XB-8000 stream looks like
// from Irene motoring out of Bahía de Banderas. Pure — sentencesAt(t) is a
// function of integer seconds, so the daemon's TCP server just ticks a clock.
//
// Cast (all MMSIs fictitious):
//   IRENE            own ship, Class B (VDO 18 + 24), 5.4 kt on 242°T
//   PACIFIC HARMONY  Class A cargo (1 + 5), 12 kt on 350°T — built to cross
//                    own track at t≈600 s → CPA collapses toward zero: the
//                    danger-alarm exercise
//   SEA TURTLE       Class B sailboat (18 + 24), 4 kt, diverging — stays safe
//   CORONADO TRADER  Class A at anchor (nav status 1, SOG 0) — slow-rate case
//   PUNTA MITA BUOY  AtoN (21) — fixed mark
//
// Timing matches ITU reporting rates (Class A underway 6–10 s, anchored 3 min,
// Class B 30 s, statics 6 min, AtoN 3 min) with one honest concession: each
// vessel's FIRST static transmission lands in the opening ~25 s, as if we
// joined its cycle at a lucky phase — so names appear quickly on the bench.
import { rmc, vtg, gga, hdg, dpt, type GpsFix } from "./nmea";
import { msg1, msg5, msg18, msg21, msg24 } from "./ais";

const VARIATION_E = 8.0; // deg E, Banderas Bay-ish

export interface Mover {
  lat0: number;
  lon0: number;
  cogT: number;
  sogKt: number;
}

// Dead-reckon along a constant course/speed. Flat-earth is fine at bay scale.
export function advance(m: Mover, tSec: number): { lat: number; lon: number } {
  const distNm = (m.sogKt * tSec) / 3600;
  const rad = (m.cogT * Math.PI) / 180;
  const lat = m.lat0 + (distNm * Math.cos(rad)) / 60;
  const lon = m.lon0 + (distNm * Math.sin(rad)) / (60 * Math.cos((m.lat0 * Math.PI) / 180));
  return { lat, lon };
}

export const OWN: Mover = { lat0: 20.72, lon0: -105.4, cogT: 242, sogKt: 5.4 };

// PACIFIC HARMONY starts 2 nm short of own's t=600 position, on 350°T at
// 12 kt — both hulls arrive at the same point at the same time.
const MEET = advance(OWN, 600);
const CARGO_START = advance({ lat0: MEET.lat, lon0: MEET.lon, cogT: 170, sogKt: 12 }, 600);
const CARGO: Mover = { lat0: CARGO_START.lat, lon0: CARGO_START.lon, cogT: 350, sogKt: 12 };

const SAILBOAT: Mover = { lat0: 20.75, lon0: -105.42, cogT: 60, sogKt: 4 };
const ANCHORED = { lat: 20.735, lon: -105.365 };
// ~2.3 nm off the bow at start (own course 242) — the scope's max range is
// 6 nm, so the mark must live inside the action, not out at sea-buoy distance.
const BUOY = { lat: 20.695, lon: -105.43 };

export const MMSI = {
  own: 338999999,
  cargo: 636014001,
  sailboat: 338012345,
  anchored: 636014222,
  buoy: 993381234,
} as const;

// True for the first occurrence at `first`, then every `period` after it.
const due = (t: number, first: number, period: number) =>
  t >= first && (t - first) % period === 0;

// One burst of everything: current positions plus all statics and the AtoN.
// The replay server sends this to each newly connected client so the bench
// never waits out a static cycle (real radios make you wait up to 6 min —
// that lossy join phase is exactly why lib/snapshot.ts exists; use the
// server's --strict-timing to reproduce it deliberately).
//
// ownMmsi: the MMSI own-ship VDO transmits. Signal K only routes VDO to SELF
// when it matches the MMSI configured in SK's vessel settings — any mismatch
// creates a phantom own-ship contact trailing ~45 m astern (VDO is 30 s data
// chasing 1 Hz GPS). Found on the bench 2026-07-06; the same failure awaits
// dockside if the Pi's SK ever lacks Irene's real MMSI. Bench rule: SK vessel
// MMSI and `npm run replay -- --own-mmsi <n>` must agree.
export function greetingAt(t: number, ownMmsi: number = MMSI.own): string[] {
  return [
    ...msg18({ mmsi: ownMmsi, ...advance(OWN, t), sogKt: OWN.sogKt, cogT: OWN.cogT, heading: OWN.cogT }, true),
    ...msg24({ mmsi: ownMmsi, name: "IRENE", callsign: "SIM0001", shipType: 36 }, true),
    ...msg1({ mmsi: MMSI.cargo, ...advance(CARGO, t), sogKt: CARGO.sogKt, cogT: CARGO.cogT, heading: CARGO.cogT }),
    ...msg5({ mmsi: MMSI.cargo, name: "PACIFIC HARMONY", callsign: "D5SIM2", shipType: 70 }, "MANZANILLO"),
    ...msg18({ mmsi: MMSI.sailboat, ...advance(SAILBOAT, t), sogKt: SAILBOAT.sogKt, cogT: SAILBOAT.cogT }),
    ...msg24({ mmsi: MMSI.sailboat, name: "SEA TURTLE", callsign: "SIM0002", shipType: 36 }),
    ...msg1({ mmsi: MMSI.anchored, ...ANCHORED, sogKt: 0, cogT: 0, navStatus: 1 }),
    ...msg5({ mmsi: MMSI.anchored, name: "CORONADO TRADER", callsign: "D5SIM3", shipType: 70 }, "PTO VALLARTA"),
    ...msg21(MMSI.buoy, "PUNTA MITA BUOY", BUOY.lat, BUOY.lon),
  ];
}

// All sentences the Vesper would emit during second `t`. Deterministic.
export function sentencesAt(t: number, ownMmsi: number = MMSI.own): string[] {
  const out: string[] = [];
  const ownPos = advance(OWN, t);
  const fix: GpsFix = { ...ownPos, cogT: OWN.cogT, sogKt: OWN.sogKt };

  // GPS + bridged instruments, every second / every other second
  out.push(rmc(t, fix), vtg(fix), gga(t, fix), hdg(OWN.cogT - VARIATION_E, VARIATION_E));
  if (t % 2 === 0) out.push(dpt(Math.min(60, 12 + t * 0.02)));

  // Own ship AIS (VDO)
  if (due(t, 0, 30)) out.push(...msg18({ mmsi: ownMmsi, ...ownPos, sogKt: OWN.sogKt, cogT: OWN.cogT, heading: OWN.cogT }, true));
  if (due(t, 5, 360)) out.push(...msg24({ mmsi: ownMmsi, name: "IRENE", callsign: "SIM0001", shipType: 36 }, true));

  // PACIFIC HARMONY — Class A, converging
  if (due(t, 1, 6)) out.push(...msg1({ mmsi: MMSI.cargo, ...advance(CARGO, t), sogKt: CARGO.sogKt, cogT: CARGO.cogT, heading: CARGO.cogT }));
  if (due(t, 15, 360)) out.push(...msg5({ mmsi: MMSI.cargo, name: "PACIFIC HARMONY", callsign: "D5SIM2", shipType: 70 }, "MANZANILLO"));

  // SEA TURTLE — Class B, diverging
  if (due(t, 10, 30)) out.push(...msg18({ mmsi: MMSI.sailboat, ...advance(SAILBOAT, t), sogKt: SAILBOAT.sogKt, cogT: SAILBOAT.cogT }));
  if (due(t, 25, 360)) out.push(...msg24({ mmsi: MMSI.sailboat, name: "SEA TURTLE", callsign: "SIM0002", shipType: 36 }));

  // CORONADO TRADER — Class A at anchor (3-min rate)
  if (due(t, 12, 180)) out.push(...msg1({ mmsi: MMSI.anchored, ...ANCHORED, sogKt: 0, cogT: 0, navStatus: 1 }));
  if (due(t, 18, 360)) out.push(...msg5({ mmsi: MMSI.anchored, name: "CORONADO TRADER", callsign: "D5SIM3", shipType: 70 }, "PTO VALLARTA"));

  // PUNTA MITA BUOY — AtoN (3-min rate)
  if (due(t, 20, 180)) out.push(...msg21(MMSI.buoy, "PUNTA MITA BUOY", BUOY.lat, BUOY.lon));

  return out;
}
