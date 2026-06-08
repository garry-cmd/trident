// Shared data shapes for the whole app.

export type ThreatLevel = "safe" | "caution" | "danger";
export type DisplayMode = "head-up" | "course-up" | "north-up";

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
