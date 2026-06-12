"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { statusColor, statusBorder } from "./status";

// One KPI status card — the one-glance answer for a focus area. Tappable; the
// whole card is the hit target. Active shows a brighter chrome + flipped chevron.
export default function KpiCard({ name, status, value, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ textAlign: "left", width: "100%", display: "block", background: active ? C.raised : C.surface, border: `1px solid ${active ? C.borderLt : C.border}`, borderLeft: `4px solid ${statusBorder(status)}`, borderRadius: 13, padding: 16, cursor: "pointer", minHeight: 112 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", color: C.label, textTransform: "uppercase" }}>{name}</span>
        <span style={{ marginLeft: "auto", color: active ? C.text : C.dim, fontSize: 12, transform: active ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>▾</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 28, lineHeight: 1, color: status === "off" ? C.dim : statusColor(status) }}>{value}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: status === "off" ? C.dim : C.text, marginTop: 6 }}>{sub}</div>
    </button>
  );
}
