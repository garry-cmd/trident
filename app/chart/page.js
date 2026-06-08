"use client";
import { C, FONT_MONO } from "@/lib/theme";

// Phase 2 — not yet built. Honest placeholder so the nav tab resolves without
// pretending the view exists.
export default function ChartPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", gap: 10 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, letterSpacing: "0.12em", color: C.text, textTransform: "uppercase" }}>Chart</div>
      <div style={{ fontSize: 12, color: C.dim }}>Not yet built · Phase 2</div>
    </div>
  );
}
