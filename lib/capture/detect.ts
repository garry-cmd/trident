// Capture detector — PURE. Given the running CaptureState and the next
// BoatState, decide what to record: a track point, zero or more events, and a
// passage-open op. No I/O, no clock of its own (time comes from boat.ts), no
// randomness of its own (the passage UUID is injected) — so it is fully
// deterministic and unit-tested. The daemon (daemon/index.ts) does the writing.
//
// Detectors in v1: underway⇄stopped (with hysteresis + a sustain window),
// passage origination on the first underway, anchor-drag while stopped, and
// CPA-danger crossings. Engine is reserved in the schema but has no detector
// (blocked on the NGX-1 — no honest N2K engine data yet).
import type { BoatState } from "../types";
import { deriveTargets } from "../state";
import { enrichTargets } from "../ais";
import { distanceNm } from "../geo";
import { DEFAULT_THRESHOLDS } from "../settings";
import type { CaptureConfig, CaptureEvent, CaptureState, PassageOp, TrackPoint } from "./types";

const NM_PER_M = 1 / 1852;

export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  underwayKt: 0.7, // clearly moving
  stopKt: 0.3, // clearly stopped (0.3–0.7 band absorbs GPS jitter at rest)
  sustainMs: 30_000, // 30s of contiguous readings before a transition commits
  trackIntervalMs: 5_000, // a point every ~5s underway (downsampled to ~1/min on sync)
  anchorRadiusNm: 50 * NM_PER_M, // ≈50 m swing circle
  cpaThresholds: DEFAULT_THRESHOLDS,
};

export function initCaptureState(): CaptureState {
  return {
    motion: "unknown",
    pending: null,
    pendingSince: null,
    passageId: null,
    anchor: null,
    lastTrackTs: 0,
    dangerContacts: {},
  };
}

export interface CaptureResult {
  state: CaptureState;
  point?: TrackPoint;
  events: CaptureEvent[];
  passageOp?: PassageOp;
}

// Fold one BoatState into the capture state. `newId` mints a passage UUID when a
// passage opens (crypto.randomUUID in the daemon; a stub in tests).
export function detectCapture(
  prev: CaptureState,
  boat: BoatState,
  newId: () => string,
  cfg: CaptureConfig = DEFAULT_CAPTURE_CONFIG,
): CaptureResult {
  const s: CaptureState = {
    ...prev,
    anchor: prev.anchor ? { ...prev.anchor } : null,
    dangerContacts: { ...prev.dangerContacts },
  };
  const events: CaptureEvent[] = [];
  let passageOp: PassageOp | undefined;
  let point: TrackPoint | undefined;
  const { ts } = boat;
  const { lat, lon } = boat.self.position;
  const sog = boat.self.sog;

  // GPS-fix guard. emptyLiveState() seeds self at (0,0); before the first
  // navigation.position delta lands, any speed/course delta would otherwise
  // open a passage or drop an anchor ref at null-island. No vessel is ever
  // legitimately at exactly 0,0 — wait for a real fix.
  if (lat === 0 && lon === 0) return { state: prev, events: [] };

  // ── Motion state machine (hysteresis + sustain window) ────────────────────
  // Desired state only from clearly-out-of-band SOG; in-band is no opinion and
  // cancels any pending transition, so a commit needs sustainMs of contiguous
  // clearly-in-direction readings.
  const desired: "underway" | "stopped" | null =
    sog >= cfg.underwayKt ? "underway" : sog <= cfg.stopKt ? "stopped" : null;

  if (desired && desired !== s.motion) {
    if (s.pending !== desired) {
      s.pending = desired;
      s.pendingSince = ts;
    } else if (s.pendingSince !== null && ts - s.pendingSince >= cfg.sustainMs) {
      // Commit the transition.
      s.motion = desired;
      s.pending = null;
      s.pendingSince = null;

      if (desired === "underway") {
        s.anchor = null; // weighed anchor
        if (!s.passageId) {
          const id = newId();
          s.passageId = id;
          passageOp = { op: "open", id, ts, lat, lon };
        }
        events.push({ passageId: s.passageId, ts, type: "underway", meta: { sog } });
      } else {
        s.anchor = { ref: { lat, lon }, dragging: false }; // drop the watch circle here
        events.push({ passageId: s.passageId, ts, type: "stopped", meta: { sog } });
      }
    }
  } else {
    // Back at the committed state, or in the dead band — cancel any candidate.
    s.pending = null;
    s.pendingSince = null;
  }

  // ── Anchor-drag watch (only while stopped, ref auto-set on the stop) ───────
  if (s.motion === "stopped" && s.anchor) {
    const d = distanceNm(s.anchor.ref, { lat, lon });
    if (d > cfg.anchorRadiusNm && !s.anchor.dragging) {
      s.anchor.dragging = true;
      events.push({
        passageId: s.passageId,
        ts,
        type: "anchor_drag",
        meta: { distNm: round(d, 4), radiusNm: round(cfg.anchorRadiusNm, 4) },
      });
    } else if (d <= cfg.anchorRadiusNm && s.anchor.dragging) {
      s.anchor.dragging = false; // back inside — re-arm for the next excursion
    }
  }

  // ── CPA-danger crossings ──────────────────────────────────────────────────
  // Reuse the exact UI collision math. Log only on ENTRY to danger (per contact),
  // closing targets (tcpa ≥ 0), AtoN excluded. Re-approach re-emits once cleared.
  const { targets, own } = deriveTargets(boat);
  const enriched = enrichTargets(
    targets.filter((t) => !t.aton),
    own,
    cfg.cpaThresholds,
  );
  const nextDanger: Record<string, true> = {};
  for (const t of enriched) {
    if (t.level === "danger" && t.tcpa >= 0) {
      nextDanger[t.id] = true;
      if (!s.dangerContacts[t.id]) {
        events.push({
          passageId: s.passageId,
          ts,
          type: "cpa",
          contactId: t.id,
          meta: {
            cpaNm: round(t.cpa, 3),
            tcpaMin: round(t.tcpa, 1),
            name: t.name || t.id,
            brg: Math.round(t.brg),
            rangeNm: round(t.dist, 2),
          },
        });
      }
    }
  }
  s.dangerContacts = nextDanger;

  // ── Track point (underway only; anchored position is noise) ───────────────
  if (s.motion === "underway" && ts - s.lastTrackTs >= cfg.trackIntervalMs) {
    s.lastTrackTs = ts;
    point = { passageId: s.passageId, ts, lat, lon, sog, cog: boat.self.cog };
  }

  return { state: s, point, events, passageOp };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
