"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { statusColor } from "./status";
import { Hw } from "./Tile";

// One device/service row in the Systems panel. Dot colour by status; gated rows
// dim and dashed with their hardware tag.
export default function StatusRow({ name, status, stat, hw, off }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, background: C.surface, border: `1px solid ${C.border}`, borderStyle: off ? "dashed" : "solid", borderRadius: 9, padding: "11px 13px", minHeight: 48, opacity: off ? 0.6 : 1 }}>
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: off ? C.dim : statusColor(status), flex: "none" }} />
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.06em", color: C.bright, minWidth: 86 }}>{name}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: off ? C.dim : C.text, flex: 1, textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
        {stat}
        {hw && <Hw tag={hw} sys />}
      </div>
    </div>
  );
}
