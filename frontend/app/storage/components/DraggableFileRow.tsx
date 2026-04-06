'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useDraggable } from '@dnd-kit/core';
import { Download, Eye, Folder, GripVertical, RotateCcw, Share2, Trash2 } from 'lucide-react';
import React from 'react';
import type { CSSProperties } from 'react';
import type { CategoryOption, FileAvailability, StorageFile, TagOption } from '../storageHelpers';

interface DraggableFileRowProps {
  dataTourId?: string;
  file: StorageFile;
  isTrashView: boolean;
  selectedTrashIds: string[];
  toggleTrashSelection: (id: string) => void;
  setPreviewFileId: (id: string) => void;
  setPreviewFileName: (name: string) => void;
  setPreviewModalOpen: (open: boolean) => void;
  canEditFile: (file: StorageFile) => boolean;
  truncateFileNameForDisplay: (name: string, max?: number) => string;
  renderTrashExpiryBadge: (date?: string | null) => React.ReactNode;
  renderAvailabilityChip: (availability?: FileAvailability) => React.ReactNode;
  tagChipClass: (isActive: boolean) => string;
  getTagChipStyle: (tag: TagOption) => CSSProperties | undefined;
  getBankDisplayName: (name: string) => string;
  formatFileSize: (bytes: number) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  handleCategoryChange: (fileId: string, categoryId: string) => void;
  categories: CategoryOption[];
  categoriesLoading: boolean;
  trashSelectRowLabel: string;
  dragDropRowHintLabel: string;
  previewLabel: string;
  sharedLinksShortLabel: string;
  categoryNoneLabel: string;
  ownerLabel: string;
  trashRestoreActionLabel: string;
  trashDeleteActionLabel: string;
  viewTooltipLabel: string;
  downloadTooltipLabel: string;
  deleteActionLabel: string;
  getPermissionLabel: (perm?: string | null) => string;
  formatDate: (date: string) => string;
  handleRestoreFromTrash: (file: StorageFile) => void;
  confirmPermanentDelete: (file: StorageFile) => void;
  handleView: (id: string) => void;
  handleDownload: (id: string, name: string) => void;
  confirmDelete: (file: StorageFile) => void;
}

