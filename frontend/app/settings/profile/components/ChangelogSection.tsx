'use client';

import { type ChangelogEntry, ChangelogModal } from '@/app/components/ChangelogModal';
import { CalendarDays, Clock3, FileText } from 'lucide-react';

type Props = {
  tx: (path: string[], fallback: string) => string;
  locale: string | undefined;
  changelogEntries: ChangelogEntry[];
  changelogLoading: boolean;
  changelogSelectedEntry: ChangelogEntry | null;
  setChangelogSelectedEntry: (entry: ChangelogEntry | null) => void;
};

export function ChangelogSection({
  tx,
  locale,
  changelogEntries,
  changelogLoading,
  changelogSelectedEntry,
  setChangelogSelectedEntry,
}: Props) {
  const releaseLabelText = tx(['changelogCard', 'releaseLabel'], 'Release');
  const closeLabelText = tx(['changelogCard', 'closeLabel'], 'Close changelog');
  const emptyText = tx(['changelogCard', 'empty'], 'No published updates yet.');
  const loadingText = tx(['changelogCard', 'loading'], 'Loading changelog...');
  const openDetailsText = tx(['changelogCard', 'openDetails'], 'Open details');

  const formattedEntries = changelogEntries.map(entry => {
    const date = new Date(entry.date);
    const formattedDate = Number.isNaN(date.getTime())
      ? entry.date
      : new Intl.DateTimeFormat(locale || 'ru', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(date);

    return { ...entry, dateLabel: formattedDate };
  });

  return (
    <div className="space-y-4">
      {changelogLoading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
          {loadingText}
        </div>
      ) : formattedEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {formattedEntries.map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setChangelogSelectedEntry(entry)}
              className="w-full rounded-2xl border border-border bg-card px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
                    {entry.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {entry.summary}
                  </p>
                </div>

                {entry.version ? (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                    {entry.version}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {entry.dateLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {openDetailsText}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <ChangelogModal
        isOpen={Boolean(changelogSelectedEntry)}
        onClose={() => setChangelogSelectedEntry(null)}
        entry={changelogSelectedEntry}
        releaseLabel={releaseLabelText}
        closeLabel={closeLabelText}
      />
    </div>
  );
}
