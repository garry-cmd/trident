"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { playAlarm } from "@/lib/audio";
import { useSettings } from "./useSettings";

const AlertsContext = createContext(null);

// Owns alert state independent of the data source. A view registers the
// current danger targets each tick; this hook derives the unacknowledged
// alert, drives the alarm, and exposes ack(). Acked entries are pruned to the
// current danger set, so a target that leaves and re-enters danger re-alerts.
export function AlertsProvider({ children }) {
  const { alarmEnabled } = useSettings();
  const [dangers, setDangersState] = useState([]); // [{id,name,tcpa}]
  const [acked, setAcked] = useState({});
  // When a danger is acknowledged (or the ACK chip is tapped) we ask the AIS
  // view to select that target, so the scope frames it instead of the ack just
  // parking a chip in the corner. The AIS page consumes + clears this.
  const [selectRequest, setSelectRequest] = useState(null);

  const setDangers = useCallback((list) => setDangersState(list), []);
  const ack = useCallback((id) => {
    setAcked((a) => ({ ...a, [id]: true }));
    setSelectRequest(id);
  }, []);
  const requestSelect = useCallback((id) => setSelectRequest(id), []);
  const clearSelectRequest = useCallback(() => setSelectRequest(null), []);

  const ids = dangers.map((d) => d.id);
  const idsKey = ids.join(",");

  // Prune acks for targets no longer in danger.
  useEffect(() => {
    setAcked((a) => {
      const next = {};
      for (const id of ids) if (a[id]) next[id] = true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const unacked = dangers.find((d) => !acked[d.id]) || null;
  const anyDangerAcked = dangers.find((d) => acked[d.id]) || null;

  // Alarm loop while an unacknowledged danger exists and the alarm is enabled.
  useEffect(() => {
    if (!unacked || !alarmEnabled) return;
    playAlarm();
    const iv = setInterval(playAlarm, 2000);
    return () => clearInterval(iv);
  }, [unacked?.id, alarmEnabled]);

  const value = { dangers, setDangers, acked, ack, unacked, anyDangerAcked, selectRequest, requestSelect, clearSelectRequest };
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
