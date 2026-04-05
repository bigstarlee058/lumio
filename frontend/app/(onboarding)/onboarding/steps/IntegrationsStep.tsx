'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer } from '@/app/i18n';
import Image from 'next/image';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';

export interface OnboardingIntegrationCard {
  key: string;
  title: string;
  description: string;
  iconSrc: string;
  connected: boolean;
  loading: boolean;
  actionLabel: string;
}

interface IntegrationsStepProps {
  cards: OnboardingIntegrationCard[];
  onConnect: (integrationKey: string) => void;
}

export function IntegrationsStep({ cards, onConnect }: IntegrationsStepProps) {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {text(['integrations', 'title'], 'Connect your integrations')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {text(
            ['integrations', 'subtitle'],
            'Pick services you want to set up now. You can connect them later as well.',
          )}
        </p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {cards.map(card => (
          <article key={card.key} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 inline-flex rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <Image
                    src={card.iconSrc}
                    alt={card.title}
                    width={24}
                    height={24}
                    className="rounded"
                  />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </div>

              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                  card.connected
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {card.connected
                  ? text(['integrations', 'connectedBadge'], 'Connected')
                  : text(['integrations', 'availableBadge'], 'Available')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onConnect(card.key)}
              disabled={card.connected || card.loading}
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                card.connected
                  ? 'border border-border bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary-hover'
              }`}
            >
              {card.loading ? <Spinner className="h-3.5 w-3.5" /> : null}
              {card.actionLabel}
            </button>
          </article>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {text(
          ['integrations', 'helper'],
          'If you skip this step, you can connect integrations later in Settings -> Integrations.',
        )}
      </p>
    </section>
  );
}
