// Shared data shapes for the whole app.

export type ThreatLevel = "safe" | "caution" | "danger";
// Threat-level display filter. "all" shows everything; "caution" shows
// caution+danger; "danger" shows danger only. Each mode shows its level AND
// everything more dangerous, so a danger target can never be filtered out.
export type LevelFilter = "all" | "caution" | "danger";
export type DisplayMode = "head-up" | "course-up" | "north-up";

// ── Canonical world model (lat/lon native) ──────────────────────────────────
// What both the simulator and the live Signal K client emit. The radar's
// bearing/range view is derived from this (lib/state.ts), so the data source
// can swap with no change downstream.
export interface LatLon {
  lat: number; // deg
  lon: number; // deg
}

export interface SelfState {
  position: LatLon;
  cog: number; // deg true
  sog: number; // kt
  heading: number; // deg true
  depth: number; // depth below transducer (Signal K native unit)
}

export interface Contact {
  id: string; // MMSI in production
  name: string; // "" if unknown
  type: string; // class / vessel type label
  aton: boolean; // Aid to Navigation (stationary)
  position: LatLon;
  cog: number; // deg true
  sog: number; // kt
}

export interface BoatState {
  self: SelfState;
  contacts: Contact[];
  source: "sim" | "live"; // drives the SIM badge — never claim live when sim
  ts: number; // ms epoch of last update
}

// User-tunable alert thresholds. Live (set in Settings), injected into the
// pure CPA functions so a bug or a tweak has one path, not many.
export interface Thresholds {
  cpaCaution: number; // nm — amber band
  cpaDanger: number; // nm — red band + alarm
  guardNm: number; // nm — guard ring radius
  tcpaAlert: number; // min — alarm when a closing target is this near CPA
}

export interface OwnVessel {
  sog: number; // kt
  cog: number; // deg true
  heading: number; // deg true
  depth: number; // m
}

// A raw target as it would arrive from AIS: absolute course/speed only.
// Relative motion is derived against own vessel — never stored on the source.
export interface Target {
  id: string; // MMSI in production
  name: string; // "" if unknown
  type: string; // class / vessel type label
  brg: number; // bearing from own (deg true)
  dist: number; // range from own (nm)
  cog: number; // course over ground (deg true)
  sog: number; // speed over ground (kt)
  aton: boolean; // Aid to Navigation (stationary)
}

// A target enriched for display: relative position + velocity (screen frame:
// x = East, y = -North), CPA/TCPA, and threat level.
export interface EnrichedTarget extends Target {
  rx: number;
  ry: number;
  vx: number;
  vy: number;
  cpa: number; // nm
  tcpa: number; // min
  level: ThreatLevel;
}

// ── Systems / environment telemetry (beyond the AIS/nav model) ──────────────
// Each block is null until its sensor exists — gated in the UI, never faked in
// the default view. DEMO mode (?demo=1) synthesizes them; the live client will
// fold the matching Signal K paths here when the Cerbo / NGX-1 are installed.
export interface BatteryTelemetry { soc: number; voltage: number; current: number; timeToGoMin: number | null; }
export interface SolarTelemetry { watts: number; yieldAh: number; }
export interface ShoreTelemetry { connected: boolean; amps: number; }
export interface BaroTelemetry { mb: number; trend3h: number; history: number[]; }
export interface WindTelemetry { speedKt: number; dirDeg: number; backing: boolean; }
export interface PiTelemetry { cpuTempC: number; loadPct: number; ramPct: number; diskFreePct: number; undervolt: boolean; }
export interface GpsTelemetry { sats: number; hdop: number; }
export interface VhfTelemetry { channel: string; dscWatch: boolean; }
export interface AutopilotTelemetry { engaged: boolean; targetHdg: number; rudderDeg: number; }

export interface Telemetry {
  battery: BatteryTelemetry | null;
  solar: SolarTelemetry | null;
  shore: ShoreTelemetry | null;
  engineChargeA: number | null;
  loadsA: number | null;
  baro: BaroTelemetry | null;
  wind: WindTelemetry | null;
  airTempC: number | null;
  seaTempC: number | null;
  pi: PiTelemetry | null;
  gps: GpsTelemetry | null;
  vhf: VhfTelemetry | null;
  autopilot: AutopilotTelemetry | null;
  depthM: number | null;
}
