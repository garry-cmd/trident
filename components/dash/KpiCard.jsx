"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { statusColor, statusBorder, statusGlow } from "./status";

// One KPI status card — the one-glance answer for a focus area. The whole card
// is the hit target. Elevation (two-layer shadow + a 1px top inset highlight)
// lifts it off the bg. Caution gets a soft static halo; danger gets a brighter
// PULSING halo (via .kpi-card--danger::after in globals.css) so an alarm card
// is the first thing the eye lands on. Active shows brighter chrome, an accent
// ring, and a flipped chevron.
export default function KpiCard({ name, status, value, sub, active, onClick }) {
  const glow = statusGlow(status);
  const isDanger = status === "danger";
  // Danger's halo is owned by the pulsing ::after; caution's is static inline.
  const inlineGlow = isDanger ? "" : glow ? `, ${glow}` : "";
  const boxShadow =
    `${C.cardInset}, ${C.cardShadow}${inlineGlow}` +
    (active ? `, 0 0 0 1px ${C.own}` : "");
  return (
    <button
      onClick={onClick}
      className={`kpi-card${isDanger ? " kpi-card--danger" : ""}`}
      style={{
        textAlign: "left", width: "100%", display: "block",
        background: active ? C.raised : C.surface,
        border: `1px solid ${active ? C.borderLt : C.border}`,
        borderLeft: `4px solid ${statusBorder(status)}`,
        borderRadius: 14, padding: 18, cursor: "pointer", minHeight: 116,
        boxShadow,
        transition: "box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: C.label, textTransform: "uppercase" }}>{name}</span>
        <span style={{ marginLeft: "auto", color: active ? C.text : C.dim, fontSize: 12, transform: active ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>▾</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 30, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: status === "off" ? C.dim : statusColor(status) }}>{value}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: status === "off" ? C.dim : C.text, marginTop: 7 }}>{sub}</div>
    </button>
  );
}
