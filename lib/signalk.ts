// Signal K client. The logic that matters — turning SK JSON deltas into our
// canonical BoatState — is the pure applyDelta() below, and it is unit-tested
// against recorded deltas. connect() is a thin WebSocket shell around it (I/O,
// not unit-tested). On June 12 useBoatState swaps initState/advanceState for
// connect(piUrl); deriveTargets and everything downstream are unchanged.
import type { BoatState, Contact, SelfState, Telemetry, PiTelemetry } from "./types";
import { EMPTY_TELEMETRY } from "./types";

const R2D = 180 / Math.PI;
const MS_TO_KT = 1.943844;
const norm = (d: number) => ((d % 360) + 360) % 360;

export interface SKDelta {
  context?: string;
  updates?: { values?: { path: string; value: unknown }[] }[];
}

export function emptyLiveState(): BoatState {
  return {
    self: { position: { lat: 0, lon: 0 }, cog: 0, sog: 0, heading: 0, depth: 0 },
    contacts: [],
    source: "live",
    ts: 0,
    telemetry: EMPTY_TELEMETRY,
  };
}

// Identify the vessel a delta refers to. Self deltas omit context or use
// "vessels.self"; others are "vessels.urn:...:<mmsi>" or "atons.<id>".
function idOf(context?: string): { self: boolean; id: string; aton: boolean } {
  if (!context || context === "vessels.self") return { self: true, id: "self", aton: false };
  const aton = context.startsWith("atons.");
  const id = context.split(":").pop() || context.split(".").pop() || context;
  return { self: false, id, aton };
}

function applySelf(self: SelfState, path: string, value: unknown): SelfState {
  switch (path) {
    case "navigation.position": { const v = value as { latitude: number; longitude: number }; return { ...self, position: { lat: v.latitude, lon: v.longitude } }; }
    case "navigation.courseOverGroundTrue": return { ...self, cog: norm((value as number) * R2D) };
    case "navigation.headingTrue": return { ...self, heading: norm((value as number) * R2D) };
    case "navigation.speedOverGround": return { ...self, sog: (value as number) * MS_TO_KT };
    case "environment.depth.belowTransducer": return { ...self, depth: value as number };
    default: return self;
  }
}

function applyContact(c: Contact, path: string, value: unknown): Contact {
  // SK's NMEA0183 AIS parser delivers static data (from VDM type 5/24) as
  // empty-path subtree merges, e.g. { path: "", value: { name: "MARIANNE" } }
  // — NOT { path: "name", value: "MARIANNE" }. Without this branch every AIS
  // target renders nameless. (Verified against @signalk/nmea0183-signalk output.)
  if (path === "") {
    if (value && typeof value === "object") {
      const v = value as { name?: unknown };
      if (typeof v.name === "string") return { ...c, name: v.name };
    }
    return c;
  }
  switch (path) {
    case "navigation.position": { const v = value as { latitude: number; longitude: number }; return { ...c, position: { lat: v.latitude, lon: v.longitude } }; }
    case "navigation.courseOverGroundTrue": return { ...c, cog: norm((value as number) * R2D) };
    case "navigation.speedOverGround": return { ...c, sog: (value as number) * MS_TO_KT };
    case "name": return { ...c, name: String(value) };
    case "design.aisShipType": { const v = value as { name?: string }; return v?.name ? { ...c, type: v.name } : c; }
    default: return c;
  }
}

const K_TO_C = (k: number) => k - 273.15;
const EMPTY_PI: PiTelemetry = { cpuTempC: 0, loadPct: 0, ramPct: 0, diskFreePct: 0, undervolt: false };

// Fold one environment.rpi.* path (from signalk-rpi-monitor) into telemetry.pi.
// Temps arrive in Kelvin (SK SI), utilisations as 0..1 fractions. SD utilisation
// is fraction *used*, so free = 1 - used. This plugin doesn't report an
// undervolt/throttle flag, so it stays false — we don't invent a signal we
// aren't given. Non-numeric values are ignored.
function applyRpi(t: Telemetry, path: string, value: unknown): Telemetry {
  if (typeof value !== "number" || !Number.isFinite(value)) return t;
  const pi = t.pi ?? EMPTY_PI;
  switch (path) {
    case "environment.rpi.cpu.temperature": return { ...t, pi: { ...pi, cpuTempC: Math.round(K_TO_C(value)) } };
    case "environment.rpi.cpu.utilisation": return { ...t, pi: { ...pi, loadPct: Math.round(value * 100) } };
    case "environment.rpi.memory.utilisation": return { ...t, pi: { ...pi, ramPct: Math.round(value * 100) } };
    case "environment.rpi.sd.utilisation": return { ...t, pi: { ...pi, diskFreePct: Math.round((1 - value) * 100) } };
    default: return t; // gpu temperature etc. — not surfaced yet
  }
}

// Pure: fold one SK delta into the state, returning a new BoatState.
export function applyDelta(state: BoatState, delta: SKDelta): BoatState {
  const who = idOf(delta.context);
  const pairs = (delta.updates ?? []).flatMap((u) => u.values ?? []);
  if (pairs.length === 0) return state;

  if (who.self) {
    let self = state.self;
    let telemetry = state.telemetry ?? EMPTY_TELEMETRY;
    for (const { path, value } of pairs) {
      if (path.startsWith("environment.rpi.")) telemetry = applyRpi(telemetry, path, value);
      else self = applySelf(self, path, value);
    }
    return { ...state, self, telemetry, ts: Date.now() };
  }

  const contacts = state.contacts.slice();
  let i = contacts.findIndex((c) => c.id === who.id);
  if (i === -1) {
    contacts.push({ id: who.id, name: "", type: who.aton ? "Nav Aid" : "Vessel", aton: who.aton, position: { lat: 0, lon: 0 }, cog: 0, sog: 0 });
    i = contacts.length - 1;
  }
  for (const { path, value } of pairs) contacts[i] = applyContact(contacts[i], path, value);
  return { ...state, contacts, ts: Date.now() };
}

// Thin I/O shell. Accumulates deltas into state and pushes each update out.
// Returns a disconnect function. Browser-only (guards for SSR).
export function connect(url: string, onState: (s: BoatState) => void, onError?: (e: unknown) => void): () => void {
  if (typeof WebSocket === "undefined") return () => {};
  let state = emptyLiveState();
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    try {
      const delta = JSON.parse(ev.data as string) as SKDelta;
      if (!delta.updates) return; // skip hello/meta frames
      state = applyDelta(state, delta);
      onState(state);
    } catch (e) { onError?.(e); }
  };
  ws.onerror = (e) => onError?.(e);
  return () => ws.close();
}
