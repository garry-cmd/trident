"use client";
import { C, FONT_MONO } from "@/lib/theme";
import TargetCard from "./TargetCard";
import TargetDetail from "./TargetDetail";

// Right panel: count header, selected-target detail, then the sorted list.
// Receives already filtered+sorted targets — no logic here.
export default function TargetList({ targets, selId, selTarget, onSelect, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.label }}>Targets</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.dim }}>{targets.length}</span>
      </div>
      {selTarget ? (
        <TargetDetail target={selTarget} onClose={onClose} />
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {targets.map((t) => (
            <TargetCard key={t.id} t={t} selected={false} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
