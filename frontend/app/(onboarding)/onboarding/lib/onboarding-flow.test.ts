import { describe, expect, it } from 'vitest';

import { resolveOnboardingFlow } from './onboarding-flow';

describe('resolveOnboardingFlow', () => {
  it('uses workspace-first flow for create-workspace mode after onboarding completion', () => {
    expect(resolveOnboardingFlow('create-workspace', '2026-01-01T00:00:00.000Z')).toEqual({
      mode: 'create-workspace',
      shouldRedirectCompletedUser: false,
      stepKeys: ['workspace', 'integrations', 'completion'],
    });
  });

  it('keeps standard onboarding flow when onboarding is not completed yet', () => {
    expect(resolveOnboardingFlow('create-workspace', null)).toEqual({
      mode: 'standard',
      shouldRedirectCompletedUser: true,
      stepKeys: ['welcome', 'language', 'workspace', 'integrations', 'completion'],
    });
  });
});
