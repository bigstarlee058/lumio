'use client';

import { Select } from '@/app/components/ui/select';
import { useIntlayer } from '@/app/i18n';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useMemo } from 'react';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';
import type { SupportedLocale } from '../useOnboardingWizard';

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Asia/Almaty',
  'Asia/Astana',
  'Asia/Tashkent',
  'Europe/Berlin',
  'America/New_York',
];

const resolveTimeZoneOptions = () => {
  const supportedValuesOf = (
    globalThis.Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    }
  ).supportedValuesOf;

  if (typeof supportedValuesOf === 'function') {
    try {
      const zones = supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) {
        return zones;
      }
    } catch {
      // Fallback below
    }
  }

  return COMMON_TIMEZONES;
};

interface LanguageStepProps {
  locale: SupportedLocale;
  timeZone: string | null;
  onLocaleChange: (locale: SupportedLocale) => void;
  onTimeZoneChange: (timeZone: string | null) => void;
}

type TimeZoneOption = {
  value: string;
  label: string;
};

function toText(token: unknown, fallback = ''): string {
  if (typeof token === 'string') {
    return token;
  }

  if (token && typeof token === 'object' && 'value' in token) {
    const value = (token as { value?: unknown }).value;
    if (typeof value === 'string') {
      return value;
    }
  }

  if (token !== null && token !== undefined) {
    const stringified = String(token);
    if (stringified && stringified !== '[object Object]') {
      return stringified;
    }
  }

  return fallback;
}

export function LanguageStep({
  locale,
  timeZone,
  onLocaleChange,
  onTimeZoneChange,
}: LanguageStepProps) {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback, locale);
  const timeZoneOptions = useMemo(resolveTimeZoneOptions, []);
  const timezoneSelectOptions = useMemo<TimeZoneOption[]>(
    () => timeZoneOptions.map(zone => ({ value: zone, label: zone })),
    [timeZoneOptions],
  );

  const selectedTimeZoneOption = useMemo<TimeZoneOption | null>(() => {
    if (!timeZone) {
      return null;
    }

    const match = timezoneSelectOptions.find(option => option.value === timeZone);
    if (match) {
      return match;
    }

    return { value: timeZone, label: timeZone };
  }, [timeZone, timezoneSelectOptions]);

  const languageOptions: Array<{ value: SupportedLocale; label: string }> = [
    { value: 'ru', label: text(['language', 'localeOptions', 'ru'], 'Russian') },
    { value: 'en', label: text(['language', 'localeOptions', 'en'], 'English') },
    { value: 'kk', label: text(['language', 'localeOptions', 'kk'], 'Kazakh') },
  ];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
          {text(['language', 'title'], 'Language and timezone')}
        </h2>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--lumio-text-secondary)' }}>
          {text(
            ['language', 'subtitle'],
            'Choose your preferred interface language and timezone for accurate report timestamps.',
          )}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--lumio-text-secondary)',
          }}
          htmlFor="onboarding-locale"
        >
          {text(['language', 'localeLabel'], 'Language')}
        </label>
        <Select
          id="onboarding-locale"
          value={locale}
          onChange={event => onLocaleChange(event.target.value as SupportedLocale)}
        >
          {languageOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--lumio-text-secondary)',
          }}
          htmlFor="onboarding-timezone-select"
        >
          {text(['language', 'timeZoneLabel'], 'Timezone')}
        </label>

        <Autocomplete<TimeZoneOption, false>
          options={timezoneSelectOptions}
          value={selectedTimeZoneOption}
          onChange={(_event, option) => onTimeZoneChange(option?.value ?? null)}
          getOptionLabel={option => option.label}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          noOptionsText={text(['language', 'timeZoneNoOptions'], 'No matching timezones found')}
          renderInput={params => (
            <TextField
              {...params}
              inputProps={{ ...params.inputProps, id: 'onboarding-timezone-select' }}
              size="small"
              placeholder={text(['language', 'timeZonePlaceholder'], 'Select timezone')}
            />
          )}
        />

        <p style={{ fontSize: 14, color: 'var(--lumio-text-secondary)', margin: 0 }}>
          {text(
            ['language', 'timeZoneHint'],
            'You can always change this later in profile settings.',
          )}
        </p>
      </div>
    </section>
  );
}
