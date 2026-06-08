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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
