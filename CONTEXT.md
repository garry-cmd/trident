# CONTEXT.md — Trident

## What is Trident
Raspberry Pi–based marine navigation, AIS watch, and power management platform. Replaces iPad/Navionics chartplotter, Vesper WatchMate AIS app, and Victron Bluetooth monitoring with a single always-on system accessible from any browser on the boat's WiFi at `http://trident.local`.

Hardware companion to Keeply.boats — the Signal K → Supabase pipeline feeds instrument-grade automated voyage logging into Keeply's logbook. Long-term commercial product vision, but building for one boat first.

Live prototype: `https://trident.keeply.boats` (Vercel, auto-deploys on push to `main`)
Repo: `https://github.com/garry-cmd/trident` (public)

> **Workflow note:** For this project Garry deploys from a **Mac (zsh/bash)** — not Windows/PowerShell. Deploys are `cp` + `git add/commit/push`. Vercel auto-deploys from `main`. Docs (this file) are updated **once at session end**, never mid-session.

## UI/UX Design Philosophy — "Garry at 2am"

Every design decision passes one test: would a solo sailor, cold, tired, half-asleep at 2am on night watch, be able to use this correctly?

- **Simple/clean always wins.** If it doesn't help make a decision, remove it.
- **Calm until something demands attention.** The default state is quiet. Escalation is: calm → caution color → alert badge → full-screen modal with alarm.
- **One glance, one answer.** Heading is a big number. CLOSING/OPENING is one word. TCPA is "minutes to act." No data tables at 2am.
- **Fat touch targets.** Minimum 44px, preferably 48px. Cold hands, gloves, rolling boat, iPad.
- **Show less, not more.** Safe targets are dim. Labels only on threats. Detail only when you ask for it by tapping.
- **No aspirational features.** If it's not wired to real data, it doesn't exist in the UI. Gate it or remove it.
- **Boring solutions first.** Big buttons beat gesture UX. Dropdowns beat drag-and-drop. Proven patterns beat clever ones.

## The Boat — S/V Irene
- **AIS:** Vesper XB-8000 (Class B transponder, stays, WiFi AP disabled post-build)
- **Instruments:** B&G Triton 2 (instrument display only — NOT a chartplotter), depth, barometer — all on NMEA 2000 backbone
- **Autopilot:** Simrad Tillerpilot on N2K (read-only monitoring in Trident, write deferred to Phase 10)
- **VHF:** Standard Horizon GX1850 on N2K — supports DSC Class D, potentially accepts DSC call commands via PGN 129808 (to verify in Phase 3)
- **Solar:** 2× Victron MPPT charge controllers
- **Battery monitor:** Victron BMV-712 (owned, NOT yet installed — Phase 1 priority)
- **DC-DC charger:** Victron Orion-Tr Smart (Bluetooth only, excluded from integration)
- **Internet:** Starlink (intermittent, hourly for weather/comms) — **no internet at sea; the app must run fully offline**

