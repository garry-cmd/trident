"use client";
import { useState, useEffect } from "react";
import { initState, advanceState, TICK_MS } from "@/lib/simulate";
import { connect, emptyLiveState } from "@/lib/signalk";
import { useSettings } from "./useSettings";

// Owns the canonical BoatState and its source lifecycle.
//
// Source default is build-keyed: the Pi static export sets
// NEXT_PUBLIC_LIVE_DEFAULT=true (via build:static) so the boat box shows real
// Signal K data with no magic URL param. Vercel/dev default to the simulator —
// that's the design surface. `?source=live` / `?source=sim` always override,
// both ways. Live connects to the Pi's Signal K WS and feeds the SAME applyDelta
// path the daemon uses; everything downstream is identical because the emitted
// BoatState shape is identical — the SIM badge keys off state.source, so live
// data never shows as sim. SK must have the Vesper feed (192.168.15.1:39150)
// wired or the scope stays empty (Pi system-health flows regardless).
const LIVE_DEFAULT = process.env.NEXT_PUBLIC_LIVE_DEFAULT === "true";

function readSource() {
  const fallback = LIVE_DEFAULT ? "live" : "sim";
  if (typeof window === "undefined") return fallback;
  const p = new URLSearchParams(window.location.search).get("source");
  if (p === "live") return "live";
  if (p === "sim") return "sim";
  return fallback;
}

// SK stream on the same host the app is served from (trident.local:3000 on the
// Pi). subscribe=all so AIS contacts + AtoN arrive, not just navigation.
function signalkUrl() {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `ws://${host}:3000/signalk/v1/stream?subscribe=all`;
}

export function useBoatState() {
  const { paused } = useSettings();
  const [source] = useState(readSource);
  const [state, setState] = useState(() => (readSource() === "live" ? emptyLiveState() : initState()));

  useEffect(() => {
    if (source === "live") {
      // connect() returns its own disconnect; paused doesn't gate live data.
      return connect(signalkUrl(), setState, (e) => console.warn("signalk:", e));
    }
    if (paused) return;
    const iv = setInterval(() => setState((prev) => advanceState(prev)), TICK_MS);
    return () => clearInterval(iv);
  }, [paused, source]);

  return { state };
}
