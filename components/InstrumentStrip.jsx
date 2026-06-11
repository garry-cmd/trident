"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { formatDepth, formatLatLon } from "@/lib/units";

// Always-visible nav read-out across the top of the watch layout. Dumb: it just
// renders own-vessel state. Heading is NOT here — it lives in the sidebar
// heading panel (big, with the orientation reference), so the strip carries the
// supporting four: COG / SOG / Depth / Position.
export default function InstrumentStrip({ self, depthUnit }) {
  const depth = formatDepth(self.depth, depthUnit);
  const cells = [
    { l: "COG", v: `${Math.round(self.cog)}\u00B0` },
    { l: "SOG", v: self.sog.toFixed(1), u: "kt" },
    { l: "Depth", v: depth.value, u: depth.unit },
    { l: "Position", v: formatLatLon(self.position.lat, self.position.lon), pos: true },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      {cells.map((c, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, padding: "7px 4px", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
          <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.label }}>{c.l}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: c.pos ? 13 : 19, fontWeight: 700, color: C.value, lineHeight: 1 }}>{c.v}</span>
          {c.u && <span style={{ fontSize: 8, color: C.dim }}>{c.u}</span>}
        </div>
      ))}
    </div>
  );
}
