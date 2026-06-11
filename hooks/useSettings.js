"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DEFAULT_SETTINGS, THRESHOLD_FIELDS } from "@/lib/settings";

const SettingsContext = createContext(null);

const FIELD = Object.fromEntries(THRESHOLD_FIELDS.map((f) => [f.key, f]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Global display/UI settings + live alert thresholds, shared across all views
// and the persistent TopBar. In-memory for now; cookie/localStorage
// persistence is a later task.
export function SettingsProvider({ children }) {
  const [displayMode, setDisplayMode] = useState(DEFAULT_SETTINGS.displayMode);
  const [filterRange, setFilterRange] = useState(DEFAULT_SETTINGS.filterRange);
  const [viewRange, setViewRange] = useState(DEFAULT_SETTINGS.viewRange);
  const [paused, setPaused] = useState(DEFAULT_SETTINGS.paused);
  const [theme, setTheme] = useState(DEFAULT_SETTINGS.theme);
  const [alarmEnabled, setAlarmEnabled] = useState(DEFAULT_SETTINGS.alarmEnabled);
  const [depthUnit, setDepthUnit] = useState(DEFAULT_SETTINGS.depthUnit);
  const [thresholds, setThresholds] = useState(DEFAULT_SETTINGS.thresholds);

  // Reflect the theme onto the document so the CSS token swap takes over.
  // "dusk" is the base :root, so it maps to no data-theme attribute.
  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dusk" ? "" : theme;
  }, [theme]);

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

  const value = {
    displayMode, setDisplayMode,
    filterRange, setFilterRange,
    viewRange, setViewRange,
    paused, setPaused,
    theme, setTheme,
    alarmEnabled, setAlarmEnabled,
    depthUnit, setDepthUnit,
    thresholds, setThreshold,
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
