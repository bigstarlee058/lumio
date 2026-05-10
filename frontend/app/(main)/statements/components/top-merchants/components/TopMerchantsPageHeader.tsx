'use client';

import { AnalyticsFlowToggle } from '@/app/(main)/statements/components/analytics/AnalyticsFlowToggle';
import { TopMerchantsFilterChipsRow } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsFilterChipsRow';
import { TopMerchantsSearchRow } from '@/app/(main)/statements/components/top-merchants/components/TopMerchantsSearchRow';
import type { useTopMerchantsViewModel } from '@/app/(main)/statements/components/top-merchants/hooks/useTopMerchantsViewModel';
import type { TopMerchantFlowType } from '@/app/(main)/statements/components/top-merchants/top-merchants.types';

type Props = { vm: ReturnType<typeof useTopMerchantsViewModel> };

export function TopMerchantsPageHeader({ vm }: Props): React.JSX.Element {
  const { labels } = vm;
  return (
    <div
      style={{ marginBottom: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--foreground)' }}>
            {labels.title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{labels.subtitle}</p>
        </div>
        <AnalyticsFlowToggle
          activeFlow={vm.activeFlowType}
          spendLabel={labels.tabSpenders}
          incomeLabel={labels.tabIncomeSenders}
          onFlowChange={flow => vm.setActiveFlowType(flow as TopMerchantFlowType)}
        />
      </div>
      <TopMerchantsSearchRow vm={vm} />
      <TopMerchantsFilterChipsRow vm={vm} />
    </div>
  );
}
