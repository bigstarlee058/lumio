// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

describe('locale helpers', () => {
  beforeEach(() => {
    document.cookie = 'INTLAYER_LOCALE=; Max-Age=0; path=/';
    document.cookie = 'intlayer-locale=; Max-Age=0; path=/';
  });

  it('reads the intlayer cookie first and falls back to the legacy cookie', async () => {
    const { readLocaleFromCookie } = await import('../locale');

    document.cookie = 'intlayer-locale=kk; path=/';
    expect(readLocaleFromCookie()).toBe('kk');

    document.cookie = 'INTLAYER_LOCALE=en; path=/';
    expect(readLocaleFromCookie()).toBe('en');
  });

  it('persists the locale in both cookie names so reload keeps the selected language', async () => {
    const { persistLocaleToCookie } = await import('../locale');

    persistLocaleToCookie('kk');

    expect(document.cookie).toContain('INTLAYER_LOCALE=kk');
    expect(document.cookie).toContain('intlayer-locale=kk');
  });

  it('accepts only supported locales when syncing from the user profile', async () => {
    const { readLocaleFromCookie, syncLocaleFromUser } = await import('../locale');

    syncLocaleFromUser({ locale: 'en' });
    expect(readLocaleFromCookie()).toBe('en');

    syncLocaleFromUser({ locale: 'de' });
    expect(readLocaleFromCookie()).toBe('en');
  });

  it('does not overwrite an explicitly selected locale cookie by default', async () => {
    const { readLocaleFromCookie, syncLocaleFromUser } = await import('../locale');

    document.cookie = 'INTLAYER_LOCALE=en; path=/';
    document.cookie = 'intlayer-locale=en; path=/';

    syncLocaleFromUser({ locale: 'ru' });

    expect(readLocaleFromCookie()).toBe('en');
  });
});
