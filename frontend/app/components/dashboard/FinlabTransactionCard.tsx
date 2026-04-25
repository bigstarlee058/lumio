'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DashboardRange } from '@/app/hooks/useDashboard';
import { gmailReceiptsApi } from '@/app/lib/api';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import { Info } from '@/app/components/icons';
import { useEffect, useState } from 'react';
import { BrandLogoAvatar } from '../BrandLogoAvatar';
import { PeriodDropdown } from './PeriodDropdown';

interface FinlabTransactionCardProps {
  formatAmount: (value: number) => string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

export function FinlabTransactionCard({
  formatAmount,
  range,
  onRangeChange,
}: FinlabTransactionCardProps) {
  interface GmailReceipt {
    id: string;
    sender: string;
    subject: string;
    receivedAt?: string | null;
    status: string;
    parsedData?: {
      amount?: number | null;
      vendor?: string | null;
      currency?: string | null;
    } | null;
  }

  const [receipts, setReceipts] = useState<GmailReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReceipts = async () => {
      setIsLoading(true);
      try {
        const response = await gmailReceiptsApi.listReceipts({ limit: 5, hasAmount: true });
        const nextReceipts = Array.isArray(response.data?.receipts) ? response.data.receipts : [];
        setReceipts(nextReceipts);
      } catch (error) {
        console.error('Failed to load Gmail receipts:', error);
        setReceipts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReceipts();
  }, [range]);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-color)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#1e293b', fontWeight: 700, fontSize: 17 }}>
          Last Transaction
          <Info size={16} color="#94a3b8" />
        </Box>
        <PeriodDropdown value={range} onChange={onRangeChange} />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Loading...</Typography>
        </Box>
      ) : receipts.length === 0 ? (
        <Box sx={{ display: 'flex', height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 14, color: 'var(--muted-foreground)' }}>No receipts found</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {receipts.slice(0, 5).map(receipt => {
            const vendorLabel = resolveGmailMerchantLabel({
              vendor: receipt.parsedData?.vendor,
              sender: receipt.sender,
              subject: receipt.subject,
              fallback: 'Gmail receipt',
            });
            const amount = receipt.parsedData?.amount ?? null;
            const isApproved = receipt.status === 'approved';
            const receivedAt = receipt.receivedAt ? new Date(receipt.receivedAt) : null;
            const hasValidReceivedAt =
              receivedAt instanceof Date && !Number.isNaN(receivedAt.valueOf());

            return (
              <Box key={receipt.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BrandLogoAvatar sender={receipt.sender} vendorName={vendorLabel} size={48} />
                  <div>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                      {vendorLabel}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 500, mt: 0.5 }}>
                      Gmail receipt
                    </Typography>
                  </div>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      {hasValidReceivedAt
                        ? receivedAt?.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 500, mt: 0.5 }}>
                      {hasValidReceivedAt
                        ? receivedAt?.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ width: 96, textAlign: 'right' }}>
                    <Typography component="span" sx={{ fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'block' }}>
                      {amount == null ? '—' : formatAmount(amount)}
                    </Typography>
                  </Box>

                  <Box sx={{ width: 84, textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        backgroundColor: '#f0fdf4',
                        color: '#16a34a',
                      }}
                    >
                      {isApproved ? 'Approved' : 'Success'}
                    </span>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
