# CONTEXT.md — Trident

## What is Trident
Raspberry Pi–based **AIS collision watch + boat-systems monitor + instrument-grade capture node** for S/V Irene. Always-on, accessible from any browser on the boat's WiFi at `http://trident.local`. It replaces the **Vesper WatchMate AIS app** and **Victron Bluetooth monitoring** with one calm, glanceable watch surface — and it captures the boat's track and events for automated voyage logging.

**Trident is NOT a chartplotter.** It is a *companion* to whatever chartplotter the user already runs (B&G, Navionics on an iPad, paper, etc.). We deliberately dropped the chart/map view (session 6) after concluding a DRM-free, offline nav chart is unachievable for the waters Irene actually sails (Mexico → Central America → Caribbean). Trident does the things it can do honestly and well — AIS/CPA collision watch, systems monitoring, and capture — and leaves charting to the dedicated plotter. See "Why no chart view" below.

Companion to **Keeply.boats** — the long-term vision is one boat hub for all management/monitoring. Trident is the **offline boat-side node** (capture + AIS + systems); Keeply is the **cloud brain + ashore UI**. The two are converging into one product over a shared Supabase model (option 3 — see "Keeply Convergence & Integration Contract"). Building for one boat first; commercial product vision behind it.

Live prototype: `https://trident.keeply.boats` (Vercel, auto-deploys on push to `main`)
Repo: `https://github.com/garry-cmd/trident` (public)

> **Workflow note:** For this project Garry deploys from a **Mac (zsh/bash)** — not Windows/PowerShell. Deploys are `cp` + `git add/commit/push`. Vercel auto-deploys from `main`. Docs (this file + `HARDWARE.md`) are updated **once at session end**, never mid-session.
>
> **Physical build (hardware): see `HARDWARE.md`.** Exact parts, the assembly stack, and all settled hardware decisions live there — this file owns software/app state only. Read both at session start.
>
> **Integration contract:** the Keeply↔Trident seam lives in the **Keeply repo** as `INTEGRATION-TRIDENT.md` — read it at session start once Keeply convergence work is active. The Supabase project (`waapqyshmqaaamiiitso`) is the canonical data interface, read live via MCP.

## UI/UX Design Philosophy — "Garry at 2am"

Every design decision passes one test: would a solo sailor, cold, tired, half-asleep at 2am on night watch, be able to use this correctly?

