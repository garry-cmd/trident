"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  anchorStatus, anchorAhead, anchorAtBow, radiusForRode,
  evalDrag, breachMs, DRAG_INIT, IRENE, NM_TO_M,
} from "@/lib/anchor";
import { appendCrumb, sanitizeTrail, pruneTrail } from "@/lib/track";
import { project } from "@/lib/geo";
import { DEFAULT_RODE_M, DEFAULT_ANCHOR_RADIUS_M } from "@/lib/settings";

// The anchor watch is operational state (a hook on the bottom), not a UI
// preference, so it persists under its own keys — reloading the tab at 2am must
// lose neither the watch nor the trail. v2 because v1 stored the BOAT's
// position as the set point; reading that as an anchor position would put the
// circle a rode-length out of place.
const ANCHOR_KEY = "trident.anchor.v2";
const TRAIL_KEY = "trident.anchor.trail.v1";

const DEFAULT_ANCHOR = {
  setPoint: null,
  setAt: null,
  rodeM: DEFAULT_RODE_M,
  alarmRadiusM: DEFAULT_ANCHOR_RADIUS_M,
};

function loadAnchor() {
  if (typeof window === "undefined") return DEFAULT_ANCHOR;
  try {
    const a = JSON.parse(window.localStorage.getItem(ANCHOR_KEY) || "null");
    if (!a) return DEFAULT_ANCHOR;
    const pt = a.setPoint && Number.isFinite(a.setPoint.lat) && Number.isFinite(a.setPoint.lon) ? a.setPoint : null;
    return {
      setPoint: pt,
      setAt: pt ? a.setAt ?? null : null,
      rodeM: Number.isFinite(a.rodeM) ? a.rodeM : DEFAULT_RODE_M,
      alarmRadiusM: Number.isFinite(a.alarmRadiusM) ? a.alarmRadiusM : DEFAULT_ANCHOR_RADIUS_M,
    };
  } catch {
    return DEFAULT_ANCHOR;
  }
}
function loadTrail() {
  if (typeof window === "undefined") return [];
  try {
    return sanitizeTrail(JSON.parse(window.localStorage.getItem(TRAIL_KEY) || "null"), Date.now());
  } catch {
    return [];
  }
}
function save(key, v) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode / quota */ }
}

// Owns the anchor set point, the rolling trail, and the drag state machine.
// Takes position/heading/ts from whatever already owns the BoatState (the page
// or useDash) rather than opening a second data source — useBoatState is not
// context-backed, so calling it again would mint a second WebSocket.
export function useAnchorWatch(position, headingDeg, ts) {
  const [anchor, setAnchor] = useState(loadAnchor);
  const [trail, setTrail] = useState(loadTrail);
  const drag = useRef(DRAG_INIT);
  const [dragTick, setDragTick] = useState(0); // forces a re-read of the ref

  useEffect(() => { save(ANCHOR_KEY, anchor); }, [anchor]);

  // Raw distance drives the state machine; the confirmed flag drives the UI.
  const raw = useMemo(() => anchorStatus(position, anchor), [position, anchor]);

  useEffect(() => {
    if (!raw.set) {
      if (drag.current !== DRAG_INIT) { drag.current = DRAG_INIT; setDragTick((n) => n + 1); }
      return;
    }
    if (raw.noFix) return; // no fix is not "inside the ring" — freeze, don't clear
    const next = evalDrag(drag.current, raw.fraction, ts);
    if (next !== drag.current) { drag.current = next; setDragTick((n) => n + 1); }
  }, [raw.set, raw.noFix, raw.fraction, ts]);

  // Trail accumulates only while a watch is armed — underway track capture is
  // the daemon's job, and an unbounded trail on passage would be noise here.
  useEffect(() => {
    if (!anchor.setPoint) return;
    setTrail((t) => {
      const next = appendCrumb(t, position, ts);
      if (next !== t) save(TRAIL_KEY, next);
      return next;
    });
  }, [anchor.setPoint, position, ts]);

  // Prune the window even when the boat isn't moving, so a stale 13-hour crumb
  // doesn't sit in the fan implying swing that already aged out.
  useEffect(() => {
    if (!anchor.setPoint) return;
    const iv = setInterval(() => {
      setTrail((t) => {
        const next = pruneTrail(t, Date.now());
        if (next !== t) save(TRAIL_KEY, next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(iv);
  }, [anchor.setPoint]);

  const status = useMemo(
    () => anchorStatus(position, anchor, drag.current),
    // dragTick is the dependency that matters — drag.current is a ref.
    [position, anchor, dragTick] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Heading is what places the hook. Prefer true heading; fall back to COG only
  // if heading is absent — and say so, because COG at anchor is noise and the
  // resulting placement needs a nudge.
  const hdg = Number.isFinite(headingDeg) ? headingDeg : null;

  const arm = useCallback((where, rodeM) => {
    const h = hdg ?? 0;
    const setPoint = where === "bow"
      ? anchorAtBow(position, h, IRENE)
      : anchorAhead(position, h, rodeM, IRENE);
    setAnchor({ setPoint, setAt: Date.now(), rodeM, alarmRadiusM: radiusForRode(rodeM, IRENE) });
    drag.current = DRAG_INIT;
    setDragTick((n) => n + 1);
    setTrail([]);
    save(TRAIL_KEY, []);
  }, [position, hdg]);

  const weigh = useCallback(() => {
    setAnchor((a) => ({ ...a, setPoint: null, setAt: null }));
    drag.current = DRAG_INIT;
    setDragTick((n) => n + 1);
    setTrail([]);
    save(TRAIL_KEY, []);
  }, []);

  const setRadius = useCallback((m) => setAnchor((a) => ({ ...a, alarmRadiusM: m })), []);
  const setRode = useCallback((m) => setAnchor((a) => ({ ...a, rodeM: m })), []);

  // Nudge the hook 2 m at a time. The boring fallback for a missing heading, and
  // the way you correct a placement once the trail shows where the hook really is.
  const nudge = useCallback((brgDeg) => {
    setAnchor((a) => (a.setPoint ? { ...a, setPoint: project(a.setPoint, brgDeg, 2 / NM_TO_M) } : a));
  }, []);

  return {
    status,
    anchor,
    trail,
    hdg,
    headingSource: Number.isFinite(headingDeg) ? "heading" : "none",
    breachSec: Math.floor(breachMs(drag.current, ts) / 1000),
    plannedRadiusM: radiusForRode(anchor.rodeM, IRENE),
    arm, weigh, setRadius, setRode, nudge,
  };
}
