"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_SETTINGS, THRESHOLD_FIELDS, ALARM_FIELDS, fenceAlarms } from "@/lib/settings";
import { loadSettings, saveSettings } from "@/lib/persist";

const SettingsContext = createContext(null);

const FIELD = Object.fromEntries(THRESHOLD_FIELDS.map((f) => [f.key, f]));
const ALARM_FIELD = Object.fromEntries(ALARM_FIELDS.map((f) => [f.key, f]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Global display/UI settings + live alert thresholds, shared across all views
// and the persistent TopBar. Persisted to localStorage (lib/persist) so the
// boat boots the way you left it.
export function SettingsProvider({ children }) {
  const [displayMode, setDisplayMode] = useState(DEFAULT_SETTINGS.displayMode);
  const [filterRange, setFilterRange] = useState(DEFAULT_SETTINGS.filterRange);
  const [levelFilter, setLevelFilter] = useState(DEFAULT_SETTINGS.levelFilter);
  const [viewRange, setViewRange] = useState(DEFAULT_SETTINGS.viewRange);
  const [paused, setPaused] = useState(DEFAULT_SETTINGS.paused);
  const [theme, setTheme] = useState(DEFAULT_SETTINGS.theme);
  const [alarmEnabled, setAlarmEnabled] = useState(DEFAULT_SETTINGS.alarmEnabled);
  const [depthUnit, setDepthUnit] = useState(DEFAULT_SETTINGS.depthUnit);
  const [thresholds, setThresholds] = useState(DEFAULT_SETTINGS.thresholds);
  const [alarms, setAlarms] = useState(DEFAULT_SETTINGS.alarms);

  // Reflect the theme onto the document so the CSS token swap takes over.
  // "dusk" is the base :root, so it maps to no data-theme attribute.
  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dusk" ? "" : theme;
  }, [theme]);

  // ── Persistence ───────────────────────────────────────────────────────
  // Load saved settings once after mount. SSR/first paint render the defaults;
  // the inline boot script in layout.js has already applied the saved THEME
  // before paint (so reloading at night never flashes white), and the rest
  // settle here a frame later. paused + viewRange are intentionally not restored.
  useEffect(() => {
    const s = loadSettings();
    if (s.displayMode !== undefined) setDisplayMode(s.displayMode);
    if (s.filterRange !== undefined) setFilterRange(s.filterRange);
    if (s.levelFilter !== undefined) setLevelFilter(s.levelFilter);
    if (s.theme !== undefined) setTheme(s.theme);
    if (s.alarmEnabled !== undefined) setAlarmEnabled(s.alarmEnabled);
    if (s.depthUnit !== undefined) setDepthUnit(s.depthUnit);
    if (s.thresholds !== undefined) setThresholds(s.thresholds);
    if (s.alarms !== undefined) setAlarms(s.alarms);
  }, []);

  // Persist on change. Skip the first run so we don't write defaults over the
  // saved blob before the load effect above has applied it.
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return; }
    saveSettings({ displayMode, filterRange, levelFilter, theme, alarmEnabled, depthUnit, thresholds, alarms });
  }, [displayMode, filterRange, levelFilter, theme, alarmEnabled, depthUnit, thresholds, alarms]);

  // Set one threshold, clamped to its bounds. The danger band must stay inside
  // the caution band, so the two CPA fields fence each other — you can't set a
  // danger ring larger than the caution ring at 2am by fat-fingering a stepper.
  const setThreshold = useCallback((key, value) => {
    setThresholds((prev) => {
      const f = FIELD[key];
      let v = clamp(Number(value.toFixed ? value.toFixed(4) : value), f.min, f.max);
      if (key === "cpaDanger") v = Math.min(v, prev.cpaCaution);
      if (key === "cpaCaution") v = Math.max(v, prev.cpaDanger);
      return { ...prev, [key]: v };
    });
  }, []);

  const setAlarm = useCallback((key, value) => {
    setAlarms((prev) => {
      const f = ALARM_FIELD[key];
      const v = clamp(Number(value.toFixed ? value.toFixed(4) : value), f.min, f.max);
      return fenceAlarms({ ...prev, [key]: v });
    });
  }, []);

  const value = {
    displayMode, setDisplayMode,
    filterRange, setFilterRange,
    levelFilter, setLevelFilter,
    viewRange, setViewRange,
    paused, setPaused,
    theme, setTheme,
    alarmEnabled, setAlarmEnabled,
    depthUnit, setDepthUnit,
    thresholds, setThreshold,
    alarms, setAlarm,
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
