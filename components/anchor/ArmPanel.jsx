"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { RODE_BOUNDS } from "@/lib/settings";
import { IRENE } from "@/lib/anchor";

// Arming the watch. ONE number to enter — rode out — because that's the only
// thing you actually know. Everything else derives from it and the boat's fixed
// geometry. Two buttons, labelled by where the hook is, so neither requires
// remembering which one means what.
export default function ArmPanel({ rodeM, setRode, plannedRadiusM, hdg, onArm }) {
  const { min, max, step } = RODE_BOUNDS;
  return (
    <>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 26, lineHeight: 1.15, color: C.cautionBr }}>SET THE HOOK</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.label, marginTop: 8 }}>
          {hdg == null ? "no heading \u2014 nudge the hook after setting" : `heading ${Math.round(hdg)}\u00b0 T \u00b7 bow offset ${IRENE.bowOffsetM} m`}
        </div>
      </div>

      <div style={{ background: C.raised, border: `1px solid ${C.borderLt}`, borderRadius: 10, padding: "13px 15px", boxShadow: C.cardInset }}>
        <div style={lab}>Rode out</div>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 46, lineHeight: 1, color: C.value, marginTop: 6 }}>
          {rodeM}<span style={{ fontSize: 17, color: C.label, fontWeight: 500 }}> m</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => setRode(Math.max(min, rodeM - step))} style={step48}>{"\u2212"}</button>
          <button onClick={() => setRode(Math.min(max, rodeM + step))} style={step48}>+</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <div style={tile}>
          <div style={lab}>Alarm radius</div>
          <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 24, color: C.value, marginTop: 6 }}>
            {plannedRadiusM}<span style={{ fontSize: 12, color: C.label, fontWeight: 500 }}> m</span>
          </div>
        </div>
        <div style={tile}>
          <div style={lab}>Derived from</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.dim, marginTop: 7, lineHeight: 1.5 }}>
            rode + {IRENE.bowOffsetM} m to bow<br />+ {IRENE.gpsMarginM} m margin
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <button onClick={() => onArm("ahead")} style={{ ...btn, background: "rgba(196,146,48,0.12)", color: C.cautionBr, borderColor: C.caution, fontSize: 13, minHeight: 58 }}>
        {"\u2693"} HOOK IS AHEAD {"\u2014"} START WATCH
      </button>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.dim, lineHeight: 1.5, marginTop: -4 }}>
        You&rsquo;ve backed down and settled. The hook lies ahead of the bow by the rode.
      </div>

      <button onClick={() => onArm("bow")} style={{ ...btn, minHeight: 46, fontSize: 11.5 }}>
        HOOK IS UNDER MY BOW {"\u2014"} DROPPING NOW
      </button>
    </>
  );
}

const lab = { fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: C.label };
const tile = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 12px", minHeight: 66 };
const step48 = { flex: 1, minHeight: 52, background: C.surface, color: C.bright, border: `1px solid ${C.borderLt}`, borderRadius: 8, fontFamily: FONT_MONO, fontSize: 22, cursor: "pointer" };
const btn = {
  width: "100%", fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.08em", minHeight: 52,
  background: C.surface, color: C.text, border: `1px solid ${C.borderLt}`, borderRadius: 10, cursor: "pointer",
};
