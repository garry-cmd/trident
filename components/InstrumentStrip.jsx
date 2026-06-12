"use client";
import { C, FONT_MONO } from "@/lib/theme";
import { formatDepth, formatLatLon } from "@/lib/units";

// Always-visible nav read-out across the top of the watch layout. Dumb: renders
// own-vessel state. Heading is NOT here — it lives in the sidebar heading panel.
// Layout: every cell is label-on-top + a centered value zone of equal height, so
// the big numbers share a baseline regardless of whether they carry a unit.
// Position is stacked lat/lon (a full fix won't fit on one line at this size).
export default function InstrumentStrip({ self, depthUnit }) {
  const depth = formatDepth(self.depth, depthUnit);
  const [latStr, lonStr] = formatLatLon(self.position.lat, self.position.lon).split(" ");
  const nums = [
    { l: "COG", v: `${Math.round(self.cog)}\u00B0` },
    { l: "SOG", v: self.sog.toFixed(1), u: "kt" },
    { l: "Depth", v: depth.value, u: depth.unit },
  ];

  const Label = ({ children }) => (
    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.label }}>{children}</span>
  );
  const cell = { display: "flex", flexDirection: "column", alignItems: "center", minHeight: 56, padding: "6px 4px", gap: 4 };
  const zone = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      {nums.map((c, i) => (
        <div key={c.l} style={{ ...cell, borderRight: `1px solid ${C.border}` }}>
          <Label>{c.l}</Label>
          <div style={zone}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 23, fontWeight: 700, color: C.value, lineHeight: 1 }}>{c.v}</span>
              {c.u && <span style={{ fontSize: 10, color: C.dim }}>{c.u}</span>}
            </span>
          </div>
        </div>
      ))}
      <div style={cell}>
        <Label>Position</Label>
        <div style={zone}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: C.value, lineHeight: 1 }}>{latStr}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: C.value, lineHeight: 1 }}>{lonStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
