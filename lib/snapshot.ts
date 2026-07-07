// Fold a Signal K REST model snapshot (GET /signalk/v1/api/) into BoatState.
//
// Why this exists: AIS statics (names, ship types) only transmit every ~6
// minutes. A browser connecting to the SK websocket mid-cycle — an iPad
// reloading on night watch — would show nameless targets until each one's
// next static lands, even though the Pi's SK server has them cached in its
// model the whole time. The snapshot is fetched once on connect and applied
// as an UNDERLAY: it creates contacts the stream hasn't mentioned yet and
// fills blank names/types, but never overwrites anything a live delta has
// already set — deltas are always fresher.
//
// Pure. The one-line fetch shell lives in signalk.ts connect().
import type { BoatState, Contact } from "./types";

const R2D = 180 / Math.PI;
const MS_TO_KT = 1.943844;

interface SkNode {
  name?: string;
  navigation?: {
    position?: { value?: { latitude: number; longitude: number } };
    courseOverGroundTrue?: { value?: number };
    speedOverGround?: { value?: number };
  };
  design?: { aisShipType?: { value?: { name?: string } } };
}

export interface SkRestModel {
  self?: string; // "vessels.urn:mrn:imo:mmsi:<own>"
  vessels?: Record<string, SkNode>;
  atons?: Record<string, SkNode>;
}

function toContact(id: string, n: SkNode, aton: boolean): Contact {
  const pos = n.navigation?.position?.value;
  return {
    id,
    name: n.name ?? "",
    type: n.design?.aisShipType?.value?.name ?? (aton ? "Nav Aid" : "Vessel"),
    aton,
    position: pos ? { lat: pos.latitude, lon: pos.longitude } : { lat: 0, lon: 0 },
    cog: ((n.navigation?.courseOverGroundTrue?.value ?? 0) * R2D + 360) % 360,
    sog: (n.navigation?.speedOverGround?.value ?? 0) * MS_TO_KT,
  };
}

export function applySnapshot(state: BoatState, model: SkRestModel): BoatState {
  // REST vessel keys are bare URNs; the self field is "vessels.<urn>".
  const selfUrn = model.self?.replace(/^vessels\./, "");
  const entries: [string, SkNode, boolean][] = [
    ...Object.entries(model.vessels ?? {})
      .filter(([urn]) => urn !== selfUrn)
      .map(([urn, n]): [string, SkNode, boolean] => [urn, n, false]),
    ...Object.entries(model.atons ?? {}).map(([urn, n]): [string, SkNode, boolean] => [urn, n, true]),
  ];

  const contacts = state.contacts.slice();
  for (const [urn, node, aton] of entries) {
    const id = urn.split(":").pop() ?? urn;
    const i = contacts.findIndex((c) => c.id === id);
    if (i === -1) {
      contacts.push(toContact(id, node, aton));
      continue;
    }
    // Underlay: only fill what the live stream hasn't set.
    const c = contacts[i];
    const filled = { ...c };
    if (!c.name && node.name) filled.name = node.name;
    const snapType = node.design?.aisShipType?.value?.name;
    if ((c.type === "Vessel" || c.type === "Nav Aid") && snapType) filled.type = snapType;
    if (c.position.lat === 0 && c.position.lon === 0) {
      const pos = node.navigation?.position?.value;
      if (pos) filled.position = { lat: pos.latitude, lon: pos.longitude };
    }
    contacts[i] = filled;
  }
  return { ...state, contacts };
}