- **Simple/clean always wins.** If it doesn't help make a decision, remove it.
- **Calm until something demands attention.** The default state is quiet. Escalation is: calm → caution color → alert badge → full-screen modal with alarm.
- **One glance, one answer.** Heading is a big number. CLOSING/OPENING is one word. TCPA is "minutes to act." No data tables at 2am.
- **Fat touch targets.** Minimum 44px, preferably 48px. Cold hands, gloves, rolling boat, iPad.
- **Show less, not more.** Safe targets are dim. Labels only on threats. Detail only when you ask for it by tapping.
- **No aspirational features.** If it's not wired to real data, it doesn't exist in the UI. Gate it or remove it. *(This principle is exactly why the chart view is gone — a chart we couldn't feed with an honest offline nav source had to go.)*
- **Boring solutions first.** Big buttons beat gesture UX. Dropdowns beat drag-and-drop. Proven patterns beat clever ones.

## The Boat — S/V Irene
- **AIS:** Vesper XB-8000 (Class B transponder, stays). WiFi AP (default) streams **NMEA 0183 over `192.168.15.1:39150` (TCP/UDP)** — sentences include RMC/VTG (GPS position + COG/SOG), VDM/VDO (AIS targets + own), HDG. **This is the live-AIS path without the N2K tap**: Signal K ingests it as a data connection directly. The AP gets disabled later once the boat LAN + NGX-1 are in.
- **Instruments:** B&G Triton 2 (instrument display only — NOT a chartplotter), depth, barometer — all on NMEA 2000 backbone
- **Autopilot:** Simrad Tillerpilot on N2K (read-only monitoring in Trident, write deferred to Phase 10)
- **VHF:** Standard Horizon GX1850 on N2K — supports DSC Class D, potentially accepts DSC call commands via PGN 129808 (to verify in Phase 3)
- **Solar:** 2× Victron MPPT charge controllers
- **Battery monitor:** Victron BMV-712 (owned, NOT yet installed — Phase 1 priority)
- **DC-DC charger:** Victron Orion-Tr Smart (Bluetooth only, excluded from integration)
- **Internet:** Starlink (intermittent, hourly for weather/comms) — **no internet at sea; the app must run fully offline**

## Current State
- **Phase:** **The Dash is built and live system-health is flowing off real hardware.** The Pi serves Trident at `trident.local` (Caddy static export) with Signal K + the **`signalk-rpi-monitor`** plugin running. **AIS** (collision watch), **Dash** (Systems / Power / Weather / Boat with anchor watch), and **Settings** are all real and modular. **Live Pi telemetry** (CPU temp / load / RAM / disk) is wired end-to-end and **verified on the boat box** under `?source=live`. AIS/nav data is still **simulated** until the Pi is in range of the Vesper — but the live Signal K path is now proven for real (the telemetry rides it), so live AIS is the same `?source=live` swap. Power/Weather stay honestly gated until the Cerbo / NGX-1 land; a `?demo=1` flag fills the whole Dash with badged synthetic data for design work. `lib/` has vitest coverage (**111 tests**).
- **Target:** Deploy on Irene by August 24, 2026 (Aug 24 = when on-the-water *testing* starts, not a hard must-work date — no deadline pressure)
- **Prototype live at:** `trident.keeply.boats`
- **Shipped this session (session 8 — built the Dash, wired live Pi system-health, redesigned Settings in the Dash idiom):**
  - **Dash view — built (was a gated stub).** A persistent KPI-card strip (Systems / Power / Weather / Boat) over a tap-to-expand detail drawer (one open at a time) — opens calm with just the cards (the vital-few night-watch default). Pure foundation first: `lib/anchor.ts` (drag math: explicit set-point, distance/bearing/dragging/fraction, max-swing) and `lib/dash.ts` (feed age/bands, GPS-fix null-island guard, per-area status, `worstStatus` where "off"=absent≠fault). Then `hooks/useDash.js` (composes `useTargets` + feed/GPS/anchor + telemetry; anchor persisted under `trident.anchor.v1`), `components/dash/*` (KpiStrip/KpiCard, Panel, Systems/Power/Weather/Boat panels, AnchorScope SVG with SET/CLEAR + radius stepper). Power/Weather **gated** ("NO SENSOR") until their telemetry exists.
  - **Demo mode (`?demo=1`, badged).** `lib/demo.ts` synthesizes slowly-varying telemetry (battery + energy flow, baro sparkline, wind, Pi health, depth, autopilot, VHF) so the whole Dash can be exercised before the Cerbo/NGX-1 exist — explicit flag + visible "DEMO DATA" badge; the default stays gated/honest. Building it also built the **real populated panels** (energy-flow strip, baro sparkline) that render live data when it lands.
  - **Live Pi system-health telemetry — wired + verified on the boat box.** `Telemetry` model on `BoatState` (optional, so sim fixtures don't break); `applyDelta` folds `environment.rpi.*` (from `signalk-rpi-monitor`) into `telemetry.pi` (Kelvin→°C, fraction→%, SD used→free); threaded through to the Dash Systems panel under `?source=live`. **Confirmed live on `trident.local`:** PI HEALTH shows real CPU °C / load % / free disk %, refreshing every 5 s.
  - **Real bug fixed — self by MMSI-URN context.** `signalk-rpi-monitor` (and a boat's own AIS transponder) emit deltas with self's **MMSI URN** as context, not `vessels.self`. `idOf` was routing them to a phantom contact, so Pi health never populated. Fix: learn self's URN from the SK **hello frame** and treat that context as self (`applyDelta(state, delta, selfId)`). Also removes a junk null-island AIS contact.
  - **Anchor no-fix guard (safety).** A stale demo anchor against the live null-island position produced a **false DRAGGING (12.5 M m)**. `anchorStatus` now reports **NO FIX** (caution) when anchored without a valid fix — never a false drag *or* a false "holding". Correct for a real GPS dropout at anchor too. Verified live in the browser.
  - **Settings — alarm thresholds across domains + Dash-idiom card redesign.** Every threshold is real persisted config: a card per system (Collision / System / Power / Weather / Display / Alarm), tap to drill into its controls — same KpiCard/Panel chrome as the Dash. Live groups (Collision, System: Pi over-temp + feed stale/lost timing) **drive alarms now**; Power (battery low-V / low-SOC) and Weather (baro fall bands) are **saved and badged PENDING**, arming the moment the Cerbo / NGX-1 connect — shown, tunable, never faked. Thresholds wired into the status derivation (`batteryStatus`/`baroStatus`/`piStatus`/`feedStatus` read settings); clamp + fence (lost>stale, danger≥caution fall) in `useSettings` + `persist.sanitize`.
  - **Pi:** installed **`signalk-rpi-monitor`** + `sysstat`, enabled it (5 s sample rate), confirmed the five `environment.rpi.*` paths live in the SK Data Browser and on the Dash. (The plugin emits CPU/GPU temp in Kelvin, CPU/memory/SD utilisation as 0–1 — no undervolt flag, so we don't fake one.)
  - **Known soft spot (parked):** with rpi deltas bumping the feed timestamp every 5 s, "AIS FEED: LIVE" reads green on the bench even with no AIS. Honest overall (GPS shows NO FIX → Systems = FAULT). Real fix = track AIS-delta age separately from any-delta age; deferred until the Vesper is in the loop.
  - **Hardware:** Pi **verified serving live system-health telemetry** (see `HARDWARE.md`). No new physical parts. KKSB Tall enclosure still on order; 12V horn still not ordered (gates the GPIO horn layer).

## Hardware (summary — full detail in `HARDWARE.md`)
- **Amazon hardware ordered** June 7, 2026 — $322.71 — arriving June 12: Raspberry Pi 5 8GB, Official Active Cooler, Seengreat 3-CH Relay HAT, PlusRoc 12V→5V converter, SanDisk High Endurance 256GB, (Argon NEO 5 — now retired/spare; enclosure is the **KKSB Tall**, on order).
- **Still to order (closer to Mexico trip):** Actisense NGX-1-USB, Victron Cerbo GX MK2, VE.Direct cables, N2K T-connector + drop, Peplink BR1 Mini LTE, 12V marine horn, wire/fuses/terminals.
- See `HARDWARE.md` for the bill of materials, the physical stack, settled decisions (cooling, enclosure, HAT mounting), clearance math, and relay wiring.

## App Architecture (Built)

Modular. Each view is a route. Components are dumb (props in, render out). Hooks own data. `lib/` is pure logic with no React.

```
trident/
  app/
    globals.css          <- Design tokens (CSS custom properties) — SINGLE SOURCE OF TRUTH.
                            :root = Dusk base; :root[data-theme="day"] = sun-readable light
                            (default); :root[data-theme="night"] = red-on-black. Validated w/ PostCSS.
                            (Token names still carry a --radar-* prefix for the scope palette —
                            cosmetic only, harmless after the AIS rename.)
    layout.js            <- Server: metadata + viewport + <html data-theme="day"
                            suppressHydrationWarning> + a pre-paint script that applies the saved
                            theme before first paint (no night-watch white flash). Renders <AppShell>.
    page.js              <- AIS view ("/") — scope dropped into <WatchLayout> (home)
    dash/page.js         <- Dash (BUILT): KPI strip (Systems/Power/Weather/Boat) + tap-to-expand
                            drawer; live Pi health + anchor watch; Power/Weather gated; ?demo=1 badged
    settings/page.js     <- Settings (BUILT): Dash-idiom card-per-system, tap to drill in —
                            collision + system/power/weather alarm thresholds (live/PENDING badged),
                            theme (Day/Dusk/Night), depth unit, master alarm + test

  components/
    AppShell.jsx         <- Client shell: context providers + persistent bottom nav + AlertModal + audio unlock
    TopBar.jsx           <- Persistent nav bar at the BOTTOM (thumb zone): view tabs (AIS·DASH·SETTINGS),
                            display mode, RANGE filter + THREAT-LEVEL filter (All/Watch+/Danger),
                            pause, tappable ACK chip (re-selects the acked target)
    WatchLayout.jsx      <- Shell for the AIS watch: top InstrumentStrip + centre scope slot
                            (children) + sidebar (TargetList + SidebarHeading). Owns range filter,
                            CPA sort, selected-target resolution, danger->alarm registration.
                            (Was the shared Radar+Chart shell; now AIS-only after the chart drop.)
    InstrumentStrip.jsx  <- Top read-strip: COG / SOG / Depth / Position (HDG is in the sidebar)
    SmallScreenNotice.jsx<- Below 768px: rotate notice (phone isn't a supported watch surface)
    Timer.jsx            <- Watch timer with alarm beep
    AlertModal.jsx       <- Full-screen CPA warning (useAlerts); dark scrim is intentional in every theme
    ais/                 (was radar/ — renamed session 6)
      AisScope.jsx       <- SVG AIS scope display only (was RadarSVG.jsx). Colours via style={{}}
                            (NOT fill=/stroke=) so var() resolves. Two fixed rings (outer+half),
                            true-motion projection on the selected target, range+level filtering,
                            count coloured by worst visible level. No background rect — the slot
                            carries the scope gradient.
      SidebarHeading.jsx <- Orientation-truthful heading block in the sidebar (lib/orient.ts)
      TargetCard.jsx     <- Single target row
      TargetDetail.jsx   <- Big-tile readout for the selected target (CPA/TCPA large; BRG/COG/SOG/
                            Range/Type tiles); floating threat-coloured card
      TargetList.jsx     <- Sidebar container: header + (when selected) ONLY the detail card,
                            else the sorted cards
    settings/
      ThresholdStepper.jsx <- One tunable threshold; stepper only (no free-text), 48px buttons
      Toggle.jsx           <- On/off switch, whole row is a >=48px hit target
    dash/
      KpiStrip/KpiCard.jsx <- Persistent status-card strip (one open at a time); reused by Settings
      Panel.jsx            <- Full-width detail-drawer shell + PanelHead; reused by Settings
      status.js            <- status -> colour/border ("off"=dim, not alarming)
      SystemsPanel / PowerPanel / WeatherPanel / BoatPanel.jsx <- the four drawers (gated or populated)
      AnchorScope.jsx      <- swing-circle SVG; BoatPanel has anchor↔underway faces, SET/CLEAR, radius stepper

  hooks/  (React, context-backed)
    useSettings.js       <- Global context: displayMode, filterRange, levelFilter (threat filter),
                            viewRange, paused, theme, alarmEnabled, depthUnit, + live thresholds.
                            setThreshold clamps + fences danger inside caution. Syncs document
                            data-theme; loads/saves via lib/persist (levelFilter persisted).
    useAlerts.js         <- Global context: danger registration, ack, escalation, alarm loop (gated by
                            alarmEnabled). ack(id) + tappable chip set a selectRequest the AIS page
                            consumes to select that target on the scope (shell↔page seam).
    useBoatState.js      <- Owns the data source + lifecycle. Today: sim interval. THE live swap
                            point — replace with connect(piUrl, setState) from signalk.ts
    useTargets.js        <- Pure composition: useBoatState -> deriveTargets -> enrichTargets (memoized);
                            also returns live telemetry (state.telemetry) for the Dash
                            (useChartData.js + useTrack.js were deleted with the chart view.)
    useDash.js           <- Dash view-model: useTargets + useSettings + 1s clock; feed/GPS/anchor
                            status, telemetry (demo via ?demo=1, else live SK, else gated), per-area
                            status from configured alarm thresholds; owns the persisted anchor set-point

  lib/  (TypeScript, pure logic, no React)
    theme.ts             <- Token map onto CSS vars (C.danger === "var(--danger)"); FONT_MONO/SANS;
                            scope palette tokens (gradient, ring labels, compass)
    geo.ts               <- Spherical math: distanceNm, bearingDeg, project (round-trips exactly)
    ais.ts               <- cpaTcpa, threat(cpa, th?), tColor, passesLevel(level, filter),
                            relativeVelocity, enrichTarget(s). Thresholds injected. THE collision file.
    state.ts             <- deriveTargets(BoatState) -> { targets, own }. lat/lon -> brg/range. Pure.
    signalk.ts           <- applyDelta(state, delta) pure SK-delta folding (AIS names read from the
                            empty-path subtree merge); connect(url, onState) WS shell
    simulate.ts          <- Sim source: initState/advanceState emit canonical BoatState; nmPerTick();
                            SELF_START seeds the boat in the open Pacific
    orient.ts            <- describeOrientation() — orientation-truthful heading label for the sidebar
    units.ts             <- formatDepth (ft/m), formatLatLon — display formatting off the metric model
    persist.ts           <- localStorage load/save + pure sanitize() validator (tested)
    audio.ts             <- Max-loudness collision alarm (square warble + compressor), timer beeps,
                            singleton AudioContext (unlocked on gesture)
    settings.ts          <- DEFAULT_RANGE, modes, FILTER/LEVEL_FILTER/DEPTH/THEME options,
                            DEFAULT_THRESHOLDS, THRESHOLD_FIELDS, DEFAULT_ALARMS + ALARM_GROUPS
                            (System live / Power+Weather pending) + fenceAlarms, DEFAULT_SETTINGS
    anchor.ts            <- Pure anchor-watch math: set-point distance/bearing/dragging/fraction,
                            maxSwing, no-fix guard (null-island = caution, never a false drag)
    dash.ts              <- Pure Dash status: feed age/bands, GPS-fix guard, battery/baro/pi status
                            (configurable thresholds), worstStatus ("off"=absent≠fault)
    demo.ts              <- ?demo=1 synthetic Telemetry generator (pure) + EMPTY_TELEMETRY re-export
    types.ts             <- Display types (incl LevelFilter) + canonical model (LatLon, SelfState,
                            Contact, BoatState) + Telemetry (systems/env, optional on BoatState) + EMPTY_TELEMETRY
    capture/             <- PURE capture logic (no React, no I/O): types.ts, detect.ts (underway/
                            anchor-drag/CPA state machine), downsample.ts (+ vitest)
    {ais,geo,state,signalk,simulate,persist,units,anchor,dash,demo,capture/*}.test.ts  <- vitest, 111 tests

  daemon/  (ISOLATED Node package — better-sqlite3 + ws + tsx; EXCLUDED from the app tsconfig so it
            never enters the Vercel build. Runs on the Pi only.)
    db.ts                <- append-only SQLite (WAL): track_points / capture_events / passages,
                            at ~/trident-data/capture.db (override TRIDENT_CAPTURE_DB)
    sk.ts                <- Signal K WS client + reconnect backoff (reuses applyDelta)
    index.ts             <- entrypoint; --sim flag for bench
    trident-capture.service <- systemd unit (built; NOT yet installed — bench-only until SK has a Vesper feed)
    README.md

  Phase-2 stub remaining: app/dash/page.js (Dash needs the BMV-712 + Cerbo data to be honest).
```

### Architecture rules
- **One responsibility per file.** A component renders; a hook owns data/state; `lib/` is pure logic with no React. **File length is a smell, not a hard limit** — past ~200 lines, ask "is this doing two things?" Sometimes the honest answer is no (a single cohesive view, a large SVG, a config table), and that's fine. Never split a file just to hit a number.
- **Each view is a route.** AIS = `/`, plus `/dash`, `/settings`. No conditional rendering of whole views. (No `/chart` — dropped session 6.)
- **Hooks own the data.** `useTargets()` returns enriched targets whether the source is simulated or live Signal K. Swap the source, UI doesn't change.
- **Shared/global state lives in context** (`useSettings`, `useAlerts`), provided once in `AppShell` so the persistent TopBar and any view read the same state without prop-drilling.
- **Design tokens live in `globals.css`.** Edit colours/fonts there; JS reads them through `lib/theme.ts`. No hardcoded hex in components.
- **Avoid server-only Next features.** Everything is client-side over (eventually) a Signal K WebSocket — no SSR benefit. This keeps the static export (`output: 'export'`) a one-line switch for the Pi.

## Trident App — Three Surfaces
1. **AIS** — Head-up situational awareness, CPA/TCPA, true-motion projection on the selected target, range + threat-level filtering. Manual zoom. The home view. *(built)*
2. **Dash** — persistent KPI-card strip (Systems / Power / Weather / Boat) over a tap-to-expand drawer; live Pi system-health + anchor watch today, Power/Weather gated until the Cerbo/NGX-1 land (`?demo=1` fills it with badged synthetic data for design). *(built)*
3. **Settings** — Dash-idiom card-per-system (tap to drill in): collision thresholds, system/power/weather alarm thresholds (live vs PENDING badged), Day/Dusk/Night theme, depth unit, alarm controls, all persisted *(built)*. Per-crew profiles deferred until the crew model exists.

### Why no chart view (decision, session 6)
We built Q1 chart features (course/CPA vector layer, scale bar, north arrow, track trail) and then removed the whole view. Reasoning: a chart is only worth shipping if it can show an **honest, offline** nav chart at sea, and that source doesn't exist for Irene's waters. NOAA discontinued all raster charts (Dec 2024); its NCDS replacement is US-waters only. For Mexico (SEMAR), Central America, and the Caribbean, every usable chart (O-Charts oeSENC/oeRNC, Navionics, C-MAP) is **DRM-locked** to OpenCPN/MFDs and can't render in MapLibre; Navionics' web API is online-only. The only MapLibre-compatible offline option is satellite-derived imagery — not a substitute for a real chart, and a weak, semi-dishonest core feature. So per "no aspirational features," the chart is gone and Trident is a companion to the user's real plotter, not a plotter. (The dropped chart was always online-tiles-only in the prototype anyway.)

## AIS View — Design Decisions (v5, built)
- Layout is the Watch Shell: top instrument read-strip (COG/SOG/Depth/Position), the scope filling the centre slot edge-to-edge, a right sidebar (target list + heading block), and the persistent nav bar at the BOTTOM (thumb zone).
- Heading lives in the sidebar (`SidebarHeading`), not over the scope centre — orientation-truthful (reads "N" in north-up). Big value, one glance.
- Alert modal shows ONLY vessel name and TCPA ("minutes to act"). **Acknowledging selects that target on the scope** (big detail + projection); the ACK chip in the TopBar is tappable to re-select.
- Nav/controls minimum 44px touch targets.
- **Two fixed distance rings** — outer on the scope edge, inner at half radius, *independent of zoom*. nm labels move with zoom. (No cardinals, no centre crosshairs, no guard ring — all removed.)
- **Selected-target collision viz is TRUE-MOTION:** own and target lines each extend to where each will be at the CPA time, ghost rings at both, and the dashed gap between them = the miss distance (= CPA, labelled). Unselected vessels show a short true-heading tick only.
- Safe targets dim (50% opacity), no labels unless selected; threats labelled. Selected target enlarges into a big-tile readout (CPA/TCPA big; BRG/COG/SOG/Range/Type tiles), and the list **collapses to just that card** (✕ restores).
- **Zoom is manual only** (+/- buttons). Selecting/switching targets does NOT change zoom; background tap deselects (no zoom reset). A selected target always renders even outside the filters.
- Target cards sorted by CPA (closest first), AtoN sorted to bottom.
- Display mode (head-up/course-up/north-up) rotates all scope elements.
- **Two filters:** the **range** filter (outer bound, TopBar select) drops distant targets from scope + list; the **threat-level** filter (All / Watch+ / Danger, TopBar select, persisted) shows a level *and everything more dangerous* across scope + list + count. Because the threat filter can hide ALL traffic, a **caution-amber "FILTERED" banner** sits on the scope whenever it's active with a one-tap SHOW ALL (shift-change safety). Count is coloured by the worst visible level.
- Watch timer with selectable duration + alarm beep. Collision alarm is a max-loudness square-wave warble (iPad-volume capped; GPIO horn is the real floor).
- AtoN (Nav Aid) targets as yellow diamonds.
- DSC Call button on target detail card — NOT built yet (pending GX1850 verification, Phase 3).

> **Resolved (session 7) — predicted-track reference frame.** The earlier dual-frame mix (true-motion track + relative-motion CPA marker) is gone. The selected-target collision viz is now a **true-motion dual projection**: own and target each projected forward to the CPA time, with the gap between the two future positions drawn as the miss distance (= CPA). The ARPA-standard relative-vector line was built and then rejected — it didn't match the on-the-water mental model ("my line should extend to where I'll be"). Per-target heading ticks remain true-heading. No frame-mixing remains on the selected target.

## CPA / Collision Math (important)
`lib/ais.ts` is the one place where a bug means a *missed collision warning*. It is pure and isolated.
- Real AIS gives each vessel an **absolute** COG/SOG. Relative velocity = target vector − own vector, computed in `relativeVelocity()` and shared by both display enrichment and the simulator so they model identical physics.
- Output `rx,ry,vx,vy` are in the **screen frame** (x = East, y = −North) the scope renderer expects.
- **Tested (vitest):** head-on, crossing, opening, parallel/zero-velocity, oblique, and half-open threat boundaries (0.5 → caution, 1.0 → safe), plus `passesLevel` threat-filter ordering (danger never hidden). ~23 tests in `ais.test.ts`. This is the file where a bug = a missed warning, so it has the deepest coverage.
- **Threat-level display filter** lives here too: `passesLevel(level, filter)` ("level and above"), reused by the scope, the list (`WatchLayout`), and the count so all three agree.
- **Thresholds are now live**, not constants. `threat()` and `enrichTarget()` take an optional `Thresholds` arg defaulting to `DEFAULT_THRESHOLDS`; `useTargets` injects the Settings values so changing a CPA stepper re-bands every target instantly. The old `CPA_DANGER`/`CPA_CAUTION`/`GUARD_NM` exports remain as the defaults.

## Data Model — Canonical lat/lon `BoatState`
The whole app hangs off one source-agnostic world model (`lib/types.ts`), lat/lon native because real Signal K gives absolute positions:
- `BoatState = { self: SelfState, contacts: Contact[], source: "sim" | "live", ts }`. `self`/`contacts` carry `position {lat,lon}`, `cog`, `sog` (+ heading/depth on self). `source` drives the SIM badge — **never claim live when simulating.**
- **Both the simulator and the live client emit this exact shape.** `lib/state.ts` `deriveTargets()` is the single bridge from the model to the scope's bearing/range `Target[]` + `OwnVessel`; `ais.ts` then derives relative motion + CPA. Nothing downstream of `deriveTargets` knows or cares whether the data is sim or live.
- **The live swap is one line** in `useBoatState`: replace the sim interval with `connect(piUrl, setState)` from `lib/signalk.ts`. `applyDelta` (pure, tested) folds Signal K deltas into `BoatState`, converting SK's SI units (radians → deg, m/s → kt) and routing self vs. contact vs. AtoN by `context`.
- `lib/geo.ts` holds the spherical math. Its key property (tested): `project(p, brg, d)` then `bearingDeg`/`distanceNm` recover `brg`/`d` exactly — that round-trip is how the sim seeds contacts at precise bearings.
- **Sim motion units:** vessels travel `nmPerTick(sog) = sog * STEP_MIN / 60` per tick (knots → nm/min). A missing `/60` here was a 60× speed bug; a per-tick distance test now guards it.
- **Capture relevance:** this same lat/lon `BoatState` stream is what Trident will downsample into the Keeply capture tables (`track_points`, `capture_events`) — the capture daemon reads the live `BoatState`, not the UI.

## Design Tokens / Theming
- `app/globals.css` `:root` holds all colour/font tokens + the scope palette (gradient, ring labels, compass). `lib/theme.ts` maps token names to `var(--x)` so components stay typo-safe (`C.danger`) while values live in CSS. **No hardcoded hex in components.**
- **Day / Dusk / Night theme system.** `:root` is the **Dusk** base (dark). `:root[data-theme="day"]` is a sun-readable **light** palette (default). `:root[data-theme="night"]` is red-on-black for dark adaptation. Threat semantics hold in every theme — danger is the most saturated thing on screen. Selected in Settings (3-way control); applied by setting `document.documentElement.dataset.theme` (`"dusk"` → no attribute). The scope reads tokens through `style`, so it re-skins automatically.
- **No-flash boot:** `<html data-theme="day">` + a pre-paint inline script in `layout.js` reads the saved theme from localStorage and sets `data-theme` *before* first paint, so reloading on night watch never flashes the light theme. `<html>` carries `suppressHydrationWarning` because that script mutates the server-rendered attribute.
- **CSS is validated.** A find/replace that broke CSS comment-nesting once failed `next build` and — because tsc/esbuild/vitest don't parse CSS — sailed through green and silently blocked three deploys. `globals.css` is now run through the **real PostCSS parser** as part of validation, and deploys are verified with `git ls-remote`.
- **Fonts are self-hosted (session 5):** IBM Plex Mono/Sans vendored as latin woff2 in `public/fonts/` with `@font-face` in `globals.css`; the Google Fonts `@import` is gone. **Offline-safe at sea, zero build-time network.**

## Alert Architecture (Layered)
1. **Physical horn** (GPIO relay) — safety floor, no WiFi/phone/internet dependency
2. **Browser audio** — any open Trident tab plays alarm tone (current: `useAlerts` plays the tone as a side-effect, gated by the **master alarm** setting; a TCPA-window alarm fires alongside the CPA-distance danger band)
3. **Push notifications** (PWA) — requires internet, convenience layer
4. **Visual** — alert modal takes over screen, requires ACKNOWLEDGE tap. **ACK now also selects that target on the AIS scope** (via `selectRequest` in `useAlerts`, consumed by the AIS page) instead of leaving a dead chip; the TopBar ACK chip is tappable to re-select.

> When building layers 1/3, separate **alert state** (in `useAlerts`) from **alert output** (a single effect that fans out to horn/audio/push). Multi-client ACK sync is parked — the physical horn makes independent per-client browser alarms acceptable for now.

## DSC Calling (Pending Verification)
GX1850 is on N2K. CALL button on target detail cards. Flow: tap Call -> confirm MMSI -> Trident sends PGN 129808 -> NGX-1 -> N2K -> GX1850. If the radio doesn't accept the command, button degrades to showing MMSI for manual dialing. Verify Phase 3.

## Pi Stack (Physical Assembly)
**Owned by `HARDWARE.md`** — the physical stack, enclosure (KKSB Tall), cooling (Active Cooler stays on), and HAT mounting (Seengreat 3-CH, stacks on a tall header over the cooler) live there. See HARDWARE.md → "The Stack" and "Settled Decisions".

## Pi Box — As Built (session 4)
- **Access:** `ssh garry@trident.local` (password auth, bench WiFi). App at `http://trident.local` (Caddy :80). Signal K admin at `http://trident.local:3000`.
- **App:** repo cloned at `~/trident` on the Pi. Rebuild after a push: `cd ~/trident && git pull && npm run build:static` — Caddy serves the new `out/` immediately, no restart.
- **Capture daemon (session 7):** lives in `daemon/`, run with `tsx`. `npm install` in `daemon/` pulled the `better-sqlite3` **arm64 prebuild** (no compile). Writes `~/trident-data/capture.db` (append-only SQLite, outside the repo). Proven on the bench via `--sim`. The `trident-capture.service` systemd unit is **built but not installed** — it would idle until Signal K has a real Vesper feed. Install it once the Pi is aboard and AIS is flowing.
- **Live AIS:** the UI defaults to the simulator; add `?source=live` to point `useBoatState` at `ws://trident.local:3000/signalk/v1/stream?subscribe=all`. Scope stays empty until SK is wired to the Vesper (`192.168.15.1:39150`).
- **Services:** `signalk` + `caddy` are systemd units, enabled on boot (`systemctl is-active caddy signalk` → both `active`). `sudo systemctl reload caddy` after a Caddyfile change.
- **Gotchas banked:** Pi OS Lite ships without `git` (apt-install it); Caddy's `caddy` user needs `o+x` on `/home/garry` to traverse to `out/` (the 403 fix — traverse only, not list); the Pi's USB-C port is power-only (the Mac never sees the Pi over it).
- **MMSI:** Irene's MMSI is set in Signal K — kept out of this public repo by choice.

## Software Stack
- **OS (decided & built):** Raspberry Pi OS Lite 64-bit (headless) + Node 20 + Signal K + **Caddy**. **Not OpenPlotter** — Trident's Pi is a headless server and the browser app is the surface. Pi OS Lite + SK + Caddy *is* the production stack with no desktop cruft.
- **N2K tap:** Actisense NGX-1-USB *(not yet ordered — no instrument/depth/wind data until it's in)*
- **Victron data:** Cerbo GX MK2 -> N2K + MQTT over LAN *(not yet ordered — Dash stays stubbed until then)*
- **Trident app:** Next.js 14 (App Router) / React 18 / **TypeScript in `lib/`** PWA
- **On the Pi (done):** served as a **static export** (`STATIC_EXPORT=true npm run build:static` → `out/`) by **Caddy** on port 80 — no Node process on the boat box. Caddyfile roots at `/home/garry/trident/out` with `try_files {path} {path}.html {path}/index.html /index.html`.
- **Keeply sync (planned):** an SQLite buffer on the Pi syncs the underway subset to Supabase when online, via **PowerSync (pending Keeply's spike)** — see the integration contract. The headless capture daemon writes append-only `track_points`/`capture_events`; the high-res buffer stays local.

## Low-Power Notes
- The realistic power lever is the iPad backlight, not our JS. The data path is naturally low-power: live AIS arrives every 5–30s over the Signal K WS, so the source will be **event-driven** — the 1s `setInterval` (now in `useBoatState`) is a *simulator artifact* that disappears when `connect()` replaces it.
- Habits adopted: enrichment is memoized (CPA trig only on data change); never use `setInterval`-based polling.
- Not yet done: pause rendering/animations when the tab is hidden (Page Visibility API).

## Keeply Convergence & Integration Contract
**Vision:** one boat hub for all management/monitoring. Keeply is already a broad cloud boat-management app (logbook, watch_entries, vessels, crew, engines, maintenance, parts, AI "firstmate," push, billing). Trident is the piece that works **offline at sea**. We chose **option 3 — two converging apps sharing a core**, not porting cloud-Keeply onto the Pi (which would die without internet).

- **Division of labor (underway vs. ashore):** Trident/Pi owns the at-sea surfaces (AIS watch, systems, logbook + watch capture, current passage). Keeply cloud owns the ashore/rich surfaces (parts, maintenance, engine library, firstmate, billing, rich logbook viewer/editor, sharing).
- **The contract** lives in the **Keeply repo** as `INTEGRATION-TRIDENT.md` (CONFIRMED by both sides June 11, 2026; design decided, not yet built — gated behind Keeply's offline-mode architecture spike). Key points:
  - **Sync stack: PowerSync** (pending spike). The Pi is a second sync client — headless Node, no IndexedDB — which eliminates Dexie/Replicache and points hard at PowerSync's Node SDK.
  - **Capture model: append-only, no shared-row writes.** Two Pi-owned tables: `track_points` (raw position, **downsampled on sync**) and `capture_events` (discrete events: CPA/anchor/underway/engine — all synced). The Pi **never** writes `watch_entries`/`logbook` (human-authored; may auto-seed from `capture_events`). This eliminates the machine-vs-human conflict class.
  - **Cadence: capture high-res locally, sync logbook-resolution** (≈1 pt/min underway ≈ ~9 MB/mo/vessel ≈ 0.4% of PowerSync's free tier). High-res raw stays in a local-only Pi buffer, never synced.
  - **Auth: device pairing, scoped + revocable, never service-role.** Pair dockside → durable offline credential RLS-scoped to that vessel's capture tables.
  - **Reads: capture-first**, read-cached `vessels`/`vessel_members` + active-passage ref; **zero live-read dependency at sea**. The Pi **originates a passage offline** with a client-generated UUID that reconciles on sync (settles voyage auto-start on underway-detection; manual override in the app).
- **Merge trigger:** when Keeply's spike picks PowerSync, Trident's capture daemon plugs into it and **both the repos and the Claude projects merge** along that seam (home = the Keeply project). Until then, the two stay separate and coordinate through `INTEGRATION-TRIDENT.md` + the shared Supabase schema.
- **Trident's stack-independent step — DONE (session 7):** the **headless Signal K capture into a local SQLite buffer** is built and bench-proven (`daemon/` + `lib/capture/`). Append-only `track_points`/`capture_events`/`passages`, downsample-on-sync, offline passage origination via client UUID. It plugs into PowerSync when Keeply's spike lands.

## Key Documents (in repo /docs)
- `trident-requirements-v2.html` — Full requirements & build spec *(predates the chart drop — partially stale)*
- `trident-roadmap.html` — OKR roadmap targeting Aug 24 *(needs a refresh for the AIS+systems scope; chart milestones obsolete)*
- `trident-shopping-list.html` — Hardware with vendor links and pricing
- `trident-radar-prototype.jsx` — Original Radar v4 prototype *(design reference; the view is now "AIS", superseded by the built modular scope)*
- `trident-full-mockup.html` — interactive mockup *(includes the dropped chart view — historical)*
- `trident-chart-mockup.html`, `trident-dashboard-mockup.html`, `trident-settings-mockup.html` — view mockups *(chart mockup is obsolete)*
- **Scope-obsolete:** `trident-chartplotter-feature-audit.html` (project file) — scored Trident vs B&G plotters; we are no longer a chartplotter.

## What's Next
1. **Live AIS (dockside, Pi aboard Irene) — the payoff.** The name-parsing bug is fixed and the **live source is wired** (`?source=live` → `connect()`); what remains is to point Signal K at the Vesper NMEA stream (`192.168.15.1:39150`, NMEA 0183 over TCP) and **verify `applyDelta` against the real delta stream** — position/COG/SOG (RMC/VTG) and AIS (VDM/VDO) first, then AtoN / `design.aisShipType`. Needs the Pi in range of the Vesper's WiFi + a GPS fix + AIS traffic. Depth/wind/instruments + Victron stay dark until the **NGX-1-USB** and **Cerbo** are installed.
2. **Run the capture daemon as a service aboard.** The daemon is built + bench-proven; once live AIS flows, install the `trident-capture.service` systemd unit so capture runs on boot. Then wire it into **PowerSync** when Keeply's spike lands (see Convergence).
3. **Low power:** pause rendering/animation when the tab is hidden (Page Visibility API).
4. **Dash alarm OUTPUT layer.** The Dash *status* (Systems/Power/Weather/Boat) and the configurable thresholds are wired; what's missing is the OUTPUT — the AIS-pattern full-screen modal + tone for a threshold breach (anchor-drag, feed-lost, and later battery/baro), gated by the master-alarm toggle, with alert state kept separate from output (shared with the GPIO horn layer). Open question for Garry: feed-lost alarm ON by default? (lean: yes.)
5. **AIS-feed-age vs any-delta-age.** Track the age of AIS/position deltas separately from any SK delta so "AIS FEED: LIVE" can't read green off rpi-only traffic. Do it when the Vesper is actually in the loop.
5. **Offline/PWA:** service worker for true offline.
6. **GPIO horn alarm layer** — wire the Relay HAT + 12V horn (both pending), then the safety-floor output (`useAlerts` state → horn), keeping alert state separate from output. (This is the real "loud" floor; the browser alarm is volume-capped.)
7. **DSC calling** — CALL button → PGN 129808 to the GX1850, pending hardware verification (Phase 3).
8. **(When triggered)** Merge with Keeply — repos + Claude projects — once Keeply's spike picks PowerSync.

## Session Log
- **2026-06-12 (session 8):** **Built the Dash, wired live Pi system-health off real hardware, and redesigned Settings in the Dash idiom.** **Dash (built):** KPI-card strip (Systems/Power/Weather/Boat) + tap-to-expand drawer, on a pure foundation (`lib/anchor.ts`, `lib/dash.ts`) + `hooks/useDash.js` + `components/dash/*`; anchor watch (SET/CLEAR, radius, swing-circle) live today; Power/Weather honestly gated. **Demo mode** (`?demo=1`, badged) via `lib/demo.ts` — also built the real populated panels (energy-flow strip, baro sparkline). **Live Pi telemetry:** `Telemetry` on `BoatState`; `applyDelta` folds `environment.rpi.*` (`signalk-rpi-monitor`) into `telemetry.pi` (K→°C, fraction→%); **verified live on `trident.local`** (CPU °C / load / free disk, 5 s). **Two real bugs fixed live (caught via Chrome MCP on the boat box):** (1) `signalk-rpi-monitor` emits with self's **MMSI-URN** context, not `vessels.self` → `idOf` mis-routed it to a phantom contact; fixed by learning self's URN from the SK **hello frame** (`applyDelta(state, delta, selfId)`). (2) a stale demo anchor against null-island live position threw a **false DRAGGING (12.5 M m)**; `anchorStatus` now reports **NO FIX** (caution) without a valid fix. **Settings redesign:** card-per-system (tap to drill in), reusing the Dash KpiCard/Panel chrome; domain alarm thresholds wired into the status fns — Collision + System (Pi over-temp, feed stale/lost) **live**, Power (battery) + Weather (baro fall) **saved + PENDING**, arming on sensor connect; clamp + fence in `useSettings` + `persist.sanitize`. **Pi:** installed `signalk-rpi-monitor` + `sysstat`, enabled (5 s), confirmed the five `environment.rpi.*` paths. 80 → **111 tests**, all green. Five commits pushed to `main`/Vercel (`4311dc7` dash foundation → … → `0a687d1` settings redesign). **Pi went offline late in the session** — it has the live-Pi-health build but still needs `git pull && build:static` for the Settings redesign when it's back. **Parked:** "AIS FEED: LIVE" reads green off rpi-only deltas (fix = separate AIS-delta age; deferred to the Vesper). **No new physical parts.** Docs swept at session end (this commit).
- **2026-06-11 (session 7):** **Built the headless capture daemon + fixed the live-AIS path + a full AIS UX overhaul.** **Capture daemon** (Keeply-convergence groundwork): pure tested detector in `lib/capture/` (underway/anchor-drag/CPA) + isolated `daemon/` I/O shell (better-sqlite3 + ws + tsx) writing append-only SQLite (`track_points`/`capture_events`/`passages`) at `~/trident-data/capture.db`; proven on the Pi via `--sim` (arm64 prebuild, no compile). First push ERRORED on Vercel (root tsconfig globbed `daemon/*.ts`) → fixed by excluding `daemon` (`4f35164`→`adbcff4`); **lesson:** validate root tsc with `daemon/node_modules` absent. **Live-AIS correctness:** fixed a real bug — SK delivers AIS names as empty-path subtree merges, `applyDelta` was dropping them (verified vs `nmea0183-signalk`); wired the live source (`?source=live`); null-island GPS guard in capture (`17c9537`). **AIS UX:** replaced the relative/ARPA collision line with a **true-motion dual projection** (own + target to CPA time, gap = miss distance — un-parked the frame decision); added a **threat-level filter** (All/Watch+/Danger) across scope/list/count with danger never hidden; added a **filtered-view safety banner** (one-tap SHOW ALL) for the shift-change hazard; **ack now selects the target** on the scope (+ tappable ACK chip); **big-tile selected-detail readout** with the list collapsing to just that card; **two fixed rings** (outer+half) independent of zoom; **decoupled zoom from selection** (manual only); **removed the dashed guard ring** + its orphaned Settings stepper (cosmetic-only); removed cardinals/crosshairs; enlarged targets/tap areas; **max-loudness collision alarm** (square warble + compressor, iPad-volume capped — GPIO horn is the real floor). 80 tests, all green. **No hardware changes** (HARDWARE.md unchanged). Pushed to the Pi (`git pull && build:static`). Docs swept at session end (this commit).
- **2026-06-11 (session 6):** **Dropped the chart view and refocused Trident as an AIS collision watch + systems monitor + capture node — not a chartplotter.** Built Q1 chart features (vector layer, scale bar, north arrow, track trail) then removed the entire chart view after a chart-source deep-dive concluded a DRM-free offline nav chart is unachievable for Mexico/Central America/Caribbean (NOAA killed rasters Dec 2024; SEMAR/O-Charts/Navionics/C-MAP all DRM-locked to OpenCPN/MFDs; only satellite-derived offline path exists). Deleted `app/chart/`, `components/chart/`, `hooks/useChartData.js`, `hooks/useTrack.js`, `lib/chartvectors.ts`(+test); removed `maplibre-gl`; nav now AIS·DASH·SETTINGS with AIS home (`c67c5dc`). **Renamed radar → AIS** (`components/ais/`, `AisScope.jsx`, `AisPage`, nav/settings copy; `f86cb3e`). **Fixed sim test location** to open Pacific (`6c0af17`). **Settled the Keeply convergence (option 3)** and authored the integration contract, now `INTEGRATION-TRIDENT.md` in the Keeply repo: append-only capture (`track_points` + `capture_events`), downsample-on-sync (~0.4% of PowerSync free tier), device-pairing scoped/revocable auth, offline passage origination via client UUID; merge trigger = Keeply's spike picks PowerSync → merge repos + Claude projects. Marked the chartplotter feature audit scope-obsolete. 59 tests. No hardware changes. Docs swept at session end (this commit).
- **2026-06-11 (session 5):** **Self-hosted the fonts** — vendored IBM Plex Mono/Sans (latin woff2, 9 weights) into `public/fonts/` and swapped the Google Fonts `@import` for `@font-face` in `globals.css`. Offline-safe at sea with zero build-time network; CSS re-validated through PostCSS. **Settled the physical build and created `HARDWARE.md`** as its source of truth (pushed mid-session by request, commit `736f814`). Hardware decisions banked there: exact HAT is the **Seengreat 3-CH** (HF3FF/005-1ZS relays, 15.5mm tall; pinout CH1/CH2/CH3 = GPIO **26/19/13**, opto-isolated — *not* the Waveshare 26/20/21); the **official Active Cooler stays ON**; enclosure changed to the **KKSB Tall Aluminum Enclosure for Dual HATs** (on order) because the Seengreat relays put the stacked board ~37mm tall; the HAT **stacks on the GPIO** via the KKSB-supplied tall stackable header + 18/20mm spacers. **Argon NEO 5 retired** (kept as spare). Process note: the fonts deploy block wasn't run mid-session (only the HARDWARE.md one was), caught at session end via `git ls-remote` — fonts + that CONTEXT update shipped together in the session-end commit.
- **2026-06-11 (session 4):** **Built the Pi.** Assembled Pi 5 (Active Cooler + Argon NEO 5 base; **Relay HAT deferred**). Flashed **Raspberry Pi OS Lite 64-bit** headless via Pi Imager — booted and SSH'd first try. Installed **Node 20.20.2** + **Signal K 2.23.0** (vessel Irene, port 3000, auto-start on boot). **Decided the OS/serving stack:** Pi OS Lite + SK + **Caddy**, not OpenPlotter. Shipped the **conditional static export** (`STATIC_EXPORT=true` → `output:'export'`; commit `00332a5`). Cloned the repo on the Pi, `build:static` → `out/`, served by **Caddy** on :80. Fixed a **403** — `chmod o+x /home/garry`. **Verified reboot survival**. Live AIS is now one dockside step (SK → Vesper `192.168.15.1:39150`, flip `useBoatState` to `connect()`).
- **2026-06-10 (session 3):** Built the **Chart view** (MapLibre GL) and extracted the shared Watch Shell; **dropped phone support** for a rotate notice. Redesigned the scope chrome (bottom nav, top instrument strip, heading in the sidebar) and fixed the own-boat icon bug. Built the **Day/Dusk/Night theme system** and made the scope fill the view area. Built **settings persistence** (localStorage). 59 tests. **Process learning:** a CSS comment-nesting bug failed `next build` and silently blocked three deploys — **added PostCSS parsing to validation** and now verify deploys with `git ls-remote`. *(The chart view built here was removed in session 6.)*
- **2026-06-08 (session 2):** Confirmed the scope renders correctly post SVG-colour conversion. Explained the divergent predicted-track vs CPA lines (correct frame mixing, parked). **Added vitest** (46 tests across `lib/`). **Built the Settings view (Phase 2a):** live CPA/guard/TCPA thresholds, TCPA-window alarm, night-vision mode, master alarm + test; deferred power/depth/crew controls honestly. **Built the live-data layer:** canonical lat/lon `BoatState` + `geo.ts` + `state.ts` + `signalk.ts` + `useBoatState`; rewrote the simulator to emit `BoatState`. Caught/fixed a 60× sim-speed regression and added a guarding test.
- **2026-06-08 (session 1):** Decomposed monolithic `app/radar.jsx` (425 lines) into the modular architecture (23 files). Cleaned URL structure + honest Phase-2 stubs. Migrated `lib/` to strict TypeScript. Fixed CPA to derive relative velocity from absolute COG/SOG. Memoized enrichment. Moved all design tokens to CSS custom properties. Revised the file-size rule from a hard 150-line cap to a one-responsibility principle.