export const DraggableFileRow = React.memo(
  ({
    dataTourId,
    file,
    isTrashView,
    selectedTrashIds,
    toggleTrashSelection,
    setPreviewFileId,
    setPreviewFileName,
    setPreviewModalOpen,
    canEditFile,
    truncateFileNameForDisplay,
    renderTrashExpiryBadge,
    renderAvailabilityChip,
    tagChipClass,
    getTagChipStyle,
    getBankDisplayName,
    formatFileSize,
    renderStatusBadge,
    handleCategoryChange,
    categories,
    categoriesLoading,
    trashSelectRowLabel,
    dragDropRowHintLabel,
    previewLabel,
    sharedLinksShortLabel,
    categoryNoneLabel,
    ownerLabel,
    trashRestoreActionLabel,
    trashDeleteActionLabel,
    viewTooltipLabel,
    downloadTooltipLabel,
    deleteActionLabel,
    getPermissionLabel,
    formatDate,
    handleRestoreFromTrash,
    confirmPermanentDelete,
    handleView,
    handleDownload,
    confirmDelete,
  }: DraggableFileRowProps) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `file-${file.id}`,
      data: { file },
      disabled: !canEditFile(file),
    });

    const style = {
      opacity: isDragging ? 0.3 : 1,
    };

    return (
      <tr
        ref={setNodeRef}
        data-tour-id={dataTourId}
        style={style}
        className={`transition-all duration-150 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      >
        {isTrashView && (
          <td className="px-6 py-5">
            <Checkbox
              checked={selectedTrashIds.includes(file.id)}
              onCheckedChange={() => toggleTrashSelection(file.id)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              aria-label={trashSelectRowLabel}
            />
          </td>
        )}
        <td className="px-6 py-5">
          <div
            className={`flex items-center gap-1 ${canEditFile(file) ? 'cursor-grab active:cursor-grabbing' : ''}`}
            {...(canEditFile(file) ? { ...attributes, ...listeners } : {})}
            title={canEditFile(file) ? dragDropRowHintLabel : undefined}
          >
            {canEditFile(file) && (
              <div className="p-1 text-gray-300 dark:text-slate-600 pointer-events-none">
                <GripVertical size={20} />
              </div>
            )}
            <button
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200 bg-transparent border-0 p-0"
              onClick={() => {
                setPreviewFileId(file.id);
                setPreviewFileName(file.fileName);
                setPreviewModalOpen(true);
              }}
              title={previewLabel}
            >
              <DocumentTypeIcon
                fileType={file.fileType}
                fileName={file.fileName}
                fileId={file.id}
                size={40}
                className="text-red-500 dark:text-red-400"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                className="text-base font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-transparent border-0 p-0 text-left w-full"
                title={file.fileName}
                onClick={() => {
                  setPreviewFileId(file.id);
                  setPreviewFileName(file.fileName);
                  setPreviewModalOpen(true);
                }}
              >
                {truncateFileNameForDisplay(file.fileName)}
              </button>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-300">
                {file.folder?.name && (
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-300">
                    <Folder className="h-3.5 w-3.5" />
                    {file.folder.name}
                  </span>
                )}
                {isTrashView && renderTrashExpiryBadge(file.deletedAt)}
                {file.sharedLinksCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300">
                    <Share2 size={12} />
                    {file.sharedLinksCount} {sharedLinksShortLabel}
                  </span>
                )}
                {renderAvailabilityChip(file.fileAvailability)}
              </div>
              {file.tags && file.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {file.tags.map(tag => (
                    <span key={tag.id} className={tagChipClass(false)} style={getTagChipStyle(tag)}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <BankLogoAvatar bankName={file.bankName} size={28} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {getBankDisplayName(file.bankName)}
            </span>
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
            {file.metadata?.accountNumber ? `••••${file.metadata.accountNumber.slice(-4)}` : '—'}
          </span>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          {formatFileSize(file.fileSize)}
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          {renderStatusBadge(file.status)}
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          <div className="space-y-1">
            <select
              value={file.categoryId || ''}
              onChange={e => handleCategoryChange(file.id, e.target.value)}
              disabled={
                isTrashView ||
                categoriesLoading ||
                (!file.isOwner && file.permissionType !== 'editor')
              }
              className="min-w-40 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800/60 disabled:text-gray-400 dark:disabled:text-gray-500"
            >
              <option value="">{categoryNoneLabel}</option>
              {categories
                .filter(cat => cat.isEnabled !== false)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            {file.category?.isEnabled === false ? (
              <p className="text-xs font-medium text-red-600">
                {file.category.name} - choose category
              </p>
            ) : null}
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              file.isOwner
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-slate-600'
                : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-500/30'
            }`}
          >
            {file.isOwner ? ownerLabel : getPermissionLabel(file.permissionType)}
          </span>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
          <div className="flex flex-col leading-tight">
            <span>
              {formatDate(isTrashView && file.deletedAt ? file.deletedAt : file.createdAt)}
            </span>
          </div>
        </td>

        <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
          <div className="relative inline-flex items-center justify-end gap-1">
            {isTrashView ? (
              <>
                <button
                  onClick={() => handleRestoreFromTrash(file)}
                  className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors"
                  title={trashRestoreActionLabel}
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => confirmPermanentDelete(file)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title={trashDeleteActionLabel}
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleView(file.id)}
                  className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-emerald-500/20 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                  title={viewTooltipLabel}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleDownload(file.id, file.fileName)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors"
                  title={downloadTooltipLabel}
                >
                  <Download size={18} />
                </button>
                {canEditFile(file) && (
                  <button
                    onClick={() => confirmDelete(file)}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title={deleteActionLabel}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

DraggableFileRow.displayName = 'DraggableFileRow';
