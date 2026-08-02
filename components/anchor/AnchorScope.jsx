"use client";
import { useMemo } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { distanceNm, bearingDeg } from "@/lib/geo";
import { NM_TO_M } from "@/lib/anchor";
import { distValue, distLabel } from "@/lib/units";

// The anchor scope.
//
// THE RING OWNS THE FRAME. This is the rule everything else follows from. An
// earlier version scaled the view to whatever it needed to fit the boat and the
// whole trail — which meant that the moment the boat actually left (the one
// case that matters), the alarm ring collapsed toward a dot, its labels piled
// onto the hook glyph, and the picture became unreadable exactly when it had a
// job to do. The frame now grows at most MAX_ZOOM times the radius and then
// stops. A boat past that pins to the edge, drawn hollow and labelled OFF
// SCALE with its true distance — honest about being off the picture rather
// than quietly lying about where it is.
//
// TWO LAYERS. Rings are concentric on the hook, so they are rotation-invariant
// and live in a STATIC layer whose labels sit at fixed offsets outside each
// ring and can never collide. Only things with a bearing — trail, rode, boat,
// north marker — rotate.
//
// Orientation is a setting. HEAD-UP matches the AIS scope and the view over the
// bow. NORTH-UP holds the frame still, which is the only way the trail keeps a
// readable shape overnight: a fan centred on the hook means holding, a path
// that walks means dragging, and a frame that yaws with the boat smears both.
//
// Pure render. Colours go through `style` (not fill=/stroke=) so the CSS var()
// tokens resolve and the scope re-skins with the theme.

const S = 1000;                  // fixed square viewBox; CSS sizes it
const CX = S / 2, CY = S / 2;
const OUTER = (S / 2) * 0.72;    // alarm ring at 1x zoom — leaves room for labels
const EDGE = (S / 2) * 0.94;     // clip boundary; also where an off-scale boat pins
const MAX_ZOOM = 2;              // frame never shrinks the ring below OUTER/2

