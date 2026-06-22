import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VisitPro — Gestion des visites d\'entreprise',
  description: 'Solution SaaS de gestion des visites et rendez-vous pour les entreprises de Côte d\'Ivoire',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E3A5F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('visitpro-theme')||'light';var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t==='system'&&d))document.documentElement.classList.add('dark');}catch(e){}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
