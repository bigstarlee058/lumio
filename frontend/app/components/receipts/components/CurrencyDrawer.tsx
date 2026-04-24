'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { CurrencySearchItem } from '@/app/lib/statement-expense-drawer';
import { Box, IconButton, Typography } from '@mui/material';
import { Check, ChevronLeft, Search } from '@/app/components/icons';

interface CurrencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currencySearch: string;
  setCurrencySearch: (v: string) => void;
  selectedCurrencyItem: CurrencySearchItem | null | undefined;
  selectedMatchesSearch: boolean;
  currencyQuery: string;
  recentCurrencyItems: CurrencySearchItem[];
  allCurrencyItems: CurrencySearchItem[];
  handleSelectCurrency: (code: string) => void;
}

export function CurrencyDrawer({
  isOpen,
  onClose,
  currencySearch,
  setCurrencySearch,
  selectedCurrencyItem,
  selectedMatchesSearch,
  currencyQuery,
  recentCurrencyItems,
  allCurrencyItems,
  handleSelectCurrency,
}: CurrencyDrawerProps) {
  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      width="lg"
      showCloseButton={false}
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close currency drawer"
            sx={{ borderRadius: 'var(--lumio-radius-md)' }}
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </IconButton>
          <Typography style={{ fontSize: 18, fontWeight: 600 }}>Select a currency</Typography>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', pb: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={currencySearch}
              onChange={event => setCurrencySearch(event.target.value)}
              placeholder="Search"
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                background: 'var(--card-bg)',
                padding: '12px 16px 12px 40px',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </Box>

          {selectedCurrencyItem && selectedMatchesSearch ? (
            <Box
              component="button"
              type="button"
              onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
              sx={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'var(--muted)',
                px: 2,
                py: 2,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Typography style={{ fontSize: 16, fontWeight: 600 }}>
                {selectedCurrencyItem.label}
              </Typography>
              <Check style={{ width: 20, height: 20, color: 'var(--color-primary, #168118)' }} />
            </Box>
          ) : null}

          {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
            <Box>
              <Typography style={{ paddingLeft: 4, fontSize: 14, color: '#94a3b8' }}>Recents</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentCurrencyItems.map(item => (
                  <Box
                    key={`recent-${item.code}`}
                    component="button"
                    type="button"
                    onClick={() => handleSelectCurrency(item.code)}
                    sx={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      py: 1.5,
                      textAlign: 'left',
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography style={{ fontSize: 16, fontWeight: 600 }}>{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}

          <Box>
            <Typography style={{ paddingLeft: 4, fontSize: 14, color: '#94a3b8' }}>All</Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {allCurrencyItems.length > 0 ? (
                allCurrencyItems.map(item => (
                  <Box
                    key={item.code}
                    component="button"
                    type="button"
                    onClick={() => handleSelectCurrency(item.code)}
                    sx={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      py: 1.5,
                      textAlign: 'left',
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography style={{ fontSize: 16, fontWeight: 600 }}>{item.label}</Typography>
                  </Box>
                ))
              ) : (
                <Typography sx={{ bgcolor: 'var(--muted)', p: 1.5, fontSize: 14, color: '#94a3b8' }}>
                  No currencies found
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </DrawerShell>
  );
}
