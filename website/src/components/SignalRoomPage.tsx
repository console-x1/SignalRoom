import Image from 'next/image';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';

type Locale = 'fr' | 'en';

type PageCopy = {
  language: 'fr' | 'en';
  eyebrow: string;
  title: string;
  titleAccent: string;
  intro: string;
  primaryCta: string;
  secondaryCta: string;
  status: string;
  missionLabel: string;
  missionTitle: string;
  missionText: string;
  focusLabel: string;
  focusTitle: string;
  focusAreas: string[];
  principlesLabel: string;
  principlesTitle: string;
  principles: { title: string; description: string }[];
  communityLabel: string;
  communityTitle: string;
  communityText: string;
  discord: string;
  whatsappTitle: string;
  whatsappChannels: { country: 'gb' | 'fr' | 'br'; label: string; href: string }[];
  disclaimer: string;
};

const copy: Record<Locale, PageCopy> = {
  fr: {
    language: 'fr',
    eyebrow: 'Veille mondiale · Information vérifiée',
    title: 'Le monde bouge.',
    titleAccent: 'Restez lucide.',
    intro:
      'Signal Room suit les événements qui comptent et vous aide à comprendre ce qui se passe — sans bruit, sans spéculation.',
    primaryCta: 'Rejoindre la communauté',
    secondaryCta: 'Découvrir notre approche',
    status: 'Une veille pensée pour la clarté',
    missionLabel: 'Notre mission',
    missionTitle: 'Un signal clair dans un monde bruyant.',
    missionText:
      'Des événements géopolitiques aux urgences naturelles, nous rassemblons des informations vérifiables et les présentons avec le contexte nécessaire pour mieux comprendre leur portée.',
    focusLabel: 'Ce que nous suivons',
    focusTitle: 'Les événements à fort impact.',
    focusAreas: [
      'Conflits et tensions internationales',
      'Sécurité et incidents majeurs',
      'Catastrophes et urgences naturelles',
      'Évolutions géopolitiques et économiques',
    ],
    principlesLabel: 'Notre approche',
    principlesTitle: 'L’essentiel, avec méthode.',
    principles: [
      {
        title: 'Des sources vérifiables',
        description:
          'Les informations s’appuient sur des sources identifiables. Les faits et l’analyse sont clairement distingués.',
      },
      {
        title: 'La clarté avant le bruit',
        description:
          'Les événements importants sont structurés et présentés sans sensationnalisme ni spéculation.',
      },
      {
        title: 'Un échange constructif',
        description:
          'La discussion reste factuelle, respectueuse et ouverte aux arguments étayés.',
      },
    ],
    communityLabel: 'Rejoignez Signal Room',
    communityTitle: 'Restez informé. Gardez du recul.',
    communityText:
      'Retrouvez la communauté sur Discord ou suivez les alertes sur le canal WhatsApp de votre choix.',
    discord: 'Rejoindre sur Discord',
    whatsappTitle: 'Canaux WhatsApp officiels',
    whatsappChannels: [
      {
        country: 'gb',
        label: 'English',
        href: 'https://whatsapp.com/channel/0029VbCFGsYB4hdZCyJBVw0A',
      },
      {
        country: 'fr',
        label: 'Français',
        href: 'https://whatsapp.com/channel/0029Vb7UgiJGE56cw7k1Tr1U',
      },
      {
        country: 'br',
        label: 'Português',
        href: 'https://whatsapp.com/channel/0029Vb7tg094tRrrd1il8X3d',
      },
    ],
    disclaimer: 'Une information utile, vérifiée et sans bruit.',
  },
  en: {
    language: 'en',
    eyebrow: 'Global monitoring · Verified information',
    title: 'The world moves.',
    titleAccent: 'Stay clear-eyed.',
    intro:
      'Signal Room tracks the events that matter and helps you understand what is happening — without noise or speculation.',
    primaryCta: 'Join the community',
    secondaryCta: 'Discover our approach',
    status: 'Monitoring, built for clarity',
    missionLabel: 'Our mission',
    missionTitle: 'A clear signal in a noisy world.',
    missionText:
      'From geopolitical developments to natural emergencies, we bring together verifiable information and the context needed to understand its impact.',
    focusLabel: 'What we monitor',
    focusTitle: 'Events with real-world impact.',
    focusAreas: [
      'Conflicts and international tensions',
      'Security and major incidents',
      'Natural disasters and emergencies',
      'Geopolitical and economic developments',
    ],
    principlesLabel: 'Our approach',
    principlesTitle: 'The essentials, with discipline.',
    principles: [
      {
        title: 'Verifiable sources',
        description:
          'Information is grounded in identifiable sources. Reporting and analysis are clearly distinguished.',
      },
      {
        title: 'Clarity over noise',
        description:
          'Important events are structured and presented without sensationalism or speculation.',
      },
      {
        title: 'Constructive discussion',
        description:
          'Conversation stays factual, respectful, and open to evidence-backed arguments.',
      },
    ],
    communityLabel: 'Join Signal Room',
    communityTitle: 'Stay informed. Keep perspective.',
    communityText:
      'Find the community on Discord or follow updates on the WhatsApp channel that works for you.',
    discord: 'Join us on Discord',
    whatsappTitle: 'Official WhatsApp channels',
    whatsappChannels: [
      {
        country: 'gb',
        label: 'English',
        href: 'https://whatsapp.com/channel/0029VbCFGsYB4hdZCyJBVw0A',
      },
      {
        country: 'fr',
        label: 'Français',
        href: 'https://whatsapp.com/channel/0029Vb7UgiJGE56cw7k1Tr1U',
      },
      {
        country: 'br',
        label: 'Português',
        href: 'https://whatsapp.com/channel/0029Vb7tg094tRrrd1il8X3d',
      },
    ],
    disclaimer: 'Useful information, verified and without the noise.',
  },
};

