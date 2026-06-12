"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { Panel, PanelHead } from "./Panel";
import Tile from "./Tile";

// Power. With telemetry (live Cerbo/BMV, or demo): SOC hero + the energy-flow
// strip (sources -> bank -> loads) + tiles. Without it: the honest gated state —
// the design is identical, only the data is absent. No fake gauges by default.
export default function PowerPanel({ telemetry }) {
  const b = telemetry.battery;
  if (!b) {
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

  const charging = b.current >= 0;
  const ttg = b.timeToGoMin;
  const ttgStr = ttg == null ? "\u2014" : ttg >= 60 ? `${Math.floor(ttg / 60)}h ${ttg % 60}m` : `${ttg}m`;
  const shore = telemetry.shore;

  return (
    <Panel>
      <PanelHead title="Power" q="am I net-charging, and how long have I got?" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 56, color: C.value, lineHeight: 1 }}>
          {b.soc}<span style={{ fontSize: 18, color: C.label }}>%</span>
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.value }}>{b.voltage.toFixed(1)} V</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: charging ? C.safeBr : C.cautionBr }}>
            {charging ? "+" : ""}{b.current} A {charging ? "charging" : "draining"}
          </span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text }}>
            {charging ? "full in" : "time to go"} {"\u2248"} {ttgStr}
          </span>
        </div>
      </div>

      <Flow nodes={[
        { fl: "Solar", fv: `${telemetry.solar ? telemetry.solar.watts : 0} W`, feed: true },
        { fl: "Engine", fv: `${telemetry.engineChargeA ? "+" + telemetry.engineChargeA : 0} A`, feed: true },
        { fl: "Bank", fv: `${b.soc} %`, bank: true },
        { fl: "Loads", fv: `${telemetry.loadsA ?? 0} A` },
      ]} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Tile label="Shore" value={shore && shore.connected ? `${shore.amps} A` : "OFFLINE"} />
        <Tile label="Solar today" value={telemetry.solar ? telemetry.solar.yieldAh : "\u2014"} unit="Ah" />
        <Tile label="Net" value={`${charging ? "+" : ""}${b.current}`} unit="A" sub={charging ? "charging" : "discharging"} />
      </div>
    </Panel>
  );
}

function Flow({ nodes }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, margin: "4px 0 14px" }}>
      {nodes.map((n, i) => (
        <div key={n.fl} style={{ display: "contents" }}>
          <div style={{ flex: n.bank ? 1.25 : 1, background: n.bank ? "#0f1822" : C.surface, border: `1px solid ${n.bank ? C.borderLt : C.border}`, borderRadius: 10, padding: "11px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.1em", color: C.label, textTransform: "uppercase" }}>{n.fl}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: n.feed ? C.safeBr : C.value, marginTop: 3 }}>{n.fv}</div>
          </div>
          {i < nodes.length - 1 && <div style={{ display: "flex", alignItems: "center", color: C.dim, fontSize: 18 }}>{"\u2192"}</div>}
        </div>
      ))}
    </div>
  );
}
