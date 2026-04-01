'use client';

import { BackgroundSelector } from '@/app/(main)/workspaces/components/BackgroundSelector';
import { CurrencySelector } from '@/app/(main)/workspaces/components/CurrencySelector';
import { AVAILABLE_BACKGROUNDS } from '@/app/(main)/workspaces/constants';
import { useIntlayer } from '@/app/i18n';
import { useEffect, useState } from 'react';
import { resolveOnboardingText } from '../lib/resolveOnboardingText';
import type { SupportedLocale } from '../useOnboardingWizard';

interface WorkspaceStepProps {
  locale: SupportedLocale;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceCurrencyChange: (value: string) => void;
  onWorkspaceBackgroundImageChange: (value: string | null) => void;
  onCurrencyPickerOpenChange?: (open: boolean) => void;
}

export function WorkspaceStep({
  locale,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  onWorkspaceNameChange,
  onWorkspaceCurrencyChange,
  onWorkspaceBackgroundImageChange,
  onCurrencyPickerOpenChange,
}: WorkspaceStepProps) {
  const t = useIntlayer('onboardingPage' as any) as any;
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const text = (token: unknown, fallback = '') => resolveOnboardingText(token, fallback, locale);

  useEffect(() => {
    onCurrencyPickerOpenChange?.(currencyPickerOpen);
  }, [currencyPickerOpen, onCurrencyPickerOpenChange]);

  useEffect(
    () => () => {
      onCurrencyPickerOpenChange?.(false);
    },
    [onCurrencyPickerOpenChange],
  );

  const isCustomBackground = Boolean(
    workspaceBackgroundImage && !AVAILABLE_BACKGROUNDS.includes(workspaceBackgroundImage),
  );

  if (currencyPickerOpen) {
    return (
      <section className="space-y-4">
        <div className="w-full">
          <CurrencySelector
            selectedCurrency={workspaceCurrency || null}
            onSelect={value => onWorkspaceCurrencyChange(value)}
            mode="inline"
            open={currencyPickerOpen}
            onOpenChange={setCurrencyPickerOpen}
            showLabel={false}
            showTrigger={false}
            minimal
          />

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setCurrencyPickerOpen(false)}
              className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {text(t.navigation.back, 'Back')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {text(t.workspace.title, 'Set up your first workspace')}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          {text(t.workspace.subtitle, 'Set workspace name and default currency for accurate data tracking.')}
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            htmlFor="workspace-name"
          >
            {text(t.workspace.nameLabel, 'Workspace name')}
          </label>
          <input
            id="workspace-name"
            type="text"
            value={workspaceName}
            onChange={event => onWorkspaceNameChange(event.target.value)}
            placeholder={text(t.workspace.namePlaceholder, 'For example: My Company workspace')}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1">
          <CurrencySelector
            selectedCurrency={workspaceCurrency || null}
            onSelect={value => onWorkspaceCurrencyChange(value)}
            mode="inline"
            open={currencyPickerOpen}
            onOpenChange={setCurrencyPickerOpen}
          />
          <p className="text-xs text-muted-foreground">
            {text(t.workspace.currencyHint, 'This currency will be used by default for new records.')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {text(t.workspace.backgroundLabel, 'Workspace background')}
        </p>

        <BackgroundSelector
          selectedBackground={
            workspaceBackgroundImage && AVAILABLE_BACKGROUNDS.includes(workspaceBackgroundImage)
              ? workspaceBackgroundImage
              : null
          }
          onSelect={onWorkspaceBackgroundImageChange}
          backgrounds={AVAILABLE_BACKGROUNDS}
          compact
        />

        <div className="space-y-1.5">
          <label className="text-xs text-foreground" htmlFor="workspace-custom-background">
            {text(t.workspace.customBackgroundLabel, 'Custom image (URL)')}
          </label>
          <input
            id="workspace-custom-background"
            type="url"
            value={isCustomBackground ? workspaceBackgroundImage || '' : ''}
            onChange={event => onWorkspaceBackgroundImageChange(event.target.value || null)}
            placeholder={text(t.workspace.customBackgroundPlaceholder, 'https://example.com/my-image.jpg')}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground">
            {text(
              t.workspace.customBackgroundHint,
              'Paste your own image URL or choose one of the presets below.',
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
