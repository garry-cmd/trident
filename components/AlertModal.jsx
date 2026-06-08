"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { useAlerts } from "@/hooks/useAlerts";

// Full-screen CPA warning. Renders globally from the shell so it takes over any
// view. Shows only what matters at 2am: who, and minutes to act.
export default function AlertModal() {
  const { unacked, ack } = useAlerts();
  if (!unacked) return null;

  const minutes = isFinite(unacked.tcpa) && unacked.tcpa < 999 ? Math.round(unacked.tcpa) : "\u2014";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,10,14,0.9)" }}>
      <div style={{ width: 380, background: C.surface, border: `2px solid ${C.danger}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 0 80px rgba(224,72,72,0.2)" }}>
        <div style={{ background: "rgba(196,64,64,0.15)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.danger}` }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.dangerBr, animation: "blink 0.8s step-end infinite" }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.dangerBr, textTransform: "uppercase", letterSpacing: "0.1em" }}>COLLISION WARNING</span>
        </div>
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.bright, marginBottom: 24 }}>{unacked.name || unacked.id}</div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 72, fontWeight: 700, color: C.dangerBr, lineHeight: 1 }}>{minutes}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>minutes to act</div>
          </div>
          <button onClick={() => ack(unacked.id)} style={{ width: "100%", padding: "14px", background: "rgba(196,64,64,0.12)", border: `2px solid ${C.danger}`, borderRadius: 8, color: C.dangerBr, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
}
