'use client';

import { Box } from '@mui/material';
import React from 'react';
import { tagChipSx } from '../helpers/storageStyling';
import type { FolderOption, TagOption } from '../storageHelpers';
import { getTagChipStyle } from '../storageHelpers';

export interface FolderTagPickerProps {
  folder: FolderOption;
  tags: TagOption[];
  tagsTitle: React.ReactNode;
  tagsClearLabel: React.ReactNode;
  onUpdateFolderTag: ({ folderId, tagId }: { folderId: string; tagId: string | null }) => void;
  onConfirmDeleteFolder: (folder: FolderOption) => void;
  onStartEditFolder: (folder: FolderOption) => void;
  onSetFolderTagPickerId: (id: string | null) => void;
}

const clearBtnSx = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--muted-foreground)',
  border: 'none',
  bgcolor: 'transparent',
  cursor: 'pointer',
  '&:hover': { color: 'var(--foreground)' },
};

export function FolderTagPicker({
  folder,
  tags,
  tagsClearLabel,
  onUpdateFolderTag,
}: FolderTagPickerProps): React.JSX.Element {
  const stopPropagation = (event: React.SyntheticEvent): void => event.stopPropagation();
  return (
    <Box
      sx={{ border: '1px solid var(--muted)', p: 1 }}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Box
          component="button"
          type="button"
          onClick={() => onUpdateFolderTag({ folderId: folder.id, tagId: null })}
          sx={clearBtnSx}
        >
          {tagsClearLabel}
        </Box>
        {tags.map(tag => (
          <Box
            key={tag.id}
            component="button"
            type="button"
            onClick={() => onUpdateFolderTag({ folderId: folder.id, tagId: tag.id })}
            sx={tagChipSx(folder.tag?.id === tag.id)}
            style={getTagChipStyle(tag)}
          >
            {tag.name}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
