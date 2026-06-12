"use client";
import { useState, useCallback, useEffect } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { useSettings } from "@/hooks/useSettings";
import { useAlerts } from "@/hooks/useAlerts";
import { useTargets } from "@/hooks/useTargets";
import AisScope from "@/components/ais/AisScope";
import WatchLayout from "@/components/WatchLayout";

// AIS view: the AIS scope dropped into the shared watch shell. The shell owns
// the instrument strip, sidebar (list + heading), range filter, CPA sort, and
// danger->alarm registration; this page owns only the scope, its zoom, and
// scope-specific selection (selecting a target auto-zooms the scope).
export default function AisPage() {
  const { displayMode, filterRange, levelFilter, setLevelFilter, viewRange, setViewRange } = useSettings();
  const { targets, own, self } = useTargets();
  const { selectRequest, clearSelectRequest } = useAlerts();
  const [selId, setSelId] = useState(null);

  // Acknowledging a collision warning (or tapping the ACK chip) asks us to put
  // that vessel on the scope. Consume the request and clear it.
  useEffect(() => {
    if (selectRequest != null) {
      setSelId(selectRequest);
      clearSelectRequest();
    }
  }, [selectRequest, clearSelectRequest]);

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
        onSelect={selectTarget}
        onResetBackground={resetView}
      />
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, zIndex: 5 }}>
        <div onClick={() => setViewRange((r) => Math.max(1, r - 1))} style={zoomBtn}>+</div>
        <div style={{ minWidth: 36, textAlign: "center", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: C.dim, lineHeight: "48px" }}>{viewRange}</div>
        <div onClick={() => setViewRange((r) => Math.min(6, r + 1))} style={zoomBtn}>{"\u2212"}</div>
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 8, color: C.dim }}>tap background to deselect</div>

      {/* Filtered-view safety banner. The threat-level filter can silently hide
          traffic (even hide ALL of it) — a new watch could read an empty scope
          as "all clear". Whenever the filter is on, this stays up, says what's
          hidden, and clears to All in one tap. */}
      {levelFilter !== "all" && (
        <button onClick={() => setLevelFilter("all")} style={filterBanner}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>{"\u26A0"}</span>
          <span>FILTERED · {levelFilter === "danger" ? "DANGER" : "WATCH+"} ONLY</span>
          <span style={filterBannerCta}>SHOW ALL</span>
        </button>
      )}
    </WatchLayout>
  );
}

const filterBanner = {
  position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
  zIndex: 6, display: "flex", alignItems: "center", gap: 10,
  minHeight: 48, padding: "0 12px 0 14px",
  background: C.cautionDim, border: `1.5px solid ${C.caution}`, borderRadius: 8,
  color: C.cautionBr, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
  letterSpacing: "0.04em", whiteSpace: "nowrap", cursor: "pointer",
  boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
};

const filterBannerCta = {
  border: `1px solid ${C.cautionBr}`, borderRadius: 5, padding: "6px 10px",
  fontSize: 11, fontWeight: 700, color: C.cautionBr,
};

const zoomBtn = { width: 48, height: 48, background: C.raised, border: "1px solid " + C.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: C.bright, cursor: "pointer" };
