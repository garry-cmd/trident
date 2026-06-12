// Capture data shapes — what the headless daemon records to the local SQLite
// buffer, and the running state its detector carries between BoatState updates.
//
// These are Pi-owned, append-only records (see INTEGRATION-TRIDENT.md in the
// Keeply repo). track_points is raw/hi-res and stays local; capture_events and
// passages are what eventually sync (downsample-on-sync lives in downsample.ts).
// Nothing here is React or Node — pure types, shared by lib/ tests and the daemon.
import type { LatLon, Thresholds } from "../types";

// A discrete event worth logging. `engine` is reserved (blocked on the NGX-1 —
// no N2K engine data yet) so the schema carries it without a detector faking it.
export type CaptureEventType =
  | "underway"
  | "stopped"
  | "anchor_drag"
  | "cpa"
  | "engine";

export interface TrackPoint {
  passageId: string | null; // the open passage this point belongs to
  ts: number; // ms epoch
  lat: number;
  lon: number;
  sog: number; // kt
  cog: number; // deg true
}

export interface CaptureEvent {
  passageId: string | null;
  ts: number; // ms epoch
  type: CaptureEventType;
  contactId?: string; // MMSI for cpa events
  meta?: Record<string, number | string>; // event-specific detail (JSON in SQLite)
}

// Emitted when the detector decides a new passage has begun. The daemon writes
// the row; the UUID is minted client-side (injected newId) so it reconciles on
// sync without a server round-trip. v1 never auto-closes a passage (we can't
// honestly tell "arrived" from "lunch hook") — closing is deferred to the app.
export interface PassageOp {
  op: "open";
  id: string;
  ts: number;
  lat: number;
  lon: number;
}

// The daemon's running state between BoatState updates. Held in memory; the
// SQLite buffer is the durable record. Pure data — detect.ts evolves it.
export interface CaptureState {
  motion: "unknown" | "underway" | "stopped";
  pending: "underway" | "stopped" | null; // candidate transition awaiting confirmation
  pendingSince: number | null; // ts the candidate was first seen contiguously
  passageId: string | null; // open passage, or null
  anchor: { ref: LatLon; dragging: boolean } | null; // set on stop, cleared underway
  lastTrackTs: number; // ts of last stored track point (cadence gate)
  dangerContacts: Record<string, true>; // contact ids currently in the danger band
}

export interface CaptureConfig {
  underwayKt: number; // SOG at/above this (sustained) ⇒ underway
  stopKt: number; // SOG at/below this (sustained) ⇒ stopped — gap from underwayKt = hysteresis
  sustainMs: number; // a candidate must hold this long, contiguously, to commit
  trackIntervalMs: number; // min spacing between stored track points (hi-res local)
  anchorRadiusNm: number; // drag if range from the anchor ref exceeds this
  cpaThresholds: Thresholds; // CPA event fires on the danger band — objective, not the UI's live setting
}
