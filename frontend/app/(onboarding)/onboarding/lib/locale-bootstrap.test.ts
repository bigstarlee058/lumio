import { describe, expect, it } from 'vitest';

import { resolveOnboardingBootstrapLocale } from './locale-bootstrap';

describe('resolveOnboardingBootstrapLocale', () => {
  it('keeps the currently active app locale for create-workspace onboarding bootstrap', () => {
    expect(resolveOnboardingBootstrapLocale('kk')).toBe('kk');
    expect(resolveOnboardingBootstrapLocale('en')).toBe('en');
  });

  it('falls back to the default locale only when the app locale is unsupported', () => {
    expect(resolveOnboardingBootstrapLocale('de')).toBe('ru');
    expect(resolveOnboardingBootstrapLocale(undefined)).toBe('ru');
  });
});
