import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SpendOverTimeRecord } from '@/app/(main)/statements/components/spend-over-time.utils';
import { SpendOverTimeCalendar } from './SpendOverTimeCalendar';

const createRecord = (overrides: Partial<SpendOverTimeRecord> = {}): SpendOverTimeRecord => ({
  id: 'record-1',
  source: 'statement',
  fileName: 'Kaspi',
  subject: null,
  sender: null,
  status: 'completed',
  fileType: 'expense',
  createdAt: '2025-12-08T00:00:00Z',
  statementDateFrom: '2025-12-08',
  statementDateTo: null,
  bankName: 'Kaspi',
  totalDebit: 100,
  totalCredit: null,
  currency: 'KZT',
  exported: null,
  paid: null,
  parsingDetails: null,
  user: null,
  receivedAt: null,
  parsedData: null,
  sourceType: 'statement',
  sourceChannel: 'bank',
  flowType: 'expense',
  amount: 100,
  currencyValue: 'KZT',
  dateValue: '2025-12-08',
  transactionId: 'tx-1',
  workspaceId: 'ws-1',
  workspaceName: 'Main workspace',
  merchant: 'Kaspi',
  paymentPurpose: 'Payment',
  ...overrides,
});

describe('SpendOverTimeCalendar', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('moves between calendar months with navigation buttons', () => {
    act(() => {
      root.render(
        <SpendOverTimeCalendar
          records={[createRecord()]}
          currency="KZT"
          onDayClick={vi.fn()}
          labels={{ title: 'Calendar view', emptyMonth: 'Empty month', operations: 'operations' }}
        />,
      );
    });

    expect(container.textContent).toContain('December 2025');

    const previous = container.querySelector('button[aria-label="Previous month"]') as HTMLButtonElement;
    const next = container.querySelector('button[aria-label="Next month"]') as HTMLButtonElement;
    const latest = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Latest',
    ) as HTMLButtonElement;

    act(() => {
      previous.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('November 2025');

    act(() => {
      next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('January 2026');

    act(() => {
      latest.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('December 2025');
  });
});
