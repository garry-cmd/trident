"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { tColor } from "@/lib/ais";

// The target list as a swipeable horizontal strip — used in portrait / phone
// where there's no room for the sidebar. Same data and sort order as the
// sidebar cards, just laid out for a thumb. Dumb.
export default function TargetStrip({ targets, selId, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "6px 8px", overflowX: "auto", background: C.surface, borderTop: `1px solid ${C.border}` }}>
      {targets.length === 0 && (
        <div style={{ padding: "12px 8px", fontSize: 11, color: C.dim }}>No targets in range</div>
      )}
      {targets.map((t) => {
        const col = tColor(t.level);
        const sel = selId === t.id;
        const tcpa = isFinite(t.tcpa) && t.tcpa > 0 && t.tcpa < 999 ? Math.round(t.tcpa) + "m" : "\u2014";
        return (
          <div key={t.id} onClick={() => onSelect(t.id)} style={{ flex: "0 0 auto", minWidth: 132, minHeight: 56, padding: "8px 11px", borderRadius: 8, border: `1px solid ${sel ? col : C.border}`, background: t.level === "danger" ? C.dangerDim : C.raised, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.name ? C.bright : C.dim, whiteSpace: "nowrap" }}>{t.name || (t.aton ? "Nav Aid" : t.id)}</div>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{t.type} {"\u00B7"} {t.dist.toFixed(1)}nm</div>
            {t.aton ? (
              <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.aton, marginTop: 4 }}>AtoN</div>
            ) : (
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: col, marginTop: 4 }}>
                {tcpa}<span style={{ fontSize: 8, color: C.dim, marginLeft: 4 }}>to act</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
