import type { AggregateSortKey, TopSpenderFlowType } from '@/app/(main)/statements/components/top-spenders/top-spenders.types';
import { useTopAnalyticsState, type TopAnalyticsStateReturn } from '@/app/(main)/statements/hooks/useTopAnalyticsState';

export type TopSpendersStateReturn = TopAnalyticsStateReturn<TopSpenderFlowType, AggregateSortKey>;

export const useTopSpendersState = (): TopSpendersStateReturn =>
  useTopAnalyticsState<TopSpenderFlowType, AggregateSortKey>('lumio-top-spenders-filters', 'spend', 'amount');
