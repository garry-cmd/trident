"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { playAlarm } from "@/lib/audio";

const AlertsContext = createContext(null);

// Owns alert state independent of the data source. A view registers the
// current danger targets each tick; this hook derives the unacknowledged
// alert, drives the alarm, and exposes ack(). Acked entries are pruned to the
// current danger set, so a target that leaves and re-enters danger re-alerts.
export function AlertsProvider({ children }) {
  const [dangers, setDangersState] = useState([]); // [{id,name,tcpa}]
  const [acked, setAcked] = useState({});

  const setDangers = useCallback((list) => setDangersState(list), []);
  const ack = useCallback((id) => setAcked((a) => ({ ...a, [id]: true })), []);

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

  // Alarm loop while an unacknowledged danger exists.
  useEffect(() => {
    if (!unacked) return;
    playAlarm();
    const iv = setInterval(playAlarm, 2000);
    return () => clearInterval(iv);
  }, [unacked?.id]);

  const value = { dangers, setDangers, acked, ack, unacked, anyDangerAcked };
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
