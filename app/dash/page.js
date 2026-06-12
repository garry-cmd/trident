"use client";
import { useState } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { useDash } from "@/hooks/useDash";
import KpiStrip from "@/components/dash/KpiStrip";
import SystemsPanel from "@/components/dash/SystemsPanel";
import PowerPanel from "@/components/dash/PowerPanel";
import WeatherPanel from "@/components/dash/WeatherPanel";
import BoatPanel from "@/components/dash/BoatPanel";

// Dash: a persistent four-card status strip (the one-glance layer) over a
// tap-to-expand detail drawer — one card open at a time. Opens calm with just
// the cards; that default IS the "vital few" night-watch view. Power + Weather
// are gated until their telemetry exists (or DEMO mode fills them); Systems +
// Boat are live today.
const round = (n) => Math.round(n);

function systemsValue(s) {
  return s === "danger" ? "FAULT" : s === "caution" ? "CHECK" : "ALL OK";
}
function systemsSub(d) {
  if (!d.gpsFix) return "no GPS fix";
  if (d.feed === "danger") return "feed lost";
  if (d.feed === "caution") return `feed stale \u00B7 ${round(d.ageSec)}s`;
  return d.source === "live" ? "feed live \u00B7 GPS fix" : "sim source \u00B7 GPS fix";
}
function powerCard(d) {
  const b = d.telemetry.battery;
  if (!b) return { value: "NO SENSOR", sub: "awaiting hardware" };
  return { value: `${b.soc}%`, sub: `${b.voltage.toFixed(1)} V \u00B7 ${b.current >= 0 ? "charging" : "draining"}` };
}
function weatherCard(d) {
  const w = d.telemetry.baro;
  if (!w) return { value: "NO SENSOR", sub: "awaiting hardware" };
  return { value: `${w.mb}mb`, sub: `${w.trend3h < 0 ? "\u25BC falling" : "\u25B2 rising"} ${w.trend3h > 0 ? "+" : ""}${w.trend3h}/3h` };
}
function boatValue(d) {
  if (d.mode === "anchor") return d.anchor.dragging ? "DRAGGING" : "HOLDING";
  return `${d.self.sog.toFixed(1)} kt`;
}
function boatSub(d) {
  if (d.mode === "anchor") return `${round(d.anchor.distanceM)} m from set`;
  return `COG ${round(d.self.cog)}\u00B0`;
}

export default function DashPage() {
  const dash = useDash();
  const [open, setOpen] = useState(null);

  const pc = powerCard(dash);
  const wc = weatherCard(dash);
  const cards = [
    { area: "systems", name: "Systems", status: dash.status.systems, value: systemsValue(dash.status.systems), sub: systemsSub(dash) },
    { area: "power", name: "Power", status: dash.status.power, value: pc.value, sub: pc.sub },
    { area: "weather", name: "Weather", status: dash.status.weather, value: wc.value, sub: wc.sub },
    { area: "boat", name: "Boat", status: dash.status.boat, value: boatValue(dash), sub: boatSub(dash) },
  ];

  const panel =
    open === "systems" ? <SystemsPanel dash={dash} />
    : open === "power" ? <PowerPanel telemetry={dash.telemetry} />
    : open === "weather" ? <WeatherPanel telemetry={dash.telemetry} />
    : open === "boat" ? <BoatPanel dash={dash} />
    : null;

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 18px 48px" }}>
        {dash.demo && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.16em", color: C.cautionBr, background: C.cautionDim, border: `1px solid ${C.caution}`, borderRadius: 6, padding: "5px 10px", textTransform: "uppercase" }}>
              Demo data \u00B7 synthetic
            </span>
          </div>
        )}
        <KpiStrip cards={cards} openArea={open} onSelect={setOpen} />
        <div style={{ marginTop: 22 }}>
          {panel || (
            <div style={{ textAlign: "center", color: C.dim, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.06em", marginTop: 26 }}>
              tap a card to open its detail
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
