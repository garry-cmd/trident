"use client";
import { C, FONT_MONO, FONT_SANS } from "@/lib/theme";

// One tunable threshold. Stepper only — no free-text entry — so cold hands on a
// rolling boat can't fat-finger a 0.5 into a 5. Buttons are 48px.
export default function ThresholdStepper({ label, desc, value, unit, min, max, step, onChange }) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  const atMin = value <= min;
  const atMax = value >= max;
  const shown = Number.isInteger(step) ? String(value) : value.toFixed(1);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}`, gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: C.bright }}>{label}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.dim, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={dec} disabled={atMin} style={btn(atMin)}>{"\u2212"}</button>
        <div style={{ minWidth: 86, textAlign: "center" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: C.value }}>{shown}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.dim, marginLeft: 4 }}>{unit}</span>
        </div>
        <button onClick={inc} disabled={atMax} style={btn(atMax)}>{"+"}</button>
      </div>
    </div>
  );
}

const btn = (disabled) => ({
  width: 48, height: 48, borderRadius: 8,
  border: `1px solid ${C.borderLt}`, background: C.raised,
  color: disabled ? C.dim : C.bright,
  fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
});
