"use client";
import { useState, useEffect } from "react";
import { initTargets, advanceTargets, OWN, TICK_MS } from "@/lib/simulate";
import { enrichTargets } from "@/lib/ais";
import { useSettings } from "./useSettings";

// Owns the target data lifecycle. Today the source is the simulator; swapping
// in a live Signal K client means replacing initTargets/advanceTargets with
// the WS feed — the returned shape (enriched targets + own) stays identical,
// so no consuming component changes.
export function useTargets() {
  const { paused } = useSettings();
  const [raw, setRaw] = useState(initTargets);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => setRaw((prev) => advanceTargets(prev)), TICK_MS);
    return () => clearInterval(iv);
  }, [paused]);

  return { targets: enrichTargets(raw), own: OWN };
}
