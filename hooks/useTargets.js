"use client";
import { useMemo } from "react";
import { deriveTargets } from "@/lib/state";
import { enrichTargets } from "@/lib/ais";
import { useBoatState } from "./useBoatState";
import { useSettings } from "./useSettings";

// Composes the data pipeline for the radar: world model -> brg/range view ->
// relative motion + CPA. Returns { targets, own } exactly as before, so every
// consuming component is untouched whether the source is sim or live. Each
// stage is memoized so the CPA trig only re-runs when its inputs change.
export function useTargets() {
  const { state } = useBoatState();
  const { thresholds } = useSettings();

  const { targets: raw, own } = useMemo(() => deriveTargets(state), [state]);
  const targets = useMemo(() => enrichTargets(raw, own, thresholds), [raw, own, thresholds]);

  return { targets, own, self: state.self, source: state.source, ts: state.ts };
}
