'use client';

import apiClient from '@/app/lib/api';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const panelStyle: React.CSSProperties = { border: '1px solid #e2e8f0', background: 'var(--card-bg)', padding: 16, borderRadius: 0 };
  const subtlePanelStyle: React.CSSProperties = { border: '1px solid #e2e8f0', background: 'var(--card-bg)', padding: '8px 16px', fontSize: 14, color: '#334155', borderRadius: 0, cursor: 'pointer' };

  return (
    <div
      className="container-shared"
      style={{ display: 'flex', height: 'calc(100vh - var(--global-nav-height,0px))', minHeight: 0, flexDirection: 'column', overflow: 'hidden', padding: '24px 16px' }}
    >
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a' }}>Tables reports</h1>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              Aggregated insights from your custom tables
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #e2e8f0', background: '#f1f5f9', padding: 4, borderRadius: 9999 }}>
            <button
              type="button"
              onClick={() => setActiveFlowType('all')}
              style={{
                borderRadius: 9999,
                background: activeFlowType === 'all' ? '#fff' : 'transparent',
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: activeFlowType === 'all' ? 600 : 400,
                color: activeFlowType === 'all' ? '#0284c7' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeFlowType === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFlowType('expense')}
              style={{
                borderRadius: 9999,
                background: activeFlowType === 'expense' ? '#fff' : 'transparent',
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: activeFlowType === 'expense' ? 600 : 400,
                color: activeFlowType === 'expense' ? '#0284c7' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeFlowType === 'expense' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setActiveFlowType('income')}
              style={{
                borderRadius: 9999,
                background: activeFlowType === 'income' ? '#fff' : 'transparent',
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: activeFlowType === 'income' ? 600 : 400,
                color: activeFlowType === 'income' ? '#0284c7' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeFlowType === 'income' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Income
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder="Search counterparties, categories, tables..."
            style={{ width: '100%', border: '1px solid #e2e8f0', background: 'var(--card-bg)', padding: '8px 16px', fontSize: 14, color: '#0f172a', outline: 'none', borderRadius: 0 }}
          />
          <div style={{ position: 'relative' }} ref={tableDropdownRef}>
            <button
              type="button"
              onClick={() => setTableDropdownOpen(open => !open)}
              style={subtlePanelStyle}
            >
              Tables
              {selectedTablesCount > 0 ? ` (${selectedTablesCount})` : ''}
            </button>

            {tableDropdownOpen ? (
              <div style={{ position: 'absolute', right: 0, zIndex: 20, marginTop: 8, width: 288, border: '1px solid #e2e8f0', background: 'var(--card-bg)', padding: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: 0 }}>
                <button
                  type="button"
                  onClick={() => setSelectedTableIds([])}
                  style={{ marginBottom: 4, width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 14, color: '#0369a1', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 0 }}
                >
                  All tables
                </button>
                {availableTables.map(table => {
                  const checked = selectedTableIds.includes(table.id);
                  return (
                    <label
                      key={table.id}
                      style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 14, color: '#334155', borderRadius: 0 }}
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
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{table.name}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
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
            style={{ ...subtlePanelStyle, appearance: 'none', paddingRight: 36 }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
            <option value={-1}>Year to date</option>
          </select>
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#64748b' }}>
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
              style={{
                borderRadius: 9999,
                background: selectedTableIds.includes(table.id) ? '#e0f2fe' : '#f1f5f9',
                padding: '4px 12px',
                color: selectedTableIds.includes(table.id) ? '#0369a1' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {table.name} · {getSourceLabel(table.source)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px 0', fontSize: 14, color: '#64748b' }}>Loading...</div>
        ) : !report || report.totals.operations === 0 ? (
          <div style={{ padding: '40px 0', fontSize: 14, color: '#64748b' }}>
            No data found for the selected period.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div style={panelStyle}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Total</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {formatAmount(report.totals.total)}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: getComparisonColor(report.comparison.totalTrend).includes('emerald') ? '#059669' : getComparisonColor(report.comparison.totalTrend).includes('red') ? '#dc2626' : '#6b7280' }}>
                  {getComparisonArrow(report.comparison.totalTrend)} {report.comparison.totalPercentage}%
                </div>
              </div>
              <div style={panelStyle}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Manual tables</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {formatAmount(report.totals.manualTotal)}
                </div>
              </div>
              <div style={panelStyle}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Google Sheets</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {formatAmount(report.totals.googleSheetsTotal)}
                </div>
              </div>
              <div style={panelStyle}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Operations</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {report.totals.operations}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div style={{ ...panelStyle, gridColumn: 'span 2' }}>
                <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#334155' }}>Trend</div>
                {trendChartOption ? (
                  <ReactECharts option={trendChartOption} style={{ height: 220 }} theme={chartTheme} />
                ) : null}
              </div>
              <div style={panelStyle}>
                <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#334155' }}>
                  Source split
                </div>
                {sourceSplitOption ? (
                  <ReactECharts option={sourceSplitOption} style={{ height: 220 }} theme={chartTheme} />
                ) : null}
              </div>
            </div>

            {topRowsBarOption ? (
              <div style={{ marginTop: 24, ...panelStyle }}>
                <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#334155' }}>
                  Top counterparties
                </div>
                <ReactECharts option={topRowsBarOption} style={{ height: 320 }} theme={chartTheme} />
              </div>
            ) : null}

            <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
              {(['amount', 'average', 'operations'] as TablesReportSortKey[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortKey(key)}
                  style={{
                    borderRadius: 9999,
                    background: sortKey === key ? '#e0f2fe' : '#f1f5f9',
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: sortKey === key ? 500 : 400,
                    color: sortKey === key ? '#0369a1' : '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {key === 'amount' ? 'Amount' : key === 'average' ? 'Average' : 'Operations'}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: 'var(--card-bg)', borderRadius: 0 }}>
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Counterparty</th>
                    <th style={{ padding: '12px 16px' }}>Source</th>
                    <th style={{ padding: '12px 16px' }}>Table</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Operations</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Average</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Last operation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.aggregatedRows.map((row, index) => (
                    <tr
                      key={`${row.counterparty}-${row.source}-${index}`}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155' }}
                      tabIndex={0}
                      onClick={() => void handleDrillDown(row.counterparty)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void handleDrillDown(row.counterparty);
                        }
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                        {row.counterparty}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            borderRadius: 9999,
                            background: row.source === 'google_sheets_import' ? '#ecfdf5' : '#f1f5f9',
                            padding: '2px 8px',
                            fontSize: 12,
                            fontWeight: 500,
                            color: row.source === 'google_sheets_import' ? '#065f46' : '#475569',
                          }}
                        >
                          {getSourceLabel(row.source)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{row.tableName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.count}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatAmount(row.average)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#0f172a' }}>
                        {formatAmount(row.total)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        {row.lastDate || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCounterparty ? (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: '0 16px' }}
                aria-hidden="true"
              >
                <div
                  style={{ maxHeight: '80vh', width: '100%', maxWidth: 768, overflow: 'hidden', background: 'var(--card-bg)', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', borderRadius: 0 }}
                  aria-modal="true"
                  onClick={event => event.stopPropagation()}
                  onKeyDown={event => event.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
                      {`${drillDown?.counterparty || selectedCounterparty} — Drill-down`}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCounterparty(null);
                        setDrillDown(null);
                      }}
                      style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ maxHeight: 'calc(80vh - 72px)', overflowY: 'auto' }}>
                    {drillDown?.items?.length ? (
                      <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>Date</th>
                            <th style={{ padding: '12px 16px' }}>Source</th>
                            <th style={{ padding: '12px 16px' }}>Table</th>
                            <th style={{ padding: '12px 16px' }}>Category</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillDown.items.map(item => (
                            <tr
                              key={item.rowId}
                              style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}
                            >
                              <td style={{ padding: '12px 16px' }}>{item.date || '-'}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    borderRadius: 9999,
                                    background: item.source === 'google_sheets_import' ? '#ecfdf5' : '#f1f5f9',
                                    padding: '2px 8px',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: item.source === 'google_sheets_import' ? '#065f46' : '#475569',
                                  }}
                                >
                                  {getSourceLabel(item.source)}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>{item.tableName}</td>
                              <td style={{ padding: '12px 16px' }}>{item.category || '-'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                {formatAmount(item.amount, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '32px 24px', fontSize: 14, color: '#64748b' }}>
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
