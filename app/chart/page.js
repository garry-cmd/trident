"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/useSettings";
import { useChartData } from "@/hooks/useChartData";
import ChartTargetCard from "@/components/chart/ChartTargetCard";
import { C, FONT_MONO } from "@/lib/theme";

// MapLibre touches window/WebGL, so the map is client-only — dynamically
// imported with ssr:false. This stays a one-line switch to a static export for
// the Pi later (no server-only features in play).
const ChartMap = dynamic(() => import("@/components/chart/ChartMap"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.dim, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.12em" }}>
      LOADING CHART{"\u2026"}
    </div>
  ),
});

// Chart view: own vessel + AIS overlay on a slippy chart. Orientation and night
// mode come from the global Settings the radar also reads, so the two views can
// never disagree. The page owns only selection + follow state; the map is
// imperative, the card is dumb.
export default function ChartPage() {
  const { displayMode, nightMode, filterRange } = useSettings();
  const { self, contacts, source } = useChartData();
  const [selId, setSelId] = useState(null);
  const [follow, setFollow] = useState(true);

  // Honour the same range filter as the radar (drops distant targets from the
  // view). Selection reads the full set so the card survives a filter change.
  const visible = contacts.filter((c) => c.dist <= filterRange);
  const sel = contacts.find((c) => c.id === selId) || null;

  const select = useCallback((id) => setSelId((p) => (p === id ? null : id)), []);
  const onUserPan = useCallback(() => setFollow(false), []);
  const recenter = useCallback(() => setFollow(true), []);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      <ChartMap
        self={self}
        contacts={visible}
        displayMode={displayMode}
        nightMode={nightMode}
        selId={selId}
        follow={follow}
        source={source}
        onSelect={select}
        onUserPan={onUserPan}
        onRecenter={recenter}
      />
      {sel && <ChartTargetCard target={sel} onClose={() => setSelId(null)} />}
    </div>
  );
}
