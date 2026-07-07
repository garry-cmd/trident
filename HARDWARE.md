# HARDWARE.md — Trident Physical Build

The physical build of the Trident box: exact parts, how it assembles, and the
decisions already settled so we **don't re-derive them every session**. Companion
to `CONTEXT.md` (which owns the software/app state). Read both at session start.

> The box is a headless **Raspberry Pi 5** server running Signal K + Caddy, serving
> the Trident app at `http://trident.local`. Full software/box state (OS, services,
> reboot survival, access) lives in `CONTEXT.md` → "Pi Box — As Built". This file is
> the **hardware** side only.

---

## Bill of Materials

| Part | Exact model | Status | Notes |
|------|-------------|--------|-------|
| SBC | Raspberry Pi 5, 8GB | in hand, running | headless, `trident.local`; SK + `signalk-rpi-monitor` running — **verified serving live system-health** (CPU/GPU temp, CPU/mem/SD utilisation) to the Dash |
| Cooling | **Official Raspberry Pi 5 Active Cooler** | in hand, **stays ON** | clips to the SoC, 4-pin fan header. This *is* the cooling. |
| Relay | **Seengreat 3-CH Relay HAT** | in hand, **mounted** | HF3FF/005-1ZS relays (15.5mm tall), board 65 × 56mm, opto-isolated (LTV-357T-B-IN). Drives the horn. Bench-verified active-low + boot-safe (session 9). |
| microSD | SanDisk High Endurance 256GB | in hand, **flashed & running** | do NOT re-image on reassembly |
| Enclosure | **KKSB Tall Aluminum Enclosure for Dual HATs & NVMe HATs** | **in hand, assembled** | stack built & cased up (session 9); ships the tall 40-pin stackable header + 18/20mm M2.5 spacers |
| Boat power | PlusRoc 12V→5V 25W USB-C converter | in hand | boat 12V → Pi 5V (bench uses any USB-C PD charger) |
| Bench sounder | **Icstation 12V active piezo buzzer (100 dB)** | **in hand** | bench alarm on relay CH1 — wiring below. Continuous-tone active piezo (the relay does the switching) |
| Boat sounder | Splash-resistant 12V marine **panel-mount** buzzer | **not ordered** | replaces the bench piezo at boat install; order before the Mexico trip |
| Display | **iPad (base, WiFi)** | **in hand** | the watch surface at the helm/nav station; kiosk PWA setup pending (What's Next #5) |

**Retired / spare**
- **Argon NEO 5 M.2 case** — original enclosure, retired for this build. Its cooling
  lives in the *removable top cover*, which has to come off for the HAT, leaving no
  cooling — and it can't close over a HAT anyway. Keep as a spare bare-Pi case.

**Boat-install parts (order NOW — trip is ~6 weeks out; Actisense stock is the long pole)**
Splash-resistant marine panel-mount buzzer, 12V wire / inline fuse holders + fuses / spade
terminals for the horn run. DECIDE this trip vs next: Actisense NGX-1-USB, Victron Cerbo GX
MK2, 3× VE.Direct cables, N2K T-connector + drop. Later: Peplink BR1 Mini LTE.

**Bench shopping (for the sounder chain, this week)**
12V wall adapter ≥1A, inline fuse holder + 2A fuse, hookup wire, spade terminals.

---

## The Stack — how it physically assembles

Bottom to top, all inside the KKSB Tall case:

1. KKSB case base — Pi screwed to the floor standoffs
2. Raspberry Pi 5
3. **Official Active Cooler** on the SoC — clipped into the two board holes, fan lead
   into the dedicated 4-pin fan header (NOT GPIO — GPIO stays free for the HAT)
4. **Tall 40-pin stackable header** (KKSB-supplied) pressed onto the GPIO — raises the
   connection up so it clears the cooler
5. **Seengreat Relay HAT** seated on the KKSB 18/20mm spacers and the raised header
6. Lid on; wall-mount through the case's bottom keyholes

The Active Cooler is the *only* cooling — the case is passive aluminum, no fan of its own.

> **Built (session 9):** this stack is assembled and cased up — Pi + Active Cooler + tall
> stackable header + Seengreat HAT inside the KKSB Tall, lid on. Wall-mount still pending a spot.

---

## Settled Decisions (do not relitigate)

- **Cooling = official Active Cooler, ON.** The case has no fan; the Active Cooler cools
  the SoC. (The "use a case fan / shelve the Active Cooler" idea is wrong — the only
  case with its own fan was the NEO 5, whose fan + heatsink live in the top cover you
  remove for the HAT.)
- **Enclosure = KKSB Tall** — not the standard KKSB, not the NEO 5. The Seengreat's
  relays are 15.5mm tall; mounted on the case's 20mm spacers over the cooler, the board
  top sits ~37mm above the Pi (dual-HAT height). The standard KKSB is for low-profile
  HATs (NVMe/PoE) and won't close; the NEO 5 can't close over a HAT and loses its cooling
  with the top off.
- **The HAT stacks on the GPIO header.** It's a HAT — it does *not* get jumper-wired or
  panel-mounted separately. The KKSB Tall ships the correct tall stackable header + 18/20mm
  spacers, which is what makes it seat over the cooler.
- **Relay HAT is functionally deferred until the horn is ordered** — it only drives the
  12V horn. Mount it when the case lands; wire it at boat install.

---

## Clearance Math (so we don't recompute)

- Official Active Cooler ≈ 15mm tall on the SoC.
- Stock GPIO pins are 8.5mm — too short to reach a HAT raised over a 15mm cooler, so a
  **tall stackable header is mandatory** (KKSB Tall ships one). This was the bench snag:
  generic/stock standoffs were the wrong length and the stock pins couldn't reach.
- Seengreat relay HF3FF/005-1ZS = 19 × 15.2 × **15.5mm** tall.
- HAT on 20mm spacers + PCB + relay ≈ **37mm** above the Pi board → needs the Tall case.

---

## Relay Wiring Reference (for the horn — boat install)

Pinout (BCM), opto-isolated:

| Channel | Pi GPIO (BCM) |
|---------|---------------|
| CH1 | GPIO26 |
| CH2 | GPIO19 |
| CH3 | GPIO13 |

- **Polarity: CONFIRMED active-low (bench, session 9).** Drive the pin LOW to energise
  (close the NO contact → horn sounds); HIGH de-energises (silent). Verified via the
  per-channel status LED (lit only at LOW). The driver in `daemon/relay.ts` encodes this.
- **Power:** the board runs off 5V from the GPIO header; a single relay's draw is
  negligible for the Pi 5.
- **Horn on one channel (e.g. CH1):** 12V+ → fuse → relay **COM**; relay **NO** → horn +;
  horn − → 12V ground. NO = off until triggered.

> Pinout note: Seengreat is **26 / 19 / 13** — NOT the Waveshare 26 / 20 / 21. Confirm
> against the board silkscreen before coding.

---

## Gotchas Banked

- microSD is flashed and running — **don't re-image** when reassembling into the new case.
- **One cooler on the SoC:** the Active Cooler and any self-cooling case (NEO 5) are
  mutually exclusive.
- Don't try to stack the HAT on stock standoffs/pins over the Active Cooler — you need a
  tall stackable header (the wrong-length generic standoffs were the bench snag).
- The Pi's USB-C port is power-only — the Mac never sees the Pi over it; use
  `ssh garry@trident.local`.
- **Relay is boot-safe (bench, session 9):** at power-on the GPIO sits input + pull-down
  (LOW), but the board's own input pull to 3V3 dominates → the relay stays **de-energized**
  through boot. No self-energize, no boot chirp, **no pull-up resistor needed**. (Confirmed:
  status LED dark with the pin in `ip pd`.) The daemon still claims the line at HIGH on
  start to avoid any claim-time glitch.
- **No polarity jumper exists.** The board's only header besides the 40-pin is the 3×2
  **GPIO-select** header (maps GPIO → channel); active-low is hardwired in the opto stage.

---

## Physical Build — What's Next

1. ~~KKSB Tall case arrives → assemble the stack~~ **DONE (session 9)** — stack assembled,
   cased up. (Wall-mount through the bottom keyholes still pending a mounting spot.)
2. **Order the 12V horn** + wire / fuses / terminals before any relay wiring. The horn
   *software* layer is built & bench-proven — only the physical horn + 12V wiring remain.
3. **Boat install:** NGX-1, Cerbo, Peplink, and the relay → horn wiring (CH1 / BCM26, active-low).

---

## Bench Sounder Wiring — CH1 (session 11 plan; wire + prove this week)

The Icstation piezo is an *active* buzzer: give it 12 V and it screams; the relay
does the switching. CH1 = BCM26, already bench-proven active-low + boot-safe.

```
12V+ (wall adapter) ──> inline fuse (2A) ──> CH1 COM
CH1 NO  ──> buzzer +  (red)
buzzer − (black) ──> 12V ground (adapter −)
```

Test: `cd ~/trident/daemon && npm run sim` — the sim's seeded CPA danger closes the
relay → buzzer sounds; releases as the target opens; Ctrl-C de-energizes. The boat
install swaps in the marine panel-mount buzzer on the same run (12V+ from the panel
via its own fuse).

---

## Box Access & Identity (settled 2026-07-06)

- **SSH:** passwordless from the Mac — ed25519 key installed via `ssh-copy-id`
  (`ssh garry@trident.local`). Claude Code drives the Pi non-interactively with it
  (pull/rebuild/restart are one instruction).
- **Signal K admin:** user recreated 2026-07-06 (the old `security.json` was reset —
  original credentials were lost). Credentials are Garry's; needed for the admin UI
  (Server → Data Connections / Settings).
- **Vessel MMSI:** Irene's real MMSI is set in SK's vessel settings (kept out of this
  public repo). **Invariant:** anything transmitting own-ship VDO at Signal K — the
  real Vesper or the replay harness (`--own-mmsi`) — must use that same MMSI, or SK
  files own-ship as a separate vessel and the scope grows a phantom Irene.
