import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Trident",
  description: "Marine navigation and AIS watch",
  manifest: "/manifest.json",
  // Home-screen web app: added once from Safari (Share > Add to Home Screen),
  // it opens full-screen with no address bar — one tap at 2am, nothing to type.
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Trident", statusBarStyle: "default" },
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
              '(function(){var E=[],T0=Date.now();function el(){var d=document.getElementById("trd-boot-err");if(!d){d=document.createElement("div");d.id="trd-boot-err";d.style.cssText="position:fixed;left:0;right:0;top:0;z-index:9999;background:#b00020;color:#fff;font:13px/1.35 monospace;padding:10px 14px;white-space:pre-wrap;word-break:break-all;max-height:70vh;overflow:auto";(document.body||document.documentElement).appendChild(d)}return d}function res(){var out=[],R={};try{performance.getEntriesByType("resource").forEach(function(r){R[r.name]=r})}catch(e){}var S=document.querySelectorAll("script[src],link[rel=stylesheet],link[rel=preload]");for(var i=0;i<S.length;i++){var u=S[i].src||S[i].href;if(!u)continue;var r=R[u],n=u.split("/").pop().slice(0,28);out.push((r?(Math.round(r.duration)+"ms "+(r.transferSize||r.encodedBodySize||0)+"b"):"PENDING")+"  "+n)}return out.join("\\n")}function show(h){el().textContent=h+"\\nt="+Math.round((Date.now()-T0)/1000)+"s readyState="+document.readyState+" ua="+navigator.userAgent+(E.length?"\\n"+E.join("\\n"):"")+"\\n"+res()}window.addEventListener("error",function(e){E.push("ERROR: "+(e.message||e.type)+" @ "+(e.filename||(e.target&&(e.target.src||e.target.href))||"?")+":"+(e.lineno||""));if(window.__tridentUp)show("TRIDENT ERROR")},true);window.addEventListener("unhandledrejection",function(e){E.push("REJECTION: "+(e.reason&&(e.reason.stack||e.reason.message)||e.reason));if(window.__tridentUp)show("TRIDENT ERROR")});var shown=false;[10,20,40,60].forEach(function(t){setTimeout(function(){if(!window.__tridentUp){shown=true;show("TRIDENT DID NOT START (app code never ran)")}else if(shown){shown=false;show("TRIDENT STARTED LATE \\u2014 up after >"+(t===60?40:t/2)+"s");setTimeout(function(){var d=document.getElementById("trd-boot-err");if(d)d.remove()},8000)}},t*1000)})})();',
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