## Current State
- **Phase:** Production build underway. Radar **and Chart** are real and modular; Settings is built with a full **Day/Dusk/Night** theme system. Data is still simulated — the simulator emits the **canonical lat/lon `BoatState`** the live Signal K feed will produce, so going live is a one-line source swap in `useBoatState`. `lib/` has vitest coverage (**59 tests**).
- **Target:** Deploy on Irene by August 24, 2026
- **Prototype live at:** `trident.keeply.boats`
- **Shipped this session (session 3, all deployed):**
  - **Chart view (MapLibre GL)** — own-vessel + AIS overlay driven straight off `BoatState` positions; native map rotation (`setBearing`) so orientation matches the radar. Online OSM raster + OpenSeaMap seamarks are the chart's "simulator-equivalent"; offline MBTiles is a Pi-phase tile-source swap. `hooks/useChartData.js`, `components/chart/{ChartMap.jsx,icons.js}`.
  - **Shared Watch Shell (`components/WatchLayout.jsx`)** — radar and chart now render into one layout (top instrument strip + centre view slot + sidebar list/heading). The shell owns range filter, CPA sort, selected-target resolution, and **danger→alarm registration so the collision alarm fires on the Chart too** (was radar-only). **Phone support dropped** below 768px for an honest rotate notice (`SmallScreenNotice`).
  - **Day/Dusk/Night theme system** — replaced the `nightMode` boolean with a `theme` tri-state. **Day** = sun-readable light (default), **Dusk** = the old dark base, **Night** = red-on-black. 3-way selector in Settings; theme-aware chart-tile filter; tokenised the hardcoded-dark controls (zoom buttons) that were invisible in Day. Boots in Day with no flash.
  - **Radar fills the view area** — moved the scope gradient onto the slot (full-bleed) and dropped RadarSVG's own background rect, removing the day-mode "three-greys" buffer band between radar and sidebar.
  - **Settings persistence (`lib/persist.ts`)** — theme / depth unit / display mode / range filter / alarm enable / all four thresholds now survive reload via localStorage; a tested `sanitize()` validates the stored blob (bad enums dropped, thresholds clamped, danger kept inside caution) so a corrupt entry can't brick the radar. `paused` and `viewRange` are deliberately **not** restored. Pre-paint theme boot in `layout.js` so a night reload doesn't flash white.
- **Amazon hardware ordered:** June 7, 2026 — $322.71 — arriving June 12
  - Raspberry Pi 5 8GB, Official Active Cooler, 3-Channel Relay HAT (opto-isolated), PlusRoc 12V→5V 25W USB-C converter, SanDisk High Endurance 256GB microSD, Argon NEO 5 M.2 case
- **Still to order (closer to Mexico trip):**
  - Actisense NGX-1-USB (~$250), Victron Cerbo GX MK2 (~$248), 3× VE.Direct cables (~$54), N2K T-connector + drop (~$45), Peplink BR1 Mini LTE-A "-W" (~$450), 12V marine alarm horn (~$35), wire/fuses/terminals (~$43), Blue Latitude O-Charts (~$80)
- **Total hardware estimate:** ~$1,538

## App Architecture (Built)

Modular. Each view is a route. Components are dumb (props in, render out). Hooks own data. `lib/` is pure logic with no React.

