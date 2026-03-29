'use client';

import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import type { ReceiptsFilterState } from './hooks/useReceipts';

export interface ReceiptFiltersProps {
  filters: ReceiptsFilterState;
  onChange: (filters: ReceiptsFilterState) => void;
}

export function ReceiptFilters({ filters, onChange }: ReceiptFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_220px_220px]">
      <Input
        value={filters.search}
        placeholder="Search receipts"
        onChange={event => onChange({ ...filters, page: 1, search: event.target.value })}
      />
      <Select
        value={filters.status}
        onChange={event => onChange({ ...filters, page: 1, status: event.target.value })}
      >
        <option value="all">All statuses</option>
        <option value="new">New</option>
        <option value="draft">Draft</option>
        <option value="parsed">Parsed</option>
        <option value="needs_review">Needs review</option>
        <option value="approved">Approved</option>
      </Select>
      <Select
        value={filters.source}
        onChange={event => onChange({ ...filters, page: 1, source: event.target.value })}
      >
        <option value="all">All sources</option>
        <option value="upload">Upload</option>
        <option value="scan">Scan</option>
        <option value="gmail">Gmail</option>
      </Select>
    </div>
  );
}
