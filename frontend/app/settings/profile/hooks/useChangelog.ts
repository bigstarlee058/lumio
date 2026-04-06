'use client';

import type { ChangelogEntry } from '@/app/components/ChangelogModal';
import type { ChangelogPayload } from '@/app/settings/profile/profileHelpers';
import { useEffect, useState } from 'react';

export type UseChangelogReturn = {
  changelogEntries: ChangelogEntry[];
  changelogLoading: boolean;
  changelogSelectedEntry: ChangelogEntry | null;
  setChangelogSelectedEntry: (entry: ChangelogEntry | null) => void;
};

export function useChangelog(
  isAuthenticated: boolean,
  activeSection: string,
  workspaceReady: boolean,
): UseChangelogReturn {
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogSelectedEntry, setChangelogSelectedEntry] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'changelog') return;
    if (!workspaceReady) return;

    let cancelled = false;

    const loadChangelog = async () => {
      try {
        setChangelogLoading(true);
        const response = await fetch('/changelog.json', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Failed to load changelog: ${response.status}`);
        }

        const payload = (await response.json()) as ChangelogPayload;
        if (!cancelled) {
          setChangelogEntries(Array.isArray(payload.entries) ? payload.entries : []);
        }
      } catch {
        if (!cancelled) {
          setChangelogEntries([]);
        }
      } finally {
        if (!cancelled) {
          setChangelogLoading(false);
        }
      }
    };

    void loadChangelog();

    return () => {
      cancelled = true;
    };
  }, [activeSection, isAuthenticated, workspaceReady]);

  return {
    changelogEntries,
    changelogLoading,
    changelogSelectedEntry,
    setChangelogSelectedEntry,
  };
}