```
trident/
  app/
    globals.css          <- Design tokens (CSS custom properties) — SINGLE SOURCE OF TRUTH.
                            :root = Dusk base; :root[data-theme="day"] = sun-readable light
                            (default); :root[data-theme="night"] = red-on-black. Validated w/ PostCSS.
    layout.js            <- Server: metadata + viewport + <html data-theme="day"
                            suppressHydrationWarning> + a pre-paint script that applies the saved
                            theme before first paint (no night-watch white flash). Renders <AppShell>.
    page.js              <- Radar view ("/") — scope dropped into <WatchLayout>
    chart/page.js        <- Chart view ("/chart") — MapLibre map dropped into <WatchLayout> (BUILT)
    dash/page.js         <- Phase-2 stub (needs Victron data to be honest)
    settings/page.js     <- Settings (BUILT): thresholds, theme (Day/Dusk/Night), depth unit,
                            master alarm + test

  components/
    AppShell.jsx         <- Client shell: context providers + persistent bottom nav + AlertModal + audio unlock
    TopBar.jsx           <- Persistent nav bar, now at the BOTTOM (thumb zone): view tabs, display
                            mode, range filter, pause, alert badge
    WatchLayout.jsx      <- Shared shell for Radar + Chart: top InstrumentStrip + centre view slot
                            (children) + sidebar (TargetList + SidebarHeading). Owns range filter,
                            CPA sort, selected-target resolution, danger->alarm registration.
    InstrumentStrip.jsx  <- Top read-strip: COG / SOG / Depth / Position (HDG is in the sidebar)
    SmallScreenNotice.jsx<- Below 768px: rotate notice (phone isn't a supported watch surface)
    Timer.jsx            <- Watch timer with alarm beep
    AlertModal.jsx       <- Full-screen CPA warning (useAlerts); dark scrim is intentional in every theme
    radar/
      RadarSVG.jsx       <- SVG radar display only. Colours via style={{}} (NOT fill=/stroke=) so
                            var() resolves. No background rect — the slot carries the scope gradient.
      SidebarHeading.jsx <- Orientation-truthful heading block in the sidebar (lib/orient.ts)
      TargetCard.jsx     <- Single target row
      TargetDetail.jsx   <- Expanded selected-target panel
      TargetList.jsx     <- Sidebar container: header + detail + sorted cards
    chart/
      ChartMap.jsx       <- MapLibre GL map: own-vessel + AIS DOM markers, theme-aware tile filter,
                            rotation matched to radar, zoom/recenter controls
      icons.js           <- DOM marker builders (colours via CSS var() in style)
    settings/
      ThresholdStepper.jsx <- One tunable threshold; stepper only (no free-text), 48px buttons
      Toggle.jsx           <- On/off switch, whole row is a >=48px hit target

  hooks/  (React, context-backed)
    useSettings.js       <- Global context: displayMode, filterRange, viewRange, paused, theme,
                            alarmEnabled, depthUnit, + live thresholds. setThreshold clamps + fences
                            danger inside caution. Syncs document data-theme; loads/saves via lib/persist.
    useAlerts.js         <- Global context: danger registration, ack, escalation, alarm loop (gated by alarmEnabled)
    useBoatState.js      <- Owns the data source + lifecycle. Today: sim interval. THE live swap
                            point — replace with connect(piUrl, setState) from signalk.ts
    useTargets.js        <- Pure composition: useBoatState -> deriveTargets -> enrichTargets (memoized)
    useChartData.js      <- Joins self lat/lon + enriched threat-by-id off one useBoatState, for the chart

  lib/  (TypeScript, pure logic, no React)
    theme.ts             <- Token map onto CSS vars (C.danger === "var(--danger)"); FONT_MONO/SANS;
                            radar palette tokens (gradient, ring labels, compass)
    geo.ts               <- Spherical math: distanceNm, bearingDeg, project (round-trips exactly)
    ais.ts               <- cpaTcpa, threat(cpa, th?), tColor, relativeVelocity, enrichTarget(s).
                            Thresholds injected. THE collision-critical file.
    state.ts             <- deriveTargets(BoatState) -> { targets, own }. lat/lon -> brg/range. Pure.
    signalk.ts           <- applyDelta(state, delta) pure SK-delta folding; connect(url, onState) WS shell
    simulate.ts          <- Sim source: initState/advanceState emit canonical BoatState; nmPerTick()
    orient.ts            <- describeOrientation() — orientation-truthful heading label for the sidebar
    units.ts             <- formatDepth (ft/m), formatLatLon — display formatting off the metric model
    persist.ts           <- localStorage load/save + pure sanitize() validator (tested)
    audio.ts             <- Alarm tones, timer beeps, singleton AudioContext (unlocked on gesture)
    settings.ts          <- DEFAULT_RANGE, modes, FILTER/DEPTH/THEME options, DEFAULT_THRESHOLDS,
                            THRESHOLD_FIELDS, DEFAULT_SETTINGS
    types.ts             <- Display types + canonical model (LatLon, SelfState, Contact, BoatState)
    {ais,geo,state,signalk,simulate,persist,units}.test.ts  <- vitest, 59 tests

  Phase-2 stub remaining: app/dash/page.js (Dash needs the BMV-712 + Cerbo data to be honest).
```

