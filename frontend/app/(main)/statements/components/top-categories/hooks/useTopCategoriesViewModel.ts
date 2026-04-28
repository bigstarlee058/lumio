import {
  buildTopCategoriesLabels,
  createTx,
} from '@/app/(main)/statements/components/top-categories/helpers/buildTopCategoriesLabels';
import { useTopCategoriesData, type TopCategoriesDataReturn } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesData';
import { useTopCategoriesState, type TopCategoriesStateReturn } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesState';
import { useTopAnalyticsViewModel, type TopAnalyticsViewModelReturn } from '@/app/(main)/statements/hooks/useTopAnalyticsViewModel';

export type TopCategoriesViewModelReturn = TopAnalyticsViewModelReturn<TopCategoriesStateReturn, TopCategoriesDataReturn>;

export const useTopCategoriesViewModel = (): TopCategoriesViewModelReturn =>
  useTopAnalyticsViewModel({ useStateHook: useTopCategoriesState, useDataHook: useTopCategoriesData, createTx, buildLabels: buildTopCategoriesLabels });
