import { describe, it, expect } from "vitest";
import {
  feedAgeSec,
  feedStatus,
  hasGpsFix,
  systemsStatus,
  anchorBoatStatus,
  worstStatus,
  batteryStatus,
  baroStatus,
  piStatus,
} from "./dash";

describe("feedAgeSec", () => {
  it("reports age in seconds and never goes negative", () => {
    expect(feedAgeSec(10_000, 5_000)).toBe(5);
    expect(feedAgeSec(5_000, 10_000)).toBe(0); // clock skew clamps to 0
  });
});

describe("feedStatus", () => {
  it("bands fresh / stale / lost", () => {
    expect(feedStatus(5, 15, 60)).toBe("ok");
    expect(feedStatus(20, 15, 60)).toBe("caution");
    expect(feedStatus(120, 15, 60)).toBe("danger");
    expect(feedStatus(15, 15, 60)).toBe("caution"); // boundary is inclusive
    expect(feedStatus(60, 15, 60)).toBe("danger");
  });
});

describe("hasGpsFix", () => {
  it("rejects null island and non-finite, accepts a real fix", () => {
    expect(hasGpsFix({ lat: 0, lon: 0 })).toBe(false);
    expect(hasGpsFix({ lat: 19.7, lon: -105.3 })).toBe(true);
    expect(hasGpsFix({ lat: NaN, lon: -105.3 })).toBe(false);
    expect(hasGpsFix({ lat: 0, lon: -105.3 })).toBe(true); // on the equator, valid
  });
});

describe("systemsStatus", () => {
  it("is danger on lost feed or no fix, else follows the feed", () => {
    expect(systemsStatus("ok", true)).toBe("ok");
    expect(systemsStatus("caution", true)).toBe("caution");
    expect(systemsStatus("danger", true)).toBe("danger");
    expect(systemsStatus("ok", false)).toBe("danger"); // no GPS fix = blind
  });
});

describe("anchorBoatStatus", () => {
  it("is informational underway, drag-driven at anchor", () => {
    expect(anchorBoatStatus(false, false)).toBe("ok");
    expect(anchorBoatStatus(true, false)).toBe("ok");
    expect(anchorBoatStatus(true, true)).toBe("danger");
  });
});

describe("worstStatus", () => {
  it("picks the most severe, treating off as absent not faulted", () => {
    expect(worstStatus("ok", "caution")).toBe("caution");
    expect(worstStatus("ok", "danger", "caution")).toBe("danger");
    expect(worstStatus("off", "ok")).toBe("ok"); // a gated sensor isn't a fault
    expect(worstStatus("off", "off")).toBe("off"); // all absent = absent
    expect(worstStatus()).toBe("off");
  });
});

describe("batteryStatus", () => {
  it("is off without data, danger below min voltage, caution on low SOC", () => {
    expect(batteryStatus(null)).toBe("off");
    expect(batteryStatus({ soc: 80, voltage: 12.6 })).toBe("ok");
    expect(batteryStatus({ soc: 80, voltage: 12.1 })).toBe("danger");
    expect(batteryStatus({ soc: 20, voltage: 12.6 })).toBe("caution");
    expect(batteryStatus({ soc: 80, voltage: 12.3 }, 12.4)).toBe("danger"); // custom min
  });
});

describe("baroStatus", () => {
  it("bands a falling barometer", () => {
    expect(baroStatus(null)).toBe("off");
    expect(baroStatus(0.5)).toBe("ok");
    expect(baroStatus(-2.1)).toBe("caution");
    expect(baroStatus(-5)).toBe("danger");
  });
});

describe("piStatus", () => {
  it("flags undervolt and heat", () => {
    expect(piStatus(null)).toBe("off");
    expect(piStatus({ undervolt: false, cpuTempC: 55 })).toBe("ok");
    expect(piStatus({ undervolt: true, cpuTempC: 55 })).toBe("danger");
    expect(piStatus({ undervolt: false, cpuTempC: 82 })).toBe("caution");
  });
});

describe("configurable alarm thresholds", () => {
  it("batteryStatus honors custom low-SOC", () => {
    expect(batteryStatus({ soc: 45, voltage: 12.6 }, 12.2, 50)).toBe("caution");
    expect(batteryStatus({ soc: 45, voltage: 12.6 }, 12.2, 30)).toBe("ok");
  });
  it("baroStatus honors custom fall bands", () => {
    expect(baroStatus(-2, 1, 3)).toBe("caution");
    expect(baroStatus(-3, 1, 3)).toBe("danger");
    expect(baroStatus(-0.5, 1, 3)).toBe("ok");
  });
  it("piStatus honors custom temp caution", () => {
    expect(piStatus({ undervolt: false, cpuTempC: 70 }, 65)).toBe("caution");
    expect(piStatus({ undervolt: false, cpuTempC: 70 }, 80)).toBe("ok");
  });
});
