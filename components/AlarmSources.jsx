"use client";
import { useMemo, useEffect } from "react";
import { isConverging } from "@/lib/ais";
import { useTargets } from "@/hooks/useTargets";
import { useSettings } from "@/hooks/useSettings";
import { useAlerts } from "@/hooks/useAlerts";

// Registers collision dangers with the alert system from the APP SHELL, so the
// collision alarm fires whichever screen is open (it used to live in the AIS
// view's layout and went silent on Dash/Anchor/Settings). Renders nothing.
export default function AlarmSources() {
  const { targets } = useTargets();
  const { thresholds } = useSettings();
  const { setDangers } = useAlerts();

  const dangers = useMemo(
    () =>
      targets
        .filter(
          (t) =>
            t.level === "danger" ||
            (!t.aton && t.cpa < thresholds.cpaCaution && t.tcpa < thresholds.tcpaAlert && isConverging(t.tcpa, t.closingKt))
        )
        .map((t) => ({ id: t.id, name: t.name, tcpa: t.tcpa })),
    [targets, thresholds.tcpaAlert, thresholds.cpaCaution]
  );
  const key = dangers.map((d) => d.id + ":" + Math.round(d.tcpa)).join(",");
  useEffect(() => { setDangers(dangers); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
