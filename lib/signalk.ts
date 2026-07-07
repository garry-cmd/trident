// Signal K client. The logic that matters — turning SK JSON deltas into our
// canonical BoatState — is the pure applyDelta() below, and it is unit-tested
// against recorded deltas. connect() is a thin WebSocket shell around it (I/O,
// not unit-tested). On June 12 useBoatState swaps initState/advanceState for
// connect(piUrl); deriveTargets and everything downstream are unchanged.
import type { BoatState, Contact, SelfState, Telemetry, PiTelemetry } from "./types";
import { EMPTY_TELEMETRY } from "./types";
import { applySnapshot, type SkRestModel } from "./snapshot";
import { TARGET_DROP_SEC } from "./settings";

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

// Identify the vessel a delta refers to. Self deltas may omit context, use
// "vessels.self", OR carry self's own MMSI URN (e.g. signalk-rpi-monitor and a
// boat's own AIS transponder do this) — so we match the self URN learned from
// the SK hello frame. Others are "vessels.urn:...:<mmsi>" or "atons.<id>".
function idOf(context: string | undefined, selfId?: string): { self: boolean; id: string; aton: boolean } {
  if (!context || context === "vessels.self" || (selfId !== undefined && context === selfId)) return { self: true, id: "self", aton: false };
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

// Pure: fold one SK delta into the state, returning a new BoatState. selfId is
// self's MMSI URN (from the SK hello frame); when known, deltas in that context
// route to self rather than a phantom contact.
export function applyDelta(state: BoatState, delta: SKDelta, selfId?: string): BoatState {
  const who = idOf(delta.context, selfId);
  const pairs = (delta.updates ?? []).flatMap((u) => u.values ?? []);
  if (pairs.length === 0) return state;
  const now = Date.now();

  // Age off targets silent past the drop window. Pruning here — inside the
  // delta path — means it only runs while the feed is alive; if the whole
  // feed dies nothing is dropped, the picture freezes, and the FEED indicator
  // owns that failure instead of targets quietly vanishing one by one.
  const dropBefore = now - TARGET_DROP_SEC * 1000;
  const live = state.contacts.some((c) => c.lastSeen < dropBefore)
    ? state.contacts.filter((c) => c.lastSeen >= dropBefore)
    : state.contacts;

  if (who.self) {
    let self = state.self;
    let telemetry = state.telemetry ?? EMPTY_TELEMETRY;
    for (const { path, value } of pairs) {
      if (path.startsWith("environment.rpi.")) telemetry = applyRpi(telemetry, path, value);
      else self = applySelf(self, path, value);
    }
    return { ...state, self, telemetry, contacts: live, ts: now };
  }

  const contacts = live.slice();
  let i = contacts.findIndex((c) => c.id === who.id);
  if (i === -1) {
    contacts.push({ id: who.id, name: "", type: who.aton ? "Nav Aid" : "Vessel", aton: who.aton, position: { lat: 0, lon: 0 }, cog: 0, sog: 0, lastSeen: now });
    i = contacts.length - 1;
  }
  for (const { path, value } of pairs) contacts[i] = applyContact(contacts[i], path, value);
  contacts[i] = { ...contacts[i], lastSeen: now };
  return { ...state, contacts, ts: now };
}

// ws stream url → REST api url on the same SK server, for the snapshot prefill.
export function restUrlFor(wsUrl: string): string {
  return wsUrl.replace(/^ws(s?):\/\//, "http$1://").replace(/\/stream.*$/, "/api/");
}

// Thin I/O shell. Accumulates deltas into state and pushes each update out.
// Returns a disconnect function. Browser-only (guards for SSR).
//
// On connect we also fetch the SK REST model once and fold it in as an
// underlay (see snapshot.ts): AIS statics only transmit every ~6 min, so
// without this a page (re)load shows nameless targets until each one's next
// static — the SK server already knows the names. Failure is silently ignored;
// the stream alone is the same behavior we had before.
export function connect(url: string, onState: (s: BoatState) => void, onError?: (e: unknown) => void): () => void {
  if (typeof WebSocket === "undefined") return () => {};
  let state = emptyLiveState();
  let selfId: string | undefined; // self's MMSI URN, learned from the hello frame
  fetch(restUrlFor(url))
    .then((r) => r.json())
    .then((model) => { state = applySnapshot(state, model as SkRestModel); onState(state); })
    .catch(() => {});
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as SKDelta & { self?: string };
      if (typeof msg.self === "string") { selfId = msg.self; return; } // SK hello frame
      if (!msg.updates) return; // skip other meta frames
      state = applyDelta(state, msg, selfId);
      onState(state);
    } catch (e) { onError?.(e); }
  };
  ws.onerror = (e) => onError?.(e);
  return () => ws.close();
}
