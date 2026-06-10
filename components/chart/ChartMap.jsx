"use client";
import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { C, FONT_MONO } from "@/lib/theme";
import { makeOwnIcon, makeVesselIcon, makeAtonIcon } from "./icons";

// Raster base + marine seamark overlay. Online tiles for now — they work on
// Vercel, in dev, and on the boat whenever Starlink is up. The Pi-phase swap is
// a local MBTiles source here; nothing else in this component changes. The
// library itself is bundled (npm), so only the tiles are the online part.
const STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "OpenStreetMap",
    },
    seamark: {
      type: "raster",
      tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 18,
      attribution: "OpenSeaMap",
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    { id: "seamark", type: "raster", source: "seamark" },
  ],
};

// The OSM raster is bright; the rest of Trident is a dark night instrument. Dim
// the WebGL canvas with a CSS filter so the chart reads dark, and dim hard in
// night mode to protect dark adaptation. Markers are DOM overlays OUTSIDE the
// canvas, so they keep full strength — the chart darkens, the AIS picture does
// not. This rides the single global night toggle (Settings), not a chart-local
// one.
const FILTER_DAY = "brightness(0.55) saturate(0.65) contrast(1.05)";
const FILTER_NIGHT = "brightness(0.32) saturate(0.45) contrast(1.0) sepia(0.5) hue-rotate(-25deg)";

// Orientation is driven by the ONE global displayMode the radar also reads, so
// the two views physically cannot disagree. head-up -> heading at top,
// course-up -> COG at top, north-up -> north at top.
const bearingFor = (mode, self) =>
  mode === "head-up" ? self.heading : mode === "course-up" ? self.cog : 0;

export default function ChartMap({ self, contacts, displayMode, nightMode, selId, follow, source, onSelect, onUserPan, onRecenter }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const markersRef = useRef(new Map()); // id -> { marker, icon }
  const ownRef = useRef(null);

  // Latest props for use inside the long-lived sync closure / map handlers.
  const selRef = useRef(selId);
  selRef.current = selId;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const dataRef = useRef({ self, contacts });
  dataRef.current = { self, contacts };

  // The single marker-sync routine. Reassigned each render so it always closes
  // over the latest data; called from the map 'load' handler and from the data
  // effect below. Diff-by-id: create on first sight, update position/rotation/
  // colour thereafter, remove when a contact drops out (filtered or gone).
  const syncRef = useRef(() => {});
  syncRef.current = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const { self: s, contacts: cs } = dataRef.current;

    if (!ownRef.current) {
      const { el } = makeOwnIcon();
      ownRef.current = new maplibregl.Marker({ element: el, rotationAlignment: "map" });
      ownRef.current.setLngLat([s.lon, s.lat]).setRotation(s.heading).addTo(map);
    } else {
      ownRef.current.setLngLat([s.lon, s.lat]).setRotation(s.heading);
    }

    const seen = new Set();
    for (const c of cs) {
      seen.add(c.id);
      let rec = markersRef.current.get(c.id);
      if (!rec) {
        const icon = c.aton ? makeAtonIcon() : makeVesselIcon();
        const marker = new maplibregl.Marker({ element: icon.el, rotationAlignment: "map" });
        const id = c.id;
        icon.el.addEventListener("click", (e) => { e.stopPropagation(); selectRef.current(id); });
        marker.setLngLat([c.lon, c.lat]).addTo(map);
        rec = { marker, icon };
        markersRef.current.set(c.id, rec);
      }
      rec.marker.setLngLat([c.lon, c.lat]);
      rec.marker.setRotation(c.aton ? 0 : c.cog);
      rec.icon.update(c.level, selRef.current === c.id);
    }
    for (const [id, rec] of markersRef.current) {
      if (!seen.has(id)) { rec.marker.remove(); markersRef.current.delete(id); }
    }
  };

  // Init the map once. Orientation is programmatic only — user rotation is
  // disabled so the chart can't be knocked off the heading the setting dictates.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [self.lon, self.lat],
      zoom: 12.5,
      bearing: bearingFor(displayMode, self),
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      keyboard: false,
    });
    if (map.touchZoomRotate && map.touchZoomRotate.disableRotation) map.touchZoomRotate.disableRotation();
    map.on("load", () => {
      readyRef.current = true;
      map.getCanvas().style.filter = nightMode ? FILTER_NIGHT : FILTER_DAY;
      syncRef.current();
    });
    map.on("dragstart", () => { if (onUserPan) onUserPan(); });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      markersRef.current.clear();
      ownRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync markers whenever data or selection changes (self/contacts are fresh
  // objects each tick from useChartData, so this runs on every update).
  useEffect(() => { syncRef.current(); }, [self, contacts, selId]);

  // Orientation: rotate to the bearing the global mode dictates. A short ease
  // makes a mode switch read as a turn rather than a jump.
  const bearing = bearingFor(displayMode, self);
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) map.easeTo({ bearing, duration: 400 });
  }, [bearing]);

  // Follow own vessel. Off the moment the user pans; the recenter button turns
  // it back on. The short ease smooths the 1s position steps.
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current && follow) map.easeTo({ center: [self.lon, self.lat], duration: 300 });
  }, [self.lat, self.lon, follow]);

  // Night dimming rides the global toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) map.getCanvas().style.filter = nightMode ? FILTER_NIGHT : FILTER_DAY;
  }, [nightMode]);

  const zoom = (d) => { const m = mapRef.current; if (m) m.easeTo({ zoom: m.getZoom() + d, duration: 200 }); };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Honesty line: this view is on online tiles and (today) simulated data.
          Never lets the chart imply offline capability or a live feed it lacks. */}
      <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 8, alignItems: "center", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", color: C.dim, pointerEvents: "none", zIndex: 5 }}>
        <span>TILES: ONLINE</span>
        <span style={{ color: C.border }}>{"\u00B7"}</span>
        <span>{source === "live" ? "LIVE" : "SIM"}</span>
        <span style={{ color: C.border }}>{"\u00B7"}</span>
        <span>OSM / OpenSeaMap</span>
      </div>

      {/* Recenter — only when the user has panned away from own vessel. */}
      {!follow && (
        <div onClick={onRecenter} style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", minHeight: 48, padding: "0 18px", display: "flex", alignItems: "center", gap: 8, background: "rgba(13,19,25,0.92)", border: `1px solid ${C.own}`, borderRadius: 8, color: C.own, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer", zIndex: 6 }}>
          <svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5" fill="none" stroke={C.own} strokeWidth="1.5" /><circle r="1.5" fill={C.own} /></svg>
          CENTER ON ME
        </div>
      )}

      {/* Zoom — 48px targets for cold hands. */}
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 6 }}>
        <div onClick={() => zoom(1)} style={zoomBtn}>+</div>
        <div onClick={() => zoom(-1)} style={zoomBtn}>{"\u2212"}</div>
      </div>
    </div>
  );
}

const zoomBtn = { width: 48, height: 48, background: "rgba(13,19,25,0.9)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: "var(--text)", cursor: "pointer" };
