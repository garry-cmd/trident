"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// Compact panel for the selected target. Dumb. Kept short — on iPad it sits
// above the list and shouldn't eat the screen. The three decision numbers
// (CPA / TCPA / Range) stay prominent; supporting fields are one tight line.
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
    <div style={{ padding: "8px 12px", background: C.raised, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.bright }}>{target.name || target.id}</span>
        <span onClick={onClose} style={{ fontSize: 11, color: C.dim, cursor: "pointer", padding: "1px 8px", border: `1px solid ${C.border}`, borderRadius: 3 }}>✕</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
        {big.map((m, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", color: C.label }}>{m.l}</span>
            <div style={{ fontFamily: FONT_MONO, fontSize: 19, fontWeight: 700, color: col, lineHeight: 1.1 }}>
              {m.v}<span style={{ fontSize: 9, fontWeight: 400, color: C.dim }}> {m.u}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", fontSize: 9 }}>
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
