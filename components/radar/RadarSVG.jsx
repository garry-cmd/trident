"use client";
import { C } from "@/lib/theme";
import { tColor, GUARD_NM } from "@/lib/ais";

const CX = 350, CY = 280, RR = 230;
const COMPASS = [{ l: "N", d: 0 }, { l: "E", d: 90 }, { l: "S", d: 180 }, { l: "W", d: 270 }];

// Pure radar display. Receives enriched targets + view state, draws the scope.
// Colours are applied via `style` (not fill=/stroke= attributes) because SVG
// presentation attributes can't resolve CSS var() — this keeps the radar on the
// same token system (lib/theme.ts -> globals.css) as the rest of the app.
export default function RadarSVG({ targets, selId, viewRange, displayMode, own, filterRange, guardNm = GUARD_NM, onSelect, onResetBackground }) {
  const rotOff = displayMode === "head-up" ? -own.heading : displayMode === "course-up" ? -own.cog : 0;
  const rotBrg = (b) => { let r = b + rotOff; while (r < 0) r += 360; while (r >= 360) r -= 360; return r; };
  const nm2px = (nm) => (nm / viewRange) * RR;
  const brg2xy = (b, d) => { const rb = (rotBrg(b) * Math.PI) / 180; return [Math.sin(rb) * nm2px(d), -Math.cos(rb) * nm2px(d)]; };

  const rings = [];
  for (let i = 1; i <= viewRange; i++) rings.push(i);

  const onBgClick = (e) => { if (e.target.tagName === "rect" || e.target.tagName === "svg") onResetBackground(); };

  return (
    <svg viewBox="0 0 700 580" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet" onClick={onBgClick}>
      <defs>
        <filter id="gl"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="dgl"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {rings.map((r) => <circle key={r} cx={CX} cy={CY} r={nm2px(r)} fill="none" strokeWidth="0.4" style={{ stroke: C.ring }} />)}
      {rings.map((r) => <text key={`l${r}`} x={CX + 4} y={CY - nm2px(r) + 11} fontFamily="IBM Plex Mono" fontSize="8" style={{ fill: C.ringLabel }}>{r}</text>)}

      <line x1={CX} y1={CY - RR - 10} x2={CX} y2={CY + RR + 10} strokeWidth="0.3" style={{ stroke: C.ring }} />
      <line x1={CX - RR - 10} y1={CY} x2={CX + RR + 10} y2={CY} strokeWidth="0.3" style={{ stroke: C.ring }} />

      {COMPASS.map((c) => {
        const rd = (rotBrg(c.d) * Math.PI) / 180;
        const lx = CX + Math.sin(rd) * (RR + 16), ly = CY - Math.cos(rd) * (RR + 16);
        return <text key={c.l} x={lx} y={ly + 3} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={c.l === "N" ? 10 : 9} fontWeight={c.l === "N" ? 600 : 400} style={{ fill: c.l === "N" ? C.compassN : C.compass }}>{c.l}</text>;
      })}

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

        let cpaX = ax, cpaY = ay, showCpa = false;
        if (!t.aton && isFinite(t.tcpa) && t.tcpa > 0 && t.tcpa < 200) {
          const cn = Math.hypot(t.rx + t.vx * t.tcpa, t.ry + t.vy * t.tcpa);
          const ca = (Math.atan2(t.rx + t.vx * t.tcpa, -(t.ry + t.vy * t.tcpa)) * 180) / Math.PI;
          const [cx2, cy2] = brg2xy(ca, cn);
          cpaX = CX + cx2; cpaY = CY + cy2; showCpa = true;
        }

        return (
          <g key={t.id} onClick={(e) => { e.stopPropagation(); onSelect(t.id); }} style={{ cursor: "pointer" }}>
            {isSel && !t.aton && <line x1={ax - Math.sin(cogR) * predPx * 0.2} y1={ay + Math.cos(cogR) * predPx * 0.2} x2={ax + Math.sin(cogR) * predPx * 1.5} y2={ay - Math.cos(cogR) * predPx * 1.5} strokeWidth="1.2" strokeDasharray="8 5" opacity="0.45" style={{ stroke: col }} />}

            {showCpa && (isSel || t.level === "danger") && (
              <line x1={ax} y1={ay} x2={cpaX} y2={cpaY} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.25" style={{ stroke: col }} />
            )}
            {isSel && showCpa && (
              <>
                <circle cx={cpaX} cy={cpaY} r={4} fill="none" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" style={{ stroke: col }} />
                <text x={cpaX + 7} y={cpaY - 3} fontFamily="IBM Plex Mono" fontSize="8" opacity="0.7" style={{ fill: col }}>{t.cpa.toFixed(2)}</text>
              </>
            )}

            {!isSel && !t.aton && <line x1={ax} y1={ay} x2={ax + Math.sin(cogR) * Math.min(nm2px((t.sog * 4) / 60), 16)} y2={ay - Math.cos(cogR) * Math.min(nm2px((t.sog * 4) / 60), 16)} strokeWidth="1.2" opacity="0.5" style={{ stroke: col }} />}

            {t.aton ? (
              <g transform={`translate(${ax},${ay})`}><polygon points="0,-6 6,0 0,6 -6,0" fill="none" strokeWidth="1.2" style={{ stroke: C.aton }} /><circle r="1.5" style={{ fill: C.aton }} /></g>
            ) : (
              <g transform={`translate(${ax},${ay})`} filter={t.level === "danger" ? "url(#dgl)" : ""}>
                <g transform={`rotate(${rotBrg(t.cog)})`}>
                  <polygon points="0,-7 -4,5 0,2 4,5" opacity={t.level === "safe" && !isSel ? 0.5 : 0.9} style={{ fill: col }} />
                </g>
              </g>
            )}

            {isSel && <circle cx={ax} cy={ay} r={16} fill="none" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" style={{ stroke: col }} />}

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
