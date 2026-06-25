"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { describeOrientation } from "@/lib/orient";

// Heading lives here in the landscape layout (bottom of the sidebar), out of
// the radar centre where a number could be misread as orientation. The big
// value is always what's at the TOP of the screen (N in north-up); the actual
// heading and COG show as small labelled lines, never as the big value unless
// the big value IS that thing.
export default function SidebarHeading({ own, displayMode }) {
  const o = describeOrientation(displayMode, own);
  const showHdg = displayMode !== "head-up"; // heading isn't the big value
  const showCog = displayMode !== "course-up"; // cog isn't the big value
  const Line = ({ l, v }) => (
    <span style={{ fontSize: 11, color: C.dim }}>
      {l} <span style={{ fontFamily: FONT_MONO, color: C.text }}>{v}{"\u00B0"}</span>
    </span>
  );
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.raised, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, boxShadow: C.cardInset }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.compassN }}>{"\u25B2 "}{o.mode}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 42, fontWeight: 700, color: o.big === "N" ? C.compassN : C.value, lineHeight: 1 }}>{o.big}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 1 }}>
        {showHdg && <Line l="HDG" v={Math.round(own.heading)} />}
        {showCog && <Line l="COG" v={Math.round(own.cog)} />}
      </div>
    </div>
  );
}
