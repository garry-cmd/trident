"use client";
import { C } from "@/lib/theme";
import { tColor, passesLevel, isLost } from "@/lib/ais";

const CX = 350, CY = 280, RR = 230;

// Pure AIS scope display. Receives enriched targets + view state, draws the
// scope. Colours are applied via `style` (not fill=/stroke= attributes) because
// SVG presentation attributes can't resolve CSS var() — this keeps the scope on
// the same token system (lib/theme.ts -> globals.css) as the rest of the app.
export default function AisScope({ targets, selId, viewRange, displayMode, own, filterRange, levelFilter = "all", onSelect, onResetBackground }) {
  const rotOff = displayMode === "head-up" ? -own.heading : displayMode === "course-up" ? -own.cog : 0;
  const rotBrg = (b) => { let r = b + rotOff; while (r < 0) r += 360; while (r >= 360) r -= 360; return r; };
  const nm2px = (nm) => (nm / viewRange) * RR;
  const brg2xy = (b, d) => { const rb = (rotBrg(b) * Math.PI) / 180; return [Math.sin(rb) * nm2px(d), -Math.cos(rb) * nm2px(d)]; };

  // Always exactly two distance rings, independent of zoom: outer on the scope
  // edge (= viewRange in nm), inner at half that. The nm labels move with zoom.
  const ringNm = [viewRange, viewRange / 2];
  const fmtNm = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  // Count reflects the active filters — vessels AND nav marks that pass both the
  // range and threat-level filter. Coloured by the worst level present so the
  // number itself reads as amber/red when something needs watching.
  const visible = targets.filter((t) => t.dist <= filterRange && passesLevel(t.level, levelFilter));
  const dangerCount = visible.filter((t) => t.level === "danger").length;
  const cautionCount = visible.filter((t) => t.level === "caution").length;
  const countColor = dangerCount > 0 ? C.danger : cautionCount > 0 ? C.cautionBr : C.value;

  const onBgClick = (e) => { if (e.target.tagName === "rect" || e.target.tagName === "svg") onResetBackground(); };

  return (
    <svg viewBox="0 0 700 580" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet" onClick={onBgClick}>
      <defs>
        <filter id="gl"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="dgl"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {ringNm.map((r) => <circle key={r} cx={CX} cy={CY} r={nm2px(r)} fill="none" strokeWidth="0.9" style={{ stroke: C.ring }} />)}
      {ringNm.map((r) => <text key={`l${r}`} x={CX + 4} y={CY - nm2px(r) + 11} fontFamily="JetBrains Mono" fontSize="8" style={{ fill: C.ringLabel }}>{fmtNm(r)}</text>)}

      {/* Target count — "how many AIS targets around me" (vessels + nav marks). */}
      <g>
        <text x={18} y={30} fontFamily="JetBrains Mono" fontSize="24" fontWeight="700" style={{ fill: countColor }}>{visible.length}</text>
        <text x={19} y={43} fontFamily="IBM Plex Sans" fontSize="9" fontWeight="600" letterSpacing="0.08em" style={{ fill: C.label }}>TARGET{visible.length === 1 ? "" : "S"}</text>
        {dangerCount > 0 && <text x={19} y={55} fontFamily="IBM Plex Sans" fontSize="8" fontWeight="600" style={{ fill: C.danger }}>{dangerCount} DANGER</text>}
      </g>

      <g transform={`translate(${CX},${CY}) rotate(${rotBrg(own.heading)})`} filter="url(#gl)">
        <line x1={0} y1={-14} x2={0} y2={-32} strokeWidth="0.8" opacity="0.4" style={{ stroke: C.own }} />
        <polygon points="0,-12 -6,7 0,3 6,7" opacity="0.85" style={{ fill: C.own }} />
      </g>

      {targets.map((t) => {
        const isSel = selId === t.id;
        // The selected target is always drawn (you explicitly chose it); others
        // are gated by both the range filter and the threat-level filter.
        if (!isSel && (t.dist > filterRange || !passesLevel(t.level, levelFilter))) return null;
        const [tx, ty] = brg2xy(t.brg, t.dist);
        const ax = CX + tx, ay = CY + ty;
        if (ax < -50 || ax > 750 || ay < -50 || ay > 630) return null;
        // A silent target's velocity is history, not prediction: dim the whole
        // mark, tag it LOST, and draw no motion lines from stale data.
        const lost = isLost(t);
        const col = tColor(t.level);
        const cogR = (rotBrg(t.cog) * Math.PI) / 180;
        const predPx = nm2px((t.sog * 30) / 60);

        const closing = !lost && !t.aton && isFinite(t.tcpa) && t.tcpa > 0 && t.tcpa < 200;

        // True-motion projection to the CPA time: where BOTH vessels will be when
        // closest. Own from the centre along its COG; the target from its mark
        // along its COG. The gap between the two future points IS the CPA.
        const projectPx = (cx, cy, cogDeg, sogKt) => {
          const r = (rotBrg(cogDeg) * Math.PI) / 180;
          const dpx = nm2px((sogKt * t.tcpa) / 60);
          return [cx + Math.sin(r) * dpx, cy - Math.cos(r) * dpx];
        };
        let ownFut = null, tgtFut = null;
        if (closing) {
          ownFut = projectPx(CX, CY, own.cog, own.sog);
          tgtFut = projectPx(ax, ay, t.cog, t.sog);
        }

        return (
          <g key={t.id} onClick={(e) => { e.stopPropagation(); onSelect(t.id); }} style={{ cursor: "pointer" }} opacity={lost ? 0.35 : 1}>
            {/* Invisible ~48px tap target — cold hands on a rolling boat. */}
            <circle cx={ax} cy={ay} r={24} fill="transparent" style={{ pointerEvents: "all" }} />
            {/* SELECTED + closing: TRUE-MOTION projection. My boat's line and the
                target's line each extend to where we'll be at the CPA time; the
                dashed gap between those two future positions is the miss distance
                (= CPA), coloured by threat — short red gap = collision. */}
            {isSel && closing && (
              <>
                <line x1={CX} y1={CY} x2={ownFut[0]} y2={ownFut[1]} strokeWidth="1.7" strokeDasharray="7 4" opacity="0.85" style={{ stroke: C.own }} />
                <circle cx={ownFut[0]} cy={ownFut[1]} r={5} fill="none" strokeWidth="1.3" style={{ stroke: C.own }} />
                <line x1={ax} y1={ay} x2={tgtFut[0]} y2={tgtFut[1]} strokeWidth="1.7" strokeDasharray="7 4" opacity="0.85" style={{ stroke: col }} />
                <circle cx={tgtFut[0]} cy={tgtFut[1]} r={5} fill="none" strokeWidth="1.3" style={{ stroke: col }} />
                <line x1={ownFut[0]} y1={ownFut[1]} x2={tgtFut[0]} y2={tgtFut[1]} strokeWidth="1.4" strokeDasharray="2 3" opacity="0.95" style={{ stroke: col }} />
                <text x={(ownFut[0] + tgtFut[0]) / 2 + 6} y={(ownFut[1] + tgtFut[1]) / 2 - 4} fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" opacity="0.95" style={{ fill: col }}>{t.cpa.toFixed(2)} nm</text>
              </>
            )}

            {/* SELECTED but opening/receding: no collision path — show its true
                heading faintly so selection still reads. */}
            {isSel && !closing && !t.aton && (
              <line x1={ax} y1={ay} x2={ax + Math.sin(cogR) * predPx * 0.8} y2={ay - Math.cos(cogR) * predPx * 0.8} strokeWidth="1.2" strokeDasharray="8 5" opacity="0.4" style={{ stroke: col }} />
            )}

            {/* Every vessel: short true-heading tick (unless selected or lost). */}
            {!isSel && !lost && !t.aton && <line x1={ax} y1={ay} x2={ax + Math.sin(cogR) * Math.min(nm2px((t.sog * 4) / 60), 16)} y2={ay - Math.cos(cogR) * Math.min(nm2px((t.sog * 4) / 60), 16)} strokeWidth="1.2" opacity="0.5" style={{ stroke: col }} />}

            {t.aton ? (
              <g transform={`translate(${ax},${ay})`}><polygon points="0,-11 11,0 0,11 -11,0" fill="none" strokeWidth="1.5" style={{ stroke: C.aton }} /><circle r="2.5" style={{ fill: C.aton }} /></g>
            ) : (
              <g transform={`translate(${ax},${ay})`} filter={t.level === "danger" ? "url(#dgl)" : ""}>
                <g transform={`rotate(${rotBrg(t.cog)})`}>
                  <polygon points="0,-12 -7,8 0,4 7,8" opacity={t.level === "safe" && !isSel ? 0.5 : 0.9} style={{ fill: col }} />
                </g>
              </g>
            )}

            {isSel && <circle cx={ax} cy={ay} r={22} fill="none" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" style={{ stroke: col }} />}

            {/* LOST always labels — a stale mark must never read as live. */}
            {lost && !isSel && (
              <text x={ax + 12} y={ay + 3} fontFamily="JetBrains Mono" fontSize={9} fontWeight={700} letterSpacing="0.08em" style={{ fill: C.dim }}>LOST</text>
            )}
            {!lost && !t.aton && t.level !== "safe" && !isSel && t.name && (
              <text x={ax + 12} y={ay + 3} fontFamily="IBM Plex Sans" fontSize={9} fontWeight={600} opacity="0.8" style={{ fill: col }}>{t.name}</text>
            )}
            {isSel && !t.aton && (
              <g>
                <rect x={ax + 16} y={ay - 16} width={125} height={26} rx={3} strokeWidth={0.4} style={{ fill: C.labelBg, stroke: col }} />
                <text x={ax + 22} y={ay - 2} fontFamily="IBM Plex Sans" fontSize={9} fontWeight={600} style={{ fill: col }}>{t.name || t.id}</text>
                <text x={ax + 22} y={ay + 7} fontFamily="JetBrains Mono" fontSize={8} opacity="0.8" style={{ fill: col }}>{lost ? `LOST ${Math.round(t.ageSec / 60)}m ago` : `CPA ${t.cpa.toFixed(1)} · ${isFinite(t.tcpa) && t.tcpa < 999 ? Math.round(t.tcpa) + "m" : "\u2014"}`}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
