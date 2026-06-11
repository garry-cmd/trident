"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { DEFAULT_RANGE } from "@/lib/settings";
import { describeOrientation } from "@/lib/orient";
import { useSettings } from "@/hooks/useSettings";
import { useTargets } from "@/hooks/useTargets";
import { useAlerts } from "@/hooks/useAlerts";
import RadarSVG from "@/components/radar/RadarSVG";
import InstrumentStrip from "@/components/InstrumentStrip";
import SidebarHeading from "@/components/radar/SidebarHeading";
import TargetList from "@/components/radar/TargetList";
import TargetStrip from "@/components/radar/TargetStrip";

// Radar is the root view. Layout: instrument read-strip on top, radar in the
// middle, and either the sidebar (landscape) or a target strip (portrait/phone)
// — driven by CSS in globals.css. Heading is never floating over the radar
// centre: it's in the sidebar panel (landscape) or the instrument strip +
// orientation chip (narrow). All logic lives in hooks/lib; this just assembles.
export default function RadarPage() {
  const { displayMode, filterRange, viewRange, setViewRange, thresholds, depthUnit } = useSettings();
  const { targets, own, self } = useTargets();
  const { setDangers } = useAlerts();
  const [selId, setSelId] = useState(null);

  const filtered = useMemo(() => targets.filter((t) => t.dist <= filterRange), [targets, filterRange]);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.aton ? 1 : b.aton ? -1 : a.cpa - b.cpa)),
    [filtered]
  );
  const selTarget = targets.find((t) => t.id === selId) || null;

  // A target alarms if it's in the CPA danger band, OR it's closing and will
  // reach a within-caution CPA inside the TCPA-alert window ("minutes to act").
  const dangers = useMemo(
    () =>
      targets
        .filter(
          (t) =>
            t.level === "danger" ||
            (!t.aton && t.tcpa > 0 && t.tcpa < thresholds.tcpaAlert && t.cpa < thresholds.cpaCaution)
        )
        .map((t) => ({ id: t.id, name: t.name, tcpa: t.tcpa })),
    [targets, thresholds.tcpaAlert, thresholds.cpaCaution]
  );
  const dangerKey = dangers.map((d) => d.id + ":" + Math.round(d.tcpa)).join(",");
  useEffect(() => { setDangers(dangers); }, [dangerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTarget = useCallback((id) => {
    if (id === selId) { setSelId(null); setViewRange(DEFAULT_RANGE); return; }
    setSelId(id);
    const t = targets.find((x) => x.id === id);
    if (t) setViewRange(Math.min(Math.max(1, Math.ceil(t.dist * 1.5)), DEFAULT_RANGE + 1));
  }, [selId, targets, setViewRange]);

  const resetView = useCallback(() => { setSelId(null); setViewRange(DEFAULT_RANGE); }, [setViewRange]);

  const orient = describeOrientation(displayMode, own);

  return (
    <div className="radar-grid">
      <InstrumentStrip self={self} depthUnit={depthUnit} />

      <div className="radar-scope">
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

        {/* Orientation chip — portrait/phone only (sidebar panel covers landscape). */}
        <div className="radar-ochip" style={{ position: "absolute", top: 10, left: 10, background: "rgba(6,10,14,0.8)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", zIndex: 5, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.compassN }}>
          {"\u25B2 "}{orient.mode}
        </div>

        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, zIndex: 5 }}>
          <div onClick={() => setViewRange((r) => Math.max(1, r - 1))} style={zoomBtn}>+</div>
          <div style={{ minWidth: 36, textAlign: "center", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: C.dim, lineHeight: "48px" }}>{viewRange}</div>
          <div onClick={() => setViewRange((r) => Math.min(6, r + 1))} style={zoomBtn}>{"\u2212"}</div>
        </div>

        <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 8, color: "#1e2e3e" }}>
          tap background to reset
        </div>
      </div>

      <aside className="radar-side" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
        <TargetList targets={sorted} selId={selId} selTarget={selTarget} onSelect={selectTarget} onClose={resetView} />
        <SidebarHeading own={own} displayMode={displayMode} />
      </aside>

      <div className="radar-strip">
        <TargetStrip targets={sorted} selId={selId} onSelect={selectTarget} />
      </div>
    </div>
  );
}

const zoomBtn = { width: 48, height: 48, background: "rgba(13,19,25,0.9)", border: "1px solid " + C.border, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: C.text, cursor: "pointer" };
