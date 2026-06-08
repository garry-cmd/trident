"use client";
import { createContext, useContext, useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const SettingsContext = createContext(null);

// Global display/UI settings shared across all views (and the persistent
// TopBar). In-memory for now; cookie/localStorage persistence is a later task.
export function SettingsProvider({ children }) {
  const [displayMode, setDisplayMode] = useState(DEFAULT_SETTINGS.displayMode);
  const [filterRange, setFilterRange] = useState(DEFAULT_SETTINGS.filterRange);
  const [viewRange, setViewRange] = useState(DEFAULT_SETTINGS.viewRange);
  const [paused, setPaused] = useState(DEFAULT_SETTINGS.paused);

  const value = {
    displayMode, setDisplayMode,
    filterRange, setFilterRange,
    viewRange, setViewRange,
    paused, setPaused,
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
