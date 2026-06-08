"use client";
import { useState, useEffect, useMemo } from "react";
import { initTargets, advanceTargets, OWN, TICK_MS } from "@/lib/simulate";
import { enrichTargets } from "@/lib/ais";
import { useSettings } from "./useSettings";

// Owns the target data lifecycle. Today the source is the simulator; swapping
// in a live Signal K client means replacing initTargets/advanceTargets with
// the WS feed — the returned shape (enriched targets + own) stays identical,
// so no consuming component changes. Enrichment is memoized so the CPA trig
// only runs when the raw data actually changes, not on every parent render.
export function useTargets() {
  const { paused } = useSettings();
  const [raw, setRaw] = useState(initTargets);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => setRaw((prev) => advanceTargets(prev, OWN)), TICK_MS);
    return () => clearInterval(iv);
  }, [paused]);

  const targets = useMemo(() => enrichTargets(raw, OWN), [raw]);
  return { targets, own: OWN };
}
