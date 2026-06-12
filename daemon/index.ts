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
import type { CaptureState } from "../lib/capture/types";
import type { BoatState } from "../lib/types";
import { initState, advanceState, TICK_MS } from "../lib/simulate";
import { CaptureDb, defaultDbPath } from "./db";
import { connectSignalK, skStreamUrl } from "./sk";

const SIM = process.argv.includes("--sim");

const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

function main(): void {
  const dbPath = defaultDbPath();
  const db = new CaptureDb(dbPath);
  let capture: CaptureState = initCaptureState();

  log(`trident-capture starting · db=${dbPath} · mode=${SIM ? "SIM" : "LIVE"}`);

  // One BoatState → detect → persist. Shared by both sources.
  const ingest = (boat: BoatState): void => {
    const r = detectCapture(capture, boat, randomUUID);
    capture = r.state;
    if (r.passageOp) log(`passage opened ${r.passageOp.id}`);
    for (const e of r.events) {
      log(`event ${e.type}${e.contactId ? ` ${e.contactId}` : ""}${e.meta ? ` ${JSON.stringify(e.meta)}` : ""}`);
    }
    if (r.point || r.events.length || r.passageOp) db.commit(r);
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
    db.close();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
