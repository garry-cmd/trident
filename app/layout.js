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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
