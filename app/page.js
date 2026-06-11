"use client";
import { useState, useCallback } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { DEFAULT_RANGE } from "@/lib/settings";
import { useSettings } from "@/hooks/useSettings";
import { useTargets } from "@/hooks/useTargets";
import RadarSVG from "@/components/radar/RadarSVG";
import WatchLayout from "@/components/WatchLayout";

// Radar view: the radar scope dropped into the shared watch shell. The shell
// owns the instrument strip, sidebar (list + heading), range filter, CPA sort,
// and danger->alarm registration; this page owns only the scope, its zoom, and
// radar-specific selection (selecting a target auto-zooms the scope).
export default function RadarPage() {
  const { displayMode, filterRange, viewRange, setViewRange, thresholds } = useSettings();
  const { targets, own, self } = useTargets();
  const [selId, setSelId] = useState(null);

  const selectTarget = useCallback((id) => {
    if (id === selId) { setSelId(null); setViewRange(DEFAULT_RANGE); return; }
    setSelId(id);
    const t = targets.find((x) => x.id === id);
    if (t) setViewRange(Math.min(Math.max(1, Math.ceil(t.dist * 1.5)), DEFAULT_RANGE + 1));
  }, [selId, targets, setViewRange]);

  const resetView = useCallback(() => { setSelId(null); setViewRange(DEFAULT_RANGE); }, [setViewRange]);

  return (
    <WatchLayout self={self} displayMode={displayMode} targets={targets} selId={selId} onSelect={selectTarget} onClose={resetView}>
      <RadarSVG
        targets={targets}
        selId={selId}
        viewRange={viewRange}
        displayMode={displayMode}
        own={own}
        filterRange={filterRange}
        guardNm={thresholds.guardNm}
        onSelect={selectTarget}
        onResetBackground={resetView}
      />
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, zIndex: 5 }}>
        <div onClick={() => setViewRange((r) => Math.max(1, r - 1))} style={zoomBtn}>+</div>
        <div style={{ minWidth: 36, textAlign: "center", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: C.dim, lineHeight: "48px" }}>{viewRange}</div>
        <div onClick={() => setViewRange((r) => Math.min(6, r + 1))} style={zoomBtn}>{"\u2212"}</div>
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 8, color: "#1e2e3e" }}>tap background to reset</div>
    </WatchLayout>
  );
}

const zoomBtn = { width: 48, height: 48, background: "rgba(13,19,25,0.9)", border: "1px solid " + C.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: C.text, cursor: "pointer" };
