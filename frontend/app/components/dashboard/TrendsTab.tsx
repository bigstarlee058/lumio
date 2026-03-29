'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { useDashboardTrends } from '@/app/hooks/useDashboard';
import { resolveDashboardEffectivePeriod } from '@/app/lib/dashboard-effective-window';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TrendsTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

export function TrendsTab({ formatAmount }: TrendsTabProps) {
  const [days, setDays] = useState<number>(30);
  const { resolvedTheme } = useTheme();
  const { data: trendsData, loading, error } = useDashboardTrends(days);
  const effectivePeriod = resolveDashboardEffectivePeriod(
    trendsData?.effectiveSince,
    trendsData?.effectiveEndDate,
  );

  const dailyTrendOption = useMemo(() => {
    if (!trendsData?.dailyTrend?.length) return null;
    const isDark = resolvedTheme === 'dark';
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#151C24' : '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: isDark ? '#E2E8F0' : '#F5F3EF', fontSize: 12 },
      },
      legend: {
        data: ['Income', 'Expense'],
        top: 0,
        right: 0,
        textStyle: { color: isDark ? '#8899AA' : '#555555', fontSize: 11, fontFamily: 'var(--font-dashboard-sans)' },
        icon: 'rect',
        itemWidth: 12,
        itemHeight: 6,
      },
      grid: { left: 40, right: 0, top: 40, bottom: 24 },
      xAxis: {
        type: 'category',
        data: trendsData.dailyTrend.map(p => p.date),
        axisLabel: { color: isDark ? '#8899AA' : '#555555', fontSize: 10, fontFamily: 'var(--font-dashboard-sans)' },
        axisLine: { lineStyle: { color: isDark ? '#2A3442' : '#D1CCC4' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: isDark ? '#8899AA' : '#555555', fontSize: 10, fontFamily: 'var(--font-dashboard-sans)' },
        splitLine: { lineStyle: { color: isDark ? '#2A3442' : '#D1CCC4' } },
      },
      series: [
        {
          name: 'Income',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: trendsData.dailyTrend.map(p => p.income),
          areaStyle: { color: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(26,26,26,0.05)' },
          lineStyle: { color: isDark ? '#34D399' : '#1a1a1a', width: 2 },
          itemStyle: { color: isDark ? '#34D399' : '#1a1a1a' },
        },
        {
          name: 'Expense',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: trendsData.dailyTrend.map(p => p.expense),
          areaStyle: { color: 'rgba(209,61,86,0.08)' },
          lineStyle: { color: '#D13D56', width: 2 },
          itemStyle: { color: '#D13D56' },
        },
      ],
    };
  }, [resolvedTheme, trendsData]);

  const rosePieOption = useMemo(() => {
    if (!trendsData?.categories?.length) return null;
    const top10 = trendsData.categories.slice(0, 10);
    const isDark = resolvedTheme === 'dark';
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#151C24' : '#1a1a1a',
        borderColor: 'transparent',
        textStyle: { color: isDark ? '#E2E8F0' : '#F5F3EF', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: isDark ? '#8899AA' : '#555555', fontSize: 11, fontFamily: 'var(--font-dashboard-sans)' },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          name: 'Expense categories',
          type: 'pie',
          radius: ['20%', '60%'],
          center: ['50%', '45%'],
          roseType: 'radius',
          label: { show: false },
          data: top10.map(c => ({ name: c.name, value: Number(c.amount.toFixed(2)) })),
        },
      ],
    };
  }, [resolvedTheme, trendsData]);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {effectivePeriod ? (
        <div
          className="rounded-xl border border-border bg-muted/70 px-4 py-3 text-[12px] text-muted-foreground backdrop-blur-md"
          style={{ fontFamily: 'var(--font-dashboard-sans)' }}
        >
          Showing latest available period: {effectivePeriod}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1
          className="text-[30px] font-bold text-foreground"
          style={{ fontFamily: 'var(--font-dashboard-mono)' }}
        >
          TRENDS DASHBOARD
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-[1px] transition-colors ${
              days === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card/90 text-muted-foreground backdrop-blur-md hover:bg-muted'
            }`}
            style={{ fontFamily: 'var(--font-dashboard-mono)' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-[#1a1a1a]" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center py-12">
          <p
            className="text-[13px] text-[#D13D56]"
            style={{ fontFamily: 'var(--font-dashboard-sans)' }}
          >
            {error}
          </p>
        </div>
      )}

      {!loading && !error && !trendsData && (
        <div className="flex items-center justify-center py-12">
          <p
            className="text-[13px] text-muted-foreground"
            style={{ fontFamily: 'var(--font-dashboard-sans)' }}
          >
            No trend data available for this period.
          </p>
        </div>
      )}

      {!loading && !error && trendsData && (
        <>
          <section className="flex flex-col gap-3 mt-4">
            <h2
              className="text-[12px] font-bold tracking-[1px] text-muted-foreground uppercase"
              style={{ fontFamily: 'var(--font-dashboard-mono)' }}
            >
              DATA SOURCES
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:border-border dark:bg-card">
                <h3
                  className="text-[18px] font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  STATEMENTS
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Income
                    </span>
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {formatAmount(trendsData.sources.statements.income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Expense
                    </span>
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {formatAmount(trendsData.sources.statements.expense)}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span
                    className="text-[11px] font-semibold text-emerald-400 tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    SYNCED
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:border-border dark:bg-card">
                <h3
                  className="text-[18px] font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  NET FLOW
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Net
                    </span>
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {formatAmount(
                        Math.abs(
                          trendsData.sources.statements.income -
                            trendsData.sources.statements.expense,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Categories
                    </span>
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {trendsData.categories.length}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span
                    className="text-[11px] font-semibold text-primary tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    ACTIVE
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:border-border dark:bg-card">
                <h3
                  className="text-[18px] font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                >
                  COUNTERPARTIES
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      Total Found
                    </span>
                    <span
                      className="text-[14px] text-muted-foreground"
                      style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                    >
                      {trendsData.counterparties.length}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span
                    className="text-[11px] font-semibold text-muted-foreground tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-dashboard-mono)' }}
                  >
                    READY
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-4">
            <div className="lg:col-span-8 flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/90 p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:border-border dark:bg-card">
              <h3
                className="text-[18px] font-bold text-foreground uppercase"
                style={{ fontFamily: 'var(--font-dashboard-mono)' }}
              >
                SPEND TREND
              </h3>
              {dailyTrendOption ? (
                <div className="flex-1 min-h-[280px]">
                  <ReactECharts
                    option={dailyTrendOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </div>
              ) : (
                <div
                  className="flex h-[280px] items-center justify-center text-[13px] text-muted-foreground"
                  style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                >
                  No trend data available for selected range
                </div>
              )}
            </div>

            <div className="lg:col-span-4 flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/90 p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] dark:border-border dark:bg-card">
              <h3
                className="text-[18px] font-bold text-foreground uppercase"
                style={{ fontFamily: 'var(--font-dashboard-mono)' }}
              >
                CATEGORY BREAKDOWN
              </h3>
              {rosePieOption ? (
                <div className="flex-1 min-h-[280px]">
                  <ReactECharts
                    option={rosePieOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </div>
              ) : (
                <div
                  className="flex h-[280px] items-center justify-center text-[13px] text-muted-foreground"
                  style={{ fontFamily: 'var(--font-dashboard-sans)' }}
                >
                  No categorized transactions to visualize
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
