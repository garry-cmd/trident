// When does an anchor drag sound the alarm? Pure, no React.
//
// The anchor watch confirms a drag (60 s contiguously outside the ring — see
// evalDrag). That sounds the alarm. Acknowledging silences it, but only for the
// distance you acknowledged at: drag a further step out and it sounds again,
// because "I've seen it" at 60 m is not consent to 120 m. Coming back inside
// (the watch releases the drag) clears the acknowledgement, so a fresh drag
// sounds from scratch.
import type { AnchorStatus } from "./anchor";

export const RE_ALARM_MIN_M = 15; // never re-alarm on less than this much further drift
export const RE_ALARM_FRACTION = 0.5; // ...or half the alarm radius, whichever is larger

export function reAlarmStepM(radiusM: number): number {
  return Math.max(RE_ALARM_MIN_M, RE_ALARM_FRACTION * radiusM);
}

// ackedAtM: distance from the anchor when the alarm was last acknowledged, or
// null if this drag hasn't been acknowledged.
export function anchorAlarmActive(status: Pick<AnchorStatus, "set" | "dragging" | "noFix" | "distanceM">, ackedAtM: number | null, radiusM: number): boolean {
  if (!status.set || !status.dragging) return false;
  if (ackedAtM === null) return true;
  if (status.noFix) return false; // can't measure further drift without a fix; the drag itself was already acked
  return status.distanceM >= ackedAtM + reAlarmStepM(radiusM);
}
