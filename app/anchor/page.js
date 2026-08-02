"use client";
import { useState, useEffect } from "react";
import { useTargets } from "@/hooks/useTargets";
import { useSettings } from "@/hooks/useSettings";
import { useAnchorWatch } from "@/hooks/useAnchorWatch";
import { EMPTY_TELEMETRY } from "@/lib/types";
import { C, FONT_MONO } from "@/lib/theme";
import AnchorScope from "@/components/anchor/AnchorScope";
import AnchorReadout from "@/components/anchor/AnchorReadout";
import ArmPanel from "@/components/anchor/ArmPanel";
import NudgePad from "@/components/anchor/NudgePad";

// Anchor watch. Its own route because at anchor this IS the job — the AIS scope
// shows nothing moving and the Dash drawer is too small for the one thing that
// answers the question. Always present in the nav: unset it arms the watch, set
// it runs it. Hiding the tab until a hook was set meant the only way to arm was
// a hunt through Dash at exactly the moment you're busy on the foredeck.
export default function AnchorPage() {
  const { self, telemetry: live, ts } = useTargets();
  const { anchorUnit, anchorOrient } = useSettings();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const w = useAnchorWatch(self.position, self.heading, ts);
  const telemetry = live ?? EMPTY_TELEMETRY;
  const armed = w.status.set;
  const dragging = w.status.dragging;

  return (
    <div style={{ display: "flex", height: "100%", background: C.bg }}>
      <div
        style={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          background: `radial-gradient(ellipse at 50% 47%, ${C.radarGrad0}, ${C.radarGrad1})`,
        }}
      >
        <AnchorScope
          anchorPos={w.anchor.setPoint}
          boatPos={armed && !w.status.noFix ? self.position : null}
          headingDeg={self.heading}
          radiusM={w.anchor.alarmRadiusM}
          level={w.status.level}
          trail={w.trail}
          orient={anchorOrient}
          unit={anchorUnit}
        />
        <div style={chip}>{anchorOrient === "head" ? "HEAD-UP" : "NORTH-UP"}</div>
        {armed && (
          <div style={{ ...chip, left: "auto", right: 14 }}>
            TRAIL 12 h {"\u00b7"} {w.trail.length} pts
          </div>
        )}
        {armed && <NudgePad onNudge={w.nudge} />}
        {!armed && (
          <div
            style={{
              ...chip,
              left: "50%",
              transform: "translateX(-50%)",
              top: "auto",
              bottom: 14,
              borderColor: C.caution,
              color: C.cautionBr,
            }}
          >
            NO WATCH SET {"\u2014"} PREVIEWING THE RING
          </div>
        )}
      </div>

      <div
        style={{
          width: 300,
          flexShrink: 0,
          borderLeft: `1px solid ${dragging ? C.danger : C.border}`,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 11,
          overflowY: "auto",
          boxShadow: dragging ? C.glowDanger : "none",
        }}
      >
        {armed ? (
          <>
            <AnchorReadout
              status={w.status}
              radiusM={w.anchor.alarmRadiusM}
              setAt={w.anchor.setAt}
              breachSec={w.breachSec}
              self={self}
              telemetry={telemetry}
              now={now}
              unit={anchorUnit}
            />
            <div style={{ flex: 1 }} />
            <button onClick={w.weigh} style={weighBtn}>
              WEIGH ANCHOR {"\u2014"} CLEAR WATCH
            </button>
          </>
        ) : (
          <ArmPanel
            rodeM={w.anchor.rodeM}
            setRode={w.setRode}
            radiusM={w.anchor.alarmRadiusM}
            setRadius={w.setRadius}
            hdg={w.hdg}
            onArm={(where) => w.arm(where, w.anchor.rodeM)}
            unit={anchorUnit}
          />
        )}
      </div>
    </div>
  );
}

const chip = {
  position: "absolute",
  top: 14,
  left: 14,
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.12em",
  color: C.label,
  border: `1px solid ${C.borderLt}`,
  borderRadius: 6,
  padding: "7px 11px",
  background: C.labelBg,
};
const weighBtn = {
  width: "100%",
  fontFamily: FONT_MONO,
  fontSize: 12,
  letterSpacing: "0.08em",
  minHeight: 54,
  background: C.surface,
  color: C.text,
  border: `1px solid ${C.borderLt}`,
  borderRadius: 10,
  cursor: "pointer",
};
