"use client";
import { C } from "@/lib/theme";
import { tColor, GUARD_NM } from "@/lib/ais";

const CX = 350, CY = 280, RR = 230;

// Pure AIS scope display. Receives enriched targets + view state, draws the
// scope. Colours are applied via `style` (not fill=/stroke= attributes) because
// SVG presentation attributes can't resolve CSS var() — this keeps the scope on
// the same token system (lib/theme.ts -> globals.css) as the rest of the app.
export default function AisScope({ targets, selId, viewRange, displayMode, own, filterRange, guardNm = GUARD_NM, onSelect, onResetBackground }) {
  const rotOff = displayMode === "head-up" ? -own.heading : displayMode === "course-up" ? -own.cog : 0;
  const rotBrg = (b) => { let r = b + rotOff; while (r < 0) r += 360; while (r >= 360) r -= 360; return r; };
  const nm2px = (nm) => (nm / viewRange) * RR;
  const brg2xy = (b, d) => { const rb = (rotBrg(b) * Math.PI) / 180; return [Math.sin(rb) * nm2px(d), -Math.cos(rb) * nm2px(d)]; };

  const rings = [];
  for (let i = 1; i <= viewRange; i++) rings.push(i);

  // Count of actual vessels in range (AtoN are nav marks, not collision targets).
  const vessels = targets.filter((t) => !t.aton && t.dist <= filterRange);
  const dangerCount = vessels.filter((t) => t.level === "danger").length;
  const countColor = dangerCount > 0 ? C.danger : C.value;

  const onBgClick = (e) => { if (e.target.tagName === "rect" || e.target.tagName === "svg") onResetBackground(); };

  return (
    <svg viewBox="0 0 700 580" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet" onClick={onBgClick}>
      <defs>
        <filter id="gl"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="dgl"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {rings.map((r) => <circle key={r} cx={CX} cy={CY} r={nm2px(r)} fill="none" strokeWidth="0.9" style={{ stroke: C.ring }} />)}
      {rings.map((r) => <text key={`l${r}`} x={CX + 4} y={CY - nm2px(r) + 11} fontFamily="IBM Plex Mono" fontSize="8" style={{ fill: C.ringLabel }}>{r}</text>)}

      {/* Vessel count — "how many AIS targets around me", glanceable top-left. */}
      <g>
        <text x={18} y={30} fontFamily="IBM Plex Mono" fontSize="24" fontWeight="700" style={{ fill: countColor }}>{vessels.length}</text>
        <text x={19} y={43} fontFamily="IBM Plex Sans" fontSize="9" fontWeight="600" letterSpacing="0.08em" style={{ fill: C.label }}>VESSEL{vessels.length === 1 ? "" : "S"}</text>
        {dangerCount > 0 && <text x={19} y={55} fontFamily="IBM Plex Sans" fontSize="8" fontWeight="600" style={{ fill: C.danger }}>{dangerCount} CLOSING</text>}
      </g>

      {guardNm <= viewRange && <circle cx={CX} cy={CY} r={nm2px(guardNm)} fill="none" strokeWidth="0.7" strokeDasharray="6 5" style={{ stroke: C.guard }} />}

      <g transform={`translate(${CX},${CY}) rotate(${rotBrg(own.heading)})`} filter="url(#gl)">
        <line x1={0} y1={-14} x2={0} y2={-32} strokeWidth="0.8" opacity="0.4" style={{ stroke: C.own }} />
        <polygon points="0,-12 -6,7 0,3 6,7" opacity="0.85" style={{ fill: C.own }} />
      </g>

      {targets.map((t) => {
        if (t.dist > filterRange) return null;
        const [tx, ty] = brg2xy(t.brg, t.dist);
        const ax = CX + tx, ay = CY + ty;
        if (ax < -50 || ax > 750 || ay < -50 || ay > 630) return null;
        const col = tColor(t.level);
        const isSel = selId === t.id;
        const cogR = (rotBrg(t.cog) * Math.PI) / 180;
        const predPx = nm2px((t.sog * 30) / 60);

        // Relative-motion point at time tt (min), mapped to screen px with the
        // active rotation applied. The target traces this straight line RELATIVE
        // to own; the point on it nearest own centre is the CPA.
        const relXY = (tt) => {
          const px = t.rx + t.vx * tt, py = t.ry + t.vy * tt;
          const rng = Math.hypot(px, py);
          const brg = (Math.atan2(px, -py) * 180) / Math.PI;
          const [x, y] = brg2xy(brg, rng);
          return [CX + x, CY + y];
        };

        const closing = !t.aton && isFinite(t.tcpa) && t.tcpa > 0 && t.tcpa < 200;
        let cpaX = ax, cpaY = ay, endX = ax, endY = ay;
        if (closing) {
          [cpaX, cpaY] = relXY(t.tcpa);
          [endX, endY] = relXY(t.tcpa * 1.8); // extend past CPA so the line reads as a path
        }

        return (
          <g key={t.id} onClick={(e) => { e.stopPropagation(); onSelect(t.id); }} style={{ cursor: "pointer" }}>
            {/* Invisible ~48px tap target — cold hands on a rolling boat. */}
            <circle cx={ax} cy={ay} r={24} fill="transparent" style={{ pointerEvents: "all" }} />
            {/* SELECTED + closing: the collision line. Relative track from the
                target through the CPA point, coloured by threat (red = on a
                collision path, green = passing clear), plus the miss line from
                own boat to the closest-approach point. */}
            {isSel && closing && (
              <>
                <line x1={ax} y1={ay} x2={endX} y2={endY} strokeWidth="1.8" strokeDasharray="7 4" opacity="0.9" style={{ stroke: col }} />
                <line x1={CX} y1={CY} x2={cpaX} y2={cpaY} strokeWidth="1" strokeDasharray="2 3" opacity="0.55" style={{ stroke: col }} />
                <circle cx={cpaX} cy={cpaY} r={4.5} fill="none" strokeWidth="1.1" style={{ stroke: col }} />
                <text x={cpaX + 8} y={cpaY - 4} fontFamily="IBM Plex Mono" fontSize="9" fontWeight="600" opacity="0.9" style={{ fill: col }}>{t.cpa.toFixed(2)} nm</text>
              </>
            )}

            {/* SELECTED but opening/receding: no collision path — show its true
                heading faintly so selection still reads. */}
            {isSel && !closing && !t.aton && (
              <line x1={ax} y1={ay} x2={ax + Math.sin(cogR) * predPx * 0.8} y2={ay - Math.cos(cogR) * predPx * 0.8} strokeWidth="1.2" strokeDasharray="8 5" opacity="0.4" style={{ stroke: col }} />
            )}

            {/* Non-selected danger: keep a faint CPA hint without the full line. */}
            {!isSel && closing && t.level === "danger" && (
              <line x1={ax} y1={ay} x2={cpaX} y2={cpaY} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.25" style={{ stroke: col }} />
            )}

            {/* Every vessel: short true-heading tick (unless selected). */}
            {!isSel && !t.aton && <line x1={ax} y1={ay} x2={ax + Math.sin(cogR) * Math.min(nm2px((t.sog * 4) / 60), 16)} y2={ay - Math.cos(cogR) * Math.min(nm2px((t.sog * 4) / 60), 16)} strokeWidth="1.2" opacity="0.5" style={{ stroke: col }} />}

            {t.aton ? (
              <g transform={`translate(${ax},${ay})`}><polygon points="0,-9 9,0 0,9 -9,0" fill="none" strokeWidth="1.4" style={{ stroke: C.aton }} /><circle r="2" style={{ fill: C.aton }} /></g>
            ) : (
              <g transform={`translate(${ax},${ay})`} filter={t.level === "danger" ? "url(#dgl)" : ""}>
                <g transform={`rotate(${rotBrg(t.cog)})`}>
                  <polygon points="0,-10 -6,7 0,3 6,7" opacity={t.level === "safe" && !isSel ? 0.5 : 0.9} style={{ fill: col }} />
                </g>
              </g>
            )}

            {isSel && <circle cx={ax} cy={ay} r={19} fill="none" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" style={{ stroke: col }} />}

            {!t.aton && t.level !== "safe" && !isSel && t.name && (
              <text x={ax + 12} y={ay + 3} fontFamily="IBM Plex Sans" fontSize={9} fontWeight={600} opacity="0.8" style={{ fill: col }}>{t.name}</text>
            )}
            {isSel && !t.aton && (
              <g>
                <rect x={ax + 16} y={ay - 16} width={125} height={26} rx={3} strokeWidth={0.4} style={{ fill: C.labelBg, stroke: col }} />
                <text x={ax + 22} y={ay - 2} fontFamily="IBM Plex Sans" fontSize={9} fontWeight={600} style={{ fill: col }}>{t.name || t.id}</text>
                <text x={ax + 22} y={ay + 7} fontFamily="IBM Plex Mono" fontSize={8} opacity="0.8" style={{ fill: col }}>CPA {t.cpa.toFixed(1)} · {isFinite(t.tcpa) && t.tcpa < 999 ? Math.round(t.tcpa) + "m" : "\u2014"}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
