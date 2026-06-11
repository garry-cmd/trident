"use client";
import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { C, FONT_MONO } from "@/lib/theme";
import { makeOwnIcon, makeVesselIcon, makeAtonIcon } from "./icons";

// Raster base + marine seamark overlay. Online tiles for now — they work on
// Vercel, in dev, and on the boat whenever Starlink is up. The Pi-phase swap is
// a local MBTiles source here; nothing else in this component changes.
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

// Tile treatment per theme. Day keeps the raster bright (sun-readable); Dusk
// dims it to read dark; Night red-dims it to protect dark adaptation. Markers
// are DOM overlays outside the canvas, so the AIS picture stays full-strength.
const TILE_FILTER = {
  day: "saturate(0.9) contrast(1.02)",
  dusk: "brightness(0.55) saturate(0.65) contrast(1.05)",
  night: "brightness(0.32) saturate(0.45) contrast(1.0) sepia(0.5) hue-rotate(-25deg)",
};
const filterFor = (t) => TILE_FILTER[t] || TILE_FILTER.dusk;

// Orientation is driven by the same global displayMode the radar reads, so the
// two views can never disagree.
const bearingFor = (mode, self) =>
  mode === "head-up" ? self.heading : mode === "course-up" ? self.cog : 0;

export default function ChartMap({ self, contacts, displayMode, theme, selId, follow, source, onSelect, onUserPan, onRecenter }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const markersRef = useRef(new Map()); // id -> { marker, icon }
  const ownRef = useRef(null);

  const selRef = useRef(selId);
  selRef.current = selId;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const dataRef = useRef({ self, contacts });
  dataRef.current = { self, contacts };

  // Marker sync. Reassigned each render so it always closes over the latest
  // data; called from the map 'load' handler and the data effect below.
  const syncRef = useRef(() => {});
  syncRef.current = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const { self: s, contacts: cs } = dataRef.current;

    if (!ownRef.current) {
      const { el } = makeOwnIcon();
      ownRef.current = new maplibregl.Marker({ element: el, rotationAlignment: "map" });
      ownRef.current.setLngLat([s.position.lon, s.position.lat]).setRotation(s.heading).addTo(map);
    } else {
      ownRef.current.setLngLat([s.position.lon, s.position.lat]).setRotation(s.heading);
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

  // Init once. User rotation is disabled so the chart can't be knocked off the
  // heading the setting dictates.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [self.position.lon, self.position.lat],
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
      map.getCanvas().style.filter = filterFor(theme);
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

  // Re-sync markers whenever data or selection changes.
  useEffect(() => { syncRef.current(); }, [self, contacts, selId]);

  // Orientation.
  const bearing = bearingFor(displayMode, self);
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) map.easeTo({ bearing, duration: 400 });
  }, [bearing]);

  // Follow own vessel (off the moment the user pans; recenter turns it back on).
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current && follow) map.easeTo({ center: [self.position.lon, self.position.lat], duration: 300 });
  }, [self.position.lat, self.position.lon, follow]);

  // Selecting a target (from the sidebar or the map) centres the chart on it —
  // the spatial payoff the radar's list can't give.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !selId) return;
    const c = dataRef.current.contacts.find((x) => x.id === selId);
    if (c) map.easeTo({ center: [c.lon, c.lat], duration: 400 });
  }, [selId]);

  // Night dimming rides the global toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) map.getCanvas().style.filter = filterFor(theme);
  }, [theme]);

  const zoom = (d) => { const m = mapRef.current; if (m) m.easeTo({ zoom: m.getZoom() + d, duration: 200 }); };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 8, alignItems: "center", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", color: C.dim, pointerEvents: "none", zIndex: 5 }}>
        <span>TILES: ONLINE</span>
        <span style={{ color: C.border }}>{"\u00B7"}</span>
        <span>{source === "live" ? "LIVE" : "SIM"}</span>
        <span style={{ color: C.border }}>{"\u00B7"}</span>
        <span>OSM / OpenSeaMap</span>
      </div>

      {!follow && (
        <div onClick={onRecenter} style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", minHeight: 48, padding: "0 18px", display: "flex", alignItems: "center", gap: 8, background: "var(--raised)", border: `1px solid ${C.own}`, borderRadius: 8, color: C.own, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer", zIndex: 6 }}>
          <svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5" fill="none" stroke={C.own} strokeWidth="1.5" /><circle r="1.5" fill={C.own} /></svg>
          CENTER ON ME
        </div>
      )}

      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 6 }}>
        <div onClick={() => zoom(1)} style={zoomBtn}>+</div>
        <div onClick={() => zoom(-1)} style={zoomBtn}>{"\u2212"}</div>
      </div>
    </div>
  );
}

const zoomBtn = { width: 48, height: 48, background: "var(--raised)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: "var(--bright)", cursor: "pointer" };
