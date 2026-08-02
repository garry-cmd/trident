"use client";
import { useState } from "react";
import { C, FONT_MONO, FONT_SANS } from "@/lib/theme";
import { THRESHOLD_FIELDS, ALARM_GROUPS, DEPTH_UNITS, THEME_OPTIONS, ANCHOR_UNITS, ANCHOR_ORIENTATIONS, ANCHOR_RADIUS_BOUNDS, RODE_BOUNDS } from "@/lib/settings";
import { useSettings } from "@/hooks/useSettings";
import { useTargets } from "@/hooks/useTargets";
import { useAnchorWatch } from "@/hooks/useAnchorWatch";
import { IRENE } from "@/lib/anchor";
import { distValue, distLabel, distStep, snapDist } from "@/lib/units";
import { playAlarm } from "@/lib/audio";
import KpiCard from "@/components/dash/KpiCard";
import { Panel, PanelHead } from "@/components/dash/Panel";
import ThresholdStepper from "@/components/settings/ThresholdStepper";
import Toggle from "@/components/settings/Toggle";

// Settings, in the Dash idiom: a card per system, tap to drill into that
// system's controls (one open at a time). Card accent uses the same honest
// language as the Dash — green for a guard that's armed now, dim for one that's
// saved but PENDING its sensor. Collision + System are live; Power + Weather
// save and arm the moment the Cerbo / NGX-1 are connected, never faked.
const GROUP = Object.fromEntries(ALARM_GROUPS.map((g) => [g.domain.toLowerCase(), g]));
const Q = {
  collision: "how close is too close?",
  system: "is the box healthy?",
  power: "when should the bank alarm?",
  weather: "how fast a fall worries me?",
  display: "day, dusk, or night?",
  alarm: "will I hear it?",
  anchor: "how big is my swing circle?",
};

