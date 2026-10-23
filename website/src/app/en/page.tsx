import type { Metadata } from 'next';
import { SignalRoomPage } from '@/components/SignalRoomPage';

export const metadata: Metadata = {
  title: 'Global monitoring, verified information',
  description:
    'Signal Room tracks major events worldwide and shares verified information clearly, without the noise.',
  alternates: {
    canonical: '/en/',
    languages: {
      fr: '/',
      en: '/en/',
    },
  },
  openGraph: {
    title: 'Signal Room — Global monitoring',
    description:
      'Global risk and event monitoring, grounded in sources and built for clarity.',
    locale: 'en_US',
  },
};

export default function EnglishHome() {
  return <SignalRoomPage locale="en" />;
}
