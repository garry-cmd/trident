"use client";
import { useState, useRef, useEffect } from "react";
import { distanceNm } from "@/lib/geo";

// Accumulates own-vessel positions into a downsampled track for the chart.
// It is fed the CURRENT position (never useBoatState — that hook spins its own
// simulator per caller, so a second call would diverge from the one the chart
// already runs). A new point is stored only once the vessel has moved at least
// `minMoveNm`, and the buffer is capped at `maxPoints` (oldest dropped).
//
// In-memory by design: the trail resets on reload. Persisted track history
// comes later with the Pi's SQLite buffer — not faked here.
export function useTrack(position, { minMoveNm = 0.01, maxPoints = 400 } = {}) {
  const [track, setTrack] = useState([]);
  const lastRef = useRef(null);
  const lat = position ? position.lat : null;
  const lon = position ? position.lon : null;

  useEffect(() => {
    if (lat == null || lon == null) return;
    const cur = { lat, lon };
    const last = lastRef.current;
    if (last && distanceNm(last, cur) < minMoveNm) return;
    lastRef.current = cur;
    setTrack((t) => {
      const next = [...t, cur];
      return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
    });
  }, [lat, lon, minMoveNm, maxPoints]);

  return track;
}
