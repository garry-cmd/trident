// Default settings + option lists. Pure config, no React.
// Single source of truth for ranges shared between sim and UI.
import type { DisplayMode } from "./types";

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

export const DEFAULT_SETTINGS = {
  displayMode: "head-up" as DisplayMode,
  filterRange: DEFAULT_RANGE,
  viewRange: DEFAULT_RANGE,
  paused: false,
};
