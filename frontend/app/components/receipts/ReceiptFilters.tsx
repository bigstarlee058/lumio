'use client';

import { Box, MenuItem, Select, TextField } from '@mui/material';
import type { ReceiptsFilterState } from './hooks/useReceipts';

export interface ReceiptFiltersProps {
  filters: ReceiptsFilterState;
  onChange: (filters: ReceiptsFilterState) => void;
}

export function ReceiptFilters({ filters, onChange }: ReceiptFiltersProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.5fr) 220px 220px' },
      }}
    >
      <TextField
        size="small"
        value={filters.search}
        placeholder="Search receipts"
        onChange={event => onChange({ ...filters, page: 1, search: event.target.value })}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
      />
      <Select
        size="small"
        value={filters.status}
        onChange={event => onChange({ ...filters, page: 1, status: event.target.value })}
        sx={{ borderRadius: 0 }}
      >
        <MenuItem value="all">All statuses</MenuItem>
        <MenuItem value="new">New</MenuItem>
        <MenuItem value="draft">Draft</MenuItem>
        <MenuItem value="parsed">Parsed</MenuItem>
        <MenuItem value="needs_review">Needs review</MenuItem>
        <MenuItem value="approved">Approved</MenuItem>
      </Select>
      <Select
        size="small"
        value={filters.source}
        onChange={event => onChange({ ...filters, page: 1, source: event.target.value })}
        sx={{ borderRadius: 0 }}
      >
        <MenuItem value="all">All sources</MenuItem>
        <MenuItem value="upload">Upload</MenuItem>
        <MenuItem value="scan">Scan</MenuItem>
        <MenuItem value="gmail">Gmail</MenuItem>
      </Select>
    </Box>
  );
}
