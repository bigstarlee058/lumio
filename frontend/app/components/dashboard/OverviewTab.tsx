'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  FileUp,
  Flag,
  Inbox,
  Receipt,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { Spinner } from '../ui/spinner';
import { CashFlowMini } from './CashFlowMini';
import { RecentActivity } from './RecentActivity';
import { TopCategoriesCard } from './TopCategoriesCard';

interface OverviewTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
  effectivePeriod?: string | null;
}

// ── Inline SVG sparkline ──────────────────────────────────────────────────────

interface SparkProps {
  points: number[];
  color?: string;
  fill?: boolean;
  h?: number;
  w?: number;
}

function Spark({ points, color = 'var(--lumio-color-primary)', fill = true, h = 38, w = 120 }: SparkProps) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  const fillD = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {fill && <path d={fillD} fill={color} opacity="0.08" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  sub?: string;
  sparkPoints?: number[];
  sparkColor?: string;
}

function StatCard({ label, value, delta, deltaDir = 'flat', sub, sparkPoints, sparkColor }: StatCardProps) {
  return (
    <div className="lumio-dashboard__stat">
      <div className="lumio-dashboard__stat-label">{label}</div>
      <div className="lumio-dashboard__stat-value">{value}</div>
      <div className="lumio-dashboard__stat-row">
        {delta && (
          <span className={`lumio-dashboard__stat-delta lumio-dashboard__stat-delta--${deltaDir}`}>
            {deltaDir === 'up' && <ArrowUp size={12} />}
            {delta}
          </span>
        )}
        {sub && <span className="lumio-dashboard__stat-sub">{sub}</span>}
      </div>
      {sparkPoints && sparkPoints.length >= 2 && (
        <div className="lumio-dashboard__stat-spark" aria-hidden="true">
          <Spark points={sparkPoints} color={sparkColor} />
        </div>
      )}
    </div>
  );
}

// ── Action icon helper ────────────────────────────────────────────────────────

function ActionIcon({ type, size = 15 }: { type: string; size?: number }): React.JSX.Element {
  switch (type) {
    case 'payments_overdue': return <AlertTriangle size={size} />;
    case 'uncategorized_transactions': return <Tag size={size} />;
    case 'parsing_warnings': return <Flag size={size} />;
    case 'receipts_pending_review': return <Receipt size={size} />;
    default: return <Inbox size={size} />;
  }
}

