"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// Big, glanceable readout for the selected target. The list collapses to just
// this card when something is selected, so it owns the sidebar — every value is
// sized to be read at arm's length on a rolling boat at 2am, not squinted at.
const LEVEL_WORD = { danger: "DANGER", caution: "CAUTION", safe: "CLEAR" };

function Tile({ label, value, unit, color, big }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.label }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: big ? 30 : 21, fontWeight: 700, color: color || C.value, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: C.dim }}>{unit}</span>}
      </span>
    </div>
  );
}

export default function TargetDetail({ target, onClose }) {
  if (!target) return null;
  const col = tColor(target.level);
  const tcpa = isFinite(target.tcpa) && target.tcpa < 999 ? Math.round(target.tcpa) : "\u2014";

  return (
    <div style={{ margin: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: C.raised, border: `1.5px solid ${col}`, borderLeft: `5px solid ${col}`, borderRadius: 8, boxShadow: "0 3px 12px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.bright, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{target.name || target.id}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: col }}>{LEVEL_WORD[target.level] || ""}</span>
        </div>
        <span onClick={onClose} style={{ flexShrink: 0, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: C.dim, cursor: "pointer", border: `1px solid ${C.border}`, borderRadius: 6 }}>{"\u2715"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Tile label="CPA" value={target.cpa.toFixed(2)} unit="nm" color={col} big />
        <Tile label="TCPA" value={tcpa} unit="min" color={col} big />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Tile label="BRG" value={`${Math.round(target.brg)}\u00B0`} />
        <Tile label="Range" value={target.dist.toFixed(2)} unit="nm" />
        <Tile label="COG" value={`${Math.round(target.cog ?? 0)}\u00B0`} />
        <Tile label="SOG" value={(target.sog ?? 0).toFixed(1)} unit="kt" />
      </div>

      <Tile label="Type" value={target.type || "\u2014"} />
    </div>
  );
}
