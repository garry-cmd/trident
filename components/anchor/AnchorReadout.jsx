"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { distValue, distLabel } from "@/lib/units";

const round = (n) => Math.round(n);

// The sidebar readout. FROM ANCHOR is the hero — one number, the thing you came
// to check. The four tiles change with state on purpose: holding, you want to
// know how much room is left; dragging, you want direction and rate, because
// those are what decide "start the engine" vs "watch it another minute".
//
// Distances render in the unit chosen in Settings > Anchor. The model is metric
// throughout; conversion happens here, at the display edge.
export default function AnchorReadout({ status, radiusM, setAt, breachSec, self, telemetry, now, unit = "ft" }) {
  const { dragging, noFix, level } = status;
  const u = distLabel(unit);
  const headColor = dragging ? C.dangerBr : noFix ? C.cautionBr : level === "caution" ? C.cautionBr : C.safeBr;
  const headText = noFix ? "NO FIX" : dragging ? "DRAGGING" : level === "caution" ? "NEAR THE RING" : "HOLDING";

  const mins = setAt ? Math.max(0, Math.floor((now - setAt) / 60000)) : 0;
  const elapsed = mins >= 60 ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m` : `${mins}m`;
  const sub = noFix
    ? `no GPS fix \u00b7 watch blind \u00b7 at anchor ${elapsed}`
    : dragging
      ? `outside the ring ${Math.floor(breachSec / 60)}m ${String(breachSec % 60).padStart(2, "0")}s`
      : `at anchor ${elapsed} \u00b7 alarm at ${distValue(radiusM, unit)} ${u}`;

  return (
    <>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, lineHeight: 1, color: headColor }}>{headText}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.label, marginTop: 8 }}>{sub}</div>
      </div>

      <Hero label="From anchor" value={noFix ? "\u2014" : distValue(status.distanceM, unit)} unit={u}
        color={dragging ? C.dangerBr : C.value} alarm={dragging} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {dragging ? (
          <>
            <Tile label="Past the ring" value={distValue(-status.roomM, unit)} unit={u} color={C.dangerBr} />
            <Tile label="Moving" value={round(self.cog)} unit="&deg; T" html />
            <Tile label="Rate" value={self.sog.toFixed(1)} unit="kt" />
            <Gated label="Depth" hw="NGX-1" value={telemetry.depthM} unit="m" />
          </>
        ) : (
          <>
            <Tile label="Room left" value={noFix ? "\u2014" : distValue(status.roomM, unit)} unit={u}
              color={level === "caution" ? C.cautionBr : C.safeBr} />
            <Tile label="Bearing to anchor" value={noFix ? "\u2014" : round(status.bearingToSetDeg)} unit="&deg; T" html />
            <Gated label="Depth" hw="NGX-1" value={telemetry.depthM} unit="m" />
            <Gated label="Wind" hw="NGX-1" value={telemetry.wind ? telemetry.wind.speedKt : null} unit="kt" />
          </>
        )}
      </div>
    </>
  );
}

function Hero({ label, value, unit, color, alarm }) {
  return (
    <div style={{
      background: C.raised, border: `1px solid ${alarm ? C.danger : C.borderLt}`, borderRadius: 10,
      padding: "13px 15px", boxShadow: alarm ? C.glowDanger : C.cardInset,
    }}>
      <div style={lab}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 54, lineHeight: 1, color, marginTop: 6 }}>
        {value}<span style={{ fontSize: 18, color: C.label, fontWeight: 500 }}> {unit}</span>
      </div>
    </div>
  );
}

function Tile({ label, value, unit, color = C.value, html }) {
  return (
    <div style={tile}>
      <div style={lab}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 24, lineHeight: 1, color, marginTop: 6 }}>
        {value}
        {html
          ? <span style={unitStyle} dangerouslySetInnerHTML={{ __html: ` ${unit}` }} />
          : <span style={unitStyle}> {unit}</span>}
      </div>
    </div>
  );
}

// No aspirational data: an unconnected sensor says which box it's waiting on.
function Gated({ label, hw, value, unit }) {
  if (value == null) {
    return (
      <div style={tile}>
        <div style={lab}>{label}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.dim, marginTop: 8 }}>{hw}</div>
      </div>
    );
  }
  return <Tile label={label} value={value} unit={unit} />;
}

const lab = { fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: C.label };
const tile = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 12px", minHeight: 66 };
const unitStyle = { fontSize: 12, color: C.label, fontWeight: 500 };
