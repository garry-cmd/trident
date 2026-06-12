"use client";
import { C } from "@/lib/theme";

// Anchor swing scope. Set point at centre, dashed alarm ring at the radius, a
// faint warn ring inside, and the boat dot placed at its bearing + fraction.
// Pure render off anchorStatus — holds no data of its own. Colours come through
// `style` (not fill=/stroke=) so the CSS var() tokens resolve and re-theme.
export default function AnchorScope({ fraction, bearingToSetDeg, dragging, set, size = 180 }) {
  const cx = size / 2;
  const cy = size / 2;
  const alarmR = size * 0.43;
  const warnR = size * 0.35;
  const f = Math.max(0, Math.min(fraction, 1.18)); // clamp so a big drag stays on-canvas
  const ang = (((bearingToSetDeg + 180) % 360) * Math.PI) / 180; // boat opposite the bearing-to-set
  const bx = cx + Math.sin(ang) * alarmR * f;
  const by = cy - Math.cos(ang) * alarmR * f;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: "none" }}>
      <circle cx={cx} cy={cy} r={warnR} fill="none" style={{ stroke: C.caution, strokeDasharray: "2 6", strokeWidth: 1.5, opacity: 0.45 }} />
      <circle cx={cx} cy={cy} r={alarmR} fill="none" style={{ stroke: C.danger, strokeDasharray: "5 5", strokeWidth: 2, opacity: 0.8 }} />
      {set && (
        <>
          <line x1={cx} y1={cy} x2={bx} y2={by} style={{ stroke: C.cautionBr, strokeWidth: 2, opacity: 0.55 }} />
          <circle cx={cx} cy={cy} r={4.5} style={{ fill: C.cautionBr }} />
          <circle cx={bx} cy={by} r={6.5} style={{ fill: dragging ? C.dangerBr : C.own }} />
        </>
      )}
      {!set && <circle cx={cx} cy={cy} r={4.5} style={{ fill: C.dim }} />}
    </svg>
  );
}
