"use client";
import { SettingsProvider } from "@/hooks/useSettings";
import { AlertsProvider } from "@/hooks/useAlerts";
import { getAudioCtx } from "@/lib/audio";
import { C, FONT_SANS } from "@/lib/theme";
import TopBar from "./TopBar";
import AlertModal from "./AlertModal";

// Client shell: provides global context, renders the persistent TopBar and the
// global alert modal, and unlocks audio on the first user interaction (browser
// autoplay policy). layout.js (a server component) wraps this around children.
export default function AppShell({ children }) {
  return (
    <SettingsProvider>
      <AlertsProvider>
        <div
          onPointerDown={() => getAudioCtx()}
          style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: C.bg, fontFamily: FONT_SANS, overflow: "hidden" }}
        >
          <AlertModal />
          <TopBar />
          <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>{children}</main>
        </div>
      </AlertsProvider>
    </SettingsProvider>
  );
}
