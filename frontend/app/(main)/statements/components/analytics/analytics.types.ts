import type { SourceChannel } from '@/app/(main)/statements/components/shared-analytics.utils';

/** Base shape shared by all analytics aggregate rows (spenders, merchants, categories). */
export type BaseAnalyticsRecord = {
  id: string;
  count: number;
  total: number;
  average: number;
  lastDate?: string | null;
  sourceChannel: SourceChannel;
};
