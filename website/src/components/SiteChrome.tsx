import Link from 'next/link';
import Image from 'next/image';

type SiteHeaderProps = {
  locale: 'fr' | 'en';
};

export function SiteHeader({ locale }: SiteHeaderProps) {
  const isEnglish = locale === 'en';

  return (
    <header className="site-header">
      <Link className="wordmark" href={isEnglish ? '/en/' : '/'} aria-label="Signal Room">
        <Image src="/logo.png" alt="" width={42} height={42} priority />
        <span>SignalRoom</span>
      </Link>
      <nav className="header-nav" aria-label={isEnglish ? 'Main navigation' : 'Navigation principale'}>
        <a href="#mission">{isEnglish ? 'Our mission' : 'Notre mission'}</a>
        <a href="#principles">{isEnglish ? 'Our approach' : 'Notre approche'}</a>
        <a className="language-switch" href={isEnglish ? '/' : '/en/'} lang={isEnglish ? 'fr' : 'en'}>
          {isEnglish ? 'FR' : 'EN'}
        </a>
      </nav>
    </header>
  );
}

type SiteFooterProps = {
  locale: 'fr' | 'en';
};

export function SiteFooter({ locale }: SiteFooterProps) {
  const isEnglish = locale === 'en';

  return (
    <footer className="site-footer">
      <Link className="footer-brand" href={isEnglish ? '/en/' : '/'}>Signal Room</Link>
      <span>{isEnglish ? 'Clear signal. Global perspective.' : 'Un signal clair. Une perspective mondiale.'}</span>
      <a href="https://discord.gg/AVJt2sgmmP" target="_blank" rel="noreferrer">
        Discord <span aria-hidden="true">↗</span>
      </a>
    </footer>
  );
}