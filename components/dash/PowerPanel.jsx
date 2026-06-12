"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { Panel, PanelHead } from "./Panel";
import Tile from "./Tile";

// Power is fully gated until the Victron Cerbo GX + BMV-712 are installed. The
// energy-flow design (solar/engine/shore -> bank -> loads) lands here when the
// hardware does — until then the panel states plainly what it's waiting on,
// with no fake gauges.
export default function PowerPanel() {
  return (
    <Panel>
      <PanelHead title="Power" q="am I net-charging, and how long have I got?" />
      <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.dim, marginBottom: 14, lineHeight: 1.5 }}>
        Battery state, solar, engine-charge and shore power need the Victron Cerbo GX + BMV-712 (not yet installed).
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Tile label="Battery" hw="BMV" off />
        <Tile label="Solar" hw="CERBO" off />
        <Tile label="Engine / Shore" hw="CERBO" off />
      </div>
    </Panel>
  );
}
