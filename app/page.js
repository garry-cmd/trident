"use client";
import { useState, useCallback } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { useSettings } from "@/hooks/useSettings";
import { useTargets } from "@/hooks/useTargets";
import AisScope from "@/components/ais/AisScope";
import WatchLayout from "@/components/WatchLayout";

// AIS view: the AIS scope dropped into the shared watch shell. The shell owns
// the instrument strip, sidebar (list + heading), range filter, CPA sort, and
// danger->alarm registration; this page owns only the scope, its zoom, and
// scope-specific selection (selecting a target auto-zooms the scope).
export default function AisPage() {
  const { displayMode, filterRange, levelFilter, viewRange, setViewRange, thresholds } = useSettings();
  const { targets, own, self } = useTargets();
  const [selId, setSelId] = useState(null);

  // Selection never touches zoom — the zoom is yours, changed only by the +/-
  // buttons. Tapping a target just selects it; tapping it again, or the
  // background, clears the selection. (Switching targets used to re-zoom, which
  // meant constantly re-zooming by hand — gone.)
  const selectTarget = useCallback((id) => {
    setSelId((cur) => (cur === id ? null : id));
  }, []);

  const resetView = useCallback(() => { setSelId(null); }, []);

  return (
    <WatchLayout self={self} displayMode={displayMode} targets={targets} selId={selId} onSelect={selectTarget} onClose={resetView}>
      <AisScope
        targets={targets}
        selId={selId}
        viewRange={viewRange}
        displayMode={displayMode}
        own={own}
        filterRange={filterRange}
        levelFilter={levelFilter}
        guardNm={thresholds.guardNm}
        onSelect={selectTarget}
        onResetBackground={resetView}
      />
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, zIndex: 5 }}>
        <div onClick={() => setViewRange((r) => Math.max(1, r - 1))} style={zoomBtn}>+</div>
        <div style={{ minWidth: 36, textAlign: "center", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: C.dim, lineHeight: "48px" }}>{viewRange}</div>
        <div onClick={() => setViewRange((r) => Math.min(6, r + 1))} style={zoomBtn}>{"\u2212"}</div>
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 8, color: C.dim }}>tap background to deselect</div>
    </WatchLayout>
  );
}

const zoomBtn = { width: 48, height: 48, background: C.raised, border: "1px solid " + C.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: C.bright, cursor: "pointer" };
