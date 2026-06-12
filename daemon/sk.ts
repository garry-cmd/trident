// Signal K source for the daemon. The Node analog of lib/signalk.ts connect():
// it reuses the SAME pure applyDelta() (already unit-tested against recorded
// deltas) and adds what a months-at-sea daemon needs that a browser tab doesn't
// — the `ws` package (Node 20 has no stable global WebSocket) and automatic
// reconnect with backoff when Signal K or the boat WiFi blips.
import WebSocket from "ws";
import { applyDelta, emptyLiveState, type SKDelta } from "../lib/signalk";
import type { BoatState } from "../lib/types";

// Subscribe to everything so AIS contacts + AtoN arrive, not just navigation.
export function skStreamUrl(host = "localhost", port = 3000): string {
  return `ws://${host}:${port}/signalk/v1/stream?subscribe=all`;
}

export interface SkOptions {
  url?: string;
  onState: (s: BoatState) => void;
  onStatus?: (msg: string) => void; // connection lifecycle, for the journal
}

const MIN_BACKOFF = 1000;
const MAX_BACKOFF = 30_000;

// Returns a stop() that tears the connection down and halts reconnects.
export function connectSignalK(opts: SkOptions): () => void {
  const url = opts.url ?? skStreamUrl();
  let state = emptyLiveState();
  let ws: WebSocket | null = null;
  let backoff = MIN_BACKOFF;
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const status = (m: string) => opts.onStatus?.(m);

  const open = () => {
    if (stopped) return;
    ws = new WebSocket(url);

    ws.on("open", () => {
      backoff = MIN_BACKOFF;
      status(`connected ${url}`);
    });

    ws.on("message", (data: WebSocket.RawData) => {
      let delta: SKDelta;
      try {
        delta = JSON.parse(data.toString()) as SKDelta;
      } catch {
        return;
      }
      if (!delta.updates) return; // hello / meta frames carry no values
      state = applyDelta(state, delta);
      opts.onState(state);
    });

    ws.on("close", () => {
      if (stopped) return;
      status(`disconnected — retrying in ${backoff}ms`);
      timer = setTimeout(open, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF);
    });

    // 'error' is followed by 'close'; let close own the reconnect.
    ws.on("error", (e: Error) => status(`socket error: ${e.message}`));
  };

  open();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}
