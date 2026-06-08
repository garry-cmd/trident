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
- **Phase:** Production build underway. Radar view is real and modular. Data is still simulated (no live Signal K yet).
- **Target:** Deploy on Irene by August 24, 2026
- **Prototype live at:** `trident.keeply.boats`
- **Shipped this session (all deployed):**
  - Decomposed the monolithic radar prototype into the modular architecture below
  - URL structure: Radar is the root `/` (no redirect); `/chart`, `/dash`, `/settings` are named routes with honest "Phase 2 — not built" stubs
  - `lib/` migrated to **TypeScript** (strict); rest of app stays `.jsx`/`.js` via `allowJs`
  - **Relative-velocity CPA fix** — targets now carry absolute COG/SOG (as real AIS does); relative velocity is derived (target − own) in `lib/ais.ts`
  - Design tokens (colours, fonts, radar palette) moved to **CSS custom properties** in `app/globals.css` as the single source of truth
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
    globals.css          <- Design tokens (CSS custom properties) — SINGLE SOURCE OF TRUTH
    layout.js            <- Server: metadata + viewport, imports globals.css, renders <AppShell>
    page.js              <- Radar view (root "/") — assembles the radar from components/hooks
    chart/page.js        <- Phase 2 stub
    dash/page.js         <- Phase 2 stub
    settings/page.js     <- Phase 2 stub

  components/
    AppShell.jsx         <- Client shell: context providers + persistent TopBar + AlertModal + audio unlock
    TopBar.jsx           <- Nav tabs, display mode, range filter, timer, alert badge (persistent across routes)
    Timer.jsx            <- Watch timer with alarm beep
    AlertModal.jsx       <- Full-screen CPA warning (reads useAlerts)
    HeadingKPI.jsx       <- Heading overlay + CLOSING/OPENING (shared radar + future chart)
    radar/
      RadarSVG.jsx       <- SVG radar display only. Colours via style={{}} (NOT fill=/stroke=
                            attributes) so CSS var() resolves inside SVG.
      TargetCard.jsx     <- Single target row
      TargetDetail.jsx   <- Expanded selected-target panel
      TargetList.jsx     <- Right-panel container: header + detail + sorted cards

  hooks/  (React, context-backed)
    useSettings.js       <- Global context: displayMode, filterRange, viewRange, paused
    useAlerts.js         <- Global context: danger registration, ack, escalation, alarm loop
    useTargets.js        <- Consumes simulate source, enriches with CPA (memoized), respects pause

  lib/  (TypeScript, pure logic, no React)
    theme.ts             <- Token map onto CSS vars (C.danger === "var(--danger)"); FONT_MONO/SANS
    ais.ts               <- cpaTcpa, threat, tColor, relativeVelocity, enrichTarget/enrichTargets
    simulate.ts          <- Simulated AIS source: initTargets (absolute COG/SOG), advanceTargets, OWN
    audio.ts             <- Alarm tones, timer beeps, singleton AudioContext (unlocked on first gesture)
    settings.ts          <- DEFAULT_RANGE, display modes, filter/timer options, DEFAULT_SETTINGS
    types.ts             <- Target, EnrichedTarget, OwnVessel, ThreatLevel, DisplayMode

  Not yet built: lib/signalk.ts (live WS source), components/chart/*, components/dash/*, tests.
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
2. **Chart** — Web-based nav chart with AIS overlay, pan/zoom, offline tiles *(Phase 2)*
3. **Dash** — KPI cards: system status (GPS/AIS/connected clients), battery, solar *(Phase 2)*
4. **Settings** — Per-crew notification profiles with configurable thresholds *(Phase 2)*

## Radar View — Design Decisions (v4, now built)
- Large heading KPI top center — just the number; CLOSING/OPENING below it when a target is selected
- No bottom instrument bar — heading is the only always-visible metric
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

## CPA / Collision Math (important)
`lib/ais.ts` is the one place where a bug means a *missed collision warning*. It is pure and isolated.
- Real AIS gives each vessel an **absolute** COG/SOG. Relative velocity = target vector − own vector, computed in `relativeVelocity()` and shared by both display enrichment and the simulator so they model identical physics.
- Output `rx,ry,vx,vy` are in the **screen frame** (x = East, y = −North) the radar renderer expects.
- **No tests yet** — adding vitest coverage here (head-on, crossing, opening, parallel geometries) is the top anti-tech-debt task.

## Design Tokens / Theming
- `app/globals.css` `:root` holds all colour/font tokens + the radar palette (gradient, ring labels, compass) that used to be hardcoded hex inside RadarSVG.
- `lib/theme.ts` maps token names to `var(--x)` so components stay typo-safe (`C.danger`) while values live in CSS.
- **Night-vision red mode** is now ~10 lines: a `:root[data-theme="night"]{ ... }` block + set `document.documentElement.dataset.theme = "night"`. Not built; documented in `globals.css`.
- Fonts currently load via Google Fonts `@import` — **won't work offline at sea**. Self-host via `next/font` or local files in the Pi phase.

## Alert Architecture (Layered)
1. **Physical horn** (GPIO relay) — safety floor, no WiFi/phone/internet dependency
2. **Browser audio** — any open Trident tab plays alarm tone (current: `useAlerts` plays the tone as a side-effect)
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
- The realistic power lever is the iPad backlight, not our JS. The data path is naturally low-power: live AIS arrives every 5–30s over the Signal K WS, so `useTargets` will be **event-driven** — the 1s `setInterval` in the code today is a *simulator artifact* that disappears with real data.
- Habits adopted: enrichment is memoized (CPA trig only on data change); never use `setInterval`-based polling.
- Not yet done: pause rendering/animations when the tab is hidden (Page Visibility API).

## Key Documents (in repo /docs)
- `trident-requirements-v2.html` — Full requirements & build spec
- `trident-roadmap.html` — OKR roadmap targeting Aug 24
- `trident-shopping-list.html` — Hardware with vendor links and pricing
- `trident-radar-prototype.jsx` — Original Radar v4 prototype (design reference; superseded by the built modular radar)
- `trident-full-mockup.html` — All 4 views interactive mockup

## What's Next
1. **Tests on `lib/`** (vitest) — `cpaTcpa`, `threat`, `relativeVelocity` with known geometries. Highest-leverage anti-tech-debt move; pure functions make it cheap.
2. **Pi hardware arrives June 12** — begin OpenPlotter / Signal K setup.
3. **`lib/signalk.ts`** — Signal K WebSocket client to replace `simulate` as the `useTargets` source (UI unchanged).
4. **Static export config** (`output: 'export'`) for Pi serving; keep avoiding server-only Next features.
5. **Offline/PWA:** service worker for true offline; self-host fonts (`next/font`) to drop the Google Fonts `@import`.
6. **Low power:** pause rendering when the tab is hidden (Page Visibility API).
7. **Build Chart view** (Leaflet/MapLibre + MBTiles), then Dash, then Settings.
8. **Night-vision red mode** (`data-theme` swap) — now a small addition.
9. **Responsive pass** for phone/portrait layout.

## Session Log
- **2026-06-08:** Decomposed monolithic `app/radar.jsx` (425 lines) into the modular architecture above (23 files). Cleaned URL structure (radar at root, named routes + honest Phase-2 stubs). Migrated `lib/` to strict TypeScript with real types. Fixed CPA to derive relative velocity from absolute COG/SOG (was using hand-authored relative vectors); re-tuned the sim for a sensible threat spread. Memoized enrichment. Moved all design tokens to CSS custom properties in `globals.css` (single source of truth); converted RadarSVG colours to `style`-based so `var()` resolves; pulled previously-hardcoded radar hexes into tokens. Revised the file-size rule from a hard 150-line cap to a one-responsibility principle. All changes built clean (tsc + next build) and deployed.
