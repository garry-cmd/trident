"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { formatDepth, formatLatLon } from "@/lib/units";

// Always-visible nav read-out across the top of the radar. Dumb: it just
// renders own-vessel state. Five cells but only four show at once — HDG is
// hidden in landscape (the sidebar panel features it there) and Position takes
// its slot; in portrait/phone HDG shows and Position drops. The .inst-hdg /
// .inst-pos classes in globals.css drive that swap.
export default function InstrumentStrip({ self, depthUnit }) {
  const depth = formatDepth(self.depth, depthUnit);
  const cells = [
    { cls: "inst-hdg", l: "HDG", v: `${Math.round(self.heading)}\u00B0`, bright: true },
    { l: "COG", v: `${Math.round(self.cog)}\u00B0` },
    { l: "SOG", v: self.sog.toFixed(1), u: "kt" },
    { l: "Depth", v: depth.value, u: depth.unit },
    { cls: "inst-pos", l: "Position", v: formatLatLon(self.position.lat, self.position.lon), pos: true },
  ];
  return (
    <div className="inst-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      {cells.map((c, i) => (
        <div key={i} className={c.cls} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, padding: "7px 4px", borderRight: i < cells.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.label }}>{c.l}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: c.pos ? 13 : 19, fontWeight: 700, color: c.bright ? C.bright : C.value, lineHeight: 1 }}>{c.v}</span>
          {c.u && <span style={{ fontSize: 8, color: C.dim }}>{c.u}</span>}
        </div>
      ))}
    </div>
  );
}
