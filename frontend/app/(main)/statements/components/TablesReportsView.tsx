'use client';

import apiClient from '@/app/lib/api';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AvailableTable,
  DEFAULT_TABLES_REPORTS_FILTERS,
  type TablesReportDrillDownResponse,
  type TablesReportResponse,
  type TablesReportSortKey,
  type TablesReportFlowType,
  formatAmount,
  getComparisonArrow,
  getComparisonColor,
  getSourceLabel,
  loadTablesReportsFilters,
  resolveDays,
  saveTablesReportsFilters,
} from './tables-reports.utils';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function TablesReportsView() {
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TablesReportResponse | null>(null);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFlowType, setActiveFlowType] = useState<TablesReportFlowType>('all');
  const [sortKey, setSortKey] = useState<TablesReportSortKey>('amount');
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<TablesReportDrillDownResponse | null>(null);
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const tableDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = loadTablesReportsFilters();
    setSearchInput(saved.search);
    setDebouncedSearch(saved.search);
    setActiveFlowType(saved.flowType);
    setSortKey(saved.sortBy);
    setSelectedDays(saved.days);
    setSelectedTableIds(saved.tableIds);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!tableDropdownOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (tableDropdownRef.current?.contains(event.target as Node)) return;
      setTableDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [tableDropdownOpen]);

  useEffect(() => {
    saveTablesReportsFilters({
      tableIds: selectedTableIds,
      days: selectedDays,
      flowType: activeFlowType,
      sortBy: sortKey,
      search: searchInput,
    });
  }, [searchInput, selectedTableIds, selectedDays, activeFlowType, sortKey]);

  useEffect(() => {
    let mounted = true;

    apiClient
      .get('/reports/custom-tables/available')
      .then(response => {
        if (!mounted) return;
        setAvailableTables(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setAvailableTables([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const fetchReport = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const payload: {
        days: number;
        flowType: TablesReportFlowType;
        sortBy: TablesReportSortKey;
        search?: string;
        limit: number;
        tableIds?: string[];
      } = {
        days: resolveDays(selectedDays),
        flowType: activeFlowType,
        sortBy: sortKey,
        search: debouncedSearch.trim() || undefined,
        limit: 60,
      };

      if (selectedTableIds.length > 0) {
        payload.tableIds = selectedTableIds;
      }

      const response = await apiClient.post('/reports/custom-tables/report', payload, {
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setReport(response.data);
      }
    } catch {
      if (!controller.signal.aborted) {
        setReport(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [activeFlowType, debouncedSearch, selectedDays, selectedTableIds, sortKey]);

  useEffect(() => {
    void fetchReport();
    return () => abortRef.current?.abort();
  }, [fetchReport]);

  const handleDrillDown = useCallback(
    async (counterparty: string) => {
      setSelectedCounterparty(counterparty);
      try {
        const payload: {
          counterparty: string;
          days: number;
          flowType: TablesReportFlowType;
          limit: number;
          tableIds?: string[];
        } = {
          counterparty,
          days: resolveDays(selectedDays),
          flowType: activeFlowType,
          limit: 120,
        };

        if (selectedTableIds.length > 0) {
          payload.tableIds = selectedTableIds;
        }

        const response = await apiClient.post('/reports/custom-tables/report/drill-down', payload);
        setDrillDown(response.data);
      } catch {
        setDrillDown({ counterparty, items: [] });
      }
    },
    [activeFlowType, selectedDays, selectedTableIds],
  );

  const trendChartOption = useMemo(() => {
    if (!report?.timeseries?.length) return null;
    return {
      xAxis: { type: 'category', data: report.timeseries.map(item => item.date) },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          data: report.timeseries.map(item => item.amount),
          smooth: true,
        },
      ],
    };
  }, [report?.timeseries]);

  const sourceSplitOption = useMemo(() => {
    if (!report) return null;
    return {
      series: [
        {
          type: 'pie',
          data: [
            { value: report.sourceSplit.manual, name: 'Manual' },
            { value: report.sourceSplit.googleSheets, name: 'Google Sheets' },
          ],
        },
      ],
    };
  }, [report]);

  const topRowsBarOption = useMemo(() => {
    if (!report?.aggregatedRows?.length) return null;

    const topRows = report.aggregatedRows.slice(0, 12).reverse();

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 10, right: 30, bottom: 20, left: 140 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: topRows.map(item => item.counterparty),
        axisLabel: { width: 120, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          data: topRows.map(item => item.total),
          barMaxWidth: 28,
          itemStyle: {
            color: '#38BDF8',
            borderRadius: [0, 4, 4, 0],
          },
        },
      ],
    };
  }, [report?.aggregatedRows]);

  const selectedTablesCount = selectedTableIds.length;
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const panelClass =
    'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-900/60';
  const subtlePanelClass =
    'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200';

  return (
    <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 shrink-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tables reports</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aggregated insights from your custom tables
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setActiveFlowType('all')}
              className={
                activeFlowType === 'all'
                  ? 'rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-sky-600 shadow-sm dark:bg-slate-800 dark:text-sky-300'
                  : 'rounded-full px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400'
              }
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFlowType('expense')}
              className={
                activeFlowType === 'expense'
                  ? 'rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-sky-600 shadow-sm dark:bg-slate-800 dark:text-sky-300'
                  : 'rounded-full px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400'
              }
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setActiveFlowType('income')}
              className={
                activeFlowType === 'income'
                  ? 'rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-sky-600 shadow-sm dark:bg-slate-800 dark:text-sky-300'
                  : 'rounded-full px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400'
              }
            >
              Income
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder="Search counterparties, categories, tables..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <div className="relative" ref={tableDropdownRef}>
            <button
              type="button"
              onClick={() => setTableDropdownOpen(open => !open)}
              className={subtlePanelClass}
            >
              Tables
              {selectedTablesCount > 0 ? ` (${selectedTablesCount})` : ''}
            </button>

            {tableDropdownOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                <button
                  type="button"
                  onClick={() => setSelectedTableIds([])}
                  className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm text-sky-700 transition-colors hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-slate-800"
                >
                  All tables
                </button>
                {availableTables.map(table => {
                  const checked = selectedTableIds.includes(table.id);
                  return (
                    <label
                      key={table.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select table ${table.name}`}
                        checked={checked}
                        onChange={() =>
                          setSelectedTableIds(current =>
                            current.includes(table.id)
                              ? current.filter(id => id !== table.id)
                              : [...current, table.id],
                          )
                        }
                      />
                      <span className="flex-1 truncate">{table.name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {getSourceLabel(table.source)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
            <select
              value={selectedDays}
              onChange={event => setSelectedDays(Number(event.target.value))}
              className={`${subtlePanelClass} appearance-none pr-9`}
            >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
            <option value={-1}>Year to date</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          {availableTables.map(table => (
            <button
              key={table.id}
              type="button"
              onClick={() =>
                setSelectedTableIds(current =>
                  current.includes(table.id)
                    ? current.filter(id => id !== table.id)
                    : [...current, table.id],
                )
              }
              className={
                selectedTableIds.includes(table.id)
                  ? 'rounded-full bg-sky-100 px-3 py-1 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800 dark:text-slate-300'
              }
            >
              {table.name} · {getSourceLabel(table.source)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-10 text-sm text-slate-500 dark:text-slate-400">Loading...</div>
        ) : !report || report.totals.operations === 0 ? (
          <div className="py-10 text-sm text-slate-500 dark:text-slate-400">
            No data found for the selected period.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className={panelClass}>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
                <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatAmount(report.totals.total)}
                </div>
                <div className={`mt-1 text-xs ${getComparisonColor(report.comparison.totalTrend)}`}>
                  {getComparisonArrow(report.comparison.totalTrend)} {report.comparison.totalPercentage}%
                </div>
              </div>
              <div className={panelClass}>
                <div className="text-xs text-slate-500 dark:text-slate-400">Manual tables</div>
                <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatAmount(report.totals.manualTotal)}
                </div>
              </div>
              <div className={panelClass}>
                <div className="text-xs text-slate-500 dark:text-slate-400">Google Sheets</div>
                <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatAmount(report.totals.googleSheetsTotal)}
                </div>
              </div>
              <div className={panelClass}>
                <div className="text-xs text-slate-500 dark:text-slate-400">Operations</div>
                <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {report.totals.operations}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={`${panelClass} lg:col-span-2`}>
                <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Trend</div>
                {trendChartOption ? (
                  <ReactECharts option={trendChartOption} style={{ height: 220 }} theme={chartTheme} />
                ) : null}
              </div>
              <div className={panelClass}>
                <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Source split
                </div>
                {sourceSplitOption ? (
                  <ReactECharts option={sourceSplitOption} style={{ height: 220 }} theme={chartTheme} />
                ) : null}
              </div>
            </div>

            {topRowsBarOption ? (
              <div className={`mt-6 ${panelClass}`}>
                <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Top counterparties
                </div>
                <ReactECharts option={topRowsBarOption} style={{ height: 320 }} theme={chartTheme} />
              </div>
            ) : null}

            <div className="mt-6 flex gap-2">
              {(['amount', 'average', 'operations'] as TablesReportSortKey[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortKey(key)}
                  className={
                    sortKey === key
                      ? 'rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                      : 'rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }
                >
                  {key === 'amount' ? 'Amount' : key === 'average' ? 'Average' : 'Operations'}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/70 dark:bg-slate-900/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3 text-right">Operations</th>
                    <th className="px-4 py-3 text-right">Average</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Last operation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.aggregatedRows.map((row, index) => (
                    <tr
                      key={`${row.counterparty}-${row.source}-${index}`}
                      className="cursor-pointer border-b border-slate-100 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/70"
                      tabIndex={0}
                      onClick={() => void handleDrillDown(row.counterparty)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void handleDrillDown(row.counterparty);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.counterparty}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <span
                          className={
                            row.source === 'google_sheets_import'
                              ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }
                        >
                          {getSourceLabel(row.source)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.tableName}</td>
                      <td className="px-4 py-3 text-right">{row.count}</td>
                      <td className="px-4 py-3 text-right">{formatAmount(row.average)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatAmount(row.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {row.lastDate || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCounterparty ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                aria-hidden="true"
              >
                <div
                  className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
                  aria-modal="true"
                  onClick={event => event.stopPropagation()}
                  onKeyDown={event => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700/70">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {`${drillDown?.counterparty || selectedCounterparty} — Drill-down`}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCounterparty(null);
                        setDrillDown(null);
                      }}
                      className="text-slate-500 dark:text-slate-400"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-[calc(80vh-72px)] overflow-y-auto">
                    {drillDown?.items?.length ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Table</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillDown.items.map(item => (
                            <tr
                              key={item.rowId}
                              className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                            >
                              <td className="px-4 py-3">{item.date || '-'}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={
                                    item.source === 'google_sheets_import'
                                      ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                      : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }
                                >
                                  {getSourceLabel(item.source)}
                                </span>
                              </td>
                              <td className="px-4 py-3">{item.tableName}</td>
                              <td className="px-4 py-3">{item.category || '-'}</td>
                              <td className="px-4 py-3 text-right">
                                {formatAmount(item.amount, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400">
                        No records found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
