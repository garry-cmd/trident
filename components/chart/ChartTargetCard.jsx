"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// Floating detail card for the tapped chart target. Dumb. Same numbers and
// wording as the radar's TargetDetail so the two views read identically: CPA /
// TCPA ("minutes to act") / Range up top, BRG / COG / SOG / Type below. AtoN
// targets are stationary, so their CPA/TCPA are meaningless and hidden.
export default function ChartTargetCard({ target, onClose }) {
  if (!target) return null;
  const col = tColor(target.level);
  const tcpa = isFinite(target.tcpa) && target.tcpa > 0 && target.tcpa < 999 ? Math.round(target.tcpa) : "\u2014";

  const big = target.aton
    ? [{ l: "Range", v: target.dist.toFixed(2), u: "nm" }]
    : [
        { l: "CPA", v: target.cpa.toFixed(2), u: "nm" },
        { l: "TCPA", v: tcpa, u: "min" },
        { l: "Range", v: target.dist.toFixed(2), u: "nm" },
      ];
  const small = target.aton
    ? [
        { l: "BRG", v: `${Math.round(target.brg)}\u00B0` },
        { l: "Type", v: target.type },
      ]
    : [
        { l: "BRG", v: `${Math.round(target.brg)}\u00B0` },
        { l: "COG", v: `${Math.round(target.cog)}\u00B0` },
        { l: "SOG", v: `${target.sog}kt` },
        { l: "Type", v: target.type },
      ];

  return (
    <div style={{ position: "absolute", top: 12, right: 12, width: 264, background: "rgba(13,19,25,0.94)", backdropFilter: "blur(8px)", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", zIndex: 7 }}>
      <div style={{ height: 3, background: col }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.bright }}>{target.name || target.id}</span>
          <span onClick={onClose} style={{ minWidth: 30, minHeight: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.dim, cursor: "pointer", border: `1px solid ${C.border}`, borderRadius: 4 }}>{"\u2715"}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${big.length}, 1fr)`, gap: 8, marginBottom: 10 }}>
          {big.map((m, i) => (
            <div key={i} style={{ textAlign: "center", padding: 8, background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", color: C.label }}>{m.l}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: col, lineHeight: 1, margin: "4px 0 2px" }}>{m.v}</div>
              <div style={{ fontSize: 9, color: C.dim }}>{m.u}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", fontSize: 10 }}>
          {small.map((m, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <span style={{ fontSize: 8, color: C.label, textTransform: "uppercase" }}>{m.l} </span>
              <span style={{ fontFamily: FONT_MONO, color: C.value }}>{m.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
