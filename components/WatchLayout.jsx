"use client";
import { useMemo } from "react";
import { C } from "@/lib/theme";
import { useSettings } from "@/hooks/useSettings";
import { passesLevel } from "@/lib/ais";
import InstrumentStrip from "./InstrumentStrip";
import SidebarHeading from "./ais/SidebarHeading";
import TargetList from "./ais/TargetList";

// The watch shell the AIS view renders into: instrument strip on top, the scope
// in the centre slot (children), target list + heading panel in the sidebar. It
// also owns the cross-cutting concerns:
//   - range filter + CPA sort for the sidebar
//   - resolving the selected target for the detail panel
// (Previously shared with a chart view; that view was dropped — Trident is an
// AIS + systems monitor, not a chartplotter.)
export default function WatchLayout({ self, displayMode, targets, selId, onSelect, onClose, children }) {
  const { filterRange, levelFilter, depthUnit, keelOffsetM, thresholds } = useSettings();

  const filtered = useMemo(
    () => targets.filter((t) => t.dist <= filterRange && passesLevel(t.level, levelFilter)),
    [targets, filterRange, levelFilter]
  );
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.aton ? 1 : b.aton ? -1 : a.cpa - b.cpa)),
    [filtered]
  );
  const selTarget = targets.find((t) => t.id === selId) || null;


  return (
    <div className="watch-grid">
      <div className="watch-inst"><InstrumentStrip self={self} depthUnit={depthUnit} keelOffsetM={keelOffsetM} /></div>
      <div className="watch-slot">{children}</div>
      <aside className="watch-side" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
        <TargetList targets={sorted} selId={selId} selTarget={selTarget} onSelect={onSelect} onClose={onClose} />
        <SidebarHeading own={self} displayMode={displayMode} />
      </aside>
    </div>
  );
}
