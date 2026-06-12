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
// are gated until their sensors land; Systems + Boat are live today.
const round = (n) => Math.round(n);

function systemsValue(s) {
  return s === "danger" ? "FAULT" : s === "caution" ? "CHECK" : "ALL OK";
}
function systemsSub(d) {
  if (!d.gpsFix) return "no GPS fix";
  if (d.feed === "danger") return "feed lost";
  if (d.feed === "caution") return `feed stale · ${round(d.ageSec)}s`;
  return d.source === "live" ? "feed live · GPS fix" : "sim source · GPS fix";
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

  const cards = [
    { area: "systems", name: "Systems", status: dash.status.systems, value: systemsValue(dash.status.systems), sub: systemsSub(dash) },
    { area: "power", name: "Power", status: "off", value: "NO SENSOR", sub: "awaiting hardware" },
    { area: "weather", name: "Weather", status: "off", value: "NO SENSOR", sub: "awaiting hardware" },
    { area: "boat", name: "Boat", status: dash.status.boat, value: boatValue(dash), sub: boatSub(dash) },
  ];

  const panel =
    open === "systems" ? <SystemsPanel dash={dash} />
    : open === "power" ? <PowerPanel />
    : open === "weather" ? <WeatherPanel />
    : open === "boat" ? <BoatPanel dash={dash} />
    : null;

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 18px 48px" }}>
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
