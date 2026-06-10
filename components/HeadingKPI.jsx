"use client";
import { C, FONT_MONO } from "@/lib/theme";

// Orientation-truthful heading overlay. The BIG value is always whatever is at
// the TOP of the screen for the current display mode — never a number that can
// contradict the picture:
//   head-up   -> heading (heading is up)
//   course-up -> COG     (course is up)
//   north-up  -> "N"     (north is up; your heading is NOT up)
// In north-up / course-up the actual heading is still shown — small and clearly
// labelled — so you keep it but can't read it as orientation. This kills the
// "N-up but a big 185 at the top" trap.
export default function HeadingKPI({ own, displayMode, selTarget }) {
  const heading = Math.round(own.heading);
  const cog = Math.round(own.cog);

  const up =
    displayMode === "north-up"
      ? { big: "N", mode: "NORTH-UP", isHeading: false }
      : displayMode === "course-up"
      ? { big: `${cog}\u00B0`, mode: "COURSE-UP \u00B7 COG", isHeading: false }
      : { big: `${heading}\u00B0`, mode: "HEAD-UP \u00B7 HDG", isHeading: true };

  const closing = selTarget && !selTarget.aton ? selTarget.dist > selTarget.cpa : null;

  return (
    <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(6,10,14,0.78)", padding: "8px 26px", borderRadius: 8, zIndex: 5 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: C.label, marginBottom: 1 }}>{"\u25B2 "}{up.mode}</div>
      <span style={{ fontFamily: FONT_MONO, fontSize: 42, fontWeight: 700, color: up.big === "N" ? C.compassN : C.value, lineHeight: 1 }}>{up.big}</span>
      {!up.isHeading && (
        <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: C.dim }}>
          HDG <span style={{ fontFamily: FONT_MONO, color: C.text }}>{heading}{"\u00B0"}</span>
        </div>
      )}
      {selTarget && !selTarget.aton && (
        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: closing ? C.dangerBr : C.safeBr }}>
          {closing ? "\u25BC CLOSING" : "\u25B2 OPENING"}
        </div>
      )}
    </div>
  );
}
