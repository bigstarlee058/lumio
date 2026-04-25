'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DashboardData } from '@/app/hooks/useDashboard';

interface TopMerchantsCardProps {
  merchants: NonNullable<DashboardData['topMerchants']>;
  formatAmount: (value: number) => string;
  title?: string;
  emptyLabel?: string;
}

export function TopMerchantsCard({
  merchants,
  formatAmount,
  title = 'Top Merchants',
  emptyLabel = 'No merchants data',
}: TopMerchantsCardProps) {
  if (!merchants.length) {
    return (
      <Box sx={{ height: '100%', border: '1px solid var(--border-color)', bgcolor: 'background.paper' }}>
        <Box
          sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Typography sx={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{emptyLabel}</Typography>
        </Box>
      </Box>
    );
  }

  const maxAmount = Math.max(...merchants.map(m => m.amount));

  return (
    <Box sx={{ height: '100%', border: '1px solid var(--border-color)', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: 'var(--muted-foreground)',
              }}
            >
              {title}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 14, color: 'var(--muted-foreground)' }}>
              Spending distribution
            </Typography>
          </div>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>
            Last period
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {merchants.slice(0, 5).map(merchant => {
            const width = Math.max(6, Math.round((merchant.amount / maxAmount) * 100));
            return (
              <Box key={merchant.name} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'flex',
                        height: 36,
                        width: 36,
                        flexShrink: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'var(--muted)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {merchant.name?.[0] ?? '•'}
                    </Box>
                    <div style={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#1e293b',
                        }}
                      >
                        {merchant.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {merchant.count} payments
                      </Typography>
                    </div>
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                    {formatAmount(merchant.amount)}
                  </Typography>
                </Box>
                <Box sx={{ height: 8, overflow: 'hidden', bgcolor: 'var(--muted)' }}>
                  <Box
                    sx={{ height: '100%', bgcolor: '#0284c7', transition: 'width 300ms' }}
                    style={{ width: `${width}%` }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
