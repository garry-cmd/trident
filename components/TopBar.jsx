"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { C, FONT_MONO } from "@/lib/theme";
import { DISPLAY_MODES, FILTER_OPTIONS, LEVEL_FILTER_OPTIONS, DEFAULT_RANGE } from "@/lib/settings";
import { useSettings } from "@/hooks/useSettings";
import { useAlerts } from "@/hooks/useAlerts";
import Timer from "./Timer";

const TABS = [
  { label: "AIS", href: "/" },
  { label: "Dash", href: "/dash" },
  { label: "Settings", href: "/settings" },
];

// Persistent chrome rendered once in the shell. Reads global settings + alert
// state from context, so it never remounts on route change.
export default function TopBar() {
  const pathname = usePathname();
  const { displayMode, setDisplayMode, filterRange, setFilterRange, levelFilter, setLevelFilter, viewRange, setViewRange, paused, setPaused } = useSettings();
  const { anyDangerAcked } = useAlerts();

  const onFilter = (v) => {
    setFilterRange(v);
    // When nothing is selected, keep the view zoom in step with the filter.
    setViewRange(Math.min(v, DEFAULT_RANGE));
  };

  const selectStyle = { fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.borderLt}`, background: C.raised, color: C.text, cursor: "pointer", minHeight: 44, appearance: "none", WebkitAppearance: "none", paddingRight: 12 };

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "0 12px", gap: 8, height: "calc(60px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)", background: C.surface, borderTop: `1px solid ${C.border}`, zIndex: 10, flexShrink: 0 }}>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 14, letterSpacing: "0.15em", color: C.bright, flexShrink: 0, marginRight: 4 }}>TRIDENT</div>

      <div style={{ display: "flex", gap: 3, background: C.raised, borderRadius: 8, padding: 3, flexShrink: 0 }}>
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link key={t.label} href={t.href} style={{ textDecoration: "none", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 16px", borderRadius: 6, color: active ? C.bright : C.dim, background: active ? C.borderLt : "transparent", minHeight: 44, display: "flex", alignItems: "center" }}>
              {t.label}
            </Link>
          );
        })}
      </div>

      <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value)} style={selectStyle}>
        {DISPLAY_MODES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
      </select>

      <select value={filterRange} onChange={(e) => onFilter(Number(e.target.value))} style={selectStyle}>
        {FILTER_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={selectStyle}>
        {LEVEL_FILTER_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      <Timer />

      <div style={{ flex: 1 }} />

      {anyDangerAcked && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.dangerDim, border: `1px solid ${C.danger}`, borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: C.dangerBr, textTransform: "uppercase", minHeight: 44 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.dangerBr, animation: "blink 1s step-end infinite" }} />
          {anyDangerAcked.name || anyDangerAcked.id} — ACK
        </div>
      )}

      <button onClick={() => setPaused(!paused)} style={{ fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 6, border: `1px solid ${C.borderLt}`, background: paused ? "rgba(196,146,48,0.12)" : C.raised, color: paused ? C.cautionBr : C.dim, cursor: "pointer", minHeight: 44, minWidth: 44 }}>
        {paused ? "\u25B6" : "\u23F8"}
      </button>
    </div>
  );
}
