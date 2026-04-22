'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { useDashboard } from '@/app/hooks/useDashboard';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { resolveDashboardStatusHeading } from '@/app/lib/dashboard-status-heading';
import { useCallback, useMemo, useState } from 'react';
import {
  fillTemplate,
  resolveGreetingState,
  resolveLocale,
  resolveDashboardGreetingData,
  statusHeadingFallback,
  text,
} from '../helpers/dashboard-helpers';
import { useDashboardRedirect } from './useDashboardRedirect';

export type DashboardTabId = 'overview' | 'trends' | 'data-health';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function useDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('dashboardPage');
  const isMobile = useIsMobile();
  const { data, loading, error, refresh, range } = useDashboard('30d');
  const [activeTab, setActiveTab] = useState<DashboardTabId>('overview');
  const isRedirecting = useDashboardRedirect({ user, authLoading, currentWorkspace, workspaceLoading });
  const { handlers: pullHandlers, pullDistance, isRefreshing: pullRefreshing, isReadyToRefresh } = usePullToRefresh({
    enabled: isMobile, onRefresh: () => { void refresh(); },
  });
  const formatAmount = useCallback(
    (value: number): string => new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency', currency: data?.snapshot?.currency ?? 'KZT',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value),
    [locale, data?.snapshot?.currency],
  );
  // eslint-disable-next-line complexity
  const { statusHeading, greetingSubtitle, effectivePeriod } = useMemo(() => {
    const greetingData = resolveDashboardGreetingData({ lastUploadDate: data?.dataHealth?.lastUploadDate ?? null, pendingReviewCount: data?.dataHealth?.statementsPendingReview ?? 0 });
    const greetingState = resolveGreetingState(greetingData);
    const greetingName = user?.name ?? text(t.greeting?.fallbackName) ?? 'User';
    const count = String(data?.dataHealth?.statementsPendingReview ?? 0);
    const subtitle = fillTemplate(text(t.greeting?.[greetingState]?.subtitle), { name: greetingName, count, days: '14' });
    const headingKey = resolveDashboardStatusHeading({ data: data as DashboardData | null, error, loading });
    const heading = text(t.statusHeading?.[headingKey]) || statusHeadingFallback[headingKey];
    const period = resolveDashboardEffectivePeriod(data?.effectiveSince, data?.effectiveEndDate);
    return { statusHeading: heading, greetingSubtitle: subtitle, effectivePeriod: period };
  }, [data, error, loading, t, user?.name]);
  return { data, loading, error, refresh, range, activeTab, setActiveTab, isMobile, pullHandlers, pullDistance, pullRefreshing, isReadyToRefresh, isRedirecting, formatAmount, statusHeading, greetingSubtitle, effectivePeriod, t };
}
