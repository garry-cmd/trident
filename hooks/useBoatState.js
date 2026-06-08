"use client";
import { useState, useEffect } from "react";
import { initState, advanceState, TICK_MS } from "@/lib/simulate";
import { useSettings } from "./useSettings";

// Owns the canonical BoatState and its source lifecycle. Today the source is
// the simulator. Going live on the Pi is a localized change HERE — replace the
// interval below with `connect(piUrl, setState)` from lib/signalk.ts — and
// nothing else in the app changes, because the emitted shape is identical.
export function useBoatState() {
  const { paused } = useSettings();
  const [state, setState] = useState(initState);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => setState((prev) => advanceState(prev)), TICK_MS);
    return () => clearInterval(iv);
  }, [paused]);

  return { state };
}
