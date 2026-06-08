"use client";
import { C, FONT_SANS } from "@/lib/theme";

// On/off switch. The whole row is the hit target (>=48px tall). The track
// colour uses the safe token when on so "on" reads as a settled, calm state.
export default function Toggle({ label, desc, on, onToggle }) {
  return (
    <div
      onClick={() => onToggle(!on)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}`, gap: 16, cursor: "pointer", minHeight: 48 }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: C.bright }}>{label}</div>
        {desc && <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.dim, marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ width: 60, height: 34, borderRadius: 17, flexShrink: 0, background: on ? C.safe : C.raised, border: `1px solid ${on ? C.safeBr : C.borderLt}`, position: "relative", transition: "background 0.15s" }}>
        <div style={{ position: "absolute", top: 3, left: on ? 29 : 3, width: 26, height: 26, borderRadius: "50%", background: on ? C.safeBr : C.dim, transition: "left 0.15s" }} />
      </div>
    </div>
  );
}
