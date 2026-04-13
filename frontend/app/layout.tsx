import type { Metadata } from 'next';
import { IBM_Plex_Sans, Inter, Manrope, Nunito, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { getLocale } from 'next-intlayer/server';
import { getIntlayer } from 'react-intlayer';
import { IntlayerServerProvider } from 'react-intlayer/server';
import AppChrome from './components/AppChrome';
import DynamicPageTitle from './components/DynamicPageTitle';
import { Providers } from './providers';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
});

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-nunito',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getIntlayer('layout', locale);

  return {
    title: t.title.value,
    description: t.description.value,
    icons: {
      icon: '/images/favicon-new.png',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const resolvedLocale = typeof locale === 'string' ? locale : 'en';
  const direction = resolvedLocale.startsWith('ar') ? 'rtl' : 'ltr';

  return (
    <html lang={resolvedLocale} dir={direction} suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${nunito.variable} ${ibmPlexSans.variable} ${inter.variable} ${spaceGrotesk.variable}`}
        style={{ background: 'var(--lumio-bg-page)', color: 'var(--lumio-text-primary)', WebkitFontSmoothing: 'antialiased', fontFamily: 'var(--font-manrope, sans-serif)' }}
      >
        <IntlayerServerProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers initialLocale={resolvedLocale as 'en' | 'ru' | 'kk'}>
              <DynamicPageTitle />
              <AppChrome />
              <main>{children}</main>
              <div id="fab-portal" style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}>
                <div style={{ position: 'relative', height: '100%', width: '100%' }} />
              </div>
            </Providers>
          </ThemeProvider>
        </IntlayerServerProvider>
      </body>
    </html>
  );
}
