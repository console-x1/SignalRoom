import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://signalroom.consolex1.com'),
  title: {
    default: 'Signal Room — Veille mondiale',
    template: '%s | SignalRoom',
  },
  description:
    'Une veille mondiale des risques et événements, fondée sur des sources et pensée pour la clarté.',
  keywords: [
    'Signal Room',
    'veille mondiale',
    'géopolitique',
    'sécurité',
    'information vérifiée',
  ],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Signal Room — Veille mondiale',
    description:
      'Une veille mondiale des risques et événements, fondée sur des sources et pensée pour la clarté.',
    url: 'https://signalroom.consolex1.com',
    siteName: 'Signal Room',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/logo.png',
        width: 420,
        height: 420,
        alt: 'Signal Room',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Signal Room — Veille mondiale',
    description:
      'Une veille mondiale des risques et événements, fondée sur des sources et pensée pour la clarté.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
