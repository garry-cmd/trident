"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { RODE_BOUNDS, ANCHOR_RADIUS_BOUNDS } from "@/lib/settings";
import { IRENE, radiusForRode } from "@/lib/anchor";
import { distValue, distLabel, snapDist, distStep, toDist } from "@/lib/units";

// Arming the watch. Rode out is the number you actually know (you counted the
// marks); the hook position and the alarm ring derive from it plus the boat's
// fixed geometry. The radius is editable here because arming is setup, not 2am
// — and it is also in Settings > Anchor for adjusting a live watch.
export default function ArmPanel({ rodeM, setRode, radiusM, setRadius, hdg, onArm, unit = "ft" }) {
  const u = distLabel(unit);
  const stepU = distStep(unit);
  const derived = radiusForRode(rodeM, IRENE);
  const overridden = Math.abs(radiusM - derived) > 0.5;

  const bumpRode = (n) => {
    const next = snapDist(rodeM, unit, n);
    if (next < RODE_BOUNDS.min || next > RODE_BOUNDS.max) return;
    setRode(next);
    if (!overridden) setRadius(radiusForRode(next, IRENE)); // keep the ring in step
  };
  const bumpRadius = (n) => {
    const next = snapDist(radiusM, unit, n);
    if (next < ANCHOR_RADIUS_BOUNDS.min || next > ANCHOR_RADIUS_BOUNDS.max) return;
    setRadius(next);
  };

  return (
    <>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 26, lineHeight: 1.15, color: C.cautionBr }}>SET THE HOOK</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.label, marginTop: 8 }}>
          {hdg == null
            ? "no heading \u2014 nudge the hook after setting"
            : `heading ${Math.round(hdg)}\u00b0 T \u00b7 bow offset ${distValue(IRENE.bowOffsetM, unit)} ${u}`}
        </div>
      </div>

      <Stepper label="Rode out" value={distValue(rodeM, unit)} unit={u} big
        onDec={() => bumpRode(-1)} onInc={() => bumpRode(1)} step={stepU} />

      <Stepper label="Alarm radius" value={distValue(radiusM, unit)} unit={u}
        onDec={() => bumpRadius(-1)} onInc={() => bumpRadius(1)} step={stepU}
        note={overridden
          ? `set by hand \u00b7 derived would be ${distValue(derived, unit)} ${u}`
          : `rode + ${Math.round(toDist(IRENE.bowOffsetM, unit))} ${u} to bow + ${Math.round(toDist(IRENE.gpsMarginM, unit))} ${u} margin`} />

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

function Stepper({ label, value, unit, onDec, onInc, step, note, big }) {
  return (
    <div style={{ background: C.raised, border: `1px solid ${C.borderLt}`, borderRadius: 10, padding: "12px 14px", boxShadow: C.cardInset }}>
      <div style={lab}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: big ? 44 : 34, lineHeight: 1, color: C.value, marginTop: 6 }}>
        {value}<span style={{ fontSize: big ? 17 : 14, color: C.label, fontWeight: 500 }}> {unit}</span>
      </div>
      {note && <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 1.45 }}>{note}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={onDec} style={key}>{"\u2212"} {step}</button>
        <button onClick={onInc} style={key}>+ {step}</button>
      </div>
    </div>
  );
}

const lab = { fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: C.label };
const key = {
  flex: 1, minHeight: 50, background: C.surface, color: C.bright,
  border: `1px solid ${C.borderLt}`, borderRadius: 8, fontFamily: FONT_MONO,
  fontSize: 17, fontWeight: 700, cursor: "pointer",
};
const btn = {
  width: "100%", fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.08em", minHeight: 52,
  background: C.surface, color: C.text, border: `1px solid ${C.borderLt}`, borderRadius: 10, cursor: "pointer",
};
