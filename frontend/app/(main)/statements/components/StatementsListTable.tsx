'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { AppPagination } from '@/app/components/ui/pagination';
import { Spinner } from '@/app/components/ui/spinner';
import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';
import {
  getStatementDisplayMerchant,
  getStatementMerchantLabel,
  isManualExpenseStatement,
} from '@/app/lib/statement-status';
import { ArrowDown, File } from 'lucide-react';
import type { JSX } from 'react';
import {
  formatPaginationLabel,
  formatStatementAmount,
  formatStatementDate,
  getBankDisplayName,
  isGmailStatement,
  isReceiptProcessing,
  isStatementParsingInProgress,
} from './StatementsListView.utils';
import { StatementsGmailSync } from './StatementsGmailSync';
import { StatementsListItem } from './StatementsListItem';
import type { DuplicateMeta } from './hooks/useStatementSelection';

interface StatementForTable {
  id: string;
  source?: string;
  bankName: string;
  status: string;
  fileName: string;
  fileType: string;
  subject?: string;
  sender?: string;
  parsedData?: { vendor?: string; amount?: number; currency?: string; date?: string };
  parsingDetails?: { importPreview?: { attachments?: number } };
}

interface TableLabels {
  merchant: string;
  date: string;
  amount: string;
  action: string;
  receipt: string;
  scanning: string;
  emptyTitle: string;
  emptyDescription: string;
  paginationShown: string;
  paginationPageOf: string;
}

interface Props {
  loading: boolean;
  displayStatements: StatementForTable[];
  paginatedStatements: StatementForTable[];
  gmailSyncSkeletonKeys: string[];
  allVisibleSelected: boolean;
  selectedCount: number;
  selectedStatementIds: string[];
  dateSortDirection: 'asc' | 'desc';
  page: number;
  totalPagesCount: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  duplicateMetaById: Map<string, DuplicateMeta>;
  viewLabel: string;
  reviewDuplicateLabel: string;
  labels: TableLabels;
  onToggleSelectAll: () => void;
  onToggleSortDirection: () => void;
  onToggleStatement: (id: string) => void;
  onView: (statement: StatementForTable) => void;
  onIconClick: (statement: StatementForTable) => void;
  onPageChange: (page: number) => void;
}

interface StatementRowData {
  isReceipt: boolean;
  merchantLabel: string;
  isManualExpense: boolean;
  allowAttachFallback: boolean;
  isProcessingReceipt: boolean;
  isProcessingStatement: boolean;
  amountLabel: string;
  dateLabel: string;
}

function resolveStatementRowData(statement: StatementForTable, scanningLabel: string): StatementRowData {
  const isReceipt = statement.source === 'gmail' || statement.source === 'scan';
  const resolvedName = isReceipt
    ? resolveGmailMerchantLabel({
        vendor: statement.parsedData?.vendor,
        sender: isGmailStatement(statement) ? statement.sender : undefined,
        subject: statement.subject,
        fallback: statement.fileName,
      })
    : getStatementDisplayMerchant(statement, getBankDisplayName(statement.bankName));
  const merchantLabel = isReceipt
    ? resolvedName
    : getStatementMerchantLabel(statement.status, resolvedName, scanningLabel);
  const isManualExpense = !isReceipt && isManualExpenseStatement(statement);
  const manualAttachmentCount = Number(
    statement.parsingDetails?.importPreview?.attachments ?? 0,
  );
  const allowAttachFallback =
    isManualExpense &&
    !isReceipt &&
    (manualAttachmentCount === 0 ||
      statement.fileName.toLowerCase().startsWith('manual-expense-'));
  return {
    isReceipt,
    merchantLabel,
    isManualExpense,
    allowAttachFallback,
    isProcessingReceipt: isReceiptProcessing(statement),
    isProcessingStatement: isStatementParsingInProgress(statement),
    amountLabel: formatStatementAmount(statement),
    dateLabel: formatStatementDate(statement),
  };
}

