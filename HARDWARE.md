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
| SBC | Raspberry Pi 5, 8GB | in hand, running | headless, `trident.local` |
| Cooling | **Official Raspberry Pi 5 Active Cooler** | in hand, **stays ON** | clips to the SoC, 4-pin fan header. This *is* the cooling. |
| Relay | **Seengreat 3-CH Relay HAT** | in hand | HF3FF/005-1ZS relays (15.5mm tall), board 65 × 56mm, opto-isolated (LTV-357T-B-IN). Drives the horn. |
| microSD | SanDisk High Endurance 256GB | in hand, **flashed & running** | do NOT re-image on reassembly |
| Enclosure | **KKSB Tall Aluminum Enclosure for Dual HATs & NVMe HATs** | **on order** | ships the tall 40-pin stackable header + 18/20mm M2.5 spacers |
| Boat power | PlusRoc 12V→5V 25W USB-C converter | in hand | boat 12V → Pi 5V (bench uses any USB-C PD charger) |
| Alarm horn | 12V marine horn | **not ordered** | one relay channel drives it; order before wiring the relay |

**Retired / spare**
- **Argon NEO 5 M.2 case** — original enclosure, retired for this build. Its cooling
  lives in the *removable top cover*, which has to come off for the HAT, leaving no
  cooling — and it can't close over a HAT anyway. Keep as a spare bare-Pi case.

**Boat-install parts (order closer to the Mexico trip)**
Actisense NGX-1-USB, Victron Cerbo GX MK2, 3× VE.Direct cables, N2K T-connector + drop,
Peplink BR1 Mini LTE, wire / fuses / terminals.

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

- **Polarity:** these opto-isolated boards are typically **active-low** (drive the pin
  LOW to energise / close the NO contact) — confirm against the Seengreat demo code
  before wiring.
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

---

## Physical Build — What's Next

1. **KKSB Tall case arrives** → assemble the stack above, close it up, wall-mount.
2. **Order the 12V horn** + wire / fuses / terminals before any relay wiring.
3. **Boat install:** NGX-1, Cerbo, Peplink, and the relay → horn wiring.
