'use client';

import { DataHealthTab } from '@/app/components/dashboard/DataHealthTab';
import { ExportDropdown } from '@/app/components/dashboard/ExportDropdown';
import { OverviewTab } from '@/app/components/dashboard/OverviewTab';
import { TrendsTab } from '@/app/components/dashboard/TrendsTab';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useDashboard } from '@/app/hooks/useDashboard';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';
import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { resolveDashboardStatusHeading } from '@/app/lib/dashboard-status-heading';
import Box from '@mui/material/Box';
import { Tab, Tabs } from '@mui/material';
import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const t = useIntlayer('dashboardPage');
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
  const statusHeading =
    text(t.statusHeading?.[statusHeadingKey]) || statusHeadingFallback[statusHeadingKey];
  const effectivePeriod = resolveDashboardEffectivePeriod(
    data?.effectiveSince,
    data?.effectiveEndDate,
  );

  if (isRedirecting) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: 'calc(100vh - var(--global-nav-height,0px))',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size={40} />
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: 'calc(100vh - var(--global-nav-height,0px))', display: 'flex', flexDirection: 'column' }}
      {...pullToRefreshHandlers}
    >
      <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (pullDistance > 0 || pullRefreshing) ? (
          <div
            style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'center', paddingTop: 16 }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 9999,
                border: '1px solid',
                borderColor:
                  isReadyToRefresh || pullRefreshing
                    ? 'rgba(var(--primary-rgb),0.4)'
                    : '#e5e7eb',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                backgroundColor: 'var(--card-bg)',
                color: isReadyToRefresh || pullRefreshing ? 'var(--primary)' : '#6b7280',
              }}
            >
              <RefreshCcw
                style={{ width: 14, height: 14 }}
                className={pullRefreshing ? 'animate-spin' : undefined}
              />
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
          <Box sx={{ px: 8, pt: 6 }}>
            <Box sx={{ border: '1px solid #fecaca', bgcolor: '#fff1f2', p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  fontSize: 14,
                  color: '#be123c',
                }}
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => refresh()}
                  style={{
                    marginLeft: 'auto',
                    padding: 4,
                    borderRadius: '50%',
                    color: '#be123c',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCcw style={{ width: 16, height: 16 }} />
                </button>
              </Box>
            </Box>
          </Box>
        ) : null}

        {loading && !data ? (
          <Box
            sx={{
              px: 8,
              pt: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
            }}
          >
            <Spinner size={40} />
          </Box>
        ) : null}

        {data ? (
          <Box
            sx={{
              px: { xs: 2, md: 10 },
              pt: { xs: 4, md: 10 },
              width: '100%',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { md: 'center' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <h1 style={{ fontFamily: 'var(--font-dashboard-mono)' }}>{statusHeading}</h1>
                <p style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>{greetingSubtitle}</p>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ExportDropdown t={t.exportMenu} />
                <Link
                  href="/statements?openExpenseDrawer=scan"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--primary)',
                    padding: '10px 20px',
                    color: 'white',
                    textDecoration: 'none',
                  }}
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
                  <span style={{ fontFamily: 'var(--font-dashboard-mono)' }}>New Record</span>
                </Link>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                width: '100%',
                mt: 1,
              }}
            >
              <Box sx={{ display: 'flex', px: 1 }}>
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
              </Box>
            </Box>
          </Box>
        ) : null}

        {data ? (
          <Box sx={{ width: '100%', px: { xs: 2, md: 10 }, py: 4, flex: 1, pb: 6 }}>
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
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
