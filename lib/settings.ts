// Default settings + option lists. Pure config, no React.
// Single source of truth for ranges + alert thresholds shared across the app.
import type { DisplayMode, LevelFilter, Thresholds } from "./types";

export const DEFAULT_RANGE = 3; // nm

// Dash — AIS/nav feed freshness bands (seconds). A feed that stops updating
// means the collision watch is blind, so this is a real live-today alarm signal.
export const FEED_STALE_SEC = 15;
export const FEED_LOST_SEC = 60;

// Anchor watch — drag-alarm radius default + stepper bounds (metres).
export const DEFAULT_ANCHOR_RADIUS_M = 40;
export const ANCHOR_RADIUS_BOUNDS = { min: 10, max: 150, step: 5 };

export const DISPLAY_MODES: { v: DisplayMode; l: string }[] = [
  { v: "head-up", l: "HDG UP" },
  { v: "course-up", l: "CRS UP" },
  { v: "north-up", l: "N UP" },
];

export const FILTER_OPTIONS: { v: number; l: string }[] = [
  { v: 1, l: "\u22641nm" },
  { v: 2, l: "\u22642nm" },
  { v: 3, l: "\u22643nm" },
  { v: 6, l: "ALL" },
];

// Threat-level filter — declutters scope, list, and the count to the levels you
// care about. Each option shows its level and everything more dangerous.
export const LEVEL_FILTER_OPTIONS: { v: LevelFilter; l: string }[] = [
  { v: "all", l: "All" },
  { v: "caution", l: "Watch +" },
  { v: "danger", l: "Danger" },
];

export const TIMER_OPTIONS = [5, 10, 15, 20, 30]; // minutes

// Depth read-out unit. The model stores metres (Signal K native); this only
// picks how it's shown. lib/units.ts does the conversion.
export const DEPTH_UNITS: { v: "ft" | "m"; l: string }[] = [
  { v: "ft", l: "Feet" },
  { v: "m", l: "Metres" },
];

// Display theme. Day = sun-readable light; Dusk = the dark base; Night =
// red-on-black for dark adaptation. Default Day — the boat is used mostly in
// daylight, where the dark theme is unreadable.
export const THEME_OPTIONS: { v: "day" | "dusk" | "night"; l: string }[] = [
  { v: "day", l: "Day" },
  { v: "dusk", l: "Dusk" },
  { v: "night", l: "Night" },
];

// Alert thresholds — the defaults that lib/ais.ts falls back to and that
// Settings starts from. Changing one here changes the whole app's defaults.
export const DEFAULT_THRESHOLDS: Thresholds = {
  cpaCaution: 1.0, // nm
  cpaDanger: 0.5, // nm
  guardNm: 2, // nm
  tcpaAlert: 6, // min
};

// Per-threshold UI bounds for the Settings steppers. Order here is render order.
export const THRESHOLD_FIELDS: {
  key: keyof Thresholds;
  label: string;
  desc: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "cpaCaution", label: "CPA caution", desc: "Amber band — target getting close", unit: "nm", min: 0.5, max: 3, step: 0.1 },
  { key: "cpaDanger", label: "CPA danger", desc: "Red band — fires the collision alarm", unit: "nm", min: 0.1, max: 1.5, step: 0.1 },
  { key: "tcpaAlert", label: "TCPA alert", desc: "Alarm when a closing target is this many minutes from CPA", unit: "min", min: 1, max: 30, step: 1 },
];

// ── Alarm / watch thresholds, grouped by domain ─────────────────────────────
// Every threshold is real persisted config — a rule the app WILL apply. A group
// is "active" when its sensor is reporting (the rule fires now); otherwise it's
// saved and arms itself the moment the sensor is connected. Never faked: an
// inactive group's status stays "off" until real data exists.
export const DEFAULT_ALARMS = {
  piTempCaution: 80,  // °C — CPU temp caution
  feedStaleSec: FEED_STALE_SEC,
  feedLostSec: FEED_LOST_SEC,
  battMinV: 12.2,     // V — bank low-voltage alarm
  battLowSoc: 30,     // % — state-of-charge caution
  baroFallCaution: 1.5, // mb/3h fall — caution
  baroFallDanger: 4,    // mb/3h fall — alarm
};
export type AlarmKey = keyof typeof DEFAULT_ALARMS;

export interface AlarmField { key: AlarmKey; label: string; desc: string; unit: string; min: number; max: number; step: number; }
export interface AlarmGroup { domain: string; active: boolean; note: string; fields: AlarmField[]; }

export const ALARM_GROUPS: AlarmGroup[] = [
  {
    domain: "System", active: true,
    note: "Live — Pi health and the Signal K feed are reporting now",
    fields: [
      { key: "piTempCaution", label: "Pi over-temp caution", desc: "Amber when the Pi CPU reaches this temperature", unit: "\u00B0C", min: 60, max: 90, step: 1 },
      { key: "feedStaleSec", label: "Feed stale after", desc: "Amber when no Signal K data arrives for this long", unit: "s", min: 5, max: 60, step: 5 },
      { key: "feedLostSec", label: "Feed lost alarm", desc: "Red when the feed is silent this long — the watch is blind", unit: "s", min: 20, max: 300, step: 10 },
    ],
  },
  {
    domain: "Power", active: false,
    note: "Saved — arms when the Victron Cerbo GX is connected",
    fields: [
      { key: "battMinV", label: "Battery low-voltage alarm", desc: "Red alarm when bank voltage drops below this", unit: "V", min: 11, max: 13, step: 0.1 },
      { key: "battLowSoc", label: "Battery low-charge caution", desc: "Amber when state of charge falls below this", unit: "%", min: 10, max: 60, step: 5 },
    ],
  },
  {
    domain: "Weather", active: false,
    note: "Saved — arms when the NGX-1 barometer is connected",
    fields: [
      { key: "baroFallCaution", label: "Barometer fall — caution", desc: "Amber when pressure falls at least this much over 3 h", unit: "mb", min: 0.5, max: 5, step: 0.5 },
      { key: "baroFallDanger", label: "Barometer fall — alarm", desc: "Red when the 3 h fall reaches this", unit: "mb", min: 2, max: 10, step: 0.5 },
    ],
  },
];

// Flat list for clamping/persistence. Fencing rules (lost>stale, danger>=caution
// fall) live in fenceAlarms below, used by both useSettings and persist sanitize,
// mirroring the CPA-band fencing.
export const ALARM_FIELDS: AlarmField[] = ALARM_GROUPS.flatMap((g) => g.fields);

// Keep alarm bands self-consistent so a 2am fat-finger can't invert them: the
// lost timeout must exceed the stale one, and the danger fall must be at least
// the caution fall.
export function fenceAlarms(a: typeof DEFAULT_ALARMS): typeof DEFAULT_ALARMS {
  const out = { ...a };
  if (out.feedLostSec <= out.feedStaleSec) out.feedLostSec = out.feedStaleSec + 5;
  if (out.baroFallDanger < out.baroFallCaution) out.baroFallDanger = out.baroFallCaution;
  return out;
}

export const DEFAULT_SETTINGS = {
  displayMode: "head-up" as DisplayMode,
  filterRange: DEFAULT_RANGE,
  levelFilter: "all" as LevelFilter,
  viewRange: DEFAULT_RANGE,
  paused: false,
  theme: "day" as "day" | "dusk" | "night",
  alarmEnabled: true,
  depthUnit: "ft" as "ft" | "m",
  thresholds: DEFAULT_THRESHOLDS,
  alarms: DEFAULT_ALARMS,
};
