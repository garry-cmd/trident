"use client";
import { C, FONT_MONO } from "@/lib/theme";

// Heading overlay shared by radar (and later chart). Big number, nothing else,
// with a CLOSING/OPENING cue only when a target is selected. Positions itself
// at the top-center of its relative parent.
export default function HeadingKPI({ heading, selTarget }) {
  const closing = selTarget && !selTarget.aton ? selTarget.dist > selTarget.cpa : null;
  return (
    <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(6,10,14,0.75)", padding: "8px 28px", borderRadius: 8, zIndex: 5 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 42, fontWeight: 700, color: C.value, lineHeight: 1 }}>{heading}°</span>
      {selTarget && !selTarget.aton && (
        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: closing ? C.dangerBr : C.safeBr }}>
          {closing ? "\u25BC CLOSING" : "\u25B2 OPENING"}
        </div>
      )}
    </div>
  );
}
