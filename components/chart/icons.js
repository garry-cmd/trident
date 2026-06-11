// DOM marker elements for the MapLibre chart. These are real DOM nodes laid
// over the WebGL canvas (not GPU symbols), so they stay crisp, take taps, and
// recolour automatically when night mode swaps the CSS tokens — they reference
// the same vars (lib/theme.ts -> globals.css) as the rest of the app.
//
// IMPORTANT: colours are set via CSS `style` (fill:var(--x)), never the SVG
// `fill=` presentation attribute — var() does not resolve in presentation
// attributes (the same reason AisScope uses style-based colours). Threat
// colours match the radar's tColor exactly: danger/caution/safe ->
// --danger-br / --caution-br / --safe-br.

const LEVEL_COLOR = {
  danger: "var(--danger-br)",
  caution: "var(--caution-br)",
  safe: "var(--safe-br)",
};

// Own vessel: filled triangle in own-vessel blue with a short heading stub.
// Points "up" at rotation 0. The marker is rotation-aligned to the map and set
// to true heading, so it tracks heading and turns with the chart in head-up /
// course-up. Non-interactive.
export function makeOwnIcon() {
  const el = document.createElement("div");
  el.style.cssText = "width:34px;height:34px;pointer-events:none;";
  el.innerHTML =
    '<svg viewBox="-17 -17 34 34" width="34" height="34">' +
    '<line x1="0" y1="-12" x2="0" y2="-26" style="stroke:var(--own);stroke-width:1.5;opacity:0.5"/>' +
    '<polygon points="0,-13 7,9 0,4 -7,9" style="fill:var(--own);stroke:var(--bg);stroke-width:0.8"/>' +
    "</svg>";
  return { el };
}

// AIS vessel: triangle coloured by threat level, oriented to COG. Safe targets
// dim to 55% (matches the radar's "safe targets dim"); caution/danger full
// strength. Selected gets a coloured ring + full opacity. Tappable.
export function makeVesselIcon() {
  const el = document.createElement("div");
  el.style.cssText = "width:30px;height:30px;cursor:pointer;";
  el.innerHTML =
    '<svg viewBox="-15 -15 30 30" width="30" height="30">' +
    '<circle class="sel" cx="0" cy="0" r="13" fill="none" style="stroke-width:1.5;opacity:0"/>' +
    '<polygon class="hull" points="0,-11 6,8 0,4 -6,8" style="stroke:var(--bg);stroke-width:0.8"/>' +
    "</svg>";
  const hull = el.querySelector(".hull");
  const ring = el.querySelector(".sel");
  function update(level, selected) {
    const col = LEVEL_COLOR[level] || LEVEL_COLOR.safe;
    hull.style.fill = col;
    ring.style.stroke = col;
    ring.style.opacity = selected ? "0.9" : "0";
    el.style.opacity = selected ? "1" : level === "safe" ? "0.55" : "1";
  }
  return { el, update };
}

// Aid to Navigation: yellow diamond, stationary, never rotates. Dim by default,
// brightens + rings when selected. Matches the radar's AtoN treatment.
export function makeAtonIcon() {
  const el = document.createElement("div");
  el.style.cssText = "width:26px;height:26px;cursor:pointer;";
  el.innerHTML =
    '<svg viewBox="-13 -13 26 26" width="26" height="26">' +
    '<circle class="sel" cx="0" cy="0" r="11" fill="none" style="stroke:var(--aton);stroke-width:1.5;opacity:0"/>' +
    '<rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" style="fill:var(--aton);stroke:var(--bg);stroke-width:0.8"/>' +
    "</svg>";
  const ring = el.querySelector(".sel");
  function update(_level, selected) {
    ring.style.opacity = selected ? "0.9" : "0";
    el.style.opacity = selected ? "1" : "0.7";
  }
  return { el, update };
}
