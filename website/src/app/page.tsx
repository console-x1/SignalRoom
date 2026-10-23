import type { Metadata } from 'next';
import { SignalRoomPage } from '@/components/SignalRoomPage';

export const metadata: Metadata = {
  title: 'Veille mondiale, information vérifiée',
  description:
    'Signal Room suit les événements majeurs dans le monde et partage une information vérifiée, claire et sans bruit.',
  alternates: {
    canonical: '/',
    languages: {
      fr: '/',
      en: '/en/',
    },
  },
  openGraph: {
    title: 'Signal Room — Veille mondiale',
    description:
      'Une veille mondiale des risques et événements, fondée sur des sources et pensée pour la clarté.',
    locale: 'fr_FR',
  },
};

export default function Home() {
  return <SignalRoomPage locale="fr" />;
}
