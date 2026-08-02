"use client";
import Link from "next/link";
import { C, FONT_MONO } from "@/lib/theme";
import { Panel, PanelHead } from "./Panel";
import Tile from "./Tile";
import AnchorScope from "./AnchorScope";
import { formatLatLon, distValue, distLabel } from "@/lib/units";
import { useSettings } from "@/hooks/useSettings";

const round = (n) => Math.round(n);

// Boat detail. Mode follows the anchor: a set hook shows an anchor-watch
// SUMMARY, no set hook shows underway motion. The watch itself — arming, the
// trail, drag confirmation, the ring — lives on /anchor. This card links there
// rather than duplicating the controls: two places to set a hook is two places
// to get it wrong, and the drawer is too small for the trail anyway.
export default function BoatPanel({ dash }) {
  const { mode } = dash;
  return mode === "anchor" ? <AnchorFace dash={dash} /> : <UnderwayFace dash={dash} />;
}

function AnchorFace({ dash }) {
  const { anchor, anchorRadiusM, setAt, telemetry } = dash;
  const { anchorUnit } = useSettings();
  const u = distLabel(anchorUnit);
  const dragging = anchor.dragging;
  const noFix = anchor.noFix;
  const depth = telemetry.depthM;
  const wind = telemetry.wind;
  const mins = setAt ? Math.max(0, Math.floor((Date.now() - setAt) / 60000)) : 0;
  const elapsed = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  const headColor = dragging ? C.dangerBr : noFix ? C.cautionBr : C.safeBr;
  const headText = noFix ? "NO FIX" : dragging ? "DRAGGING" : "HOLDING";

  return (
    <Panel alarm={dragging}>
      <PanelHead title="Boat" q="is the anchor holding?" />
      <div style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <AnchorScope fraction={anchor.fraction} bearingToSetDeg={anchor.bearingToSetDeg} dragging={dragging} set />
        <div style={{ minWidth: 160 }}>
          <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 32, color: headColor }}>{headText}</div>
          <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 46, color: C.value, lineHeight: 1, marginTop: 8 }}>
            {noFix ? "\u2014" : distValue(anchor.distanceM, anchorUnit)}
            <span style={{ fontSize: 18, color: C.label }}> {u}</span>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text, marginTop: 4 }}>
            {noFix ? "no GPS fix" : "from anchor"} {"\u00b7"} alarm at {distValue(anchorRadiusM, anchorUnit)} {u} {"\u00b7"} at anchor {elapsed}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Tile label="Room left" value={noFix ? "\u2014" : distValue(anchor.roomM, anchorUnit)} unit={u} />
        <Tile label="Bearing to anchor" value={noFix ? "\u2014" : `${round(anchor.bearingToSetDeg)}\u00B0`} />
        {depth != null ? <Tile label="Depth" value={depth} unit="m" /> : <Tile label="Depth" hw="NGX-1" off />}
        {wind ? <Tile label="Wind" value={`${wind.speedKt} kt`} sub={`${wind.dirDeg}\u00B0`} /> : <Tile label="Wind" hw="NGX-1" off />}
      </div>

      <Link href="/anchor" style={btn}>{"\u2693"} OPEN ANCHOR WATCH</Link>
    </Panel>
  );
}

function UnderwayFace({ dash }) {
  const { self, telemetry } = dash;
  const [lat, lon] = formatLatLon(self.position.lat, self.position.lon).split(" ");
  const depth = telemetry.depthM;
  const ap = telemetry.autopilot;
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
        {depth != null ? <Tile label="Depth" value={depth} unit="m" big /> : <Tile label="Depth" hw="NGX-1" off />}
        {ap ? <Tile label="Autopilot" value={ap.engaged ? `AUTO ${ap.targetHdg}\u00B0` : "STANDBY"} sub={ap.engaged ? `rudder ${Math.abs(ap.rudderDeg)}\u00B0${ap.rudderDeg < 0 ? "P" : ap.rudderDeg > 0 ? "S" : ""}` : undefined} /> : <Tile label="Autopilot" hw="N2K" off />}
        <Tile label="Position" value={lat} sub={lon} />
      </div>
      <Link href="/anchor" style={btn}>{"\u2693"} ANCHOR WATCH {"\u2014"} SET THE HOOK</Link>
    </Panel>
  );
}

const btn = {
  display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
  width: "100%", fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.08em", minHeight: 52,
  background: "rgba(196,146,48,0.12)", color: C.cautionBr, border: `1px solid ${C.caution}`,
  borderRadius: 10, padding: 15, cursor: "pointer",
};
