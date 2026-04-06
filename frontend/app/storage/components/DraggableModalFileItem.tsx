'use client';

import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import type { StorageFile } from '../storageHelpers';

interface DraggableModalFileItemProps {
  file: StorageFile;
  canEditFile: (file: StorageFile) => boolean;
  rowHintLabel: string;
  tableFromLabel: string;
}

export const DraggableModalFileItem = React.memo(
  ({ file, canEditFile, rowHintLabel, tableFromLabel }: DraggableModalFileItemProps) => {
    const router = useRouter();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `modal-file-${file.id}`,
      data: { file },
      disabled: !canEditFile(file),
    });

    return (
      <div className="px-3 py-2">
        <div
          className={`flex items-center gap-1 ${canEditFile(file) ? 'cursor-grab active:cursor-grabbing' : ''}`}
          {...(canEditFile(file) ? { ...attributes, ...listeners } : {})}
        >
          {canEditFile(file) && (
            <div className="text-gray-300 dark:text-slate-600 pointer-events-none">
              <GripVertical size={16} />
            </div>
          )}
          <button
            ref={setNodeRef}
            type="button"
            onClick={() => router.push(`/statements/${file.id}/view`)}
            title={canEditFile(file) ? rowHintLabel : undefined}
            className={`flex min-w-0 flex-1 items-center gap-3 text-left hover:text-primary ${
              isDragging ? 'opacity-50' : ''
            } ${canEditFile(file) ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className="flex items-center justify-center">
              <DocumentTypeIcon
                fileType={file.fileType}
                fileName={file.fileName}
                fileId={file.id}
                size={32}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {file.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tableFromLabel} {file.bankName}
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  },
);

DraggableModalFileItem.displayName = 'DraggableModalFileItem';
