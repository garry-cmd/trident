"use client";
import { useState, useEffect } from "react";
import { C, FONT_MONO } from "@/lib/theme";
import { playTimerBeep } from "@/lib/audio";
import { TIMER_OPTIONS } from "@/lib/settings";

// Watch timer. Self-contained: counts down a selectable duration and beeps at
// zero. Lives in the shared TopBar, so it's available on every view.
export default function Timer() {
  const [dur, setDur] = useState(15);
  const [rem, setRem] = useState(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on || rem === null) return;
    if (rem <= 0) {
      playTimerBeep();
      setOn(false);
      return;
    }
    const iv = setInterval(() => setRem((r) => r - 1), 1000);
    return () => clearInterval(iv);
  }, [on, rem]);

  const mm = rem !== null ? Math.floor(rem / 60) : dur;
  const ss = rem !== null ? rem % 60 : 0;

  const toggle = () => {
    if (on) { setOn(false); setRem(null); }
    else { setRem(dur * 60); setOn(true); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {!on && rem === null && (
        <select value={dur} onChange={(e) => setDur(Number(e.target.value))}
          style={{ fontSize: 13, fontWeight: 600, padding: "10px 8px", borderRadius: 6, border: `1px solid ${C.borderLt}`, background: C.raised, color: C.text, cursor: "pointer", minHeight: 44 }}>
          {TIMER_OPTIONS.map((m) => <option key={m} value={m}>{m}m</option>)}
        </select>
      )}
      <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: on ? (rem < 60 ? C.dangerBr : C.text) : C.dim }}>
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </span>
      <span onClick={toggle}
        style={{ fontSize: 14, fontWeight: 700, color: on ? C.dangerBr : C.safeBr, cursor: "pointer", padding: "10px 14px", border: `1px solid ${on ? C.danger : C.safe}`, borderRadius: 6, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on ? "\u25A0" : "\u25B6"}
      </span>
      {!on && rem !== null && rem <= 0 && (
        <span style={{ fontSize: 13, fontWeight: 700, color: C.dangerBr, animation: "blink 1s step-end infinite" }}>CHECK</span>
      )}
    </div>
  );
}
