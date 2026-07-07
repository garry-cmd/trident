// Minimal typing for @signalk/nmea0183-signalk (ships untyped). Only what the
// replay round-trip tests use: construct, parse one sentence, get back a
// Signal K delta (or null while a multi-part message is still assembling).
declare module "@signalk/nmea0183-signalk" {
  interface ParsedDelta {
    context?: string;
    updates?: { values?: { path: string; value: unknown }[] }[];
  }
  export default class Parser {
    parse(sentence: string): ParsedDelta | null;
  }
}
