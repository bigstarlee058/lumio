'use client';

import { useIntlayer } from '@/app/i18n';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';
import type { SupportedLocale } from '../useOnboardingWizard';

interface ConnectedIntegration {
  key: string;
  title: string;
  iconSrc: string;
}

interface CompletionStepProps {
  locale: SupportedLocale;
  timeZone: string | null;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  connectedIntegrations: ConnectedIntegration[];
}

export function CompletionStep({
  locale,
  timeZone,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  connectedIntegrations,
}: CompletionStepProps) {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback, locale);

  const localeLabel =
    locale === 'ru'
      ? text(['language', 'localeOptions', 'ru'], 'Russian')
      : locale === 'kk'
        ? text(['language', 'localeOptions', 'kk'], 'Kazakh')
        : text(['language', 'localeOptions', 'en'], 'English');

  return (
    <section className="space-y-6">
      <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 p-3">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {text(['completion', 'title'], 'Done! Setup complete')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {text(
            ['completion', 'subtitle'],
            'Press the button below to continue to your workspace.',
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {text(['completion', 'summaryTitle'], 'Your setup')}
        </p>
        <ul className="space-y-2 text-sm text-foreground">
          <li>
            {text(['completion', 'summary', 'language'], 'Language: {value}').replace(
              '{value}',
              localeLabel,
            )}
          </li>
          <li>
            {text(['completion', 'summary', 'timeZone'], 'Timezone: {value}').replace(
              '{value}',
              timeZone || 'UTC',
            )}
          </li>
          <li>
            {text(['completion', 'summary', 'workspace'], 'Workspace: {value}').replace(
              '{value}',
              workspaceName || '-',
            )}
          </li>
          <li>
            {text(['completion', 'summary', 'currency'], 'Currency: {value}').replace(
              '{value}',
              workspaceCurrency || text(['completion', 'notSet'], 'not set'),
            )}
          </li>
          <li>
            {text(['completion', 'summary', 'background'], 'Workspace background: {value}').replace(
              '{value}',
              workspaceBackgroundImage
                ? text(['completion', 'backgroundSet'], 'set')
                : text(['completion', 'notSet'], 'not set'),
            )}
          </li>
          <li>{text(['completion', 'summary', 'integrations'], 'Connected integrations:')}</li>
        </ul>

        <div className="mt-4 border-t border-border pt-3">
          {connectedIntegrations.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {connectedIntegrations.map(integration => (
                <div
                  key={integration.key}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted"
                  title={integration.title}
                >
                  <Image
                    src={integration.iconSrc}
                    alt={integration.title}
                    width={18}
                    height={18}
                    className="rounded"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {text(['completion', 'noIntegrations'], 'No integrations connected')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
