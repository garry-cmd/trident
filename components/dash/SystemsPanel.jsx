"use client";
import { Panel, PanelHead } from "./Panel";
import StatusRow from "./StatusRow";

// Systems detail. Live-today rows (feed, GPS, source) carry real status; Pi
// hardware health, VHF, N2K and Victron are gated — a missing sensor reads as
// absent (dim/dashed), not as a fault.
export default function SystemsPanel({ dash }) {
  const { source, feed, ageSec, gpsFix } = dash;
  const age = Math.round(ageSec);
  const feedStat =
    source === "live"
      ? feed === "ok"
        ? `LIVE · ${age}s ago`
        : feed === "caution"
        ? `STALE · ${age}s`
        : "LOST"
      : `SIM · ${age}s`;

  return (
    <Panel>
      <PanelHead title="Systems" q="are all my electronics running?" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <StatusRow name="TRIDENT" status="ok" stat="OK" />
        <StatusRow name="AIS FEED" status={feed} stat={feedStat} />
        <StatusRow name="GPS" status={gpsFix ? "ok" : "danger"} stat={gpsFix ? "FIX" : "NO FIX"} />
        <StatusRow name="SIGNAL K" status="ok" stat={source === "live" ? "CONNECTED" : "SIM SOURCE"} />
        <StatusRow name="PI HEALTH" status="off" stat="monitor n/a" hw="RPI" off />
        <StatusRow name="VHF" status="off" stat={"CH \u2014"} hw="N2K" off />
        <StatusRow name="N2K BUS" status="off" stat={"\u2014"} hw="NGX-1" off />
        <StatusRow name="VICTRON" status="off" stat={"\u2014"} hw="CERBO" off />
      </div>
    </Panel>
  );
}
