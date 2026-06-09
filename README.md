# Trident

Raspberry Pi–based marine navigation, AIS watch, and power management platform for S/V Irene.

Replaces iPad/Navionics chartplotter, Vesper WatchMate AIS app, and Victron Bluetooth monitoring with a single always-on system at `http://trident.local`.

## Status

**Phase:** Production build underway — modular Radar live, Settings (Phase 2a) live, lat/lon data model + Signal K client built (sim feed; live swap is one line).  
**Target:** Deploy on Irene by August 24, 2026.

See [CONTEXT.md](CONTEXT.md) for current state.

## Stack

- Raspberry Pi 5 + OpenPlotter + Signal K
- Next.js / React / TypeScript PWA
- Actisense NGX-1-USB (NMEA 2000)
- Victron Cerbo GX MK2

## Docs

- `CONTEXT.md` — Current state, decisions, what's next
- `docs/trident-requirements-v2.html` — Full requirements & build spec
- `docs/trident-roadmap.html` — OKR roadmap
- `docs/trident-shopping-list.html` — Hardware with vendor links
- `docs/trident-radar-prototype.jsx` — Interactive Radar v4 prototype
- `docs/trident-full-mockup.html` — All 4 views mockup
