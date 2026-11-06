import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Trident",
  description: "Marine navigation and AIS watch",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#060a0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="day" suppressHydrationWarning>
      <body>
        {/* Apply the saved theme before first paint so a night-watch reload
            never flashes the light Day theme. Mirrors useSettings' mapping
            (dusk = base :root = no attribute). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var s=JSON.parse(localStorage.getItem("trident.settings.v1")||"{}");var t=s&&s.theme;if(t!=="day"&&t!=="dusk"&&t!=="night")t="day";document.documentElement.dataset.theme=t==="dusk"?"":t;}catch(e){}',
          }}
        />
        {/* Boot watchdog: if the app crashes or never starts, say so ON SCREEN.
            The boat iPad has no console, so a silent freeze is undiagnosable.
            AppShell sets window.__tridentUp once React is running. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var E=[];function show(h){var d=document.getElementById("trd-boot-err");if(!d){d=document.createElement("div");d.id="trd-boot-err";d.style.cssText="position:fixed;left:0;right:0;top:0;z-index:9999;background:#b00020;color:#fff;font:14px/1.4 monospace;padding:12px 16px;white-space:pre-wrap;word-break:break-all";(document.body||document.documentElement).appendChild(d)}d.textContent=h+(E.length?"\\n"+E.join("\\n"):"")}window.addEventListener("error",function(e){E.push("ERROR: "+(e.message||e.type)+" @ "+(e.filename||(e.target&&(e.target.src||e.target.href))||"?")+":"+(e.lineno||""));if(window.__tridentUp)show("TRIDENT ERROR")},true);window.addEventListener("unhandledrejection",function(e){E.push("REJECTION: "+(e.reason&&(e.reason.stack||e.reason.message)||e.reason));if(window.__tridentUp)show("TRIDENT ERROR")});setTimeout(function(){if(!window.__tridentUp)show("TRIDENT DID NOT START (app code never ran) \\u2014 "+navigator.userAgent)},10000)})();',
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
