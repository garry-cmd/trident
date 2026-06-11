// What is at the TOP of the screen for a given display mode. Shared by the
// sidebar heading panel and the radar's orientation chip so the "what's up"
// logic lives in exactly one place. Pure, no React.
import type { DisplayMode, OwnVessel } from "./types";

export function describeOrientation(
  displayMode: DisplayMode,
  own: OwnVessel
): { big: string; mode: string; isHeading: boolean } {
  const heading = Math.round(own.heading);
  const cog = Math.round(own.cog);
  if (displayMode === "north-up") return { big: "N", mode: "NORTH-UP", isHeading: false };
  if (displayMode === "course-up") return { big: `${cog}\u00B0`, mode: "COURSE-UP", isHeading: false };
  return { big: `${heading}\u00B0`, mode: "HEAD-UP", isHeading: true };
}