function actionIcoClass(priority: string): string {
  switch (priority) {
    case 'critical': return 'lumio-dashboard__action-ico--critical';
    case 'warning': return 'lumio-dashboard__action-ico--warning';
    case 'success': return 'lumio-dashboard__action-ico--success';
    default: return 'lumio-dashboard__action-ico--info';
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function OverviewTab({ data, formatAmount, range, isLoading, effectivePeriod }: OverviewTabProps) {
  const mappedActions = (data.actions || []).map(a => {
    let priority: 'critical' | 'warning' | 'info' | 'success' = 'info';
    if (a.type === 'payments_overdue') priority = 'critical';
    else if (
      a.type === 'statements_pending_review' ||
      a.type === 'receipts_pending_review' ||
      a.type === 'statements_pending_submit'
    )
      priority = 'warning';
    return { ...a, priority };
  });

  if (data.dataHealth?.parsingWarnings > 0) {
    mappedActions.push({
      type: 'parsing_warnings',
      count: data.dataHealth.parsingWarnings,
      label: 'Parsing issues found',
      href: '/statements?filter=has_errors',
      priority: 'warning' as const,
    });
  }

  const hasNoData =
    data.cashFlow.length === 0 && mappedActions.length === 0 && data.snapshot.totalBalance === 0;

  const rangeLabel = range === '7d' ? '7 days' : range === '90d' ? '90 days' : '30 days';

  // Derive sparklines from cashFlow time-series
  const cfPoints = data.cashFlow.slice(-10);
  const incomePoints = cfPoints.map(p => p.income);
  const expensePoints = cfPoints.map(p => p.expense);
  const netPoints = cfPoints.map(p => p.income - p.expense);

  const uncatCount = data.dataHealth?.uncategorizedTransactions ?? 0;

  // ── Empty state ────────────────────────────────────────────────────────────

  if (hasNoData) {
    return (
      <div className="lumio-dashboard__empty">
        <div className="lumio-dashboard__empty-icon">
          <FileUp size={40} color="var(--lumio-color-ink-400)" />
        </div>
        <h2 className="lumio-dashboard__empty-title">Upload your first statement</h2>
        <p className="lumio-dashboard__empty-desc">
          Start tracking your finances by uploading a bank statement. We&apos;ll parse it
          automatically and show your cash flow, categories, and insights.
        </p>
        <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__empty-cta">
          <FileUp size={16} />
          Parse statement
        </Link>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 40 }}>
      {effectivePeriod && (
        <div className="lumio-dashboard__period-banner">
          Showing latest available period: {effectivePeriod}
        </div>
      )}

      {/* Stat row — 4 cards */}
      <div className="lumio-dashboard__stat-grid">
        <StatCard
          label="Net balance"
          value={isLoading ? <Spinner size={12} /> : formatAmount(Math.abs(data.snapshot.totalBalance))}
          delta={data.snapshot.totalBalance < 0 ? 'Negative' : undefined}
          deltaDir={data.snapshot.totalBalance < 0 ? 'down' : undefined}
          sub={data.snapshot.currency}
          sparkPoints={netPoints.length >= 2 ? netPoints : undefined}
          sparkColor="var(--lumio-color-success)"
        />
        <StatCard
          label="Income"
          value={isLoading ? <Spinner size={12} /> : formatAmount(data.snapshot.income30d)}
          sub={rangeLabel}
          sparkPoints={incomePoints.length >= 2 ? incomePoints : undefined}
          sparkColor="var(--lumio-color-primary)"
        />
        <StatCard
          label="Expenses"
          value={isLoading ? <Spinner size={12} /> : formatAmount(data.snapshot.expense30d)}
          sub={rangeLabel}
          sparkPoints={expensePoints.length >= 2 ? expensePoints : undefined}
          sparkColor="var(--lumio-color-warning)"
        />
        <StatCard
          label="Uncategorized"
          value={isLoading ? <Spinner size={12} /> : String(uncatCount)}
          delta={uncatCount > 0 ? 'Needs review' : 'All clear'}
          deltaDir={uncatCount > 0 ? 'flat' : 'up'}
          sparkColor="var(--lumio-color-danger)"
        />
      </div>

      {/* Main 2fr/1fr grid */}
      <div className="lumio-dashboard__grid">

        {/* ── Cash flow ── */}
        <div className="lumio-dashboard__card lumio-dashboard__cashflow">
          <div className="lumio-dashboard__card-head">
            <div>
              <div className="lumio-dashboard__card-title">Cash flow</div>
              <div className="lumio-dashboard__card-sub">Income vs. expenses · {rangeLabel}</div>
            </div>
            <div className="lumio-dashboard__card-head-actions">
              <span className="lumio-dashboard__legend">
                <span className="lumio-dashboard__legend-dot" style={{ background: 'var(--lumio-color-primary)' }} />
                Income
              </span>
              <span className="lumio-dashboard__legend">
                <span className="lumio-dashboard__legend-dot" style={{ background: 'var(--lumio-color-ink-300)' }} />
                Expense
              </span>
            </div>
          </div>
          <div className="lumio-dashboard__cf-chart">
            <CashFlowMini data={data.cashFlow} emptyLabel="No cash flow data yet" />
          </div>
        </div>

        {/* ── Top categories ── */}
        <div className="lumio-dashboard__card lumio-dashboard__categories">
          <div className="lumio-dashboard__card-head">
            <div>
              <div className="lumio-dashboard__card-title">Top categories</div>
              <div className="lumio-dashboard__card-sub">{rangeLabel}</div>
            </div>
            <Link href="/reports" className="lumio-dashboard__card-link-btn">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="lumio-dashboard__cat-chart">
            <TopCategoriesCard categories={data.topCategories ?? []} />
          </div>
        </div>

        {/* ── Recent activity ── */}
        <div className="lumio-dashboard__card-shell lumio-dashboard__activity">
          <div className="lumio-dashboard__card-shell-head">
            <div>
              <div className="lumio-dashboard__card-title">Recent activity</div>
              <div className="lumio-dashboard__card-sub">Across all connected accounts</div>
            </div>
            <Link href="/statements" className="lumio-dashboard__card-link-btn">
              All transactions <ArrowRight size={13} />
            </Link>
          </div>
          <div className="lumio-dashboard__card-shell-body">
            <RecentActivity
              activities={data.recentActivity ?? []}
              formatAmount={formatAmount}
              title="Recent activity"
              emptyLabel="No recent activity yet"
            />
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="lumio-dashboard__card lumio-dashboard__actions">
          <div className="lumio-dashboard__card-title" style={{ marginBottom: 16 }}>Quick actions</div>
          {mappedActions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--lumio-color-ink-400)', textAlign: 'center', padding: '24px 0' }}>
              No actions needed
            </div>
          ) : (
            <div className="lumio-dashboard__action-list">
              {mappedActions.slice(0, 5).map((action) => (
                <Link
                  key={action.type}
                  href={action.href}
                  className="lumio-dashboard__action-row"
                >
                  <div className={`lumio-dashboard__action-ico ${actionIcoClass(action.priority)}`}>
                    <ActionIcon type={action.type} />
                  </div>
                  <div className="lumio-dashboard__action-body">
                    <div className="lumio-dashboard__action-title">{action.label}</div>
                    {action.count > 0 && (
                      <div className="lumio-dashboard__action-sub">{action.count} item{action.count !== 1 ? 's' : ''} to review</div>
                    )}
                  </div>
                  <ChevronRight size={14} className="lumio-dashboard__action-chevron" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Upload zone ── */}
        <div className="lumio-dashboard__card lumio-dashboard__upload">
          <Link href="/statements?openExpenseDrawer=scan" className="lumio-dashboard__upload-zone">
            <div className="lumio-dashboard__upload-ico">
              <FileUp size={20} />
            </div>
            <div className="lumio-dashboard__upload-title">Drop a statement here</div>
            <div className="lumio-dashboard__upload-sub">
              PDF, CSV, XLSX up to 10 MB
            </div>
            <div className="lumio-dashboard__upload-formats">
              <span className="lumio-dashboard__format-tag">PDF</span>
              <span className="lumio-dashboard__format-tag">CSV</span>
              <span className="lumio-dashboard__format-tag">XLSX</span>
              <span className="lumio-dashboard__format-tag">JPG/PNG</span>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