export default function SettingsPage() {
  const {
    thresholds, setThreshold, alarms, setAlarm, theme, setTheme,
    alarmEnabled, setAlarmEnabled, depthUnit, setDepthUnit,
    anchorUnit, setAnchorUnit, anchorOrient, setAnchorOrient,
  } = useSettings();
  const [open, setOpen] = useState(null);

  // The anchor watch's radius and rode are operational state (they live with the
  // hook, not with preferences), so Settings reaches the same shared watch the
  // /anchor route uses rather than keeping a second copy.
  const { self, ts } = useTargets();
  const w = useAnchorWatch(self.position, self.heading, ts);
  const aU = distLabel(anchorUnit);

  const cards = [
    { area: "collision", name: "Collision", status: "ok", value: `${thresholds.cpaCaution.toFixed(1)} / ${thresholds.cpaDanger.toFixed(1)}`, sub: "CPA bands \u00B7 nm" },
    { area: "system", name: "System", status: "ok", value: `${alarms.piTempCaution}\u00B0C`, sub: "Pi temp + feed" },
    { area: "power", name: "Power", status: "off", value: `${alarms.battMinV.toFixed(1)} V`, sub: "battery \u00B7 pending" },
    { area: "weather", name: "Weather", status: "off", value: `${alarms.baroFallCaution} mb`, sub: "baro fall \u00B7 pending" },
    { area: "anchor", name: "Anchor", status: w.status.set ? "ok" : "off", value: `${distValue(w.anchor.alarmRadiusM, anchorUnit)} ${aU}`, sub: w.status.set ? "watch set \u00b7 alarm radius" : "alarm radius \u00b7 no watch" },
    { area: "display", name: "Display", status: "ok", value: theme.toUpperCase(), sub: "theme + units" },
    { area: "alarm", name: "Alarm", status: alarmEnabled ? "ok" : "off", value: alarmEnabled ? "ON" : "OFF", sub: "master + test" },
  ];

  function renderPanel() {
    if (open === "collision") {
      return (
        <Panel>
          <PanelHead title="Collision" q={Q.collision} right={<Badge active />} />
          <NoteLine text="Feeds the AIS view and the collision alarm." />
          {THRESHOLD_FIELDS.map((f) => (
            <ThresholdStepper key={f.key} label={f.label} desc={f.desc} value={thresholds[f.key]} unit={f.unit} min={f.min} max={f.max} step={f.step} onChange={(v) => setThreshold(f.key, v)} />
          ))}
        </Panel>
      );
    }
    if (open === "anchor") {
      const stepU = distStep(anchorUnit);
      const overridden = Math.abs(w.anchor.alarmRadiusM - w.derivedRadiusM) > 0.5;
      const bumpRadius = (n) => w.setRadius(snapDist(w.anchor.alarmRadiusM, anchorUnit, n));
      const bumpRode = (n) => {
        const next = snapDist(w.anchor.rodeM, anchorUnit, n);
        if (next < RODE_BOUNDS.min || next > RODE_BOUNDS.max) return;
        w.setRode(next);
        if (!overridden) w.setRadius(next + IRENE.bowOffsetM + IRENE.gpsMarginM);
      };
      return (
        <Panel>
          <PanelHead title="Anchor" q={Q.anchor} right={<Badge active />} />
          <NoteLine text={`Irene: ${distValue(IRENE.loaM, anchorUnit)} ${aU} LOA, GPS antenna ${distValue(IRENE.bowOffsetM, anchorUnit)} ${aU} aft of the bow roller. The ring is the radius the ANTENNA swings on — rode + bow offset + margin — not rode + LOA.`} />
          <BumpRow
            label="Alarm radius"
            desc={overridden
              ? `Set by hand. From ${distValue(w.anchor.rodeM, anchorUnit)} ${aU} of rode it would be ${distValue(w.derivedRadiusM, anchorUnit)} ${aU}.`
              : "Tracks the rode. Widen it if a wind shift keeps tripping a hook that is holding."}
            value={distValue(w.anchor.alarmRadiusM, anchorUnit)} unit={aU} step={stepU}
            onDec={() => bumpRadius(-1)} onInc={() => bumpRadius(1)}
            atMin={w.anchor.alarmRadiusM <= ANCHOR_RADIUS_BOUNDS.min}
            atMax={w.anchor.alarmRadiusM >= ANCHOR_RADIUS_BOUNDS.max}
          />
          <BumpRow
            label="Rode out"
            desc="What you have paid out. Sets where the hook is placed when you arm the watch."
            value={distValue(w.anchor.rodeM, anchorUnit)} unit={aU} step={stepU}
            onDec={() => bumpRode(-1)} onInc={() => bumpRode(1)}
            atMin={w.anchor.rodeM <= RODE_BOUNDS.min}
            atMax={w.anchor.rodeM >= RODE_BOUNDS.max}
          />
          <Row label="Distance units" desc="How the anchor watch reads out distances">
            <Segmented options={ANCHOR_UNITS} value={anchorUnit} onChange={setAnchorUnit} />
          </Row>
          <Row label="Scope orientation" desc="North-up holds the frame still, which keeps the swing trail's shape readable overnight" last>
            <Segmented options={ANCHOR_ORIENTATIONS} value={anchorOrient} onChange={setAnchorOrient} />
          </Row>
        </Panel>
      );
    }
    if (open === "display") {
      return (
        <Panel>
          <PanelHead title="Display" q={Q.display} />
          <Row label="Theme" desc="Day for sun, Dusk for low light, Night to protect dark vision">
            <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} />
          </Row>
          <Row label="Depth units" desc="How depth reads out across the app" last>
            <Segmented options={DEPTH_UNITS} value={depthUnit} onChange={setDepthUnit} />
          </Row>
        </Panel>
      );
    }
    if (open === "alarm") {
      return (
        <Panel>
          <PanelHead title="Alarm" q={Q.alarm} />
          <Toggle label="Master alarm" desc="Browser alarm tone for collision and TCPA alerts" on={alarmEnabled} onToggle={setAlarmEnabled} />
          <Row label="Test alarm" desc="Fire the tone now to check volume before a passage" last>
            <button onClick={() => playAlarm()} style={{ minHeight: 48, padding: "0 22px", borderRadius: 8, border: `1px solid ${C.borderLt}`, background: C.raised, color: C.bright, fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>TEST</button>
          </Row>
        </Panel>
      );
    }
    const g = GROUP[open]; // system / power / weather
    if (g) {
      return (
        <Panel>
          <PanelHead title={g.domain} q={Q[open]} right={<Badge active={g.active} />} />
          <NoteLine text={g.note} />
          {g.fields.map((f) => (
            <ThresholdStepper key={f.key} label={f.label} desc={f.desc} value={alarms[f.key]} unit={f.unit} min={f.min} max={f.max} step={f.step} onChange={(v) => setAlarm(f.key, v)} />
          ))}
        </Panel>
      );
    }
    return null;
  }

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 18px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {cards.map((c) => (
            <KpiCard key={c.area} name={c.name} status={c.status} value={c.value} sub={c.sub} active={open === c.area} onClick={() => setOpen(open === c.area ? null : c.area)} />
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          {open ? renderPanel() : (
            <div style={{ textAlign: "center", color: C.dim, fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.06em", marginTop: 26, lineHeight: 1.7 }}>
              tap a system to set its thresholds<br />
              <span style={{ fontSize: 11 }}>pending controls save now and arm when their sensor connects</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ active }) {
  const b = active ? { t: "LIVE", fg: C.safeBr, br: C.safe } : { t: "PENDING", fg: C.cautionBr, br: C.caution };
  return <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: b.fg, border: `1px solid ${b.br}`, borderRadius: 5, padding: "3px 8px" }}>{b.t}</span>;
}

function NoteLine({ text }) {
  return <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.5 }}>{text}</div>;
}

function Row({ label, desc, last, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: 16, minHeight: 48, borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: C.bright }}>{label}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.dim, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// A stepper on a Settings row. Same 48px keys as ThresholdStepper, but stepping
// in DISPLAY units (10 ft / 5 m) while the stored value stays metric.
function BumpRow({ label, desc, value, unit, step, onDec, onInc, atMin, atMax }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: 16, minHeight: 48, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: C.bright }}>{label}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.dim, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={onDec} disabled={atMin} style={bumpBtn(atMin)}>{"\u2212"}</button>
        <div style={{ minWidth: 92, textAlign: "center" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: C.value }}>{value}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.dim, marginLeft: 4 }}>{unit}</span>
        </div>
        <button onClick={onInc} disabled={atMax} style={bumpBtn(atMax)}>{"+"}</button>
      </div>
    </div>
  );
}

const bumpBtn = (disabled) => ({
  width: 48, height: 48, borderRadius: 8,
  border: `1px solid ${C.borderLt}`, background: C.raised,
  color: disabled ? C.dim : C.bright,
  fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
});

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 8, padding: 4, border: `1px solid ${C.border}` }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{ minHeight: 40, padding: "0 16px", borderRadius: 6, border: "none", background: on ? C.borderLt : "transparent", color: on ? C.bright : C.dim, fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
