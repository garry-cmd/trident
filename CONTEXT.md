# CONTEXT.md — Trident

## What is Trident
Raspberry Pi–based marine navigation, AIS watch, and power management platform. Replaces iPad/Navionics chartplotter, Vesper WatchMate AIS app, and Victron Bluetooth monitoring with a single always-on system accessible from any browser on the boat's WiFi at `http://trident.local`.

Hardware companion to Keeply.boats — the Signal K → Supabase pipeline feeds instrument-grade automated voyage logging into Keeply's logbook. Long-term commercial product vision, but building for one boat first.

Live prototype: `https://trident.keeply.boats` (Vercel)
Repo: `https://github.com/garry-cmd/trident`

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
- **Internet:** Starlink (intermittent, hourly for weather/comms)

## Current State
- **Phase:** Design complete. Next.js app scaffolded. Radar prototype v4 deployed to Vercel.
- **Target:** Deploy on Irene by August 24, 2026
- **Prototype live at:** `trident.keeply.boats`
- **Amazon hardware ordered:** June 7, 2026 — $322.71 — arriving June 12
  - Raspberry Pi 5 8GB ($182.39 — at retail due to RAM crisis)
  - Official Active Cooler ($9.95)
  - 3-Channel Relay HAT, opto-isolated ($18.90)
  - PlusRoc 12V→5V 25W USB-C converter ($9.99)
  - SanDisk High Endurance 256GB microSD ($59.99)
  - Argon NEO 5 M.2 case ($41.49 — base only, top removed for relay HAT)
- **Still to order (closer to Mexico trip):**
  - Actisense NGX-1-USB (~$250, Defender)
  - Victron Cerbo GX MK2 (~$248, Defender)
  - 3× VE.Direct cables (~$54, Defender)
  - N2K T-connector + drop cable (~$45, Defender)
  - Peplink BR1 Mini LTE-A + WiFi (~$450, Amazon, "-W" variant)
  - 12V marine alarm horn (~$35, Fisheries Supply)
  - Wire, fuses, terminals (~$43, Fisheries Supply)
  - Blue Latitude O-Charts (~$80, o-charts.org)
- **Total hardware estimate:** ~$1,538

## App Architecture (Locked)

Modular, not monolithic. No file over ~150 lines. Each view is a route.

```
trident/
  app/
    layout.js            ← Shell + shared TopBar + providers
    page.js              ← Redirects to /radar
    radar/page.js        ← Radar view (assembles components)
    chart/page.js        ← Chart view
    dash/page.js         ← Dashboard view
    settings/page.js     ← Settings view

  components/
    TopBar.jsx           ← Nav tabs, timer, alert badge (shared)
    AlertModal.jsx       ← Full-screen CPA warning
    HeadingKPI.jsx       ← Heading overlay (shared radar + chart)
    radar/
      RadarSVG.jsx       ← SVG radar display only
      TargetCard.jsx     ← Single target row
      TargetDetail.jsx   ← Expanded selected target panel
      TargetList.jsx     ← Sorted/filtered list container
    chart/               ← Phase 2
    dash/                ← Phase 2

  lib/
    ais.js               ← CPA/TCPA math, threat classification
    signalk.js           ← Signal K WebSocket client
    simulate.js          ← Fake data for dev (swappable)
    audio.js             ← Alarm tones, timer beeps
    settings.js          ← Display mode, thresholds, guard zones
    types.js             ← Shared data shapes

  hooks/
    useTargets.js        ← Consumes signalk or simulate, enriches with CPA
    useSettings.js       ← Global settings (cookie-backed per crew)
    useAlerts.js         ← Alert state, acknowledgment, escalation
```

Rules:
- **Each view is a route.** `/radar`, `/chart`, `/dash`, `/settings`
- **Components are dumb.** They receive props and render. No data fetching.
- **Hooks own the data.** `useTargets()` works against simulated or live Signal K.
- **`lib/` is pure logic.** No React. Testable functions.
- **TopBar lives in `layout.js`** — persists across route changes.
- **Display mode is global** — shared between Chart and Radar via `useSettings()`.

## Trident App — Four Views
1. **Radar** — Head-up situational awareness, guard zones, CPA/TCPA, auto-zoom on target select
2. **Chart** — Web-based nav chart with AIS overlay, pan/zoom, offline tiles
3. **Dash** — KPI cards: system status (GPS/AIS/connected clients), battery, solar
4. **Settings** — Per-crew notification profiles with configurable thresholds

## Radar View — Design Decisions (v4)
- Large heading KPI top center — just the number, nothing else
- CLOSING/OPENING indicator appears below heading when target selected
- No bottom instrument bar — heading is the only always-visible metric
- Alert modal shows ONLY vessel name and TCPA ("minutes to act")
- Nav bar buttons minimum 44px touch targets
- One line per target: unselected = short heading tick, selected = extended predicted track
- Safe targets at 50% opacity with no labels unless selected
- Click target → auto-zoom, show predicted track + CPA point
- Click radar background → reset zoom, deselect, show all
- Target cards sorted by CPA (closest first), AtoN sorted to bottom
- Display mode (head-up/course-up/north-up) rotates all radar elements
- Filter range visually drops targets from both radar and list
- Watch timer with selectable duration and alarm beep
- Nav Aid (AtoN) targets as yellow diamonds
- DSC Call button on target detail card (pending GX1850 verification)

## Alert Architecture (Layered)
1. **Physical horn** (GPIO relay) — safety floor, no WiFi/phone/internet dependency
2. **Browser audio** — any open Trident tab plays alarm tone
3. **Push notifications** (PWA) — requires internet, convenience layer
4. **Visual** — alert modal takes over screen, requires ACKNOWLEDGE tap

## DSC Calling (Pending Verification)
GX1850 is on N2K. CALL button on target detail cards. Flow: tap Call → confirm MMSI → Trident sends PGN 129808 → NGX-1 → N2K → GX1850. If radio doesn't accept the command, button degrades to showing MMSI for manual dialing. Verify Phase 3.

## Pi Stack (Physical Assembly)
1. Argon NEO 5 base (screw-mounted to panel)
2. Pi 5 8GB
3. Official Active Cooler (fan header)
4. 3-Channel Relay HAT (GPIO via standoffs)
Top cover stays in spares drawer.

## Software Stack
- **OS:** OpenPlotter (or clean Pi OS + Signal K)
- **N2K tap:** Actisense NGX-1-USB
- **Victron data:** Cerbo GX MK2 → N2K + MQTT over LAN
- **Trident app:** Next.js / React / JavaScript PWA
- **Chart engine:** Leaflet or MapLibre GL with pre-cached marine tiles
- **Charts for Mexico:** O-Charts Blue Latitude, SEMAR, Chart Locker MBTiles
- **Keeply sync:** SQLite buffer on Pi → Supabase when Starlink up

## Key Documents (in repo /docs)
- `trident-requirements-v2.html` — Full requirements & build spec
- `trident-roadmap.html` — OKR roadmap targeting Aug 24
- `trident-shopping-list.html` — Hardware with vendor links and pricing
- `trident-radar-prototype.jsx` — Radar v4 prototype (design spec)
- `trident-full-mockup.html` — All 4 views interactive mockup

## What's Next
1. Decompose monolithic radar.jsx into modular components per architecture
2. Build production Radar view as first route
3. Pi hardware arrives June 12 — begin OpenPlotter / Signal K setup
4. Responsive pass for phone/portrait layout
5. Order remaining hardware closer to August
