"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { Panel, PanelHead } from "./Panel";
import Tile from "./Tile";
import AnchorScope from "./AnchorScope";
import { ANCHOR_RADIUS_BOUNDS } from "@/lib/settings";
import { formatLatLon } from "@/lib/units";

const round = (n) => Math.round(n);

// Boat detail. Mode follows the anchor: a set hook shows the anchor watch, no
// set hook shows underway motion. Position / COG / SOG / heading and the whole
// anchor watch are live today (GPS only). Depth, wind and autopilot are gated
// on the NGX-1 / N2K and show "not connected".
export default function BoatPanel({ dash }) {
  const { mode } = dash;
  return mode === "anchor" ? <AnchorFace dash={dash} /> : <UnderwayFace dash={dash} />;
}

function AnchorFace({ dash }) {
  const { anchor, anchorRadiusM, setAt, maxSwing, clearAnchor, setRadius } = dash;
  const dragging = anchor.dragging;
  const mins = setAt ? Math.max(0, Math.floor((Date.now() - setAt) / 60000)) : 0;
  const elapsed = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

  return (
    <Panel alarm={dragging}>
      <PanelHead title="Boat" q="is the anchor holding?" />
      <div style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <AnchorScope fraction={anchor.fraction} bearingToSetDeg={anchor.bearingToSetDeg} dragging={dragging} set />
        <div style={{ minWidth: 160 }}>
          <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 32, color: dragging ? C.dangerBr : C.safeBr }}>
            {dragging ? "DRAGGING" : "HOLDING"}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 46, color: C.value, lineHeight: 1, marginTop: 8 }}>
            {round(anchor.distanceM)}<span style={{ fontSize: 18, color: C.label }}> m</span>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text, marginTop: 4 }}>
            from set point · alarm at {anchorRadiusM} m · at anchor {elapsed}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Tile label="Max swing" value={round(maxSwing)} unit="m" />
        <Tile label="Bearing to set" value={`${round(anchor.bearingToSetDeg)}\u00B0`} />
        <Tile label="Depth" hw="NGX-1" off />
        <Tile label="Wind" hw="NGX-1" off />
      </div>

      <RadiusStepper value={anchorRadiusM} onChange={setRadius} />
      <button onClick={clearAnchor} style={btn(false)}>WEIGH ANCHOR — CLEAR WATCH</button>
    </Panel>
  );
}

function UnderwayFace({ dash }) {
  const { self } = dash;
  const [lat, lon] = formatLatLon(self.position.lat, self.position.lon).split(" ");
  return (
    <Panel>
      <PanelHead title="Boat" q="where am I going, how fast, how deep?" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 50, color: C.value, lineHeight: 1 }}>
          {self.sog.toFixed(1)}<span style={{ fontSize: 17, color: C.label }}> kt</span>
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 26, color: C.value }}>
          {round(self.cog)}{"\u00B0"}<span style={{ fontSize: 13, color: C.label }}> COG</span>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Tile label="Heading" value={`${round(self.heading)}\u00B0`} />
        <Tile label="Depth" hw="NGX-1" off />
        <Tile label="Autopilot" hw="N2K" off />
        <Tile label="Position" value={lat} sub={lon} />
      </div>
      <button onClick={dash.setAnchorHere} style={btn(true)}>{"\u2693"} DROP ANCHOR HERE — START WATCH</button>
    </Panel>
  );
}

function RadiusStepper({ value, onChange }) {
  const { min, max, step } = ANCHOR_RADIUS_BOUNDS;
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const sbtn = { width: 52, height: 52, background: C.surface, color: C.bright, border: `1px solid ${C.borderLt}`, fontSize: 24, cursor: "pointer" };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", color: C.label, textTransform: "uppercase", marginBottom: 6 }}>Alarm radius</div>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.borderLt}`, borderRadius: 9, overflow: "hidden", maxWidth: 240 }}>
        <button onClick={dec} style={{ ...sbtn, borderRight: `1px solid ${C.borderLt}` }}>{"\u2212"}</button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: FONT_MONO, fontSize: 18, color: C.value }}>{value} m</div>
        <button onClick={inc} style={{ ...sbtn, borderLeft: `1px solid ${C.borderLt}` }}>+</button>
      </div>
    </div>
  );
}

const btn = (primary) => ({
  width: "100%", fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.08em", minHeight: 52,
  background: primary ? "rgba(196,146,48,0.12)" : C.surface,
  color: primary ? C.cautionBr : C.text,
  border: `1px solid ${primary ? C.caution : C.borderLt}`,
  borderRadius: 10, padding: 15, cursor: "pointer",
});
