import {
  buildTopMerchantsLabels,
  createTx,
} from '@/app/(main)/statements/components/top-merchants/helpers/buildTopMerchantsLabels';
import { useTopMerchantsData, type TopMerchantsDataReturn } from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsData';
import { useTopMerchantsState, type TopMerchantsStateReturn } from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsState';
import { useTopAnalyticsViewModel, type TopAnalyticsViewModelReturn } from '@/app/(main)/statements/hooks/useTopAnalyticsViewModel';

export type TopMerchantsViewModelReturn = TopAnalyticsViewModelReturn<TopMerchantsStateReturn, TopMerchantsDataReturn>;

export const useTopMerchantsViewModel = (): TopMerchantsViewModelReturn =>
  useTopAnalyticsViewModel({ useStateHook: useTopMerchantsState, useDataHook: useTopMerchantsData, createTx, buildLabels: buildTopMerchantsLabels });
