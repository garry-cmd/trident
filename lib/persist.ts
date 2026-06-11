// localStorage persistence for user settings. A pure, testable `sanitize`
// (no window access) plus thin window-guarded load/save wrappers.
//
// Only genuine preferences persist. `viewRange` is transient view state and
// `paused` must always boot live — you never want to reload at 2am and find
// the AIS feed frozen — so both are excluded on purpose.
import {
  DEFAULT_THRESHOLDS,
  THEME_OPTIONS,
  DEPTH_UNITS,
  DISPLAY_MODES,
  THRESHOLD_FIELDS,
} from "./settings";
import type { DisplayMode, Thresholds } from "./types";

export const STORAGE_KEY = "trident.settings.v1";

export interface PersistedSettings {
  displayMode: DisplayMode;
  filterRange: number;
  theme: "day" | "dusk" | "night";
  alarmEnabled: boolean;
  depthUnit: "ft" | "m";
  thresholds: Thresholds;
}

const has = <T extends { v: unknown }>(opts: T[], v: unknown) => opts.some((o) => o.v === v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Validate a raw parsed blob into a partial of known-good settings. Unknown,
// missing, malformed, or out-of-range values are dropped or clamped rather than
// trusted, so a corrupt or stale localStorage entry can never brick the app.
export function sanitize(raw: unknown): Partial<PersistedSettings> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<PersistedSettings> = {};

  if (has(DISPLAY_MODES, r.displayMode)) out.displayMode = r.displayMode as DisplayMode;
  if (has(THEME_OPTIONS, r.theme)) out.theme = r.theme as PersistedSettings["theme"];
  if (has(DEPTH_UNITS, r.depthUnit)) out.depthUnit = r.depthUnit as "ft" | "m";
  if (typeof r.alarmEnabled === "boolean") out.alarmEnabled = r.alarmEnabled;
  if (typeof r.filterRange === "number" && Number.isFinite(r.filterRange)) out.filterRange = r.filterRange;

  if (r.thresholds && typeof r.thresholds === "object") {
    const t = r.thresholds as Record<string, unknown>;
    const clean: Partial<Thresholds> = {};
    for (const f of THRESHOLD_FIELDS) {
      const v = t[f.key];
      if (typeof v === "number" && Number.isFinite(v)) clean[f.key] = clamp(v, f.min, f.max);
    }
    const merged: Thresholds = { ...DEFAULT_THRESHOLDS, ...clean };
    // Keep the danger band inside the caution band even if storage was edited.
    if (merged.cpaDanger > merged.cpaCaution) merged.cpaDanger = merged.cpaCaution;
    out.thresholds = merged;
  }
  return out;
}

// Read + validate saved settings. Returns {} on SSR, empty storage, or any error.
export function loadSettings(): Partial<PersistedSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

// Persist the current settings. No-op on SSR; swallows quota/private-mode
// errors so a storage failure never breaks a live watch screen.
export function saveSettings(s: PersistedSettings): void {
  if (typeof window === "undefined") return;
  try {
    const out: PersistedSettings = {
      displayMode: s.displayMode,
      filterRange: s.filterRange,
      theme: s.theme,
      alarmEnabled: s.alarmEnabled,
      depthUnit: s.depthUnit,
      thresholds: s.thresholds,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* private mode / quota exceeded — settings just won't persist */
  }
}
