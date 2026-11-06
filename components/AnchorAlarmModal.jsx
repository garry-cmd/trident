"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { useAlerts } from "@/hooks/useAlerts";
import { useSettings } from "@/hooks/useSettings";
import { distValue, distLabel } from "@/lib/units";

// Full-screen anchor-drag warning, from the shell so it takes over any screen.
// One big number: how far the boat is from the anchor. The collision warning
// takes precedence if both are live (it's the faster-moving threat).
export default function AnchorAlarmModal() {
  const { anchorAlarm, ackAnchor, anchorDistanceM, anchorRadiusM, unacked } = useAlerts();
  const { anchorUnit } = useSettings();
  if (!anchorAlarm || unacked) return null;
  const u = distLabel(anchorUnit);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,10,14,0.9)" }}>
      <div style={{ width: 380, background: C.surface, border: `2px solid ${C.danger}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 0 80px rgba(224,72,72,0.2)" }}>
        <div style={{ background: "rgba(196,64,64,0.15)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.danger}` }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.dangerBr, animation: "blink 0.8s step-end infinite" }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.dangerBr, textTransform: "uppercase", letterSpacing: "0.1em" }}>ANCHOR DRAGGING</span>
        </div>
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 72, fontWeight: 700, color: C.dangerBr, lineHeight: 1 }}>{distValue(anchorDistanceM, anchorUnit)}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: C.dangerBr, marginLeft: 6 }}>{u}</span>
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 28, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            from anchor · ring {distValue(anchorRadiusM, anchorUnit)} {u}
          </div>
          <button onClick={ackAnchor} style={{ width: "100%", minHeight: 48, padding: "14px", background: "rgba(196,64,64,0.12)", border: `2px solid ${C.danger}`, borderRadius: 8, color: C.dangerBr, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
}
