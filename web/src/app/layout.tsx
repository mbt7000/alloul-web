import type { Metadata } from 'next'
import { Inter, Tajawal, IBM_Plex_Sans_Arabic } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
})

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ALLOUL&Q — منصة الأعمال الذكية',
  description: 'مساحة عمل ذكية للفرق الحديثة — مهام، مشاريع، اجتماعات، AI، كل شيء في مكان واحد.',
  keywords: ['ALLOUL', 'Q', 'workspace', 'tasks', 'projects', 'AI', 'منصة', 'أعمال', 'SaaS'],
  authors: [{ name: 'ALLOUL&Q' }],
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://alloul.app',
    title: 'ALLOUL&Q — منصة الأعمال الذكية',
    description: 'مساحة عمل ذكية للفرق الحديثة',
    siteName: 'ALLOUL&Q',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050810',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${tajawal.variable} ${ibmPlexSansArabic.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-screen bg-dark-bg-900 text-white antialiased font-arabic overflow-x-hidden">
        <div className="bg-ambient" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
