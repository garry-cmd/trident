"use client";
import { useState, useEffect, useMemo } from "react";
import { useTargets } from "./useTargets";
import { useSettings } from "./useSettings";
import {
  feedAgeSec, feedStatus, hasGpsFix, systemsStatus, anchorBoatStatus,
  worstStatus, batteryStatus, baroStatus, piStatus,
} from "@/lib/dash";
import { useAnchorWatch } from "./useAnchorWatch";
import { demoTelemetry, EMPTY_TELEMETRY } from "@/lib/demo";

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
  const { targets, self, source, ts, telemetry: liveTelemetry } = useTargets();
  const { alarms } = useSettings();
  const [demo] = useState(readDemo);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // The anchor watch itself lives on /anchor; the Dash reads the same shared
  // (persisted) state so the Boat card can summarise it without a second brain.
  const watch = useAnchorWatch(self.position, self.heading, ts);

  // Demo overlay wins (explicit ?demo=1); otherwise live telemetry from Signal K
  // (Pi health today; Cerbo/NGX-1 later); otherwise empty/gated.
  const telemetry = useMemo(
    () => (demo ? demoTelemetry(now) : (liveTelemetry ?? EMPTY_TELEMETRY)),
    [demo, now, liveTelemetry]
  );

  const ageSec = feedAgeSec(now, ts);
  const feed = feedStatus(ageSec, alarms.feedStaleSec, alarms.feedLostSec);
  const gpsFix = hasGpsFix(self.position);
  const aStat = watch.status;

  return {
    self, source, demo, targets, telemetry, alarms,
    feed, ageSec, gpsFix,
    anchor: aStat, anchorRadiusM: watch.anchor.alarmRadiusM, setAt: watch.anchor.setAt,
    mode: aStat.set ? "anchor" : "underway",
    status: {
      systems: worstStatus(systemsStatus(feed, gpsFix), piStatus(telemetry.pi, alarms.piTempCaution)),
      power: batteryStatus(telemetry.battery, alarms.battMinV, alarms.battLowSoc),
      weather: baroStatus(telemetry.baro ? telemetry.baro.trend3h : null, alarms.baroFallCaution, alarms.baroFallDanger),
      boat: anchorBoatStatus(aStat.set, aStat.dragging, aStat.noFix),
    },
  };
}
