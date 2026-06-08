export const metadata = {
  title: 'Trident',
  description: 'Marine navigation and AIS watch',
  manifest: '/manifest.json',
  themeColor: '#060a0e',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#060a0e', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
