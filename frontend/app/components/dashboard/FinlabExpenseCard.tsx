'use client';

import { Info } from '@/app/components/icons';
import type { DashboardCashFlowPoint, DashboardRange } from '@/app/hooks/useDashboard';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabExpenseCardProps {
  data: DashboardCashFlowPoint[];
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

export function FinlabExpenseCard({
  data,
  formatAmount,
  range,
  onRangeChange,
}: FinlabExpenseCardProps) {
  const totalExpense = data.reduce((sum, p) => sum + (p.expense ?? 0), 0);
  const mid = Math.floor(data.length / 2);
  const prevExpense = data.slice(0, mid).reduce((sum, p) => sum + (p.expense ?? 0), 0);
  const currExpense = data.slice(mid).reduce((sum, p) => sum + (p.expense ?? 0), 0);
  let pct = 0;
  if (prevExpense > 0) {
    pct = ((currExpense - prevExpense) / prevExpense) * 100;
  } else if (currExpense > 0) {
    pct = 100;
  }

  // Finlab usually uses red/rose for expenses, but the ref image uses a blue line chart for Expense Analysis.
  const option = useMemo(() => {
    if (!data.length) return null;
    const sliceMap: Record<DashboardRange, number> = {
      '7d': 7,
      '30d': 10,
      '90d': 12,
    };
    const chartData = data.slice(-sliceMap[range]);
    return {
      grid: { top: 10, right: 10, bottom: 20, left: 10 },
      xAxis: {
        type: 'category',
        data: chartData.map(() => ''),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
      },
      yAxis: { show: false },
      series: [
        {
          type: 'line',
          smooth: true,
          data: chartData.map(d => d.expense),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 3, color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.2)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
      ],
      tooltip: { show: false },
    };
  }, [data, range]);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid var(--border-color)',
      }}
    >
      <div>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Expense Analysis
            <Info size={14} color="var(--muted-foreground)" />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatAmount(totalExpense)}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                fontSize: 11,
                fontWeight: 700,
                ...(pct <= 0
                  ? { backgroundColor: 'var(--color-success-soft-bg)', color: '#16a34a' }
                  : { backgroundColor: 'var(--color-error-soft-bg)', color: 'var(--destructive)' }),
              }}
            >
              ⬊ {pct > 0 ? '+' : ''}
              {pct.toFixed(1)}%
            </span>
            <Typography sx={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500 }}>
              VS This Month
            </Typography>
          </Box>
        </Box>
      </div>

      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <PeriodDropdown value={range} onChange={onRangeChange} />
        </Box>
        {option ? (
          <Box sx={{ height: 100, width: '100%' }}>
            <ReactECharts option={option} style={{ height: '100px', width: '100%' }} />
          </Box>
        ) : (
          <Box
            sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography sx={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No data</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
