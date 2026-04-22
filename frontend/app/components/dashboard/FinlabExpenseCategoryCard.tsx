'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';
import { Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PeriodDropdown } from './PeriodDropdown';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FinlabExpenseCategoryCardProps {
  categories: NonNullable<DashboardData['topCategories']>;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6'];

export function FinlabExpenseCategoryCard({
  categories,
  formatAmount,
  range,
  onRangeChange,
}: FinlabExpenseCategoryCardProps) {
  const total = useMemo(() => categories.reduce((sum, c) => sum + c.amount, 0) || 1, [categories]);

  const option = useMemo(() => {
    if (!categories.length) return null;

    return {
      tooltip: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['60%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          itemStyle: { borderWidth: 4, borderColor: '#fff' },
          data: categories.map((cat, idx) => ({
            value: cat.amount,
            name: cat.name ?? 'Other',
            itemStyle: { color: COLORS[idx % COLORS.length] },
          })),
        },
      ],
      animationDuration: 1000,
    };
  }, [categories]);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 3,
        height: '100%',
        border: '1px solid #E8E8E8',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#1e293b', fontWeight: 700, fontSize: 16 }}>
          Expense Category
          <Info size={16} color="#94a3b8" />
        </Box>
        <PeriodDropdown value={range} onChange={onRangeChange} />
      </Box>

      {!categories.length ? (
        <Box sx={{ display: 'flex', height: 160, alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 14, color: '#94a3b8' }}>No data available</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: 3,
            mt: 2,
          }}
        >
          <Box sx={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
            {option && <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>100%</Typography>
              <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Data Recorded</Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, pr: 2, width: '100%' }}>
            {categories.slice(0, 4).map((cat, idx) => {
              const pct = ((cat.amount / total) * 100).toFixed(1);
              return (
                <Box
                  key={cat.id ?? cat.name ?? `cat-${idx}`}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box
                      sx={{ width: 10, height: 10, borderRadius: 'var(--lumio-radius-full)', flexShrink: 0, bgcolor: COLORS[idx % COLORS.length] }}
                    />
                    <Typography
                      component="span"
                      sx={{ fontSize: 14, color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {cat.name ?? 'Other'}{' '}
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>({pct}%)</span>
                    </Typography>
                  </Box>
                  <Typography
                    component="span"
                    sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}
                  >
                    {formatAmount(cat.amount)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
