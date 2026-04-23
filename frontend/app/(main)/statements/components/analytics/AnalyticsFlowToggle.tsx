'use client';
import type { JSX } from 'react';

type Props = {
  activeFlow: string;
  spendLabel: string;
  incomeLabel: string;
  onFlowChange: (flow: string) => void;
};

export function AnalyticsFlowToggle({ activeFlow, spendLabel, incomeLabel, onFlowChange }: Props): React.JSX.Element {
  return (
    <div className="lumio-view-page__period-tabs">
      <button
        type="button"
        className={`lumio-view-page__period-tab${activeFlow === 'spend' ? ' lumio-view-page__period-tab--active' : ''}`}
        onClick={() => onFlowChange('spend')}
      >
        {spendLabel}
      </button>
      <button
        type="button"
        className={`lumio-view-page__period-tab${activeFlow === 'income' ? ' lumio-view-page__period-tab--active' : ''}`}
        onClick={() => onFlowChange('income')}
      >
        {incomeLabel}
      </button>
    </div>
  );
}
