'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { Copy } from '@/app/components/icons';

interface StatementsDuplicateGroupProps {
  loading: boolean;
  duplicateStatementIds: string[];
  selectDuplicatesLabel: string;
  onSelectDetectedDuplicates: () => void;
}

export function StatementsDuplicateGroup({
  loading,
  duplicateStatementIds,
  selectDuplicatesLabel,
  onSelectDetectedDuplicates,
}: StatementsDuplicateGroupProps): React.JSX.Element | null {
  if (!loading && duplicateStatementIds.length === 0) return null;

  return (
    <button
      type="button"
      className="lumio-stmt-list-view__duplicate-chip"
      onClick={onSelectDetectedDuplicates}
      disabled={loading || duplicateStatementIds.length === 0}
    >
      <Copy size={14} />
      {selectDuplicatesLabel}
      <span className="lumio-stmt-list-view__duplicate-count">
        {loading ? <Spinner size={12} /> : duplicateStatementIds.length}
      </span>
    </button>
  );
}
