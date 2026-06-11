"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// Expanded panel for the selected target. Dumb.
export default function TargetDetail({ target, onClose }) {
  if (!target) return null;
  const col = tColor(target.level);
  const tcpa = isFinite(target.tcpa) && target.tcpa < 999 ? Math.round(target.tcpa) : "\u2014";

  const big = [
    { l: "CPA", v: target.cpa.toFixed(2), u: "nm" },
    { l: "TCPA", v: tcpa, u: "min" },
    { l: "Range", v: target.dist.toFixed(2), u: "nm" },
  ];
  const small = [
    { l: "BRG", v: `${Math.round(target.brg)}\u00B0` },
    { l: "COG", v: `${target.cog}\u00B0` },
    { l: "SOG", v: `${target.sog}kt` },
    { l: "Type", v: target.type },
  ];

  return (
    <div style={{ padding: "14px", background: C.raised, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.bright }}>{target.name || target.id}</span>
        <span onClick={onClose} style={{ fontSize: 10, color: C.dim, cursor: "pointer", padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: 3 }}>✕</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        {big.map((m, i) => (
          <div key={i} style={{ textAlign: "center", padding: 8, background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", color: C.label }}>{m.l}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: col, lineHeight: 1, margin: "4px 0 2px" }}>{m.v}</div>
            <div style={{ fontSize: 9, color: C.dim }}>{m.u}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 10 }}>
        {small.map((m, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span style={{ fontSize: 8, color: C.label, textTransform: "uppercase" }}>{m.l} </span>
            <span style={{ fontFamily: FONT_MONO, color: C.value }}>{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
