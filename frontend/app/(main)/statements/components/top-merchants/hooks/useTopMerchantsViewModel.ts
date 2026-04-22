import {
  buildAnalyticsFilterLabels,
  buildAnalyticsFilterOptions,
  type AnalyticsFilterOptionLabels,
} from '@/app/(main)/statements/helpers/analytics-filter-labels';
import {
  buildTopMerchantsLabels,
  createTx,
} from '@/app/(main)/statements/components/top-merchants/helpers/buildTopMerchantsLabels';
import { useTopMerchantsData, type TopMerchantsDataReturn } from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsData';
import { useTopMerchantsState, type TopMerchantsStateReturn } from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsState';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import { resolveCurrencyCode } from '@/app/lib/analytics-common';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';

type WorkspaceLike = { id: string; name?: string | null };
type SourceLabels = { sourceBank: string; sourceReceipt: string; sourceGmailInbox: string };
type DrillLabels = { drillDown: string; close: string; noOperations: string; lastOperation: string; source: string; workspace: string; amount: string };

export type TopMerchantsViewModelReturn = TopMerchantsStateReturn & TopMerchantsDataReturn & {
  labels: Record<string, string>;
  filterOptions: ReturnType<typeof buildAnalyticsFilterOptions>;
  filterOptionLabels: AnalyticsFilterOptionLabels;
  workspaces: WorkspaceLike[];
  workspaceCurrency: string;
  resolvedTheme: string | undefined;
  sourceLabels: SourceLabels;
  drillLabels: DrillLabels;
};

export const useTopMerchantsViewModel = (): TopMerchantsViewModelReturn => {
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const workspaceCurrency = resolveCurrencyCode(currentWorkspace?.currency);
  const state = useTopMerchantsState();
  const t = useIntlayer('statementsPage');
  const tx = useMemo(() => createTx(t), [t]);
  const labels = useMemo(() => buildTopMerchantsLabels(tx), [tx]);
  const filterOptionLabels = useMemo(() => buildAnalyticsFilterLabels(tx), [tx]);
  const filterOptions = useMemo(() => buildAnalyticsFilterOptions(filterOptionLabels), [filterOptionLabels]);
  const data = useTopMerchantsData({ user, currentWorkspace, workspaces, workspaceCurrency, resolvedTheme, labels, state });
  const sourceLabels = useMemo(() => ({ sourceBank: labels.sourceBank, sourceReceipt: labels.sourceReceipt, sourceGmailInbox: labels.sourceGmailInbox }), [labels]);
  const drillLabels = useMemo(() => ({ drillDown: labels.drillDown, close: labels.close, noOperations: labels.noOperations, lastOperation: labels.lastOperation, source: labels.source, workspace: labels.workspace, amount: labels.amount }), [labels]);
  return { ...state, ...data, labels, filterOptions, filterOptionLabels, workspaces, workspaceCurrency, resolvedTheme, sourceLabels, drillLabels };
};