export default function AnchorScope({
  anchorPos, boatPos, headingDeg, radiusM, level, trail, orient = "head", unit = "ft",
}) {
  const radius = Number.isFinite(radiusM) && radiusM > 0 ? radiusM : 1;

  // Everything is computed in metres relative to the hook, then scaled once.
  const pts = useMemo(() => {
    if (!anchorPos) return [];
    return trail.map((c) => {
      const p = { lat: c.lat, lon: c.lon };
      const d = distanceNm(anchorPos, p) * NM_TO_M;
      const b = (bearingDeg(anchorPos, p) * Math.PI) / 180;
      return { x: d * Math.sin(b), y: -d * Math.cos(b) };
    });
  }, [anchorPos, trail]);

  const boat = useMemo(() => {
    if (!anchorPos || !boatPos) return null;
    const d = distanceNm(anchorPos, boatPos) * NM_TO_M;
    const b = (bearingDeg(anchorPos, boatPos) * Math.PI) / 180;
    return { x: d * Math.sin(b), y: -d * Math.cos(b), d };
  }, [anchorPos, boatPos]);

  // Zoom out to keep the boat and trail in view, but only so far. Past MAX_ZOOM
  // the ring stops shrinking and the far stuff goes off scale instead.
  const spanM = useMemo(() => {
    let need = radius;
    if (boat) need = Math.max(need, boat.d * 1.06);
    for (const p of pts) need = Math.max(need, Math.hypot(p.x, p.y) * 1.06);
    return Math.min(need, radius * MAX_ZOOM);
  }, [radius, boat, pts]);

  const k = OUTER / spanM;              // metres -> viewBox units
  const alarmR = radius * k;            // always within [OUTER/MAX_ZOOM, OUTER]
  const halfR = alarmR / 2;
  const u = distLabel(unit);
  // Radius of the boat in viewBox units — the one place metres become units for
  // the boat, so the off-scale pin can't mix the two (it did: pinning by a ratio
  // of units applied to a metre value put the glyph a fraction of the way out).
  const boatUnits = boat ? Math.hypot(boat.x, boat.y) * k : 0;
  const offScale = boatUnits > EDGE;

  // No third ring. A caution ring at 0.85R sits almost on top of the alarm ring
  // at 1.0R and the pair read as noise; the alarm ring changes colour instead.
  const ringColor = level === "dragging" ? C.dangerBr : level === "caution" ? C.cautionBr : C.danger;
  const trailColor = level === "dragging" ? C.dangerBr : C.own;
  const rot = orient === "head" && Number.isFinite(headingDeg) ? -headingDeg : 0;

  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    // Drop absurd jumps (a GPS glitch) rather than drawing a false streak.
    if (Math.hypot(b.x - a.x, b.y - a.y) > spanM * MAX_ZOOM) continue;
    segs.push({ a, b, o: 0.14 + 0.76 * (i / pts.length) });
  }

  // Where the boat glyph actually goes: its true spot, or pinned to the edge on
  // the same bearing. `f` is always a metres->units factor, never a bare ratio.
  const f = offScale && boatUnits > 0 ? (k * EDGE) / boatUnits : k;
  const bx = boat ? CX + boat.x * f : CX;
  const by = boat ? CY + boat.y * f : CY;

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        {/* Nothing with a bearing may paint outside the scope — an old crumb or
            a departed boat must not streak across the whole canvas. */}
        <clipPath id="trd-anchor-clip">
          <circle cx={CX} cy={CY} r={EDGE} />
        </clipPath>
      </defs>

      {/* ── static layer: concentric rings + labels at fixed offsets ── */}
      <circle cx={CX} cy={CY} r={halfR} fill="none" style={{ stroke: C.ring, strokeWidth: 1.8, opacity: 0.45 }} />
      <circle cx={CX} cy={CY} r={alarmR} fill="none" style={{
        stroke: ringColor,
        strokeWidth: level === "dragging" ? 6 : 4,
        strokeDasharray: "14 12",
        opacity: level === "holding" ? 0.7 : 0.95,
      }} />
      <text x={CX} y={CY - alarmR - 16} textAnchor="middle" style={{ fill: C.ringLabel, fontFamily: FONT_MONO, fontSize: 26 }}>
        {distValue(radius, unit)} {u} {"\u00b7"} ALARM
      </text>
      <text x={CX} y={CY - halfR - 14} textAnchor="middle" style={{ fill: C.ringLabel, fontFamily: FONT_MONO, fontSize: 22 }}>
        {distValue(radius / 2, unit)} {u}
      </text>

      {/* ── rotating layer: everything that has a bearing ── */}
      <g transform={`rotate(${rot} ${CX} ${CY})`}>
        <text x={CX} y={CY - EDGE - 8} textAnchor="middle" style={{ fill: C.compassN, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 30 }}>N</text>

        <g clipPath="url(#trd-anchor-clip)">
          <g strokeLinecap="round" fill="none">
            {segs.map((s, i) => (
              <line key={i} x1={CX + s.a.x * k} y1={CY + s.a.y * k} x2={CX + s.b.x * k} y2={CY + s.b.y * k}
                style={{ stroke: trailColor, strokeWidth: 3.4, opacity: s.o }} />
            ))}
          </g>

          {boat && (
            <line x1={CX} y1={CY} x2={bx} y2={by}
              style={{ stroke: level === "dragging" ? C.dangerBr : C.cautionBr, strokeWidth: 2.6, strokeDasharray: "9 9", opacity: 0.5 }} />
          )}

          {boat && (
            <g transform={`translate(${bx} ${by}) rotate(${Number.isFinite(headingDeg) ? headingDeg : 0})`}>
              <path d="M0 -24 L14 18 L0 11 L-14 18 Z"
                fill={offScale ? "none" : undefined}
                style={offScale
                  ? { stroke: level === "dragging" ? C.dangerBr : C.own, strokeWidth: 4 }
                  : { fill: level === "dragging" ? C.dangerBr : C.own }} />
            </g>
          )}
        </g>
      </g>

      {/* the hook — at the centre, so it neither rotates nor moves */}
      <g transform={`translate(${CX} ${CY})`}>
        <circle r={16} fill="none" style={{ stroke: C.cautionBr, strokeWidth: 2.6, opacity: 0.8 }} />
        <path d="M0 -12 L0 14 M-11 2 L0 14 L11 2 M-8 -7 L8 -7" fill="none" strokeLinecap="round"
          style={{ stroke: C.cautionBr, strokeWidth: 3.4 }} />
      </g>

      {/* honest about being off the picture, rather than pretending otherwise */}
      {offScale && (
        <text x={CX} y={S - 26} textAnchor="middle"
          style={{ fill: level === "dragging" ? C.dangerBr : C.cautionBr, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 26, letterSpacing: "0.1em" }}>
          OFF SCALE {"\u00b7"} {distValue(boat.d, unit)} {u} OUT
        </text>
      )}
    </svg>
  );
}
