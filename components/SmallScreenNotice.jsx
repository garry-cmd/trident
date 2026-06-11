"use client";
import { C, FONT_MONO, FONT_SANS } from "@/lib/theme";

// Shown only below the tablet floor (768px), via the .trd-toosmall class in
// globals.css. Trident is a landscape watch display; the phone isn't a
// supported surface, so we say so plainly instead of shipping a cramped layout.
export default function SmallScreenNotice() {
  return (
    <div className="trd-toosmall" style={{ position: "fixed", inset: 0, zIndex: 100, background: C.bg, flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, gap: 14 }}>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 18, letterSpacing: "0.18em", color: C.bright }}>TRIDENT</div>
      <div style={{ fontSize: 40, color: C.own }}>{"\u21BB"}</div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: C.bright }}>Landscape display</div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.dim, maxWidth: 320, lineHeight: 1.5 }}>
        Rotate your device, or open Trident on the nav-station iPad. It's built for a wide screen.
      </div>
    </div>
  );
}
