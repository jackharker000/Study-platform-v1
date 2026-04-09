import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Revision Platform',
  description: 'Multi-subject IGCSE & AS Level practice',
}

// Inline script runs synchronously before React hydrates — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('rp-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      var pref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', pref);
    }
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <NavBar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
