"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/useSettings";
import { useChartData } from "@/hooks/useChartData";
import WatchLayout from "@/components/WatchLayout";
import { C, FONT_MONO } from "@/lib/theme";

// MapLibre touches window/WebGL, so the map is client-only (ssr:false). Stays a
// one-line switch to a static export for the Pi later.
const ChartMap = dynamic(() => import("@/components/chart/ChartMap"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.12em" }}>
      LOADING CHART{"\u2026"}
    </div>
  ),
});

// Chart view: the map dropped into the shared watch shell, so it gets the
// instrument strip, sidebar list, and heading panel for free — identical to
// radar. Selection is unified: tapping a marker OR a sidebar row selects the
// target, which both highlights it and centres the map on it (handled in
// ChartMap). No more floating card — the sidebar detail panel covers that.
export default function ChartPage() {
  const { displayMode, theme, filterRange } = useSettings();
  const { self, contacts, source } = useChartData();
  const [selId, setSelId] = useState(null);
  const [follow, setFollow] = useState(true);

  const visible = contacts.filter((c) => c.dist <= filterRange);

  // Selecting a target stops follow so the map can settle on it; the recenter
  // button (in ChartMap) brings own-vessel follow back.
  const select = useCallback((id) => { setSelId((p) => (p === id ? null : id)); setFollow(false); }, []);
  const onUserPan = useCallback(() => setFollow(false), []);
  const recenter = useCallback(() => setFollow(true), []);

  return (
    <WatchLayout self={self} displayMode={displayMode} targets={contacts} selId={selId} onSelect={select} onClose={() => setSelId(null)}>
      <ChartMap
        self={self}
        contacts={visible}
        displayMode={displayMode}
        theme={theme}
        selId={selId}
        follow={follow}
        source={source}
        onSelect={select}
        onUserPan={onUserPan}
        onRecenter={recenter}
      />
    </WatchLayout>
  );
}
