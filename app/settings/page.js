"use client";
import { C, FONT_MONO, FONT_SANS } from "@/lib/theme";
import { THRESHOLD_FIELDS } from "@/lib/settings";
import { useSettings } from "@/hooks/useSettings";
import { playAlarm } from "@/lib/audio";
import ThresholdStepper from "@/components/settings/ThresholdStepper";
import Toggle from "@/components/settings/Toggle";

// Settings (Phase 2a) — only controls wired to live behaviour. Collision
// thresholds feed lib/ais.ts + the radar; night mode swaps the CSS theme; the
// alarm row gates the real alarm loop. Power / depth / crew profiles are
// deferred until their sensors exist (footer), never faked.
export default function SettingsPage() {
  const { thresholds, setThreshold, nightMode, setNightMode, alarmEnabled, setAlarmEnabled } = useSettings();

  return (
    <div style={{ height: "100%", overflowY: "auto", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 640, padding: "24px 20px 60px" }}>
        <Section label="Collision" note="Live — feeds the radar and the collision alarm">
          {THRESHOLD_FIELDS.map((f) => (
            <ThresholdStepper
              key={f.key}
              label={f.label}
              desc={f.desc}
              value={thresholds[f.key]}
              unit={f.unit}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(v) => setThreshold(f.key, v)}
            />
          ))}
        </Section>

        <Section label="Display">
          <Toggle
            label="Night mode"
            desc="Red-on-black to protect night vision on watch"
            on={nightMode}
            onToggle={setNightMode}
          />
        </Section>

        <Section label="Alarm">
          <Toggle
            label="Master alarm"
            desc="Browser alarm tone for collision and TCPA alerts"
            on={alarmEnabled}
            onToggle={setAlarmEnabled}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: 16, minHeight: 48 }}>
            <div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: C.bright }}>Test alarm</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.dim, marginTop: 2 }}>Fire the tone now to check volume before a passage</div>
            </div>
            <button onClick={() => playAlarm()} style={{ minHeight: 48, padding: "0 22px", borderRadius: 8, border: "1px solid " + C.borderLt, background: C.raised, color: C.bright, fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
              TEST
            </button>
          </div>
        </Section>

        <div style={{ marginTop: 28, padding: "16px 0 0", borderTop: "1px solid " + C.border }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            Available when their sensors are connected:{" "}
            <span style={{ color: C.label }}>Power (battery / solar)</span>,{" "}
            <span style={{ color: C.label }}>Depth &amp; baro</span>,{" "}
            <span style={{ color: C.label }}>Per-crew profiles</span>.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, note, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: C.text, textTransform: "uppercase" }}>{label}</div>
        {note && <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: C.dim }}>{note}</div>}
      </div>
      {children}
    </div>
  );
}