function TableDesktopHeader({
  allVisibleSelected,
  selectedCount,
  dateSortDirection,
  labels,
  onToggleSelectAll,
  onToggleSortDirection,
}: {
  allVisibleSelected: boolean;
  selectedCount: number;
  dateSortDirection: 'asc' | 'desc';
  labels: TableLabels;
  onToggleSelectAll: () => void;
  onToggleSortDirection: () => void;
}): JSX.Element {
  return (
    <div className="lumio-stmt-list-view__desktop-header">
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
            marginRight: 16,
          }}
        >
          <div style={{ width: 16, display: 'flex', justifyContent: 'center', opacity: 0.7 }}>
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={selectedCount > 0 && !allVisibleSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Select all statements"
            />
          </div>
          <div
            style={{
              width: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            }}
          >
            <span className="sr-only">{labels.receipt}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af' }}>
            {labels.merchant}
            <span style={{ padding: '0 4px', color: '#d1d5db' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                data-testid="statements-date-sort"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  padding: 0,
                }}
                onClick={onToggleSortDirection}
                aria-label={`Sort by date ${dateSortDirection === 'desc' ? 'ascending' : 'descending'}`}
              >
                {labels.date}
                <ArrowDown
                  size={12}
                  style={{
                    transition: 'transform 0.2s',
                    transform: dateSortDirection === 'asc' ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 24,
          flexShrink: 0,
          width: 420,
          paddingLeft: 16,
        }}
      >
        <div style={{ width: 128, textAlign: 'right', color: '#9ca3af', paddingRight: 4 }}>
          {labels.amount}
        </div>
        <div style={{ width: 144, textAlign: 'right', color: '#9ca3af' }}>{labels.action}</div>
      </div>
    </div>
  );
}

export function StatementsListTable({
  loading,
  displayStatements,
  paginatedStatements,
  gmailSyncSkeletonKeys,
  allVisibleSelected,
  selectedCount,
  selectedStatementIds,
  dateSortDirection,
  page,
  totalPagesCount,
  rangeStart,
  rangeEnd,
  total,
  duplicateMetaById,
  viewLabel,
  reviewDuplicateLabel,
  labels,
  onToggleSelectAll,
  onToggleSortDirection,
  onToggleStatement,
  onView,
  onIconClick,
  onPageChange,
}: Props): JSX.Element {
  if (loading && gmailSyncSkeletonKeys.length === 0) {
    return (
      <div className="lumio-stmt-list-view__loading">
        <Spinner style={{ height: 80, width: 80, color: 'var(--primary)' }} />
      </div>
    );
  }

  if (displayStatements.length === 0 && gmailSyncSkeletonKeys.length === 0) {
    return (
      <div className="lumio-stmt-list-view__empty">
        <div
          style={{
            margin: '0 auto 16px',
            display: 'flex',
            height: 64,
            width: 64,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--lumio-radius-full)',
            background: '#f9fafb',
            color: '#d1d5db',
          }}
        >
          <File size={32} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{labels.emptyTitle}</h3>
        <p style={{ marginTop: 4, color: '#6b7280' }}>{labels.emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={selectedCount > 0 && !allVisibleSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Select all statements"
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#4b5563' }}>Select all</span>
        </div>
        <TableDesktopHeader
          allVisibleSelected={allVisibleSelected}
          selectedCount={selectedCount}
          dateSortDirection={dateSortDirection}
          labels={labels}
          onToggleSelectAll={onToggleSelectAll}
          onToggleSortDirection={onToggleSortDirection}
        />
        <StatementsGmailSync skeletonKeys={gmailSyncSkeletonKeys} />
        {paginatedStatements.map((statement, index) => {
          const rowData = resolveStatementRowData(statement, labels.scanning);
          const duplicateMeta = duplicateMetaById.get(statement.id);
          return (
            <StatementsListItem
              key={statement.id}
              dataTourId={index === 0 ? 'statement-row-primary' : undefined}
              statement={statement}
              viewLabel={viewLabel}
              isReceipt={rowData.isReceipt}
              isProcessing={rowData.isProcessingReceipt}
              merchantLabel={rowData.merchantLabel}
              amountLabel={rowData.amountLabel}
              dateLabel={rowData.dateLabel}
              isPossibleDuplicate={Boolean(duplicateMeta)}
              duplicatePosition={duplicateMeta?.position}
              duplicateGroupSize={duplicateMeta?.total}
              duplicateRole={duplicateMeta?.role}
              duplicateGroupLabel={duplicateMeta?.groupLabel}
              duplicateGroupTone={duplicateMeta?.groupTone}
              duplicateReason={duplicateMeta?.reason}
              duplicateActionLabel={reviewDuplicateLabel}
              typeLabel={rowData.isReceipt ? 'Receipt' : statement.fileType}
              isManualExpense={rowData.isManualExpense}
              viewDisabled={rowData.isProcessingStatement}
              onView={() => onView(statement)}
              onIconClick={() => onIconClick(statement)}
              onToggleSelect={() => onToggleStatement(statement.id)}
              selected={selectedStatementIds.includes(statement.id)}
            />
          );
        })}
      </div>
      <div className="lumio-stmt-list-view__pagination" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {formatPaginationLabel(labels.paginationShown, { from: rangeStart, to: rangeEnd, count: total })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#4b5563', minWidth: 120, textAlign: 'center' }}>
            {formatPaginationLabel(labels.paginationPageOf, { page, count: totalPagesCount })}
          </span>
          <AppPagination page={page} total={totalPagesCount} onChange={onPageChange} />
        </div>
      </div>
    </>
  );
}
