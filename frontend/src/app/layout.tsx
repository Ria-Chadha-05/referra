import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Referra — AI Citation Assistant',
  description:
    'Analyze your academic writing sentence by sentence. Detect claims, retrieve verified research papers, and build citations with confidence scoring.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Referra — AI Citation Assistant',
    description: 'AI-powered academic citation analysis and verification.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ height: '100%', fontFamily: "'DM Sans', system-ui, sans-serif", overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
