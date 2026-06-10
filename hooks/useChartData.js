"use client";
import { useMemo } from "react";
import { deriveTargets } from "@/lib/state";
import { enrichTargets } from "@/lib/ais";
import { useBoatState } from "./useBoatState";
import { useSettings } from "./useSettings";

// Chart needs two things the radar pipeline splits apart: the raw lat/lon
// positions (deriveTargets discards them) AND the threat enrichment (cpa/tcpa/
// level). This composes both off ONE useBoatState call, then joins the enriched
// targets back onto their lat/lon by id. It deliberately does not also call
// useTargets — that would spin a second simulator and the two would diverge.
//
// Returns lat/lon-native shapes for MapLibre plus the radar's threat banding,
// so chart markers colour exactly like radar targets. `source` is passed
// through so the view can stay honest about sim vs live.
export function useChartData() {
  const { state } = useBoatState();
  const { thresholds } = useSettings();

  const { targets: raw, own } = useMemo(() => deriveTargets(state), [state]);
  const enriched = useMemo(() => enrichTargets(raw, own, thresholds), [raw, own, thresholds]);
  const byId = useMemo(() => new Map(enriched.map((e) => [e.id, e])), [enriched]);

  const contacts = useMemo(
    () =>
      state.contacts.map((c) => {
        const e = byId.get(c.id);
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          aton: c.aton,
          lat: c.position.lat,
          lon: c.position.lon,
          cog: c.cog,
          sog: c.sog,
          brg: e ? e.brg : 0,
          dist: e ? e.dist : 0,
          cpa: e ? e.cpa : Infinity,
          tcpa: e ? e.tcpa : -1,
          level: e ? e.level : "safe",
        };
      }),
    [state.contacts, byId]
  );

  const self = useMemo(
    () => ({
      lat: state.self.position.lat,
      lon: state.self.position.lon,
      heading: state.self.heading,
      cog: state.self.cog,
      sog: state.self.sog,
    }),
    [state.self]
  );

  return { self, contacts, source: state.source };
}
