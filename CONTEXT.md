# CONTEXT.md — Trident

## What is Trident
Raspberry Pi–based marine navigation, AIS watch, and power management platform. Replaces iPad/Navionics chartplotter, Vesper WatchMate AIS app, and Victron Bluetooth monitoring with a single always-on system accessible from any browser on the boat's WiFi at `http://trident.local`.

Hardware companion to Keeply.boats — the Signal K → Supabase pipeline feeds instrument-grade automated voyage logging into Keeply's logbook. Long-term commercial product vision, but building for one boat first.

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
- **Phase:** Design complete. Requirements v2 approved. Interactive Radar prototype at v4. No production code yet.
- **Target:** Deploy on Irene by August 24, 2026
- **Amazon hardware ordered:** June 7, 2026 — $322.71 — arriving June 12
  - Raspberry Pi 5 8GB ($182.39, JIBOTECH — at retail due to RAM crisis)
  - Official Active Cooler ($9.95)
  - 3-Channel Relay HAT, opto-isolated ($18.90 — GPIO alarm driver)
  - PlusRoc 12V→5V 25W USB-C converter ($9.99)
  - SanDisk High Endurance 256GB microSD ($59.99)
  - Argon NEO 5 M.2 case ($41.49 — use as base only, top removed for relay HAT clearance)
- **Still to order (closer to Mexico trip):**
  - Actisense NGX-1-USB (~$250, Defender) — NOT the retired NGT-1
  - Victron Cerbo GX MK2 (~$248, Defender)
  - 3× VE.Direct cables (~$54, Defender)
  - N2K T-connector + drop cable (~$45, Defender)
  - Peplink BR1 Mini LTE-A + WiFi (~$450, Amazon — must be "-W" variant)
  - 12V marine alarm horn (~$35, Fisheries Supply)
  - Wire, fuses, terminals (~$43, Fisheries Supply)
  - Blue Latitude O-Charts: Sea of Cortez + Pacific Mexico (~$80, o-charts.org)
- **Total hardware estimate:** ~$1,538

## Pi Stack (Physical Assembly)
Bottom to top:
1. Argon NEO 5 base (screw-mounted to electrical panel)
2. Pi 5 8GB (seated in base)
3. Official Active Cooler (clipped onto SoC, plugged into fan header)
4. 3-Channel Relay HAT (stacked on GPIO header via standoffs)
Top cover stays in spares drawer. Active cooler handles thermals.

## Key Documents (in project)
- `trident-requirements-v2.html` — Full requirements & build spec
- `trident-full-mockup.html` — Interactive mockup, all 4 views (Chart/Radar/Dash/Settings)
- `trident-radar-prototype.jsx` — Interactive Radar v4 prototype with moving AIS targets
- `trident-roadmap.html` — OKR roadmap targeting Aug 24 deploy
- `trident-shopping-list.html` — Hardware shopping list with vendor links and pricing
- `trident-dashboard-mockup.html`, `trident-chart-mockup.html`, `trident-settings-mockup.html` — Individual view mockups
- `Vesper_AIS.pdf` — XB-8000 install guide
- `Triton2_OM_.pdf` — B&G Triton 2 manual

## Locked Hardware Decisions (Premium)
| Item | Vendor | Status |
|---|---|---|
| Raspberry Pi 5 8GB | Amazon (ordered) | Arriving Jun 12 |
| Active Cooler | Amazon (ordered) | Arriving Jun 12 |
| 3-Ch Relay HAT (opto-isolated) | Amazon (ordered) | Arriving Jun 12 |
| PlusRoc 12V→5V USB-C 25W | Amazon (ordered) | Arriving Jun 12 |
| SanDisk High Endurance 256GB | Amazon (ordered) | Arriving Jun 12 |
| Argon NEO 5 M.2 (base only) | Amazon (ordered) | Arriving Jun 12 |
| Actisense NGX-1-USB | Defender | To order |
| Peplink BR1 Mini (WiFi variant) | Amazon | To order |
| Victron Cerbo GX MK2 | Defender | To order |
| 3× VE.Direct cables | Defender | To order |
| 12V relay + marine horn | Fisheries Supply | To order |

