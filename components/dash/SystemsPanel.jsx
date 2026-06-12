"use client";
import { Panel, PanelHead } from "./Panel";
import StatusRow from "./StatusRow";
import { piStatus } from "@/lib/dash";

// Systems detail. Live-today rows (feed, GPS, source) always carry real status.
// Pi health, VHF and Victron light up from telemetry when present (demo, or the
// real plugins/Cerbo later); otherwise they're gated — absent, not faulted.
export default function SystemsPanel({ dash }) {
  const { source, feed, ageSec, gpsFix, telemetry } = dash;
  const age = Math.round(ageSec);
  const feedStat =
    source === "live"
      ? feed === "ok" ? `LIVE \u00B7 ${age}s ago` : feed === "caution" ? `STALE \u00B7 ${age}s` : "LOST"
      : `SIM \u00B7 ${age}s`;

  const pi = telemetry.pi;
  const gps = telemetry.gps;
  const vhf = telemetry.vhf;
  const ps = piStatus(pi);

  return (
    <Panel>
      <PanelHead title="Systems" q="are all my electronics running?" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <StatusRow name="TRIDENT" status="ok" stat="OK" />
        <StatusRow name="AIS FEED" status={feed} stat={feedStat} />
        <StatusRow
          name="GPS"
          status={gpsFix ? "ok" : "danger"}
          stat={gpsFix ? (gps ? `FIX \u00B7 ${gps.sats} sat \u00B7 HDOP ${gps.hdop}` : "FIX") : "NO FIX"}
        />
        <StatusRow name="SIGNAL K" status="ok" stat={source === "live" ? "CONNECTED" : "SIM SOURCE"} />
        {pi
          ? <StatusRow name="PI HEALTH" status={ps} stat={`${pi.cpuTempC}\u00B0C \u00B7 load ${pi.loadPct}% \u00B7 ${pi.diskFreePct}% free`} />
          : <StatusRow name="PI HEALTH" status="off" stat="monitor n/a" hw="RPI" off />}
        {vhf
          ? <StatusRow name="VHF" status="ok" stat={`CH ${vhf.channel}${vhf.dscWatch ? " \u00B7 DSC" : ""}`} />
          : <StatusRow name="VHF" status="off" stat={"CH \u2014"} hw="N2K" off />}
        <StatusRow name="N2K BUS" status={telemetry.depthM != null ? "ok" : "off"} stat={telemetry.depthM != null ? "ONLINE" : "\u2014"} hw="NGX-1" off={telemetry.depthM == null} />
        <StatusRow name="VICTRON" status={telemetry.battery ? "ok" : "off"} stat={telemetry.battery ? "ONLINE" : "\u2014"} hw="CERBO" off={!telemetry.battery} />
      </div>
    </Panel>
  );
}
