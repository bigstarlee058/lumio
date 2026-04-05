'use client';

import { useIntlayer } from '@/app/i18n';
import { CheckCircle2, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';

export function WelcomeStep() {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {text(['welcome', 'title'], "Let's tailor Lumio for you")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {text(
            ['welcome', 'subtitle'],
            'This takes a couple of minutes: choose language, default currency, and integrations.',
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {text(['welcome', 'points', 'fastSetup'], 'Quick initial setup')}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Workflow className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {text(['welcome', 'points', 'integrations'], 'Connect services in one click')}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {text(['welcome', 'points', 'control'], 'Clear start and full control')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">
          {text(['welcome', 'nextTitle'], 'What happens next')}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {text(['welcome', 'nextSteps', 'language'], 'Pick interface language and timezone')}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {text(
              ['welcome', 'nextSteps', 'workspace'],
              'Set workspace name, currency, and background',
            )}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {text(
              ['welcome', 'nextSteps', 'integrations'],
              'Connect integrations you need right now',
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}