## Software Architecture
- **OS:** OpenPlotter (or clean Pi OS + Signal K)
- **Data backbone:** Signal K server on Pi
- **N2K tap:** Actisense NGX-1-USB (replaces retired NGT-1)
- **Victron data:** Cerbo GX MK2 → N2K (summary) + MQTT over LAN (detail)
- **Trident app:** Next.js / React / TypeScript PWA at `trident.local`
- **Chart engine:** Leaflet or MapLibre GL with pre-cached marine tiles
- **Passage planning:** OpenCPN on laptop/Pi HDMI (separate from Trident)
- **Charts for Mexico:** O-Charts Blue Latitude (~€72), SEMAR, Chart Locker MBTiles
- **Keeply sync:** SQLite buffer on Pi → Supabase when Starlink up

## Trident App — Four Views
1. **Chart** — Web-based nav chart with AIS overlay, pan/zoom, offline tiles
2. **Radar** — Head-up situational awareness, guard zones, CPA/TCPA, auto-zoom on target select
3. **Dash** — KPI cards: system status (GPS/AIS/connected clients), battery, solar
4. **Settings** — Per-crew notification profiles with configurable thresholds

## Radar View — Design Decisions (from v4 iteration)
- Solo sailor / 3am design principle: simple, clean, don't overwhelm with data
- Large heading KPI top center — just the number, nothing else
- CLOSING/OPENING indicator appears below heading when target selected
- No bottom instrument bar — heading is the only always-visible metric
- Alert modal shows ONLY vessel name and TCPA ("minutes to act") — no CPA
- Nav bar buttons minimum 44px touch targets for cold-hands iPad use
- One line per target: unselected = short heading tick, selected = extended predicted track
- Safe targets at 50% opacity with no labels unless selected
- Click target → auto-zoom to frame it, show predicted track + CPA point
- Click radar background → reset zoom, deselect, show all targets
- Target cards sorted by CPA (closest approach first)
- Display mode (head-up/course-up/north-up) actually rotates all radar elements
- Filter range visually drops targets from both radar and list
- Watch timer with selectable duration and alarm beep
- Nav Aid (AtoN) targets rendered as yellow diamonds, sorted to bottom of list
- DSC Call button on target detail card (pending GX1850 PGN verification)

## Alert Architecture (Layered)
1. **Physical horn** (GPIO relay) — safety floor, no WiFi/phone/internet dependency
2. **Browser audio** — any open Trident tab plays alarm tone
3. **Push notifications** (PWA) — requires internet (Starlink), convenience layer
4. **Visual** — alert modal takes over screen, requires ACKNOWLEDGE tap

## DSC Calling (Pending Verification)
The GX1850 is on the N2K backbone. Trident will have a CALL button on target detail cards. Flow: tap Call → confirm MMSI → Trident sends PGN 129808 → NGX-1 → N2K → GX1850 initiates DSC individual call. If the radio doesn't accept the command, the button degrades to showing the MMSI in large digits for manual dialing. Verify during Phase 3.

## Keeply Integration
Trident is the hardware arm of Keeply.boats. Sync service buffers voyage data (GPS track, anchorages, weather, AIS encounters, battery patterns) to SQLite on Pi, pushes to Supabase when Starlink is up. Long-term: any Signal K server → Keeply API endpoint. Build for one boat, prove the pipeline, then productize.

## What's Next
1. Pi hardware arrives June 12 — begin OpenPlotter / Signal K setup on laptop
2. Build Trident Radar view as production Next.js component (v4 prototype is the spec)
3. Order remaining hardware closer to August Mexico trip
4. Install BMV-712 on Irene (Phase 1, $0 hardware cost)

## Key Decisions Made This Session
- Actisense NGX-1-USB replaces retired NGT-1 (same Signal K compat, adds 0183↔N2K conversion)
- Flirc Pi case rejected (blocks GPIO) → Argon NEO 5 base + active cooler + relay HAT stack
- Pi 5 8GB retail is $175 (RAM crisis), not $95 — budget adjusted
- Bottom instrument bar removed from Radar — heading-only KPI at top
- Alert modal stripped to TCPA only — "how much time do I have" is the 2am question
- DSC calling added as a feature pending GX1850 hardware verification
- All nav bar controls sized for 44-48px touch targets (cold hands, tired, iPad)
- Display mode rotation implemented (head-up actually rotates the radar)
- Solo sailor design principle overrides feature density — calm until something demands attention
