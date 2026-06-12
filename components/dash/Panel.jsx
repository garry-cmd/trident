"use client";
import { C, FONT_MONO } from "@/lib/theme";

// Full-width detail panel shell + its header. Dumb.
export function Panel({ children, alarm }) {
  return (
    <section style={{ background: C.raised, border: `1px solid ${alarm ? C.danger : C.borderLt}`, borderRadius: 14, padding: 20 }}>
      {children}
    </section>
  );
}

export function PanelHead({ title, q, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.18em", color: C.bright, textTransform: "uppercase" }}>{title}</span>
      <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>{q}</span>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}
