"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// One target row. Dumb: receives an enriched target and renders it.
export default function TargetCard({ t, selected, onSelect }) {
  const col = tColor(t.level);
  const closing = !t.aton && t.dist > t.cpa;
  const tcpaTxt = isFinite(t.tcpa) && t.tcpa < 999 ? Math.round(t.tcpa) + "m" : "\u2014";

  return (
    <div onClick={() => onSelect(t.id)}
      style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, borderLeft: t.level === "danger" ? `3px solid ${C.danger}` : t.level === "caution" ? `3px solid ${C.caution}` : "3px solid transparent", background: t.level === "danger" ? C.dangerDim : selected ? C.raised : "transparent", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.name ? C.bright : C.dim }}>{t.name || (t.aton ? "Nav Aid" : t.id)}</span>
        {!t.aton && <span style={{ fontSize: 9, fontWeight: 600, color: closing ? C.dangerBr : C.safeBr }}>{closing ? "CLOSING" : "opening"}</span>}
      </div>
      {t.aton ? (
        <div style={{ fontSize: 10, color: C.dim }}>Range {t.dist.toFixed(1)} nm · {t.type}</div>
      ) : (
        <div style={{ display: "flex", gap: 16 }}>
          {[{ l: "CPA", v: t.cpa.toFixed(1) }, { l: "TCPA", v: tcpaTxt }, { l: "Range", v: t.dist.toFixed(1) }].map((m, i) => (
            <div key={i}>
              <span style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase", color: C.label, marginRight: 4 }}>{m.l}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: i < 2 ? col : C.value }}>{m.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
