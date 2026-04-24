'use client';
import type { JSX } from 'react';

import type { SourceChannel } from '@/app/(main)/statements/components/shared-analytics.utils';
import { getSourceLabel } from '@/app/lib/analytics-common';
import { Landmark, Mail, Receipt } from '@/app/components/icons';

type Props = {
  sourceChannel: SourceChannel;
  labels: {
    sourceBank: string;
    sourceReceipt: string;
    sourceGmailInbox: string;
  };
};

export function AnalyticsSourceBadge({ sourceChannel, labels }: Props): React.JSX.Element {
  const label = getSourceLabel(sourceChannel, labels);

  if (sourceChannel === 'gmail') {
    return (
      <span className="lumio-view-page__source-chip">
        <Mail size={14} />
        {label}
      </span>
    );
  }

  if (sourceChannel === 'receipt') {
    return (
      <span className="lumio-view-page__source-chip">
        <Receipt size={14} />
        {label}
      </span>
    );
  }

  return (
    <span className="lumio-view-page__source-chip">
      <Landmark size={14} />
      {label}
    </span>
  );
}
