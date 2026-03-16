import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revision Platform',
  description: 'Multi-subject IGCSE & AS Level practice',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
