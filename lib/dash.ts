// Pure derivations for the Dash view model. No React. Turns the facts the live
// feed can actually answer into per-area status. Anything without a live source
// today (Pi hardware health, Victron, N2K instruments) is NOT modelled as a
// fake value here — those tiles are gated in the UI. This file derives only
// what BoatState and the connection can honestly tell us right now.
import type { LatLon } from "./types";

export type Status = "ok" | "caution" | "danger" | "off"; // "off" = no sensor / not connected

// AIS/nav feed freshness. The feed timestamp is BoatState.ts; a feed that stops
// updating means the collision watch has gone blind, so staleness is a real,
// live-today alarm signal (unlike battery voltage, which needs the BMV).
export function feedAgeSec(now: number, ts: number): number {
  return Math.max(0, (now - ts) / 1000);
}

export function feedStatus(ageSec: number, staleSec: number, lostSec: number): Status {
  if (ageSec >= lostSec) return "danger";
  if (ageSec >= staleSec) return "caution";
  return "ok";
}

// A position of exactly 0,0 (null island) means "no GPS fix yet", not a real
// fix in the Gulf of Guinea. Non-finite guards a malformed delta.
export function hasGpsFix(pos: LatLon): boolean {
  return (
    Number.isFinite(pos.lat) &&
    Number.isFinite(pos.lon) &&
    !(Math.abs(pos.lat) < 1e-9 && Math.abs(pos.lon) < 1e-9)
  );
}

// Systems rollup from live-today signals only. Pi hardware health / VHF / N2K /
// Victron are gated in the UI and intentionally excluded — a missing sensor is
// not a system fault.
export function systemsStatus(feed: Status, gpsFix: boolean): Status {
  if (feed === "danger" || !gpsFix) return "danger";
  if (feed === "caution") return "caution";
  return "ok";
}

// Boat-area status. When anchored it tracks drag; underway it's informational
// (depth/other alarms are gated rules added when their sensors land).
export function anchorBoatStatus(set: boolean, dragging: boolean): Status {
  if (!set) return "ok";
  return dragging ? "danger" : "ok";
}

// Worst of a set of statuses. "off" (a gated/absent sensor) is NOT worse than
// "ok" — an absent sensor isn't a fault. An all-"off" area stays "off".
const SEV: Record<Status, number> = { off: -1, ok: 0, caution: 1, danger: 2 };
export function worstStatus(...s: Status[]): Status {
  if (s.length === 0) return "off";
  if (s.every((x) => x === "off")) return "off";
  return s.reduce<Status>((a, b) => (SEV[b] > SEV[a] ? b : a), "ok");
}
