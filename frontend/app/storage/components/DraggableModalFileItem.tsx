'use client';

import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { useDraggable } from '@dnd-kit/core';
import { Box, Typography } from '@mui/material';
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
      <Box sx={{ px: 1.5, py: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: canEditFile(file) ? 'grab' : 'default',
          }}
          {...(canEditFile(file) ? { ...attributes, ...listeners } : {})}
        >
          {canEditFile(file) && (
            <Box sx={{ color: '#d1d5db', pointerEvents: 'none' }}>
              <GripVertical size={16} />
            </Box>
          )}
          <Box
            component="button"
            ref={setNodeRef}
            type="button"
            onClick={() => router.push(`/statements/${file.id}/view`)}
            title={canEditFile(file) ? rowHintLabel : undefined}
            sx={{
              display: 'flex',
              minWidth: 0,
              flex: 1,
              alignItems: 'center',
              gap: 1.5,
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: canEditFile(file) ? 'grab' : 'default',
              opacity: isDragging ? 0.5 : 1,
              p: 0,
              '&:hover': { color: 'primary.main' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DocumentTypeIcon
                fileType={file.fileType}
                fileName={file.fileName}
                fileId={file.id}
                size={32}
              />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#111827',
                }}
              >
                {file.fileName}
              </Typography>
              <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                {tableFromLabel} {file.bankName}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  },
);

DraggableModalFileItem.displayName = 'DraggableModalFileItem';
