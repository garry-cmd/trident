"use client";
import { useMemo } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { distanceNm, bearingDeg } from "@/lib/geo";
import { NM_TO_M } from "@/lib/anchor";
import { distValue, distLabel } from "@/lib/units";

// The anchor scope.
//
// TWO LAYERS, and the split is the point. Rings and their labels are concentric
// on the hook, so they are rotation-invariant and live in a STATIC layer — they
// never spin, never re-place their labels, and can't collide with each other.
// Only the things that actually have a bearing — the trail, the rode, the boat,
// the north marker — sit in a rotating layer.
//
// Orientation is a setting. HEAD-UP matches the AIS scope and the view over the
// bow. NORTH-UP holds the frame still, which is the only way the trail keeps a
// readable shape overnight: a fan centred on the hook means holding, a path
// that walks means dragging, and a frame that yaws with the boat smears both.
//
// Pure render. Colours go through `style` (not fill=/stroke=) so the CSS var()
// tokens resolve and the scope re-skins with the theme.

const S = 1000;                 // fixed square viewBox; CSS sizes it
const CX = S / 2, CY = S / 2;
const OUTER = (S / 2) * 0.78;   // alarm ring — 0.78 leaves room for its label

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

  // Frame to the ring, but grow if the boat or the trail has run outside it —
  // a drag must never walk off the canvas just when you need to see it.
  const spanM = useMemo(() => {
    let m = radius;
    if (boat) m = Math.max(m, boat.d * 1.06);
    for (const p of pts) m = Math.max(m, Math.hypot(p.x, p.y) * 1.06);
    return m;
  }, [radius, boat, pts]);

  const k = OUTER / spanM;              // metres -> viewBox units
  const alarmR = radius * k;
  const halfR = alarmR / 2;
  const u = distLabel(unit);

  // No third ring. A caution ring at 0.85R sits almost on top of the alarm ring
  // at 1.0R and the pair read as noise; the alarm ring itself changes colour
  // instead. One ring that matters, one reference ring at half.
  const ringColor = level === "dragging" ? C.dangerBr : level === "caution" ? C.cautionBr : C.danger;
  const trailColor = level === "dragging" ? C.dangerBr : C.own;

  // Rotation applies only to bearing-bearing things (see the two-layer note).
  const rot = orient === "head" && Number.isFinite(headingDeg) ? -headingDeg : 0;

  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    // Drop absurd jumps (a GPS glitch) rather than drawing a false streak.
    if (Math.hypot(b.x - a.x, b.y - a.y) > spanM) continue;
    segs.push({ a, b, o: 0.14 + 0.76 * (i / pts.length) });
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {/* ── static layer: concentric rings + their labels ── */}
      <circle cx={CX} cy={CY} r={halfR} fill="none" style={{ stroke: C.ring, strokeWidth: 1.8, opacity: 0.45 }} />
      <circle cx={CX} cy={CY} r={alarmR} fill="none" style={{
        stroke: ringColor,
        strokeWidth: level === "dragging" ? 6 : 4,
        strokeDasharray: "14 12",
        opacity: level === "holding" ? 0.7 : 0.95,
      }} />
      <text x={CX + 12} y={CY - alarmR + 34} style={{ fill: C.ringLabel, fontFamily: FONT_MONO, fontSize: 26 }}>
        {distValue(radius, unit)} {u} {"\u00b7"} ALARM
      </text>
      <text x={CX + 12} y={CY - halfR + 30} style={{ fill: C.ringLabel, fontFamily: FONT_MONO, fontSize: 24 }}>
        {distValue(radius / 2, unit)} {u}
      </text>

      {/* ── rotating layer: everything that has a bearing ── */}
      <g transform={`rotate(${rot} ${CX} ${CY})`}>
        {/* north marker — on the ring, so head-up still shows where north is */}
        <g transform={`translate(${CX} ${CY - OUTER - 22})`}>
          <text textAnchor="middle" dy={10} style={{ fill: C.compassN, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 30 }}>N</text>
        </g>

        <g strokeLinecap="round" fill="none">
          {segs.map((s, i) => (
            <line key={i} x1={CX + s.a.x * k} y1={CY + s.a.y * k} x2={CX + s.b.x * k} y2={CY + s.b.y * k}
              style={{ stroke: trailColor, strokeWidth: 3.4, opacity: s.o }} />
          ))}
        </g>

        {boat && (
          <line x1={CX} y1={CY} x2={CX + boat.x * k} y2={CY + boat.y * k}
            style={{ stroke: level === "dragging" ? C.dangerBr : C.cautionBr, strokeWidth: 2.6, strokeDasharray: "9 9", opacity: 0.5 }} />
        )}

        {boat && (
          <g transform={`translate(${CX + boat.x * k} ${CY + boat.y * k}) rotate(${Number.isFinite(headingDeg) ? headingDeg : 0})`}>
            <path d="M0 -24 L14 18 L0 11 L-14 18 Z" style={{ fill: level === "dragging" ? C.dangerBr : C.own }} />
          </g>
        )}
      </g>

      {/* the hook — at the centre, so it neither rotates nor moves */}
      <g transform={`translate(${CX} ${CY})`}>
        <circle r={16} fill="none" style={{ stroke: C.cautionBr, strokeWidth: 2.6, opacity: 0.8 }} />
        <path d="M0 -12 L0 14 M-11 2 L0 14 L11 2 M-8 -7 L8 -7" fill="none" strokeLinecap="round"
          style={{ stroke: C.cautionBr, strokeWidth: 3.4 }} />
      </g>
    </svg>
  );
}
