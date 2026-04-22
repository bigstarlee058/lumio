/**
 * Formats a date string as a relative time label (e.g. "2 hours ago").
 * Falls back to a localised date string for dates older than 7 days.
 */
const toIntlLocale = (locale: string): string => (locale === 'kk' ? 'kk-KZ' : locale);

const formatWithRelativeTime = (
  relativeTime: Intl.RelativeTimeFormat,
  minutes: number,
): string | null => {
  if (minutes < 60) return relativeTime.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relativeTime.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return relativeTime.format(-days, 'day');
  return null;
};

export function formatRelativeTime(value: string, locale: string, justNowLabel: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return justNowLabel;

  const intlLocale = toIntlLocale(locale);
  const relativeTime = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });
  const formatted = formatWithRelativeTime(relativeTime, minutes);

  return formatted ?? date.toLocaleDateString(intlLocale);
}
