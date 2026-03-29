'use client';

import type { ReceiptRecord } from '@/app/lib/api';
import { ReceiptCard } from './ReceiptCard';

export interface ReceiptsListProps {
  receipts: ReceiptRecord[];
  isLoading?: boolean;
  onOpenReceipt?: (receipt: ReceiptRecord) => void;
}

const SKELETON_KEYS = [
  'receipt-skeleton-1',
  'receipt-skeleton-2',
  'receipt-skeleton-3',
  'receipt-skeleton-4',
  'receipt-skeleton-5',
  'receipt-skeleton-6',
];

export function ReceiptsList({ receipts, isLoading = false, onOpenReceipt }: ReceiptsListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SKELETON_KEYS.map(key => (
          <div
            key={key}
            className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No receipts yet</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upload a receipt or scan one with your camera to start reviewing extracted data.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {receipts.map(receipt => (
        <ReceiptCard key={receipt.id} receipt={receipt} onOpen={onOpenReceipt} />
      ))}
    </div>
  );
}
