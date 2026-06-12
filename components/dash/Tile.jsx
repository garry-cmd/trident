"use client";
import { C, FONT_MONO } from "@/lib/theme";

// Small hardware-dependency tag (CERBO / NGX-1 / BMV / N2K / RPI).
export function Hw({ tag, sys }) {
  return (
    <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.06em", color: sys ? C.blue : C.cautionBr, border: `1px solid ${sys ? C.blue : C.caution}`, borderRadius: 4, padding: "1px 4px", opacity: 0.9 }}>
      {tag}
    </span>
  );
}

// Dumb metric tile. When `off`, it shows an honest "not connected" with the
// hardware tag instead of a value — never a placeholder number.
export default function Tile({ label, hw, value, unit, sub, off, big }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderStyle: off ? "dashed" : "solid", borderRadius: 10, padding: "11px 12px", minHeight: 58, opacity: off ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.12em", color: C.label, textTransform: "uppercase" }}>
        {label}
        {hw && <Hw tag={hw} />}
      </div>
      {off ? (
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.dim, marginTop: 6 }}>not connected</div>
      ) : (
        <>
          <div style={{ fontFamily: FONT_MONO, fontSize: big ? 26 : 20, color: C.value, marginTop: 4, lineHeight: 1.1 }}>
            {value}
            {unit && <span style={{ fontSize: big ? 13 : 12, color: C.label }}> {unit}</span>}
          </div>
          {sub && <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.text, marginTop: 1 }}>{sub}</div>}
        </>
      )}
    </div>
  );
}
