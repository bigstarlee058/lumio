type DailyTrendPoint = { date: string; income: number; expense: number };
type CategoryPoint = { name: string; amount: number };

export function buildDailyTrendOption(
  dailyTrend: DailyTrendPoint[],
  isDark: boolean,
): object | null {
  if (!dailyTrend.length) return null;

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
      textStyle: {
        color: isDark ? '#8899AA' : '#555555',
        fontSize: 11,
        fontFamily: 'var(--font-dashboard-sans)',
      },
      icon: 'rect',
      itemWidth: 12,
      itemHeight: 6,
    },
    grid: { left: 40, right: 0, top: 40, bottom: 24 },
    xAxis: {
      type: 'category',
      data: dailyTrend.map(p => p.date),
      axisLabel: {
        color: isDark ? '#8899AA' : '#555555',
        fontSize: 10,
        fontFamily: 'var(--font-dashboard-sans)',
      },
      axisLine: { lineStyle: { color: isDark ? '#2A3442' : '#D1CCC4' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: isDark ? '#8899AA' : '#555555',
        fontSize: 10,
        fontFamily: 'var(--font-dashboard-sans)',
      },
      splitLine: { lineStyle: { color: isDark ? '#2A3442' : '#D1CCC4' } },
    },
    series: [
      {
        name: 'Income',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: dailyTrend.map(p => p.income),
        areaStyle: { color: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(26,26,26,0.05)' },
        lineStyle: { color: isDark ? '#34D399' : '#1a1a1a', width: 2 },
        itemStyle: { color: isDark ? '#34D399' : '#1a1a1a' },
      },
      {
        name: 'Expense',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: dailyTrend.map(p => p.expense),
        areaStyle: { color: 'rgba(209,61,86,0.08)' },
        lineStyle: { color: '#D13D56', width: 2 },
        itemStyle: { color: '#D13D56' },
      },
    ],
  };
}

export function buildRosePieOption(categories: CategoryPoint[], isDark: boolean): object | null {
  if (!categories.length) return null;

  const top10 = categories.slice(0, 10);
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
      textStyle: {
        color: isDark ? '#8899AA' : '#555555',
        fontSize: 11,
        fontFamily: 'var(--font-dashboard-sans)',
      },
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
}
