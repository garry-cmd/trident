"use client";
import { useMemo } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { distanceNm, bearingDeg } from "@/lib/geo";
import { NM_TO_M } from "@/lib/anchor";

// The anchor scope. ALWAYS NORTH-UP — unlike the AIS scope, which rotates to
// head-up. The whole value of the trail is its SHAPE (a fan centred on the hook
// means holding; a path that walks means dragging), and rotating the frame
// under it destroys exactly that. A fixed frame is the point.
//
// Pure render off status + trail. Colours go through `style` (not fill=/stroke=)
// so the CSS var() tokens resolve and the scope re-skins with the theme.

const RING_PAD = 1.12; // keep the alarm ring off the very edge

export default function AnchorScope({ anchorPos, boatPos, headingDeg, radiusM, level, trail, cautionFraction = 0.85 }) {
  // Everything is drawn in metres relative to the anchor, then scaled once.
  const pts = useMemo(() => {
    if (!anchorPos) return [];
    return trail.map((c) => {
      const p = { lat: c.lat, lon: c.lon };
      const d = distanceNm(anchorPos, p) * NM_TO_M;
      const b = (bearingDeg(anchorPos, p) * Math.PI) / 180;
      return { x: d * Math.sin(b), y: -d * Math.cos(b), ts: c.ts };
    });
  }, [anchorPos, trail]);

  const boat = useMemo(() => {
    if (!anchorPos || !boatPos) return null;
    const d = distanceNm(anchorPos, boatPos) * NM_TO_M;
    const b = (bearingDeg(anchorPos, boatPos) * Math.PI) / 180;
    return { x: d * Math.sin(b), y: -d * Math.cos(b), d };
  }, [anchorPos, boatPos]);

  // Frame to the ring, but grow if the boat or trail has run outside it — a
  // drag must never walk off the canvas just when you need to see it.
  const spanM = useMemo(() => {
    let m = radiusM * RING_PAD;
    if (boat) m = Math.max(m, boat.d * 1.15);
    for (const p of pts) m = Math.max(m, Math.hypot(p.x, p.y) * 1.15);
    return m;
  }, [radiusM, boat, pts]);

  const S = 1000;              // viewBox is a fixed square; CSS sizes it
  const cx = S / 2, cy = S / 2;
  const k = (S / 2) / spanM;   // metres -> viewBox units
  const alarmR = radiusM * k;
  const cautionR = radiusM * cautionFraction * k;
  const halfR = alarmR / 2;

  const ringColor = level === "dragging" ? C.dangerBr : C.danger;
  const trailColor = level === "dragging" ? C.dangerBr : C.own;

  // Fade the trail by age: newest bright, oldest nearly gone. The gradient IS
  // the time axis — it tells you which end of the shape is now.
  const n = pts.length;
  const segs = [];
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i];
    // Drop absurd jumps (a GPS glitch) rather than drawing a false streak.
    if (Math.hypot(b.x - a.x, b.y - a.y) > spanM) continue;
    segs.push({ a, b, o: 0.12 + 0.78 * (i / n) });
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {/* rings */}
      <circle cx={cx} cy={cy} r={halfR} fill="none" style={{ stroke: C.ring, strokeWidth: 1.6, opacity: 0.5 }} />
      <circle cx={cx} cy={cy} r={cautionR} fill="none" style={{ stroke: C.caution, strokeWidth: 2, strokeDasharray: "3 12", opacity: 0.4 }} />
      <circle cx={cx} cy={cy} r={alarmR} fill="none"
        style={{ stroke: ringColor, strokeWidth: level === "dragging" ? 5 : 3.4, strokeDasharray: "12 10", opacity: level === "dragging" ? 0.95 : 0.75 }} />

      {/* north — the frame is fixed, so N is always up */}
      <text x={cx} y={34} textAnchor="middle" style={{ fill: C.compassN, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 26 }}>N</text>
      <text x={cx + 10} y={cy - alarmR + 30} style={{ fill: C.ringLabel, fontFamily: FONT_MONO, fontSize: 20 }}>{Math.round(radiusM)} m · ALARM</text>
      <text x={cx + 10} y={cy - halfR + 26} style={{ fill: C.ringLabel, fontFamily: FONT_MONO, fontSize: 18 }}>{Math.round(radiusM / 2)} m</text>

      {/* the trail — the actual drag detector */}
      <g strokeLinecap="round" fill="none">
        {segs.map((s, i) => (
          <line key={i} x1={cx + s.a.x * k} y1={cy + s.a.y * k} x2={cx + s.b.x * k} y2={cy + s.b.y * k}
            style={{ stroke: trailColor, strokeWidth: 3, opacity: s.o }} />
        ))}
      </g>

      {/* rode: anchor -> boat */}
      {boat && (
        <line x1={cx} y1={cy} x2={cx + boat.x * k} y2={cy + boat.y * k}
          style={{ stroke: level === "dragging" ? C.dangerBr : C.cautionBr, strokeWidth: 2.4, strokeDasharray: "8 8", opacity: 0.5 }} />
      )}

      {/* the hook */}
      <g transform={`translate(${cx} ${cy})`}>
        <circle r={15} fill="none" style={{ stroke: C.cautionBr, strokeWidth: 2.4, opacity: 0.8 }} />
        <path d="M0 -11 L0 13 M-10 2 L0 13 L10 2 M-7 -6 L7 -6" fill="none" strokeLinecap="round"
          style={{ stroke: C.cautionBr, strokeWidth: 3.2 }} />
      </g>

      {/* the boat */}
      {boat && (
        <g transform={`translate(${cx + boat.x * k} ${cy + boat.y * k}) rotate(${Number.isFinite(headingDeg) ? headingDeg : 0})`}>
          <path d="M0 -22 L13 17 L0 10 L-13 17 Z" style={{ fill: level === "dragging" ? C.dangerBr : C.own }} />
        </g>
      )}
    </svg>
  );
}
