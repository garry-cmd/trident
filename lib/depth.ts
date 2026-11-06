// Depth reference. The Triton/Vesper deliver depth below the TRANSDUCER; what
// matters aboard is water under the KEEL. Displays and the shallow alarm use
// keelDepth(), never the raw sensor value. Pure, no React.
import type { SelfState } from "./types";

export const KEEL_OFFSET_BOUNDS = { min: 0, max: 5 }; // m, transducer -> bottom of keel

export interface DepthReading {
  m: number; // metres, NaN when there is no reading
  ref: "keel" | "sensor"; // what the number is measured from
}

// Prefer Signal K's own below-keel value (set when the instrument carries a keel
// offset). Otherwise subtract the configured transducer-to-keel offset. With no
// offset configured the reading is honestly labelled as below the sensor.
export function keelDepth(self: Pick<SelfState, "depth" | "depthKeel">, keelOffsetM: number): DepthReading {
  if (Number.isFinite(self.depthKeel)) return { m: self.depthKeel as number, ref: "keel" };
  if (!Number.isFinite(self.depth)) return { m: NaN, ref: keelOffsetM > 0 ? "keel" : "sensor" };
  if (keelOffsetM > 0) return { m: self.depth - keelOffsetM, ref: "keel" };
  return { m: self.depth, ref: "sensor" };
}
