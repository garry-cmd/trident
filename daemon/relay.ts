// Relay GPIO output for the horn — the daemon's I/O shell for the safety-floor
// alarm. The pure WHEN-to-sound logic is lib/capture/relay.ts (hornState); this
// file owns HOW: the BCM pin, the active-low polarity, and the actual GPIO poke.
//
// Hardware (bench-verified — see HARDWARE.md): Seengreat 3-CH HAT, opto-isolated,
// ACTIVE-LOW. Driving the pin LOW energizes the relay (closes NO → horn sounds);
// HIGH de-energizes (silent). CH1 = BCM26. The board's own input pull holds the
// line de-energized through boot, so HIGH is the safe idle.
//
// Driver: shells out to `pinctrl` (ships with Pi OS, works on the Pi 5 RP1 today,
// no native module to compile or version-match against Bookworm's libgpiod).
// pinctrl writes the pin register and the level PERSISTS after the process exits
// (we relied on exactly this during the bench polarity test). Horn transitions
// are rare — a hazard onset/clear — so a per-change exec is fine. The interface
// is injectable so the bench/tests run without touching real GPIO.
import { execFileSync } from "node:child_process";

export const HORN_PIN_DEFAULT = 26; // BCM — Seengreat CH1
const ACTIVE_LOW = true; // energize on LOW (bench-confirmed)

const ON_LEVEL = ACTIVE_LOW ? "dl" : "dh"; // energized / horn sounding
const OFF_LEVEL = ACTIVE_LOW ? "dh" : "dl"; // de-energized / silent (safe idle)

export interface RelayDriver {
  set(on: boolean): void; // on = energize = horn sounds
  close(): void; // drive to safe-off and release
}

// Real GPIO via pinctrl. Claims the pin at safe-off in the constructor so there
// is no LOW glitch between claiming the line and the first deliberate set().
export class PinctrlRelay implements RelayDriver {
  private last: boolean | null = null;
  constructor(private readonly pin: number = HORN_PIN_DEFAULT) {
    this.drive(OFF_LEVEL); // safe idle before anything else (throws if pinctrl absent)
  }
  set(on: boolean): void {
    if (on === this.last) return; // edge-triggered; no redundant pokes
    this.drive(on ? ON_LEVEL : OFF_LEVEL);
    this.last = on;
  }
  close(): void {
    this.drive(OFF_LEVEL);
  }
  private drive(level: string): void {
    execFileSync("pinctrl", ["set", String(this.pin), "op", level]);
  }
}

// No-GPIO driver for runs without the HAT or with the horn disabled (--no-horn).
// Does nothing — index.ts logs horn transitions regardless, so the pipeline
// stays observable without a relay attached.
export class NoopRelay implements RelayDriver {
  set(): void {}
  close(): void {}
}

// Pick a driver. enabled=false (or pinctrl unavailable, e.g. running off-Pi)
// degrades to the no-op so the daemon still runs and logs.
export function makeRelay(
  enabled: boolean,
  pin: number,
  log: (m: string) => void,
): RelayDriver {
  if (!enabled) {
    log(`horn: disabled (--no-horn) — detector still logs hazards`);
    return new NoopRelay();
  }
  try {
    const r = new PinctrlRelay(pin);
    log(`horn: armed on BCM${pin} (active-low, idle HIGH)`);
    return r;
  } catch (e) {
    log(`horn: pinctrl unavailable (${(e as Error).message}) — log-only`);
    return new NoopRelay();
  }
}
