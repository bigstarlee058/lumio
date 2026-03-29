'use client';

import type { ReceiptRecord } from '@/app/lib/api';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Camera, FileImage, FileText, Mail, UploadCloud } from 'lucide-react';

const statusVariantMap = {
  approved: 'success',
  needs_review: 'warning',
  failed: 'destructive',
  parsed: 'info',
  new: 'outline',
  draft: 'outline',
  reviewed: 'info',
  rejected: 'destructive',
} as const;

type ReceiptStatusKey = keyof typeof statusVariantMap;

function formatAmount(amount?: number, currency?: string) {
  if (!Number.isFinite(amount)) {
    return 'Amount pending';
  }

  return (
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0) + (currency ? ` ${currency}` : '')
  );
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'scan':
      return <Camera className="h-4 w-4" />;
    case 'gmail':
      return <Mail className="h-4 w-4" />;
    case 'upload':
      return <UploadCloud className="h-4 w-4" />;
    default:
      return <FileImage className="h-4 w-4" />;
  }
}

export interface ReceiptCardProps {
  receipt: ReceiptRecord;
  onOpen?: (receipt: ReceiptRecord) => void;
}

export function ReceiptCard({ receipt, onOpen }: ReceiptCardProps) {
  const attachment = receipt.metadata?.attachments?.[0];
  const isPdf = attachment?.mimeType === 'application/pdf';
  const badgeVariant =
    statusVariantMap[receipt.status as ReceiptStatusKey] ?? statusVariantMap.draft;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(receipt)}
      aria-label={`Open receipt ${receipt.parsedData?.vendor || 'Unknown vendor'}`}
      className="w-full cursor-pointer text-left"
    >
      <Card className="h-full border-slate-200 shadow-sm transition-colors hover:border-slate-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                {isPdf ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {receipt.parsedData?.vendor || 'Unknown vendor'}
                </p>
                <p className="truncate text-sm text-slate-500">{receipt.subject}</p>
              </div>
            </div>
            <Badge variant={badgeVariant}>{receipt.status}</Badge>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
            <span>{new Date(receipt.receivedAt).toLocaleDateString()}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
              {getSourceIcon(receipt.source)}
              {receipt.source}
            </span>
          </div>

          <div className="mt-4 text-lg font-semibold text-slate-900">
            {formatAmount(receipt.parsedData?.amount, receipt.parsedData?.currency)}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
