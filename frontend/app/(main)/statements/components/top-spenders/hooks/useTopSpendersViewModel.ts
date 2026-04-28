import {
  buildTopSpendersLabels,
  createTx,
} from '@/app/(main)/statements/components/top-spenders/helpers/buildTopSpendersLabels';
import { useTopSpendersData, type TopSpendersDataReturn } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersData';
import { useTopSpendersState, type TopSpendersStateReturn } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersState';
import { useTopAnalyticsViewModel, type TopAnalyticsViewModelReturn } from '@/app/(main)/statements/hooks/useTopAnalyticsViewModel';

export type TopSpendersViewModelReturn = TopAnalyticsViewModelReturn<TopSpendersStateReturn, TopSpendersDataReturn>;

export const useTopSpendersViewModel = (): TopSpendersViewModelReturn =>
  useTopAnalyticsViewModel({ useStateHook: useTopSpendersState, useDataHook: useTopSpendersData, createTx, buildLabels: buildTopSpendersLabels });
