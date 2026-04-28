import type { AggregateSortKey, TopMerchantFlowType } from '@/app/(main)/statements/components/top-merchants/top-merchants.types';
import { useTopAnalyticsState, type TopAnalyticsStateReturn } from '@/app/(main)/statements/hooks/useTopAnalyticsState';

export type TopMerchantsStateReturn = TopAnalyticsStateReturn<TopMerchantFlowType, AggregateSortKey>;

export const useTopMerchantsState = (): TopMerchantsStateReturn =>
  useTopAnalyticsState<TopMerchantFlowType, AggregateSortKey>('lumio-top-merchants-filters', 'spend', 'amount');
