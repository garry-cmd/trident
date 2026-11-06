import { describe, it, expect } from "vitest";
import { anchorAlarmActive, reAlarmStepM } from "./anchorAlarm";

const st = (o: any) => ({ set: true, dragging: true, noFix: false, distanceM: 70, ...o });

describe("anchorAlarmActive", () => {
  it("is silent with no watch set or no confirmed drag", () => {
    expect(anchorAlarmActive(st({ set: false }), null, 55)).toBe(false);
    expect(anchorAlarmActive(st({ dragging: false }), null, 55)).toBe(false);
  });
  it("sounds on a confirmed, unacknowledged drag", () => {
    expect(anchorAlarmActive(st({}), null, 55)).toBe(true);
  });
  it("stays silent after ACK until the boat drifts a further step out", () => {
    const step = reAlarmStepM(55); // 27.5 m
    expect(anchorAlarmActive(st({ distanceM: 70 }), 70, 55)).toBe(false);
    expect(anchorAlarmActive(st({ distanceM: 70 + step - 1 }), 70, 55)).toBe(false);
    expect(anchorAlarmActive(st({ distanceM: 70 + step }), 70, 55)).toBe(true);
  });
  it("re-alarm step is half the radius, never under 15 m", () => {
    expect(reAlarmStepM(100)).toBe(50);
    expect(reAlarmStepM(10)).toBe(15);
  });
  it("an acknowledged drag stays silent while the fix is lost", () => {
    expect(anchorAlarmActive(st({ noFix: true, distanceM: 999 }), 70, 55)).toBe(false);
  });
});
