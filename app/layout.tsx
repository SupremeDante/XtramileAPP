import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Xtramile',
  description: 'Share your music',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f1a] text-white antialiased">{children}</body>
    </html>
  )
}
