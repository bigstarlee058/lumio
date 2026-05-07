export type OnboardingMode = 'standard' | 'create-workspace';

export type OnboardingStepKey =
  | 'welcome'
  | 'language'
  | 'workspace'
  | 'integrations'
  | 'completion';

const STANDARD_STEP_KEYS: OnboardingStepKey[] = [
  'welcome',
  'language',
  'workspace',
  'integrations',
  'completion',
];

const CREATE_WORKSPACE_STEP_KEYS: OnboardingStepKey[] = ['workspace', 'integrations', 'completion'];

export function resolveOnboardingFlow(
  modeParam: string | null | undefined,
  onboardingCompletedAt: string | null | undefined,
) {
  const isCreateWorkspaceMode = modeParam === 'create-workspace' && Boolean(onboardingCompletedAt);

  if (isCreateWorkspaceMode) {
    return {
      mode: 'create-workspace' as const,
      shouldRedirectCompletedUser: false,
      stepKeys: CREATE_WORKSPACE_STEP_KEYS,
    };
  }

  return {
    mode: 'standard' as const,
    shouldRedirectCompletedUser: true,
    stepKeys: STANDARD_STEP_KEYS,
  };
}
