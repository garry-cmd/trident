// Trident capture daemon — headless. Subscribes to Signal K, folds each delta
// into a canonical BoatState (reusing the app's pure applyDelta), runs the pure
// capture detector, and persists the result to the local SQLite buffer. Append-
// only; no UI; the only output besides the DB is lifecycle logging to the
// systemd journal.
//
//   tsx index.ts          → live: connect to Signal K at localhost:3000
//   tsx index.ts --sim    → bench: drive the simulator instead (no Pi/Vesper
//                           needed) to prove the source→detect→DB pipeline
//
// DB path: $TRIDENT_CAPTURE_DB or ~/trident-data/capture.db (outside the repo).
import { randomUUID } from "node:crypto";
import { detectCapture, initCaptureState } from "../lib/capture/detect";
import { hornState } from "../lib/capture/relay";
import type { CaptureState } from "../lib/capture/types";
import type { BoatState } from "../lib/types";
import { initState, advanceState, TICK_MS } from "../lib/simulate";
import { CaptureDb, defaultDbPath } from "./db";
import { connectSignalK, skStreamUrl } from "./sk";
import { makeRelay, HORN_PIN_DEFAULT } from "./relay";

const SIM = process.argv.includes("--sim");
// Horn is the safety floor — armed by default. `--no-horn` runs the pipeline
// silently (bench/dev). TRIDENT_HORN_PIN overrides the BCM channel.
const HORN = !process.argv.includes("--no-horn");
const HORN_PIN = Number(process.env.TRIDENT_HORN_PIN) || HORN_PIN_DEFAULT;

const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

function main(): void {
  const dbPath = defaultDbPath();
  const db = new CaptureDb(dbPath);
  let capture: CaptureState = initCaptureState();

  log(`trident-capture starting · db=${dbPath} · mode=${SIM ? "SIM" : "LIVE"}`);

  const relay = makeRelay(HORN, HORN_PIN, log);
  let hornOn = false;

  // One BoatState → detect → persist → drive the horn. Shared by both sources.
  const ingest = (boat: BoatState): void => {
    const r = detectCapture(capture, boat, randomUUID);
    capture = r.state;
    if (r.passageOp) log(`passage opened ${r.passageOp.id}`);
    for (const e of r.events) {
      log(`event ${e.type}${e.contactId ? ` ${e.contactId}` : ""}${e.meta ? ` ${JSON.stringify(e.meta)}` : ""}`);
    }
    if (r.point || r.events.length || r.passageOp) db.commit(r);

    // Safety-floor horn: edge-triggered off the detector's running state, so it
    // holds while a hazard persists and releases when it clears.
    const h = hornState(capture);
    if (h.on !== hornOn) {
      relay.set(h.on);
      log(`horn ${h.on ? `ON — ${h.reasons.join("+")}` : "off"}`);
      hornOn = h.on;
    }
  };

  let stop: () => void;

  if (SIM) {
    let state = initState();
    ingest(state);
    const iv = setInterval(() => {
      state = advanceState(state);
      ingest(state);
    }, TICK_MS);
    stop = () => clearInterval(iv);
  } else {
    stop = connectSignalK({
      url: skStreamUrl(),
      onState: ingest,
      onStatus: (m) => log(`signalk: ${m}`),
    });
  }

  const shutdown = (sig: string) => {
    log(`${sig} — flushing & closing (counts: ${JSON.stringify(db.counts())})`);
    stop();
    relay.close(); // de-energize the horn on the way out
    db.close();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
