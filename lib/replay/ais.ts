// AIS message encoders for the replay harness: the message types a real
// Vesper XB-8000 stream contains. Class A targets (type 1 position + type 5
// static/voyage), Class B targets and own ship (type 18 position + type 24A/B
// static), and AtoN (type 21). Output is framed as !AIVDM (targets) / !AIVDO
// (own ship), multi-sentence where the payload demands it — exactly the wire
// format Signal K's NMEA 0183 parser ingests. Round-trip proven in ais.test.ts.
import { BitWriter, aisLat, aisLon, aisSog, aisCog, aisHdg } from "./ais-bits";
import { frame } from "./nmea";

export interface AisPosition {
  mmsi: number;
  lat: number; // deg
  lon: number; // deg
  sogKt: number;
  cogT: number; // deg true
  heading?: number; // deg true; omitted → 511 (not available)
  navStatus?: number; // type 1 only: 0 under way, 1 at anchor, 5 moored…
}

export interface AisStatic {
  mmsi: number;
  name: string;
  callsign?: string;
  shipType?: number; // ITU ship type id (36 sailing, 70 cargo…)
}

// Max armored payload chars per sentence — keeps every sentence ≤ 82 chars.
const MAX_PAYLOAD = 60;
let seq = 0; // multi-part sequential message id, cycles 0–9

export function vdm(payload: string, fill: number, own = false): string[] {
  const tag = own ? "AIVDO" : "AIVDM";
  const parts: string[] = [];
  for (let i = 0; i < payload.length; i += MAX_PAYLOAD) parts.push(payload.slice(i, i + MAX_PAYLOAD));
  const total = parts.length;
  const id = total > 1 ? String(seq = (seq + 1) % 10) : "";
  return parts.map((p, i) =>
    frame(`${tag},${total},${i + 1},${id},A,${p},${i === total - 1 ? fill : 0}`, "!"),
  );
}

// Type 1 — Class A position report. 168 bits.
export function msg1(p: AisPosition): string[] {
  const b = new BitWriter()
    .u(1, 6).u(0, 2).u(p.mmsi, 30)
    .u(p.navStatus ?? 0, 4)
    .u(128, 8) // ROT not available
    .u(aisSog(p.sogKt), 10).u(1, 1)
    .i(aisLon(p.lon), 28).i(aisLat(p.lat), 27)
    .u(aisCog(p.cogT), 12).u(p.heading !== undefined ? aisHdg(p.heading) : 511, 9)
    .u(0, 6).u(0, 2).u(0, 3).u(0, 1).u(0, 19);
  const { payload, fill } = b.armor();
  return vdm(payload, fill);
}

// Type 5 — Class A static & voyage data. 424 bits → two sentences.
export function msg5(s: AisStatic, destination = ""): string[] {
  const b = new BitWriter()
    .u(5, 6).u(0, 2).u(s.mmsi, 30)
    .u(0, 2).u(0, 30) // AIS version, IMO
    .text(s.callsign ?? "", 7)
    .text(s.name, 20)
    .u(s.shipType ?? 0, 8)
    .u(30, 9).u(70, 9).u(8, 6).u(8, 6) // dimensions to bow/stern/port/stbd
    .u(1, 4) // GPS fix
    .u(0, 20) // ETA not available
    .u(45, 8) // draught 4.5 m
    .text(destination, 20)
    .u(0, 1).u(0, 1);
  const { payload, fill } = b.armor();
  return vdm(payload, fill);
}

// Type 18 — Class B position report. 168 bits.
export function msg18(p: AisPosition, own = false): string[] {
  const b = new BitWriter()
    .u(18, 6).u(0, 2).u(p.mmsi, 30)
    .u(0, 8)
    .u(aisSog(p.sogKt), 10).u(1, 1)
    .i(aisLon(p.lon), 28).i(aisLat(p.lat), 27)
    .u(aisCog(p.cogT), 12).u(p.heading !== undefined ? aisHdg(p.heading) : 511, 9)
    .u(0, 6).u(0, 2)
    .u(1, 1).u(0, 1).u(1, 1).u(1, 1).u(1, 1).u(0, 1).u(0, 1) // CS unit flags
    .u(0, 20);
  const { payload, fill } = b.armor();
  return vdm(payload, fill, own);
}

// Type 24 part A (name) + part B (type/callsign/dims) — Class B static.
export function msg24(s: AisStatic, own = false): string[] {
  const a = new BitWriter().u(24, 6).u(0, 2).u(s.mmsi, 30).u(0, 2).text(s.name, 20).armor();
  const b = new BitWriter()
    .u(24, 6).u(0, 2).u(s.mmsi, 30).u(1, 2)
    .u(s.shipType ?? 0, 8)
    .text("", 7) // vendor id
    .text(s.callsign ?? "", 7)
    .u(6, 9).u(6, 9).u(2, 6).u(2, 6)
    .u(0, 6)
    .armor();
  return [...vdm(a.payload, a.fill, own), ...vdm(b.payload, b.fill, own)];
}

// Type 21 — Aid to Navigation. 272 bits (20-char name) → two sentences.
export function msg21(mmsi: number, name: string, lat: number, lon: number, aidType = 25 /* starboard hand mark */): string[] {
  const b = new BitWriter()
    .u(21, 6).u(0, 2).u(mmsi, 30)
    .u(aidType, 5)
    .text(name, 20)
    .u(1, 1)
    .i(aisLon(lon), 28).i(aisLat(lat), 27)
    .u(2, 9).u(2, 9).u(2, 6).u(2, 6) // dimensions
    .u(7, 4) // fix: surveyed
    .u(60, 6) // timestamp not available
    .u(0, 1).u(0, 8).u(0, 1).u(0, 1).u(0, 1).u(0, 1);
  const { payload, fill } = b.armor();
  return vdm(payload, fill);
}
