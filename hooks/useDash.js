"use client";
import { useState, useEffect, useCallback } from "react";
import { useTargets } from "./useTargets";
import { feedAgeSec, feedStatus, hasGpsFix, systemsStatus, anchorBoatStatus } from "@/lib/dash";
import { anchorStatus, maxSwingM } from "@/lib/anchor";
import { FEED_STALE_SEC, FEED_LOST_SEC, DEFAULT_ANCHOR_RADIUS_M } from "@/lib/settings";

// Anchor watch is operational state (a dropped hook), not a UI preference, so it
// persists under its own key — reloading the tab at 2 a.m. must not lose the
// watch. Radius travels with it. Pure window-guarded load/save.
const ANCHOR_KEY = "trident.anchor.v1";
const DEFAULT_ANCHOR = { setPoint: null, setAt: null, alarmRadiusM: DEFAULT_ANCHOR_RADIUS_M };

function loadAnchor() {
  if (typeof window === "undefined") return DEFAULT_ANCHOR;
  try {
    const raw = window.localStorage.getItem(ANCHOR_KEY);
    if (!raw) return DEFAULT_ANCHOR;
    const a = JSON.parse(raw);
    const radius = Number.isFinite(a?.alarmRadiusM) ? a.alarmRadiusM : DEFAULT_ANCHOR_RADIUS_M;
    const pt = a?.setPoint && Number.isFinite(a.setPoint.lat) && Number.isFinite(a.setPoint.lon) ? a.setPoint : null;
    return { setPoint: pt, setAt: pt ? a.setAt ?? null : null, alarmRadiusM: radius };
  } catch {
    return DEFAULT_ANCHOR;
  }
}
function saveAnchor(a) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(ANCHOR_KEY, JSON.stringify(a)); } catch { /* private mode */ }
}

// Single composition point for the Dash view model. Reuses the same data
// pipeline as the AIS view (useTargets) so sim/live behave identically, adds a
// 1 s wall clock so feed age advances even when no new delta arrives, and owns
// the anchor set-point. Status for each focus area is derived here; Power and
// Weather are "off" (gated) until the Cerbo / NGX-1 exist — never faked.
export function useDash() {
  const { targets, self, source, ts } = useTargets();
  const [anchor, setAnchor] = useState(loadAnchor);
  const [maxSwing, setMaxSwing] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { saveAnchor(anchor); }, [anchor]);

  const ageSec = feedAgeSec(now, ts);
  const feed = feedStatus(ageSec, FEED_STALE_SEC, FEED_LOST_SEC);
  const gpsFix = hasGpsFix(self.position);
  const aStat = anchorStatus(self.position, anchor);

  // Accumulate the widest swing observed since the hook went down.
  useEffect(() => {
    if (aStat.set) setMaxSwing((m) => maxSwingM(m, aStat.distanceM));
  }, [aStat.set, aStat.distanceM]);

  const setAnchorHere = useCallback(() => {
    setAnchor((a) => ({ ...a, setPoint: { ...self.position }, setAt: Date.now() }));
    setMaxSwing(0);
  }, [self.position]);
  const clearAnchor = useCallback(() => {
    setAnchor((a) => ({ ...a, setPoint: null, setAt: null }));
    setMaxSwing(0);
  }, []);
  const setRadius = useCallback((m) => setAnchor((a) => ({ ...a, alarmRadiusM: m })), []);

  return {
    self, source, targets,
    feed, ageSec, gpsFix,
    anchor: aStat, anchorRadiusM: anchor.alarmRadiusM, setAt: anchor.setAt, maxSwing,
    mode: aStat.set ? "anchor" : "underway",
    setAnchorHere, clearAnchor, setRadius,
    status: {
      systems: systemsStatus(feed, gpsFix),
      power: "off",   // gated — no BMV/Cerbo yet
      weather: "off", // gated — no NGX-1 yet
      boat: anchorBoatStatus(aStat.set, aStat.dragging),
    },
  };
}
