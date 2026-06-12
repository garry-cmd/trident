"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// Compact bar for the selected target. iPad is the primary surface, so this is
// kept short: name row, the three decision numbers inline (CPA / TCPA / Range),
// and a tiny supporting line. No tall boxed KPIs.
export default function TargetDetail({ target, onClose }) {
  if (!target) return null;
  const col = tColor(target.level);
  const tcpa = isFinite(target.tcpa) && target.tcpa < 999 ? Math.round(target.tcpa) : "\u2014";

  const kpi = [
    { l: "CPA", v: target.cpa.toFixed(2), u: "nm", c: col },
    { l: "TCPA", v: tcpa, u: "min", c: col },
    { l: "Range", v: target.dist.toFixed(2), u: "nm", c: C.value },
  ];
  const small = [
    { l: "BRG", v: `${Math.round(target.brg)}\u00B0` },
    { l: "COG", v: `${target.cog}\u00B0` },
    { l: "SOG", v: `${target.sog}kt` },
    { l: "Type", v: target.type },
  ];

  return (
    <div style={{ padding: "6px 10px", background: C.raised, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.bright }}>{target.name || target.id}</span>
        <span onClick={onClose} style={{ fontSize: 11, color: C.dim, cursor: "pointer", padding: "0 7px", border: `1px solid ${C.border}`, borderRadius: 3 }}>✕</span>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginBottom: 3 }}>
        {kpi.map((m, i) => (
          <span key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", color: C.label }}>{m.l}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: m.c, lineHeight: 1 }}>{m.v}</span>
            <span style={{ fontSize: 8, color: C.dim }}>{m.u}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 9 }}>
        {small.map((m, i) => (
          <span key={i}>
            <span style={{ color: C.label, textTransform: "uppercase" }}>{m.l} </span>
            <span style={{ fontFamily: FONT_MONO, color: C.value }}>{m.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
