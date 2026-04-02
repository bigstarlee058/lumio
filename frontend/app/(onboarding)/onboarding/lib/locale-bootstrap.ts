import { normalizeLocale } from '@/app/lib/locale';

export function resolveOnboardingBootstrapLocale(appLocale: string | null | undefined): 'en' | 'ru' | 'kk' {
  return normalizeLocale(appLocale);
}
