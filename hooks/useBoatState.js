"use client";
import { useState, useEffect } from "react";
import { initState, advanceState, TICK_MS } from "@/lib/simulate";
import { connect, emptyLiveState } from "@/lib/signalk";
import { useSettings } from "./useSettings";

// Owns the canonical BoatState and its source lifecycle.
//
// Source is chosen by the URL: default is the simulator; `?source=live`
// connects to the Pi's Signal K WebSocket and feeds the SAME applyDelta path
// the daemon uses. Everything downstream is identical because the emitted
// BoatState shape is identical — the SIM badge keys off state.source, so live
// data never shows as sim. On the boat, going live is this flag flip; SK must
// have the Vesper feed (192.168.15.1:39150) wired first or the scope stays empty.
function readSource() {
  if (typeof window === "undefined") return "sim";
  return new URLSearchParams(window.location.search).get("source") === "live" ? "live" : "sim";
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
