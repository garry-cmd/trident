// Local SQLite buffer for captured data. Append-only (passages also get an
// ended_ts column for a future close, but v1 never writes it). WAL + NORMAL so
// an abrupt boat power-cut can't corrupt the file. This is the durable record;
// the in-memory CaptureState is just the running detector context.
//
// The DB lives OUTSIDE the repo (default ~/trident-data/capture.db) so a
// `git pull && build:static` on the Pi never touches captured data. Override
// with TRIDENT_CAPTURE_DB.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CaptureEvent, PassageOp, TrackPoint } from "../lib/capture/types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS passages (
  id         TEXT PRIMARY KEY,
  started_ts INTEGER NOT NULL,
  start_lat  REAL NOT NULL,
  start_lon  REAL NOT NULL,
  ended_ts   INTEGER
);
CREATE TABLE IF NOT EXISTS track_points (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  passage_id TEXT,
  ts         INTEGER NOT NULL,
  lat        REAL NOT NULL,
  lon        REAL NOT NULL,
  sog        REAL NOT NULL,
  cog        REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_track_passage_ts ON track_points (passage_id, ts);
CREATE TABLE IF NOT EXISTS capture_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  passage_id TEXT,
  ts         INTEGER NOT NULL,
  type       TEXT NOT NULL,
  contact_id TEXT,
  meta       TEXT
);
CREATE INDEX IF NOT EXISTS ix_events_ts ON capture_events (ts);
`;

export function defaultDbPath(): string {
  return process.env.TRIDENT_CAPTURE_DB ?? join(homedir(), "trident-data", "capture.db");
}

export class CaptureDb {
  private db: Database.Database;
  private insPassage;
  private insPoint;
  private insEvent;

  constructor(path: string = defaultDbPath()) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(SCHEMA);

    this.insPassage = this.db.prepare(
      "INSERT OR IGNORE INTO passages (id, started_ts, start_lat, start_lon) VALUES (@id, @started_ts, @start_lat, @start_lon)",
    );
    this.insPoint = this.db.prepare(
      "INSERT INTO track_points (passage_id, ts, lat, lon, sog, cog) VALUES (@passage_id, @ts, @lat, @lon, @sog, @cog)",
    );
    this.insEvent = this.db.prepare(
      "INSERT INTO capture_events (passage_id, ts, type, contact_id, meta) VALUES (@passage_id, @ts, @type, @contact_id, @meta)",
    );
  }

  openPassage(op: PassageOp): void {
    this.insPassage.run({ id: op.id, started_ts: op.ts, start_lat: op.lat, start_lon: op.lon });
  }

  addPoint(p: TrackPoint): void {
    this.insPoint.run({ passage_id: p.passageId, ts: p.ts, lat: p.lat, lon: p.lon, sog: p.sog, cog: p.cog });
  }

  addEvent(e: CaptureEvent): void {
    this.insEvent.run({
      passage_id: e.passageId ?? null,
      ts: e.ts,
      type: e.type,
      contact_id: e.contactId ?? null,
      meta: e.meta ? JSON.stringify(e.meta) : null,
    });
  }

  // One transaction per BoatState — all-or-nothing, and far faster under WAL.
  commit(result: { point?: TrackPoint; events: CaptureEvent[]; passageOp?: PassageOp }): void {
    const tx = this.db.transaction(() => {
      if (result.passageOp) this.openPassage(result.passageOp);
      if (result.point) this.addPoint(result.point);
      for (const e of result.events) this.addEvent(e);
    });
    tx();
  }

  counts(): { passages: number; points: number; events: number } {
    const one = (sql: string) => (this.db.prepare(sql).get() as { n: number }).n;
    return {
      passages: one("SELECT COUNT(*) n FROM passages"),
      points: one("SELECT COUNT(*) n FROM track_points"),
      events: one("SELECT COUNT(*) n FROM capture_events"),
    };
  }

  close(): void {
    this.db.close();
  }
}
