import { describe, it, expect } from "vitest";
import { hornState } from "./relay";
import { initCaptureState } from "./detect";
import type { CaptureState } from "./types";

const base = (): CaptureState => initCaptureState();

describe("hornState", () => {
  it("is silent with no hazards", () => {
    expect(hornState(base())).toEqual({ on: false, reasons: [] });
  });

  it("sounds on CPA danger contacts", () => {
    const s: CaptureState = { ...base(), dangerContacts: { "366123456": true } };
    const h = hornState(s);
    expect(h.on).toBe(true);
    expect(h.reasons).toContain("cpa");
  });

  it("sounds while the anchor is dragging", () => {
    const s: CaptureState = {
      ...base(),
      motion: "stopped",
      anchor: { ref: { lat: 20.1, lon: -105.3 }, dragging: true },
    };
    const h = hornState(s);
    expect(h.on).toBe(true);
    expect(h.reasons).toContain("anchor_drag");
  });

  it("stays silent for a set anchor that is holding", () => {
    const s: CaptureState = {
      ...base(),
      motion: "stopped",
      anchor: { ref: { lat: 20.1, lon: -105.3 }, dragging: false },
    };
    expect(hornState(s)).toEqual({ on: false, reasons: [] });
  });

  it("reports both reasons when CPA and drag overlap", () => {
    const s: CaptureState = {
      ...base(),
      motion: "stopped",
      anchor: { ref: { lat: 20.1, lon: -105.3 }, dragging: true },
      dangerContacts: { "366123456": true },
    };
    const h = hornState(s);
    expect(h.on).toBe(true);
    expect(h.reasons).toEqual(expect.arrayContaining(["cpa", "anchor_drag"]));
    expect(h.reasons).toHaveLength(2);
  });

  it("clears the moment the hazard resolves", () => {
    const active: CaptureState = { ...base(), dangerContacts: { "366123456": true } };
    expect(hornState(active).on).toBe(true);
    const cleared: CaptureState = { ...active, dangerContacts: {} };
    expect(hornState(cleared)).toEqual({ on: false, reasons: [] });
  });
});
