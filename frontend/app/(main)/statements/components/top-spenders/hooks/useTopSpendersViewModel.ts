import {
  buildTopSpendersLabels,
  createTx,
} from '@/app/(main)/statements/components/top-spenders/helpers/buildTopSpendersLabels';
import {
  type TopSpendersDataReturn,
  useTopSpendersData,
} from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersData';
import {
  type TopSpendersStateReturn,
  useTopSpendersState,
} from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersState';
import {
  type TopAnalyticsViewModelReturn,
  useTopAnalyticsViewModel,
} from '@/app/(main)/statements/hooks/useTopAnalyticsViewModel';

export type TopSpendersViewModelReturn = TopAnalyticsViewModelReturn<
  TopSpendersStateReturn,
  TopSpendersDataReturn
>;

export const useTopSpendersViewModel = (): TopSpendersViewModelReturn =>
  useTopAnalyticsViewModel({
    useStateHook: useTopSpendersState,
    useDataHook: useTopSpendersData,
    createTx,
    buildLabels: buildTopSpendersLabels,
  });
