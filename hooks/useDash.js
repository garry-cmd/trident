"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useTargets } from "./useTargets";
import {
  feedAgeSec, feedStatus, hasGpsFix, systemsStatus, anchorBoatStatus,
  worstStatus, batteryStatus, baroStatus, piStatus,
} from "@/lib/dash";
import { anchorStatus, maxSwingM } from "@/lib/anchor";
import { demoTelemetry, EMPTY_TELEMETRY } from "@/lib/demo";
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

// DEMO mode fills the gated panels with synthetic telemetry so the whole Dash
// can be exercised before the Cerbo / NGX-1 exist. Explicit URL flag (?demo=1),
// badged in the UI — the default stays gated and honest.
function readDemo() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

// Single composition point for the Dash view model. Reuses the same data
// pipeline as the AIS view (useTargets) so sim/live behave identically, adds a
// 1 s wall clock so feed age advances even when no new delta arrives, owns the
// anchor set-point, and threads telemetry (demo now, Signal K later). Status for
// each focus area is derived here; Power/Weather are "off" until their telemetry
// exists — never faked.
export function useDash() {
  const { targets, self, source, ts } = useTargets();
  const [demo] = useState(readDemo);
  const [anchor, setAnchor] = useState(loadAnchor);
  const [maxSwing, setMaxSwing] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { saveAnchor(anchor); }, [anchor]);

  const telemetry = useMemo(() => (demo ? demoTelemetry(now) : EMPTY_TELEMETRY), [demo, now]);

  const ageSec = feedAgeSec(now, ts);
  const feed = feedStatus(ageSec, FEED_STALE_SEC, FEED_LOST_SEC);
  const gpsFix = hasGpsFix(self.position);
  const aStat = anchorStatus(self.position, anchor);

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
    self, source, demo, targets, telemetry,
    feed, ageSec, gpsFix,
    anchor: aStat, anchorRadiusM: anchor.alarmRadiusM, setAt: anchor.setAt, maxSwing,
    mode: aStat.set ? "anchor" : "underway",
    setAnchorHere, clearAnchor, setRadius,
    status: {
      systems: worstStatus(systemsStatus(feed, gpsFix), piStatus(telemetry.pi)),
      power: batteryStatus(telemetry.battery),
      weather: baroStatus(telemetry.baro ? telemetry.baro.trend3h : null),
      boat: anchorBoatStatus(aStat.set, aStat.dragging),
    },
  };
}
