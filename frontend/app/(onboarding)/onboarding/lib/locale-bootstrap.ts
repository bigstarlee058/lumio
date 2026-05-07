import { type AppLocale, normalizeLocale } from '@/app/lib/locale';

export function resolveOnboardingBootstrapLocale(appLocale: string | null | undefined): AppLocale {
  return normalizeLocale(appLocale);
}
