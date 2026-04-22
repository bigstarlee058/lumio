'use client';
import type { JSX } from 'react';

import { AnalyticsFlowToggle } from '@/app/(main)/statements/components/analytics/AnalyticsFlowToggle';
import { TopSpendersFilterChipsRow } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersFilterChipsRow';
import { TopSpendersSearchRow } from '@/app/(main)/statements/components/top-spenders/components/TopSpendersSearchRow';
import type { TopSpenderFlowType } from '@/app/(main)/statements/components/top-spenders/top-spenders.types';
import type { useTopSpendersViewModel } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersViewModel';

type Props = { vm: ReturnType<typeof useTopSpendersViewModel> };

export function TopSpendersPageHeader({ vm }: Props): JSX.Element {
  const { labels } = vm;
  return (
    <div style={{ marginBottom: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{labels.title}</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>{labels.subtitle}</p>
        </div>
        <AnalyticsFlowToggle
          activeFlow={vm.activeFlowType}
          spendLabel={labels.tabSpenders}
          incomeLabel={labels.tabIncomeSenders}
          onFlowChange={(flow) => vm.setActiveFlowType(flow as TopSpenderFlowType)}
        />
      </div>
      <TopSpendersSearchRow vm={vm} />
      <TopSpendersFilterChipsRow vm={vm} />
    </div>
  );
}