function SectionLabel({ children }: { children: string }) {
  return <p className="section-label">{children}</p>;
}

function CountryFlag({ country }: { country: 'gb' | 'fr' | 'br' }) {
  if (country === 'fr') {
    return (
      <svg className="channel-flag" viewBox="0 0 24 16" aria-hidden="true">
        <rect width="8" height="16" fill="#1b3f9b" />
        <rect x="8" width="8" height="16" fill="#fff" />
        <rect x="16" width="8" height="16" fill="#ed2939" />
      </svg>
    );
  }

  if (country === 'br') {
    return (
      <svg className="channel-flag" viewBox="0 0 24 16" aria-hidden="true">
        <rect width="24" height="16" fill="#009b3a" />
        <path d="M12 2 22 8 12 14 2 8Z" fill="#ffdf00" />
        <circle cx="12" cy="8" r="3.1" fill="#002776" />
      </svg>
    );
  }

  return (
    <svg className="channel-flag" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#012169" />
      <path d="m0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.5" />
      <path d="m0 0 24 16M24 0 0 16" stroke="#c8102e" strokeWidth="1.5" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5" />
      <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.5" />
    </svg>
  );
}

export function SignalRoomPage({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const isEnglish = locale === 'en';

  return (
    <main lang={text.language}>
      <div className="page-shell">
        <SiteHeader locale={locale} />

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" />{text.eyebrow}</p>
            <h1 id="hero-title">
              {text.title}<br />
              <span>{text.titleAccent}</span>
            </h1>
            <p className="hero-intro">{text.intro}</p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href="https://discord.gg/AVJt2sgmmP"
                target="_blank"
                rel="noreferrer"
              >
                {text.primaryCta}<span aria-hidden="true">↗</span>
              </a>
              <a className="button button-quiet" href="#principles">
                {text.secondaryCta}<span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="hero-note">
              <span className="note-line" />
              <span>{text.status}</span>
            </div>
          </div>

          <div className="hero-art" aria-label={isEnglish ? 'Signal Room global monitoring emblem' : 'Emblème de veille mondiale Signal Room'} role="img">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-glow" />
            <div className="logo-frame">
              <Image
                src="/logo.png"
                alt=""
                width={420}
                height={420}
                priority
                className="hero-logo"
              />
            </div>
            <div className="art-caption">
              <span className="caption-mark" />
              SIGNAL ROOM <span>·</span> GLOBAL WATCH
            </div>
          </div>
        </section>

        <section className="mission-section content-section" id="mission">
          <div className="section-heading">
            <SectionLabel>{text.missionLabel}</SectionLabel>
            <h2>{text.missionTitle}</h2>
          </div>
          <p className="mission-copy">{text.missionText}</p>
        </section>

        <section className="focus-section content-section" aria-labelledby="focus-title">
          <div className="section-heading">
            <SectionLabel>{text.focusLabel}</SectionLabel>
            <h2 id="focus-title">{text.focusTitle}</h2>
          </div>
          <ul className="focus-list">
            {text.focusAreas.map((area, index) => (
              <li key={area}>
                <span className="focus-number">0{index + 1}</span>
                <span>{area}</span>
                <span className="focus-arrow" aria-hidden="true">↗</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="principles-section content-section" id="principles">
          <div className="section-heading">
            <SectionLabel>{text.principlesLabel}</SectionLabel>
            <h2>{text.principlesTitle}</h2>
          </div>
          <div className="principle-grid">
            {text.principles.map((principle, index) => (
              <article className="principle-card" key={principle.title}>
                <span className="principle-index">0{index + 1}</span>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="community-section" id="community">
          <div className="community-topline">
            <SectionLabel>{text.communityLabel}</SectionLabel>
            <span className="community-index">SR / 001</span>
          </div>
          <div className="community-main">
            <div className="community-copy">
              <h2>{text.communityTitle}</h2>
              <p>{text.communityText}</p>
              <a
                className="button button-primary"
                href="https://discord.gg/AVJt2sgmmP"
                target="_blank"
                rel="noreferrer"
              >
                {text.discord}<span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="channel-list">
              <h3>{text.whatsappTitle}</h3>
              {text.whatsappChannels.map((channel) => (
                <a
                  className="channel-link"
                  href={channel.href}
                  key={channel.label}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="channel-language">
                    <CountryFlag country={channel.country} />
                    {channel.label}
                  </span>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="closing-line">
          <span className="status-dot" />{text.disclaimer}
        </div>
        <SiteFooter locale={locale} />
      </div>
    </main>
  );
}
