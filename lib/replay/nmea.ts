// NMEA 0183 sentence builders for the Vesper replay harness. Pure: numbers in,
// checksummed sentence strings out. These mimic the GPS/instrument side of the
// XB-8000's WiFi stream (the AIS side — VDM/VDO — lives in ais.ts). Formats are
// verified round-trip against @signalk/nmea0183-signalk (the real SK parser)
// in nmea.test.ts, so what we emit is provably what Signal K understands.

// XOR checksum over the chars between the leading $/! and the *.
export function checksum(body: string): string {
  let c = 0;
  for (let i = 0; i < body.length; i++) c ^= body.charCodeAt(i);
  return c.toString(16).toUpperCase().padStart(2, "0");
}

export function frame(body: string, lead: "$" | "!" = "$"): string {
  return `${lead}${body}*${checksum(body)}`;
}

// Decimal degrees → NMEA ddmm.mmmm / dddmm.mmmm + hemisphere.
export function nmeaLat(lat: number): { v: string; h: "N" | "S" } {
  const h = lat < 0 ? "S" : "N";
  const a = Math.abs(lat);
  const d = Math.floor(a);
  const m = (a - d) * 60;
  return { v: `${String(d).padStart(2, "0")}${m.toFixed(4).padStart(7, "0")}`, h };
}

export function nmeaLon(lon: number): { v: string; h: "E" | "W" } {
  const h = lon < 0 ? "W" : "E";
  const a = Math.abs(lon);
  const d = Math.floor(a);
  const m = (a - d) * 60;
  return { v: `${String(d).padStart(3, "0")}${m.toFixed(4).padStart(7, "0")}`, h };
}

// Scenario clock → NMEA time/date fields. The replay runs on a fixed simulated
// UTC day so output is deterministic (tests) and date fields are always valid.
const BASE_UTC = Date.UTC(2026, 6, 6, 18, 0, 0); // 2026-07-06 18:00:00Z

export function hhmmss(tSec: number): string {
  const d = new Date(BASE_UTC + tSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}.00`;
}

export function ddmmyy(tSec: number): string {
  const d = new Date(BASE_UTC + tSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}${p(d.getUTCMonth() + 1)}${String(d.getUTCFullYear()).slice(2)}`;
}

export interface GpsFix {
  lat: number; // deg, +N
  lon: number; // deg, +E
  cogT: number; // deg true
  sogKt: number;
}

// RMC — the primary position/COG/SOG sentence. Variation left empty (the SK
// parser tolerates it; heading variation rides on HDG instead).
export function rmc(t: number, f: GpsFix): string {
  const la = nmeaLat(f.lat), lo = nmeaLon(f.lon);
  return frame(
    `GPRMC,${hhmmss(t)},A,${la.v},${la.h},${lo.v},${lo.h},${f.sogKt.toFixed(1)},${f.cogT.toFixed(1)},${ddmmyy(t)},,,A`,
  );
}

export function vtg(f: GpsFix): string {
  const kph = f.sogKt * 1.852;
  return frame(`GPVTG,${f.cogT.toFixed(1)},T,,M,${f.sogKt.toFixed(1)},N,${kph.toFixed(1)},K,A`);
}

export function gga(t: number, f: GpsFix): string {
  const la = nmeaLat(f.lat), lo = nmeaLon(f.lon);
  return frame(`GPGGA,${hhmmss(t)},${la.v},${la.h},${lo.v},${lo.h},1,09,0.9,5.0,M,,M,,`);
}

// HDG — magnetic heading + variation. IMPORTANT: the SK parser only derives
// navigation.headingTrue when the variation fields are present; without them
// it emits headingMagnetic only (which applySelf currently drops). The real
// Vesper bridges heading from N2K — whether it includes variation is a
// dockside finding. We emit variation so the true-heading path is exercised.
export function hdg(headingMag: number, variation: number): string {
  const east = variation >= 0;
  return frame(`HCHDG,${headingMag.toFixed(1)},,,${Math.abs(variation).toFixed(1)},${east ? "E" : "W"}`);
}

// DPT — depth below transducer + offset. The XB-8000 has an N2K port; if it's
// on Irene's backbone it bridges the Triton's depth, meaning depth may flow
// dockside with no NGX-1. Emitting it proves the pipeline either way.
export function dpt(depthM: number, offsetM = 0.3): string {
  return frame(`SDDPT,${depthM.toFixed(1)},${offsetM.toFixed(1)}`);
}
