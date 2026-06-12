# Trident Capture Daemon

Headless Signal K → local SQLite capture. Runs on the Pi alongside `signalk` and
`caddy`. Subscribes to Signal K, folds each delta into the canonical `BoatState`
(reusing the app's pure, unit-tested `applyDelta`), runs the pure capture
detector, and appends to a local SQLite buffer. No UI, no Node server for the
app — this is a separate, isolated process.

This is the Trident side of the Keeply convergence groundwork
(`INTEGRATION-TRIDENT.md` in the Keeply repo). It is **stack-independent of the
PowerSync decision** — it just fills the local buffer. When the sync layer lands,
it reads `track_points` through `downsample()` (already built + tested) and pushes
`capture_events` / `passages` whole.

## What it captures (v1)

| Record | Detector | Notes |
|--------|----------|-------|
| `passages` | underway-detected ⇒ originate with a client UUID | one open passage; **never auto-closed** in v1 (can't honestly tell "arrived" from "lunch hook") |
| `track_points` | every ~5s **while underway** | raw/hi-res, local-only; `downsample()` thins to ~1/min on sync |
| `capture_events` · `underway` / `stopped` | SOG crosses thresholds, sustained 30s (hysteresis) | |
| `capture_events` · `anchor_drag` | anchor ref auto-set on the underway→stop transition; fires when range exceeds ~50 m | re-arms when back inside |
| `capture_events` · `cpa` | a contact enters the **danger** CPA band (closing, AtoN excluded) | reuses the exact UI collision math at `DEFAULT_THRESHOLDS` |

**Deferred (honest):** `engine` events — reserved in the schema, no detector,
blocked on the NGX-1 (no N2K engine data yet).

## Run

```bash
cd ~/trident/daemon
npm install            # better-sqlite3 builds native — see note below
npm run sim            # bench: drive the simulator, no Pi/Vesper needed
npm start              # live: connect to Signal K at ws://localhost:3000
```

`npm run sim` is how you prove the source→detect→DB pipeline without being near
the boat — it logs passage/event lines and writes real rows.

### better-sqlite3 native build
Ships arm64 prebuilds, so `npm install` on the Pi normally needs **no** compiler.
If a prebuild is missing for the installed Node and it falls back to source:
```bash
sudo apt install -y build-essential python3
```
The Pi runs Node 20; that's the supported target.

## Install as a service

```bash
sudo cp ~/trident/daemon/trident-capture.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now trident-capture
journalctl -u trident-capture -f
```

Edit `User=`/paths in the unit if the repo isn't at `/home/garry/trident`. It
restarts on crash and reconnects to Signal K on its own (backoff to 30s), so the
ordering against `signalk.service` is best-effort, not required.

## Data location

Default `~/trident-data/capture.db` — **outside the repo**, so `git pull` and
`npm run build:static` never touch captured data. Override with
`TRIDENT_CAPTURE_DB` (the systemd unit sets it explicitly). SQLite runs in WAL
mode with `synchronous=NORMAL` so an abrupt boat power-cut won't corrupt it.

Inspect:
```bash
sqlite3 ~/trident-data/capture.db \
  "SELECT type, COUNT(*) FROM capture_events GROUP BY type;"
```

## Layout

```
daemon/
  index.ts     entrypoint — source → detect → persist; --sim flag
  sk.ts        Node Signal K WS client (ws + reconnect) over the shared applyDelta
  db.ts        SQLite schema + append-only writers (better-sqlite3)
  tsconfig.json / package.json   isolated — never part of the Vercel app build
```

The detection logic is **not** here — it's pure and lives in `../lib/capture/`
(`detect.ts`, `downsample.ts`, `types.ts`) with vitest coverage in the root suite.
The daemon is just the I/O shell around it.
