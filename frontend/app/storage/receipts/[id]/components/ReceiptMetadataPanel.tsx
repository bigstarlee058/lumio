'use client';

import { ReceiptParsedDataForm } from '@/app/components/receipts/ReceiptParsedDataForm';
import type {
  EditableReceiptParsedData,
  ReceiptCategoryOption,
} from '@/app/components/receipts/receipt-types';
import { Box, Typography } from '@mui/material';

interface ReceiptMetadataPanelProps {
  formValue: EditableReceiptParsedData;
  categories: ReceiptCategoryOption[];
  onChange: (value: EditableReceiptParsedData) => void;
}

function PanelHeading(): React.ReactElement {
  return (
    <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, borderBottom: '1px solid #e2e8f0', pb: 2 }}>
      <Box>
        <Typography style={{ fontSize: 18, fontWeight: 600, color: '#020617' }}>
          Parsed fields
        </Typography>
        <Typography style={{ marginTop: 4, fontSize: 14, color: '#64748b' }}>
          Review and correct the extracted receipt data before approval.
        </Typography>
      </Box>
    </Box>
  );
}

export function ReceiptMetadataPanel({ formValue, categories, onChange }: ReceiptMetadataPanelProps): React.ReactElement {
  return (
    <Box component="section" sx={{ height: '100%', border: '1px solid #e2e8f0', bgcolor: 'background.paper', p: 3 }}>
      <PanelHeading />
      <ReceiptParsedDataForm value={formValue} categories={categories} onChange={onChange} />
    </Box>
  );
}
