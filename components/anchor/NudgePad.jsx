"use client";
import { useState } from "react";
import { C, FONT_MONO } from "@/lib/theme";

// Move the hook 2 m at a time. Boring on purpose: four buttons beat dragging a
// pin on a rolling boat, and this is the fallback that keeps the watch usable
// if the Vesper's HDG turns out to omit variation (no true heading = the
// projected placement needs correcting by eye against the trail).
export default function NudgePad({ onNudge }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...pill, bottom: 14, left: 14 }}>
        MOVE HOOK
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 14,
        left: 14,
        background: C.labelBg,
        border: `1px solid ${C.borderLt}`,
        borderRadius: 10,
        padding: 10,
      }}
    >
      <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.12em", color: C.label, marginBottom: 8 }}>
        MOVE HOOK {"\u00b7"} 2 m
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gridTemplateRows: "repeat(3, 48px)", gap: 4 }}>
        <span />
        <button onClick={() => onNudge(0)} style={key}>{"\u25B2"}</button>
        <span />
        <button onClick={() => onNudge(270)} style={key}>{"\u25C0"}</button>
        <button onClick={() => setOpen(false)} style={{ ...key, fontSize: 10.5, color: C.label }}>DONE</button>
        <button onClick={() => onNudge(90)} style={key}>{"\u25B6"}</button>
        <span />
        <button onClick={() => onNudge(180)} style={key}>{"\u25BC"}</button>
        <span />
      </div>
    </div>
  );
}

const pill = {
  position: "absolute",
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.12em",
  color: C.label,
  background: C.labelBg,
  border: `1px solid ${C.borderLt}`,
  borderRadius: 6,
  padding: "10px 13px",
  minHeight: 44,
  cursor: "pointer",
};
const key = {
  background: C.surface,
  color: C.bright,
  border: `1px solid ${C.borderLt}`,
  borderRadius: 7,
  fontFamily: FONT_MONO,
  fontSize: 15,
  cursor: "pointer",
};