### Architecture rules
- **One responsibility per file.** A component renders; a hook owns data/state; `lib/` is pure logic with no React. If a file does more than one of those jobs, split it. **File length is a smell, not a hard limit** — past ~200 lines, ask "is this doing two things?" Sometimes the honest answer is no (a single cohesive view, a large SVG, a config table), and that's fine. Never split a file just to hit a number. *(This replaces the old "no file over 150 lines" rule, which was an arbitrary proxy that can force worse design.)*
- **Each view is a route.** Radar = `/`, plus `/chart`, `/dash`, `/settings`. No conditional rendering of whole views.
- **Hooks own the data.** `useTargets()` returns enriched targets whether the source is simulated or live Signal K. Swap the source, UI doesn't change.
- **Shared/global state lives in context** (`useSettings`, `useAlerts`), provided once in `AppShell` so the persistent TopBar and any view read the same state without prop-drilling.
- **Design tokens live in `globals.css`.** Edit colours/fonts there; JS reads them through `lib/theme.ts`. No hardcoded hex in components.
- **Avoid server-only Next features.** Everything is client-side over (eventually) a Signal K WebSocket — no SSR benefit. This keeps a static export (`output: 'export'`) a one-line switch for the Pi later.

## Trident App — Four Views
1. **Radar** — Head-up situational awareness, guard zones, CPA/TCPA, auto-zoom on target select *(built)*
2. **Chart** — MapLibre GL nav chart with AIS overlay, pan/zoom, rotation matched to the radar; online OSM/OpenSeaMap tiles now, offline MBTiles in the Pi phase *(built)*
3. **Dash** — KPI cards: system status (GPS/AIS/connected clients), battery, solar *(Phase 2 — gated on Victron data, won't be faked)*
4. **Settings** — Live collision thresholds, Day/Dusk/Night theme, depth unit, alarm controls, all persisted *(built)*. Per-crew profiles + power/nav-sensor rules deferred until their sensors exist.

## Radar View — Design Decisions (v4, now built)
- Layout is the shared Watch Shell: top instrument read-strip (COG/SOG/Depth/Position), the scope filling the centre slot edge-to-edge, a right sidebar (target list + heading block), and the persistent nav bar at the BOTTOM (thumb zone).
- Heading lives in the sidebar (`SidebarHeading`), not over the scope centre — orientation-truthful (reads "N" in north-up). Big value, one glance.
- Alert modal shows ONLY vessel name and TCPA ("minutes to act")
- Nav/controls minimum 44px touch targets
- Unselected target = short heading tick; selected = extended predicted track + CPA point
- Safe targets dim (50% opacity), no labels unless selected; threats labelled
- Click target -> auto-zoom + predicted track; click background -> reset/deselect
- Target cards sorted by CPA (closest first), AtoN sorted to bottom
- Display mode (head-up/course-up/north-up) rotates all radar elements
- Range filter visually drops targets from both radar and list
- Watch timer with selectable duration + alarm beep
- AtoN (Nav Aid) targets as yellow diamonds
- DSC Call button on target detail card — NOT built yet (pending GX1850 verification, Phase 3)

> **Parked decision — predicted-track reference frame.** Investigated a case where a selected target's long predicted-track line (its **true COG**, a 30-min true-motion vector) diverged ~66° from the faint line to its **relative-frame CPA point**. This is correct, not a bug: own ≈ target speed maximises the gap between true and relative motion, and the sim speed has no effect on the frozen-frame geometry (verified numerically). The radar currently mixes frames — a true-motion track + a relative-motion CPA marker. The ARPA-standard fix is to make the bold predicted-track line follow the **relative** vector so it points straight through the CPA dot (icon still oriented to true COG). **Deferred** — left as-is for now by choice; revisit if the dual-frame display proves confusing on the water.

## CPA / Collision Math (important)
`lib/ais.ts` is the one place where a bug means a *missed collision warning*. It is pure and isolated.
- Real AIS gives each vessel an **absolute** COG/SOG. Relative velocity = target vector − own vector, computed in `relativeVelocity()` and shared by both display enrichment and the simulator so they model identical physics.
- Output `rx,ry,vx,vy` are in the **screen frame** (x = East, y = −North) the radar renderer expects.
- **Tested (vitest):** head-on, crossing, opening, parallel/zero-velocity, oblique, and half-open threat boundaries (0.5 → caution, 1.0 → safe). 19 tests in `ais.test.ts`. This is the file where a bug = a missed warning, so it has the deepest coverage.
- **Thresholds are now live**, not constants. `threat()` and `enrichTarget()` take an optional `Thresholds` arg defaulting to `DEFAULT_THRESHOLDS`; `useTargets` injects the Settings values so changing a CPA stepper re-bands every target instantly. The old `CPA_DANGER`/`CPA_CAUTION`/`GUARD_NM` exports remain as the defaults.

## Data Model — Canonical lat/lon `BoatState`
The whole app now hangs off one source-agnostic world model (`lib/types.ts`), lat/lon native because real Signal K gives absolute positions and the future Chart needs them:
- `BoatState = { self: SelfState, contacts: Contact[], source: "sim" | "live", ts }`. `self`/`contacts` carry `position {lat,lon}`, `cog`, `sog` (+ heading/depth on self). `source` drives the SIM badge — **never claim live when simulating.**
- **Both the simulator and the live client emit this exact shape.** `lib/state.ts` `deriveTargets()` is the single bridge from the model to the radar's bearing/range `Target[]` + `OwnVessel`; `ais.ts` then derives relative motion + CPA exactly as before. Nothing downstream of `deriveTargets` knows or cares whether the data is sim or live.
- **The live swap is one line** in `useBoatState`: replace the sim interval with `connect(piUrl, setState)` from `lib/signalk.ts`. `applyDelta` (pure, tested) folds Signal K deltas into `BoatState`, converting SK's SI units (radians → deg, m/s → kt) and routing self vs. contact vs. AtoN by `context`.
- `lib/geo.ts` holds the spherical math. Its key property (tested): `project(p, brg, d)` then `bearingDeg`/`distanceNm` recover `brg`/`d` exactly — that round-trip is how the sim seeds contacts at precise bearings, and why the radar is byte-identical to the pre-rewrite geometry.
- **Sim motion units:** vessels travel `nmPerTick(sog) = sog * STEP_MIN / 60` per tick (knots → nm/min). A missing `/60` here was a 60× speed bug; a per-tick distance test now guards it.

## Design Tokens / Theming
- `app/globals.css` `:root` holds all colour/font tokens + the radar palette (gradient, ring labels, compass). `lib/theme.ts` maps token names to `var(--x)` so components stay typo-safe (`C.danger`) while values live in CSS. **No hardcoded hex in components** — the few that slipped through (radar/chart zoom buttons) were tokenised this session because they were invisible in Day.
- **Day / Dusk / Night theme system.** `:root` is the **Dusk** base (dark). `:root[data-theme="day"]` is a sun-readable **light** palette (default). `:root[data-theme="night"]` is red-on-black for dark adaptation. Threat semantics hold in every theme — danger is the most saturated thing on screen. Selected in Settings (3-way control); applied by setting `document.documentElement.dataset.theme` (`"dusk"` → no attribute). The radar reads tokens through `style`, so it re-skins automatically; the chart filters its tiles per theme (Day bright, Dusk dim, Night red-dim).
- **No-flash boot:** `<html data-theme="day">` + a pre-paint inline script in `layout.js` reads the saved theme from localStorage and sets `data-theme` *before* first paint, so reloading on night watch never flashes the light theme. `<html>` carries `suppressHydrationWarning` because that script mutates the server-rendered attribute.
- **CSS is now validated.** A find/replace that spliced the Day block into a header comment broke CSS comment-nesting and failed `next build` — and because tsc / esbuild / vitest don't parse CSS, it sailed through green and silently blocked three deploys (remote `main` never moved). `globals.css` is now run through the **real PostCSS parser** (the one Next uses) as part of validation, and deploys are verified with `git ls-remote`.
- Fonts still load via Google Fonts `@import` — **won't work offline at sea**. Self-host via `next/font` or local files in the Pi phase.

## Alert Architecture (Layered)
1. **Physical horn** (GPIO relay) — safety floor, no WiFi/phone/internet dependency
2. **Browser audio** — any open Trident tab plays alarm tone (current: `useAlerts` plays the tone as a side-effect, now gated by the **master alarm** setting; a TCPA-window alarm fires alongside the CPA-distance danger band)
3. **Push notifications** (PWA) — requires internet, convenience layer
4. **Visual** — alert modal takes over screen, requires ACKNOWLEDGE tap

> When building layers 1/3, separate **alert state** (in `useAlerts`) from **alert output** (a single effect that fans out to horn/audio/push). Multi-client ACK sync (ACK on iPad clearing the phone) is parked — the physical horn makes independent per-client browser alarms acceptable for now.

## DSC Calling (Pending Verification)
GX1850 is on N2K. CALL button on target detail cards. Flow: tap Call -> confirm MMSI -> Trident sends PGN 129808 -> NGX-1 -> N2K -> GX1850. If the radio doesn't accept the command, button degrades to showing MMSI for manual dialing. Verify Phase 3.

## Pi Stack (Physical Assembly)
1. Argon NEO 5 base (screw-mounted to panel)
2. Pi 5 8GB
3. Official Active Cooler (fan header)
4. 3-Channel Relay HAT (GPIO via standoffs)
Top cover stays in spares drawer.

## Software Stack
- **OS:** OpenPlotter (or clean Pi OS + Signal K)
- **N2K tap:** Actisense NGX-1-USB
- **Victron data:** Cerbo GX MK2 -> N2K + MQTT over LAN
- **Trident app:** Next.js 14 (App Router) / React 18 / **TypeScript in `lib/`** PWA
- **On the Pi:** plan to serve as a **static export** (`output: 'export'`) via nginx/caddy — lighter and more robust on an always-on box than a `next start` Node process
- **Chart engine:** Leaflet or MapLibre GL with pre-cached marine tiles (MBTiles)
- **Charts for Mexico:** O-Charts Blue Latitude, SEMAR, Chart Locker MBTiles
- **Keeply sync:** SQLite buffer on Pi -> Supabase when Starlink up

## Low-Power Notes
- The realistic power lever is the iPad backlight, not our JS. The data path is naturally low-power: live AIS arrives every 5–30s over the Signal K WS, so the source will be **event-driven** — the 1s `setInterval` (now in `useBoatState`) is a *simulator artifact* that disappears when `connect()` replaces it.
- Habits adopted: enrichment is memoized (CPA trig only on data change); never use `setInterval`-based polling.
- Not yet done: pause rendering/animations when the tab is hidden (Page Visibility API).

## Key Documents (in repo /docs)
- `trident-requirements-v2.html` — Full requirements & build spec
- `trident-roadmap.html` — OKR roadmap targeting Aug 24
- `trident-shopping-list.html` — Hardware with vendor links and pricing
- `trident-radar-prototype.jsx` — Original Radar v4 prototype (design reference; superseded by the built modular radar)
- `trident-full-mockup.html` — All 4 views interactive mockup

## What's Next
1. **Pi hardware (arriving June 12) → live Signal K.** OpenPlotter / Signal K setup, then the payoff: point `useBoatState` at the Pi's Signal K WS via `connect(piUrl, setState)` and radar + chart run on live AIS, UI unchanged. Verify `applyDelta` against the real delta stream (esp. depth unit + AtoN / `design.aisShipType` paths) — built against the spec, not a live feed.
2. **Self-host fonts** (`next/font` / local files) to drop the Google Fonts `@import` — required for offline at sea. Rides with the static-export work.
3. **Static export config** (`output: 'export'`) for nginx/caddy serving on the Pi; keep avoiding server-only Next features.
4. **Low power:** pause rendering/animation when the tab is hidden (Page Visibility API).
5. **Dash view** — system status / battery / solar. Gated on real Victron data (BMV-712 + Cerbo); won't be built with fake gauges.
6. **Offline/PWA:** service worker for true offline.
7. **DSC calling** — CALL button → PGN 129808 to the GX1850, pending hardware verification (Phase 3).
8. **(Parked)** Predicted-track relative-vector option (see Radar Design Decisions) — revisit if the dual-frame display confuses on the water.

Done this session and off the list: Chart view, Day/Dusk/Night theming, settings persistence, and the phone "responsive pass" (resolved by dropping phone support for a rotate notice).

## Session Log
- **2026-06-10 (session 3):** Built the **Chart view** (MapLibre GL: own-vessel + AIS overlay off `BoatState`, rotation matched to radar, online OSM/OpenSeaMap tiles). Extracted the **shared Watch Shell** (`WatchLayout`) so radar + chart share one layout and the collision alarm fires on both; **dropped phone support** for an honest rotate notice. Redesigned the radar chrome (bottom nav, top instrument strip, heading moved to the sidebar) and fixed the own-boat icon pointing bug. Built the **Day/Dusk/Night theme system** (replacing the night boolean; Day default, sun-readable) and made the **radar fill the view area** (scope gradient on the slot, dropped the SVG bg rect — killed the three-greys buffer). Built **settings persistence** (localStorage, sanitised loader, pre-paint theme boot; `paused`/`viewRange` excluded). 59 tests. **Process learning:** a CSS comment-nesting bug from a careless find/replace failed `next build` and silently blocked three deploys (remote `main` didn't move) — diagnosed by re-cloning the remote + reading the build error; **added PostCSS parsing to validation** and now verify deploys with `git ls-remote`. All deployed (tsc green; real `next build` runs on Garry's Mac / Vercel — sandbox SIGBUSes).
- **2026-06-08 (session 2):** Confirmed radar renders correctly post SVG-colour conversion. Investigated and explained the divergent predicted-track vs CPA lines (correct frame mixing, not a bug — see parked decision). **Added vitest** with 46 tests across `lib/`. **Built the Settings view (Phase 2a):** lifted CPA/guard/TCPA thresholds from constants into live settings state injected through the pure CPA functions, added a TCPA-window alarm, night-vision `data-theme` mode, master alarm + test button; deferred power/depth/crew controls honestly. **Built the live-data layer:** canonical lat/lon `BoatState` model + `geo.ts` + `state.ts` (`deriveTargets`) + `signalk.ts` (`applyDelta` + `connect`) + `useBoatState`; rewrote the simulator to emit `BoatState` and recomposed `useTargets` — collision math untouched, all seeds reproduce exactly, live swap reduced to one line. Caught and fixed a 60× sim-speed regression from the rewrite (knots→nm/min) and added a guarding test. All deployed (tsc green; `next build` unverified locally — sandbox SIGBUS — but Vercel builds clean).
- **2026-06-08 (session 1):** Decomposed monolithic `app/radar.jsx` (425 lines) into the modular architecture above (23 files). Cleaned URL structure (radar at root, named routes + honest Phase-2 stubs). Migrated `lib/` to strict TypeScript with real types. Fixed CPA to derive relative velocity from absolute COG/SOG (was using hand-authored relative vectors); re-tuned the sim for a sensible threat spread. Memoized enrichment. Moved all design tokens to CSS custom properties in `globals.css` (single source of truth); converted RadarSVG colours to `style`-based so `var()` resolves; pulled previously-hardcoded radar hexes into tokens. Revised the file-size rule from a hard 150-line cap to a one-responsibility principle. All changes built clean (tsc + next build) and deployed.
