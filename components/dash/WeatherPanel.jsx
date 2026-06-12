"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { Panel, PanelHead } from "./Panel";
import Tile from "./Tile";

// Weather is gated until the Actisense NGX-1 puts the Triton 2 barometer + wind
// on the bus. The barometer trend (the real seamanship signal) renders here
// when that data arrives; no faked pressure trace until then.
export default function WeatherPanel() {
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
