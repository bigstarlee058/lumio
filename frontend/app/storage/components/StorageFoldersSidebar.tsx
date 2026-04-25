'use client';

import { Box } from '@mui/material';
import React from 'react';
import type { StorageFile, TagOption } from '../storageHelpers';
import type { FolderFilesPanelProps } from './FolderFilesPanel';
import { FolderFilesPanel } from './FolderFilesPanel';
import type { FolderListProps } from './FolderList';
import { FolderList } from './FolderList';
import type { NewFolderInputProps } from './NewFolderInput';
import { NewFolderInput } from './NewFolderInput';

type FeedbackTone = 'success' | 'error';

export interface StorageFoldersSidebarProps
  extends Omit<FolderListProps, 'draggingFile'>,
    FolderFilesPanelProps,
    Omit<NewFolderInputProps, 'draggingFile'> {
  activeFolderLabel: React.ReactNode;
  draggingFile: StorageFile | null;
  folderMoveFeedback: { tone: FeedbackTone; message: string } | null;
  tags: TagOption[];
  files: StorageFile[];
}

function FolderMoveFeedbackBanner({
  folderMoveFeedback,
}: {
  folderMoveFeedback: NonNullable<StorageFoldersSidebarProps['folderMoveFeedback']>;
}): React.JSX.Element {
  const sx =
    folderMoveFeedback.tone === 'success'
      ? { borderColor: '#a7f3d0', bgcolor: '#ecfdf5', color: '#065f46' }
      : { borderColor: '#fecaca', bgcolor: '#fef2f2', color: 'var(--destructive)' };
  return (
    <Box
      role={folderMoveFeedback.tone === 'error' ? 'alert' : 'status'}
      sx={{ border: '1px solid', px: 1.5, py: 1, fontSize: 14, ...sx }}
    >
      {folderMoveFeedback.message}
    </Box>
  );
}

function buildFolderListHandlers(props: StorageFoldersSidebarProps): Pick<FolderListProps,
  | 'onSetActiveFolderId' | 'onSetPickedFolderId' | 'onSetEditingFolderName' | 'onSetFolderTagPickerId'
  | 'onRenameFolder' | 'onCancelEditFolder' | 'onUpdateFolderTag' | 'onConfirmDeleteFolder'
  | 'onStartEditFolder' | 'onHandleFolderContextMenu' | 'canEditFolder' | 'clampFolderName'
> {
  return {
    onSetActiveFolderId: props.onSetActiveFolderId,
    onSetPickedFolderId: props.onSetPickedFolderId,
    onSetEditingFolderName: props.onSetEditingFolderName,
    onSetFolderTagPickerId: props.onSetFolderTagPickerId,
    onRenameFolder: props.onRenameFolder,
    onCancelEditFolder: props.onCancelEditFolder,
    onUpdateFolderTag: props.onUpdateFolderTag,
    onConfirmDeleteFolder: props.onConfirmDeleteFolder,
    onStartEditFolder: props.onStartEditFolder,
    onHandleFolderContextMenu: props.onHandleFolderContextMenu,
    canEditFolder: props.canEditFolder,
    clampFolderName: props.clampFolderName,
  };
}

function buildFolderListProps(props: StorageFoldersSidebarProps): FolderListProps {
  return {
    folders: props.folders,
    tags: props.tags,
    files: props.files,
    activeFolderId: props.activeFolderId,
    pickedFolderId: props.pickedFolderId,
    editingFolderId: props.editingFolderId,
    editingFolderName: props.editingFolderName,
    folderTagPickerId: props.folderTagPickerId,
    folderCounts: props.folderCounts,
    scrollHintLabel: props.scrollHintLabel,
    foldersAllLabel: props.foldersAllLabel,
    foldersNoneLabel: props.foldersNoneLabel,
    folderListTitleLabel: props.folderListTitleLabel,
    folderListEmptyLabel: props.folderListEmptyLabel,
    dragAndDropLabel: props.dragAndDropLabel,
    doneLabel: props.doneLabel,
    fileMovedToLabel: props.fileMovedToLabel,
    tagsTitle: props.tagsTitle,
    tagsClearLabel: props.tagsClearLabel,
    ...buildFolderListHandlers(props),
  };
}

function buildFilesPanelProps(props: StorageFoldersSidebarProps): FolderFilesPanelProps {
  return {
    activeFolderLabel: props.activeFolderLabel,
    folderModalFiles: props.folderModalFiles,
    folderFileQuery: props.folderFileQuery,
    draggingFile: props.draggingFile,
    dragDropTitleLabel: props.dragDropTitleLabel,
    modalsFilesLabel: props.modalsFilesLabel,
    modalsFileSearchPlaceholder: props.modalsFileSearchPlaceholder,
    modalsFilesEmpty: props.modalsFilesEmpty,
    dragDropRowHintLabel: props.dragDropRowHintLabel,
    tableFromLabel: props.tableFromLabel,
    onSetFolderFileQuery: props.onSetFolderFileQuery,
    canEditFile: props.canEditFile,
  };
}

export function StorageFoldersSidebar(props: StorageFoldersSidebarProps): React.JSX.Element {
  const { folderMoveFeedback, newFolderName, folderCreatePlaceholder, folderCreateTooltip } = props;
  const { draggingFile, dragDropSubtitleLabel, onSetNewFolderName, onCreateFolder, clampFolderName } = props;

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {folderMoveFeedback && <FolderMoveFeedbackBanner folderMoveFeedback={folderMoveFeedback} />}
      <NewFolderInput
        newFolderName={newFolderName}
        folderCreatePlaceholder={folderCreatePlaceholder}
        folderCreateTooltip={folderCreateTooltip}
        draggingFile={draggingFile}
        dragDropSubtitleLabel={dragDropSubtitleLabel}
        onSetNewFolderName={onSetNewFolderName}
        onCreateFolder={onCreateFolder}
        clampFolderName={clampFolderName}
      />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '550px 1fr' } }}>
        <FolderList {...buildFolderListProps(props)} />
        <FolderFilesPanel {...buildFilesPanelProps(props)} />
      </Box>
    </Box>
  );
}
