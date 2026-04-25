'use client';

import type { CategorySortKey, TopCategoryFlowType } from '@/app/(main)/statements/components/top-categories.utils';
import { useTopAnalyticsState, type TopAnalyticsStateReturn } from '@/app/(main)/statements/hooks/useTopAnalyticsState';

export type TopCategoriesStateReturn = TopAnalyticsStateReturn<TopCategoryFlowType, CategorySortKey>;

export const useTopCategoriesState = (): TopCategoriesStateReturn =>
  useTopAnalyticsState<TopCategoryFlowType, CategorySortKey>('lumio-top-categories-filters', 'spend', 'amount');
