'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import { Tab, Tabs } from '@mui/material';
import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataHealthTab } from '@/app/components/dashboard/DataHealthTab';
import { ExportDropdown } from '@/app/components/dashboard/ExportDropdown';
import { OverviewTab } from '@/app/components/dashboard/OverviewTab';
import { TrendsTab } from '@/app/components/dashboard/TrendsTab';
import { Card, CardContent } from '@/app/components/ui/card';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useDashboard } from '@/app/hooks/useDashboard';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { resolveDashboardStatusHeading } from '@/app/lib/dashboard-status-heading';

const resolveLocale = (locale: string) => {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'kk') return 'kk-KZ';
  return 'en-US';
};

const statusHeadingFallback: Record<string, string> = {
  error: 'Data unavailable',
  loading: 'Loading...',
  empty: 'No data yet',
  overdue: 'Overdue payments',
  needsReview: 'Needs review',
  pendingSubmit: 'Pending submit',
  receiptsNeedReview: 'Receipts need review',
  parsingIssues: 'Parsing issues',
  uncategorized: 'Uncategorized items',
  stale: 'Data is stale',
  negativeFlow: 'Negative cash flow',
  positiveFlow: 'Positive cash flow',
  breakEven: 'Break-even period',
  allClear: 'All good',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('dashboardPage' as any) as any;
  const text = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'value' in value) {
      const tokenValue = (value as { value?: string }).value;
      if (typeof tokenValue === 'string') return tokenValue;
    }
    return '';
  };
  const fillTemplate = (template: string, values: Record<string, string>) => {
    return Object.entries(values).reduce((acc, [key, value]) => {
      return acc.split(`{${key}}`).join(value);
    }, template);
  };
  const isMobile = useIsMobile();
  const { data, loading, error, refresh, range } = useDashboard('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'data-health'>('overview');

  const needsOnboarding = user?.onboardingCompletedAt == null;

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (!currentWorkspace) {
      router.replace('/workspaces');
    }
  }, [authLoading, currentWorkspace, needsOnboarding, router, user, workspaceLoading]);

  const {
    handlers: pullToRefreshHandlers,
    pullDistance,
    isRefreshing: pullRefreshing,
    isReadyToRefresh,
  } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: () => refresh(),
  });

  const formatAmount = useCallback(
    (value: number) => {
      return new Intl.NumberFormat(resolveLocale(locale), {
        style: 'currency',
        currency: data?.snapshot?.currency || 'KZT',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    },
    [locale, data?.snapshot?.currency],
  );

  const isRedirecting =
    authLoading || workspaceLoading || !user || needsOnboarding || !currentWorkspace;

  const greetingName = user?.name || text(t.greeting?.fallbackName) || 'User';
  const pendingReviewCount = data?.dataHealth?.statementsPendingReview ?? 0;
  const lastUploadDate = data?.dataHealth?.lastUploadDate;
  const daysSinceUpload = lastUploadDate
    ? Math.floor((Date.now() - new Date(lastUploadDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isEmptyWorkspace = !lastUploadDate;
  const isStaleImport = !isEmptyWorkspace && daysSinceUpload !== null && daysSinceUpload >= 14;
  const greetingCopy = isEmptyWorkspace
    ? t.greeting?.empty
    : pendingReviewCount > 0
      ? t.greeting?.pendingReview
      : isStaleImport
        ? t.greeting?.stale
        : t.greeting?.upToDate;
  const greetingSubtitle = fillTemplate(text(greetingCopy?.subtitle), {
    name: greetingName,
    count: String(pendingReviewCount),
    days: '14',
  });
  const statusHeadingKey = useMemo(
    () =>
      resolveDashboardStatusHeading({
        data,
        error,
        loading,
      }),
    [data, error, loading],
  );
  const statusHeading = text(t.statusHeading?.[statusHeadingKey]) || statusHeadingFallback[statusHeadingKey];
  const effectivePeriod = resolveDashboardEffectivePeriod(data?.effectiveSince, data?.effectiveEndDate);

  if (isRedirecting) {
    return (
      <div className="flex min-h-[calc(100vh-var(--global-nav-height,0px))] items-center justify-center bg-background">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <main
      className="min-h-[calc(100vh-var(--global-nav-height,0px))] bg-background text-foreground flex flex-col font-sans"
      {...pullToRefreshHandlers}
    >
      <div className="w-full flex-1 flex flex-col">
        {isMobile && (pullDistance > 0 || pullRefreshing) ? (
          <div className="pointer-events-none flex justify-center pt-4">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                isReadyToRefresh || pullRefreshing
                  ? 'border-primary/40 text-primary bg-card'
                  : 'border-border text-muted-foreground bg-card'
              }`}
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${pullRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {pullRefreshing
                  ? text(t.refresh?.loading)
                  : isReadyToRefresh
                    ? text(t.refresh?.ready)
                    : text(t.refresh?.idle)}
              </span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="px-8 pt-6">
            <Card className="border-rose-200 bg-rose-50 shadow-sm">
              <CardContent className="flex items-center gap-2 px-4 py-3 text-sm text-rose-700">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="ml-auto rounded-full p-1 text-rose-600 transition-colors hover:bg-rose-100"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="px-8 pt-8 flex items-center justify-center min-h-[50vh]">
            <Spinner className="h-10 w-10 text-white" />
          </div>
        ) : null}

        {data ? (
          <div className="px-10 pt-10 w-full shrink-0 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1
                  className="text-[32px] md:text-[40px] font-medium text-foreground tracking-tight"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  {statusHeading}
                </h1>
                <p className="mt-1 text-[14px] text-muted-foreground">{greetingSubtitle}</p>
              </div>

              <div className="flex items-center gap-3">
                <ExportDropdown t={t.exportMenu} />
                <Link
                  href="/statements?openExpenseDrawer=scan"
                  className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-white transition-colors hover:bg-[var(--primary-hover)]"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <title>New Record</title>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span
                    className="text-[13px] font-medium"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    New Record
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex items-end justify-between border-b border-border pb-0 w-full mt-2">
              <div className="flex px-2">
                <Tabs
                  value={activeTab}
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{
                    minHeight: '48px',
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'var(--primary)',
                      height: '2px',
                    },
                    '& .MuiTabs-flexContainer': {
                      gap: '40px',
                    },
                    '& .MuiTab-root:hover': {
                      backgroundColor: 'transparent !important',
                      color: 'var(--foreground)',
                    },
                  }}
                >
                  <Tab
                    value="overview"
                    label="Overview"
                    disableRipple
                    sx={{
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-dashboard-mono)',
                      textTransform: 'uppercase',
                      color: 'var(--muted-foreground)',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: 'var(--foreground)' },
                    }}
                  />
                  <Tab
                    value="trends"
                    label="Trends"
                    disableRipple
                    sx={{
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-dashboard-mono)',
                      textTransform: 'uppercase',
                      color: 'var(--muted-foreground)',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: 'var(--foreground)' },
                    }}
                  />
                  <Tab
                    value="data-health"
                    label="Data Health"
                    disableRipple
                    sx={{
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-dashboard-mono)',
                      textTransform: 'uppercase',
                      color: 'var(--muted-foreground)',
                      minWidth: 'auto',
                      padding: '0 0 16px 0',
                      '&.Mui-selected': { color: 'var(--foreground)' },
                    }}
                  />
                </Tabs>
              </div>
            </div>
          </div>
        ) : null}

        {data ? (
          <div className="bg-background w-full px-10 py-8 flex-1 pb-12">
            {activeTab === 'overview' && (
              <OverviewTab
                data={data}
                formatAmount={formatAmount}
                range={range}
                isLoading={loading}
                effectivePeriod={effectivePeriod}
              />
            )}

            {activeTab === 'trends' && (
              <TrendsTab
                data={data}
                formatAmount={formatAmount}
                range={range}
                isLoading={loading}
              />
            )}

            {activeTab === 'data-health' && (
              <DataHealthTab
                data={data}
                formatAmount={formatAmount}
                range={range}
                isLoading={loading}
              />
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
