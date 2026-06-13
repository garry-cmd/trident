// Horn policy — PURE. Maps the capture detector's running state to a single
// logical horn output: ON while a life-safety hazard is active, OFF otherwise.
// No I/O, no pin numbers, no polarity — those are hardware concerns owned by
// daemon/relay.ts. This layer decides WHEN the horn sounds; the driver decides
// HOW (active-low GPIO). Kept pure so it's unit-tested alongside the detector
// and shared without dragging Node into lib/.
//
// Why derive from state, not events: capture events are momentary — they fire
// once on entry to the danger band / on drag onset. A horn must HOLD while the
// hazard persists and RELEASE when it clears. CaptureState already tracks
// exactly that — dangerContacts (CPA danger, with the detector's re-arm logic)
// and anchor.dragging (outside the swing circle, with re-arm) — so the horn is
// a pure function of it and inherits that hysteresis for free. No timers here.
import type { CaptureState } from "./types";

export type HornReason = "cpa" | "anchor_drag";

export interface HornState {
  on: boolean;
  reasons: HornReason[]; // why it's sounding — for the journal/log
}

export function hornState(s: CaptureState): HornState {
  const reasons: HornReason[] = [];
  if (Object.keys(s.dangerContacts).length > 0) reasons.push("cpa");
  if (s.anchor?.dragging) reasons.push("anchor_drag");
  return { on: reasons.length > 0, reasons };
}
