// Default settings + option lists. Pure config, no React.
// Single source of truth for ranges + alert thresholds shared across the app.
import type { DisplayMode, Thresholds } from "./types";

export const DEFAULT_RANGE = 3; // nm

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

export const TIMER_OPTIONS = [5, 10, 15, 20, 30]; // minutes

// Depth read-out unit. The model stores metres (Signal K native); this only
// picks how it's shown. lib/units.ts does the conversion.
export const DEPTH_UNITS: { v: "ft" | "m"; l: string }[] = [
  { v: "ft", l: "Feet" },
  { v: "m", l: "Metres" },
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
  { key: "guardNm", label: "Guard zone", desc: "Ring radius drawn on the radar", unit: "nm", min: 0.5, max: 6, step: 0.5 },
  { key: "tcpaAlert", label: "TCPA alert", desc: "Alarm when a closing target is this many minutes from CPA", unit: "min", min: 1, max: 30, step: 1 },
];

export const DEFAULT_SETTINGS = {
  displayMode: "head-up" as DisplayMode,
  filterRange: DEFAULT_RANGE,
  viewRange: DEFAULT_RANGE,
  paused: false,
  nightMode: false,
  alarmEnabled: true,
  depthUnit: "ft" as "ft" | "m",
  thresholds: DEFAULT_THRESHOLDS,
};
