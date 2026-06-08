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
      <body style={{ margin: 0, padding: 0, background: "#060a0e", overflow: "hidden" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
