"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { Panel, PanelHead } from "./Panel";
import Tile from "./Tile";

// Weather. With telemetry: barometer hero + trend + the trailing sparkline (the
// real seamanship signal) + wind/temp tiles. Without it: gated. Same design,
// data absent — no faked pressure trace by default.
export default function WeatherPanel({ telemetry }) {
  const baro = telemetry.baro;
  if (!baro) {
    return (
      <Panel>
        <PanelHead title="Weather" q="what's the pressure doing?" />
        <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.dim, marginBottom: 14, lineHeight: 1.5 }}>
          Barometer trend, wind and air/sea temperature need the Actisense NGX-1 N2K tap (not yet installed).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <Tile label="Barometer" hw="NGX-1" off />
          <Tile label="Wind" hw="NGX-1" off />
        </div>
      </Panel>
    );
  }

  const falling = baro.trend3h < 0;
  const trendCol = baro.trend3h <= -1.5 ? C.cautionBr : C.text;
  const w = telemetry.wind;

  return (
    <Panel>
      <PanelHead title="Weather" q="what's the pressure doing?" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 44, color: C.value, lineHeight: 1 }}>
          {baro.mb}<span style={{ fontSize: 16, color: C.label }}> mb</span>
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: trendCol }}>
          {falling ? "\u25BC" : "\u25B2"} {baro.trend3h > 0 ? "+" : ""}{baro.trend3h}
          <span style={{ fontSize: 12, color: C.label }}>/3h</span>
        </span>
      </div>
      <Sparkline data={baro.history} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        <Tile label="Wind" value={w ? `${w.speedKt} kt @ ${w.dirDeg}\u00B0` : "\u2014"} sub={w && w.backing ? "backing" : undefined} />
        <Tile label="Air / Sea" value={`${telemetry.airTempC ?? "\u2014"}\u00B0 / ${telemetry.seaTempC ?? "\u2014"}\u00B0`} />
      </div>
    </Panel>
  );
}

function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const W = 600, H = 76;
  const lo = Math.min(...data), hi = Math.max(...data);
  const span = hi - lo || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - lo) / span) * (H - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 76, margin: "8px 0 16px" }}>
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} style={{ stroke: C.border, strokeWidth: 1 }} />
      <polyline points={pts} fill="none" style={{ stroke: C.cautionBr, strokeWidth: 2.5 }} />
    </svg>
  );
}
