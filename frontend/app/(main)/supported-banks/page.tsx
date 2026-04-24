'use client';

import { useIntlayer } from '@/app/i18n';
import { getNestedValue, resolveLabel } from '@/app/lib/side-panel-utils';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Building2, CheckCircle2 } from '@/app/components/icons';
import Image from 'next/image';

type SupportedBankCard = {
  id: string;
  logo: string;
  name: string;
  notes: string;
};

// eslint-disable-next-line max-lines-per-function
export default function SupportedBanksPage(): React.JSX.Element {
  const t = useIntlayer('supportedBanksPage');

  const banks: SupportedBankCard[] = [
    {
      id: 'kaspi',
      logo: '/images/bank-logo/kaspi.png',
      name: resolveLabel(getNestedValue(t, ['banks', 'kaspi', 'name']), 'Kaspi'),
      notes: resolveLabel(
        getNestedValue(t, ['banks', 'kaspi', 'notes']),
        'Upload Kaspi PDF statements for automatic transaction extraction.',
      ),
    },
    {
      id: 'bereke',
      logo: '/images/bank-logo/bereke-bank.png',
      name: resolveLabel(getNestedValue(t, ['banks', 'bereke', 'name']), 'Bereke'),
      notes: resolveLabel(
        getNestedValue(t, ['banks', 'bereke', 'notes']),
        'Upload Bereke PDF statements for automatic transaction extraction.',
      ),
    },
  ];

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
      <Box sx={{ border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: { xs: 2.5, sm: 3 }, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ bgcolor: 'primary.main', p: 1.5, color: '#fff', display: 'inline-flex' }}>
            <Building2 size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#111827' }}>
              {resolveLabel(getNestedValue(t, ['title']), 'Supported banks')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#6b7280' }}>
              {resolveLabel(
                getNestedValue(t, ['subtitle']),
                'List of banks currently available for automatic statement parsing.',
              )}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2.5 }}>
          <Chip
            icon={<CheckCircle2 size={14} />}
            label={resolveLabel(getNestedValue(t, ['parserStatus']), 'Parser is active')}
            size="small"
            sx={{ bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: 600, borderRadius: 'var(--lumio-radius-full)' }}
          />
        </Box>
      </Box>

      <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {banks.map(bank => (
          <Box
            component="article"
            key={bank.id}
            data-supported-bank={bank.id}
            sx={{ border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: { xs: 2.5, sm: 3 }, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, bgcolor: '#f9fafb' }}>
                <Image src={bank.logo} alt={bank.name} width={32} height={32} style={{ objectFit: 'contain' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{bank.name}</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {resolveLabel(getNestedValue(t, ['statusLabel']), 'Status')}:{' '}
                  {resolveLabel(getNestedValue(t, ['supported']), 'Supported')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2, border: '1px solid #f3f4f6', bgcolor: 'rgba(249,250,251,0.7)', px: 1.5, py: 1, fontSize: 14, color: '#374151' }}>
              <Box component="span" sx={{ fontWeight: 500, color: '#1f2937', mr: 0.5 }}>
                {resolveLabel(getNestedValue(t, ['formatsLabel']), 'Supported format')}:
              </Box>
              {resolveLabel(getNestedValue(t, ['pdfStatements']), 'PDF statements')}
            </Box>

            <Typography variant="body2" sx={{ mt: 1.5, color: '#4b5563' }}>{bank.notes}</Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="body2" sx={{ mt: 3, fontWeight: 500, color: '#6b7280' }}>
        {resolveLabel(getNestedValue(t, ['comingSoon']), 'More banks are coming soon')}
      </Typography>
    </Box>
  );
}
