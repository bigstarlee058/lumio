'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { Spinner } from '@/app/components/ui/spinner';
import type { PasteErrorKey, PastePreviewData } from '../utils/pasteUtils';
import { tx } from '../utils/tableHelpers';

interface PastePreviewModalProps {
  t: unknown;
  isOpen: boolean;
  onClose: () => void;
  pasteApplying: boolean;
  pasteParsing: boolean;
  pastePreview: PastePreviewData | null;
  pasteUseHeaders: boolean;
  hasMissingPasteColumnTitles: boolean;
  onHeadersToggle: (checked: boolean) => void;
  onCellChange: (rowIndex: number, sourceIndex: number, value: string) => void;
  onConfirm: () => Promise<void>;
}

export function PastePreviewModal({
  t,
  isOpen,
  onClose,
  pasteApplying,
  pasteParsing,
  pastePreview,
  pasteUseHeaders,
  hasMissingPasteColumnTitles,
  onHeadersToggle,
  onCellChange,
  onConfirm,
}: PastePreviewModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={!pasteApplying}
      closeOnBackdropClick={!pasteApplying}
      closeOnEscape={!pasteApplying}
      className="w-[95vw] max-w-none h-[90vh] rounded-2xl overflow-hidden"
      contentClassName="flex flex-col h-full p-0 gap-0"
      title={
        <div className="flex items-center gap-4">
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            {pastePreview
              ? `${tx(t, ['paste', 'titlePrefix'], '')}${pastePreview.totalRows}${tx(t, ['paste', 'titleSuffix'], '')}`
              : tx(t, ['paste', 'titleFallback'], 'Paste preview')}
          </span>
          {pastePreview?.hasHeadersToggle && (
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <Checkbox
                checked={pasteUseHeaders}
                onCheckedChange={onHeadersToggle}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
              />
              <span>{tx(t, ['paste', 'headersToggle'], 'Use first row as headers')}</span>
            </div>
          )}
        </div>
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          cancelText={tx(t, ['paste', 'cancel'], 'Cancel')}
          confirmText={tx(t, ['paste', 'add'], 'Add')}
          isConfirmLoading={pasteApplying}
          isConfirmDisabled={
            pasteParsing ||
            !pastePreview?.dataRows.length ||
            Boolean(pastePreview?.hasErrors) ||
            hasMissingPasteColumnTitles
          }
        />
      }
    >
      {pasteParsing && (
        <div className="flex flex-1 items-center justify-center gap-3 text-sm text-gray-500">
          <Spinner className="h-6 w-6 text-primary" />
          <span>{tx(t, ['paste', 'parsing'], 'Parsing...')}</span>
        </div>
      )}
      {!pasteParsing && pastePreview && (
        <div className="flex flex-col h-full">
          {pastePreview.hasErrors && (
            <div className="flex-none px-6 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                <div className="font-semibold whitespace-nowrap text-xs uppercase tracking-wide opacity-80 pt-0.5">
                  {tx(t, ['paste', 'errorsTitle'], 'Errors')}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-700">
                  {(['date', 'amount', 'currency', 'paid'] as PasteErrorKey[])
                    .filter(key => pastePreview.errors[key] > 0)
                    .map(key => (
                      <span
                        key={key}
                        className="flex items-center gap-1 bg-amber-100/50 px-2 py-0.5 rounded text-xs font-medium"
                      >
                        <span>{tx(t, ['paste', 'errors', key], key)}:</span>
                        <span className="font-mono font-bold">{pastePreview.errors[key]}</span>
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 relative bg-gray-50/30">
            {pastePreview.totalRows === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                {tx(t, ['paste', 'noRows'], 'No rows found')}
              </div>
            ) : (
              <div className="absolute inset-0 overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
                    <tr>
                      {pastePreview.columns.map(col => (
                        <th
                          key={`${col.field}-${col.columnKey}`}
                          className="px-3 py-3 text-left min-w-[180px] border-r border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {pastePreview.previewRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                        {row.cells.map((cell, index) => (
                          <td
                            key={`${row.id}-${index}`}
                            className={`px-3 py-2 text-sm border-r border-gray-50 transition-colors ${
                              cell.error ? 'bg-red-50 text-red-700' : 'text-gray-700'
                            }`}
                          >
                            {cell.sourceIndex !== null ? (
                              <input
                                value={cell.value}
                                onChange={event =>
                                  onCellChange(
                                    row.rowIndex,
                                    cell.sourceIndex as number,
                                    event.target.value,
                                  )
                                }
                                className={`w-full bg-transparent border-none p-0 focus:ring-0 text-sm ${
                                  cell.error
                                    ? 'text-red-700 placeholder:text-red-400'
                                    : 'text-gray-900'
                                }`}
                              />
                            ) : (
                              <div className="truncate">{cell.value || '—'}</div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {pastePreview.extraRowsCount > 0 && (
                      <tr>
                        <td
                          colSpan={pastePreview.columns.length}
                          className="py-6 text-center text-xs text-gray-400 bg-gray-50/30"
                        >
                          {tx(t, ['paste', 'moreRowsPrefix'], '')}
                          <span className="font-semibold text-gray-600 mx-1">
                            {pastePreview.extraRowsCount}
                          </span>
                          {tx(t, ['paste', 'moreRowsSuffix'], '')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}
