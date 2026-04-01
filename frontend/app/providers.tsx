'use client';

import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_EVENT,
  getStoredThemePreference,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import { HeroUIProvider } from '@heroui/react';
import { MantineProvider } from '@mantine/core';
import { ThemeProvider } from '@mui/material/styles';
import { useTheme as useNextTheme } from 'next-themes';
import React, { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { IntlayerProviderContent } from 'react-intlayer';
import { SidePanelProvider } from './components/side-panel';
import { NotificationProvider } from './contexts/NotificationContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { useAutoTheme } from './hooks/useAutoTheme';
import { useHTMLLanguage } from './hooks/useHTMLLanguage';
import { mantineCssVariablesResolver, mantineTheme } from './mantine-theme';
import { createAppTheme } from './theme';
import { TourAutoStarter } from './tours/components/TourAutoStarter';

type AppLocale = 'en' | 'ru' | 'kk';
const LOCALE_COOKIE_NAME = 'intlayer-locale';

function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'ru' || value === 'kk';
}

function readLocaleFromCookie(): AppLocale | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookieValue = document.cookie
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.split('=')[1];

  return isSupportedLocale(cookieValue) ? cookieValue : null;
}

function persistLocaleToCookie(locale: AppLocale) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function HTMLLanguageSync() {
  useHTMLLanguage();
  return null;
}

function ThemePreferenceSync() {
  const [themePreference, setThemePreference] = useState(getStoredThemePreference);

  useEffect(() => {
    const syncThemePreference = () => {
      setThemePreference(resolveThemePreference(getStoredThemePreference()));
    };

    const handleThemePreferenceEvent = () => {
      syncThemePreference();
    };

    window.addEventListener('storage', syncThemePreference);
    window.addEventListener(THEME_STORAGE_EVENT, handleThemePreferenceEvent);

    return () => {
      window.removeEventListener('storage', syncThemePreference);
      window.removeEventListener(THEME_STORAGE_EVENT, handleThemePreferenceEvent);
    };
  }, []);

  useAutoTheme(themePreference);
  return null;
}

function WorkspaceScopedProviders({
  children,
  mounted,
}: {
  children: React.ReactNode;
  mounted: boolean;
}) {
  const { currentWorkspace } = useWorkspace();

  return (
    <React.Fragment key={currentWorkspace?.id ?? 'no-workspace'}>
      <NotificationProvider>
        <SidePanelProvider
          defaultWidth="md"
          defaultPosition="left"
          defaultCollapsed={false}
          persistState={true}
          storageKey="lumio-side-panel"
        >
          {mounted ? (
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  fontSize: '14px',
                  background: 'var(--card-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border-color)',
                },
              }}
            />
          ) : null}
          {children}
        </SidePanelProvider>
      </NotificationProvider>
    </React.Fragment>
  );
}

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  const { resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<AppLocale>(() => readLocaleFromCookie() ?? initialLocale);
  const paletteMode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const colorScheme = paletteMode === 'dark' ? 'dark' : 'light';
  const muiTheme = useMemo(() => createAppTheme(paletteMode), [paletteMode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const cookieLocale = readLocaleFromCookie();
    setLocale(cookieLocale ?? initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    persistLocaleToCookie(locale);
  }, [locale]);

  const handleLocaleChange = (nextLocale: string) => {
    if (!isSupportedLocale(nextLocale)) {
      return;
    }

    persistLocaleToCookie(nextLocale);
    setLocale(nextLocale);
  };

  return (
    <HeroUIProvider>
      <IntlayerProviderContent
        locale={locale}
        setLocale={handleLocaleChange}
      >
        <HTMLLanguageSync />
        <ThemePreferenceSync />
        <TourAutoStarter />
        <MantineProvider
          theme={mantineTheme}
          cssVariablesResolver={mantineCssVariablesResolver}
          forceColorScheme={colorScheme}
          defaultColorScheme="light"
        >
          <ThemeProvider theme={muiTheme}>
            <WorkspaceProvider>
              <WorkspaceScopedProviders mounted={mounted}>{children}</WorkspaceScopedProviders>
            </WorkspaceProvider>
          </ThemeProvider>
        </MantineProvider>
      </IntlayerProviderContent>
    </HeroUIProvider>
  );
}
