'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import { Box, Chip, Divider, IconButton, Popover, TextField, Typography } from '@mui/material';
import {
  Bookmark,
  Check,
  FileText,
  FileX,
  Filter,
  Folder,
  MoreVertical,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import toast from 'react-hot-toast';
import { BankLogoAvatar } from '../components/BankLogoAvatar';
import ConfirmModal from '../components/ConfirmModal';
import { DocumentTypeIcon } from '../components/DocumentTypeIcon';
import { DropboxStorageWidget } from '../components/DropboxStorageWidget';
import { GoogleDriveStorageWidget } from '../components/GoogleDriveStorageWidget';
import { PDFPreviewModal } from '../components/PDFPreviewModal';
import { Checkbox } from '../components/ui/checkbox';
import { AppPagination } from '../components/ui/pagination';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import api from '../lib/api';
import { getNestedValue, resolveLabel } from '../lib/side-panel-utils';
import { DraggableFileRow } from './components/DraggableFileRow';
import { DraggableModalFileItem } from './components/DraggableModalFileItem';
import { DroppableFolderButton } from './components/DroppableFolderButton';
import { DroppableHeaderTrigger } from './components/DroppableHeaderTrigger';
import { useStorageDnd } from './hooks/useStorageDnd';
import { useStorageFiles } from './hooks/useStorageFiles';
import { useStorageFilters } from './hooks/useStorageFilters';
import { useStorageFolders } from './hooks/useStorageFolders';
import { useStorageTags } from './hooks/useStorageTags';
import { useStorageTrash } from './hooks/useStorageTrash';
import { useStorageViews } from './hooks/useStorageViews';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_TRASH_TTL_DAYS,
  type FileAvailability,
  type FileAvailabilityStatus,
  type FolderOption,
  MS_PER_DAY,
  NO_FOLDER,
  type StorageFile,
  type StorageView,
  type StorageViewPayload,
  type TagOption,
  colorPickerPopoverSlotProps,
  formatFileSize,
  getAvailabilityColor,
  getAvailabilityDot,
  getBankDisplayName,
  getStatusTone,
  getTagChipStyle,
  tagChipClass,
  truncateFileNameForDisplay,
} from './storageHelpers';

/**
 * Storage page - displays all files with sharing and permissions
 */
function StoragePageContent({
  initialList = 'active',
}: {
  initialList?: 'active' | 'trash';
}) {
  const router = useRouter();
  const t = useIntlayer('storagePage');
  const { locale } = useLocale();
  const tx = useCallback(
    (path: string[], fallback: string) => resolveLabel(getNestedValue(t, path), fallback),
    [t],
  );
  const trashTtlDays = useMemo(() => {
    const parsed = Number.parseInt(process.env.NEXT_PUBLIC_STORAGE_TRASH_TTL_DAYS || '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_TRASH_TTL_DAYS;
  }, []);
  const {
    files,
    setFiles,
    loading,
    deleteModalOpen,
    setDeleteModalOpen,
    fileToDelete,
    setFileToDelete,
    permanentDeleteModalOpen,
    setPermanentDeleteModalOpen,
    fileToDeletePermanently,
    setFileToDeletePermanently,
    loadFiles,
    handleView,
    handleDownload,
    handleCategoryChange,
    confirmDelete,
    handleDelete,
    confirmPermanentDelete,
    handlePermanentDelete,
    handleRestoreFromTrash,
    handleBulkRestore,
    handleBulkDeleteFromTrash,
    handleEmptyTrash,
  } = useStorageFiles({
    loadFilesFailed: t.toasts.loadFilesFailed.value,
    downloaded: t.toasts.downloaded.value,
    downloadFailed: t.toasts.downloadFailed.value,
    categoryUpdated: t.toasts.categoryUpdated.value,
    categoryUpdateFailed: t.toasts.categoryUpdateFailed.value,
    deleteLoading: t.delete.loading.value,
    deleteSuccess: t.delete.success.value,
    deleteError: t.delete.error.value,
    trashRestoreLoading: t.trash.restoreLoading.value,
    trashRestoreSuccess: t.trash.restoreSuccess.value,
    trashRestoreFailed: t.trash.restoreFailed.value,
    trashDeleteLoading: t.trash.deleteLoading.value,
    trashDeleteSuccess: t.trash.deleteSuccess.value,
    trashDeleteFailed: t.trash.deleteFailed.value,
  });
  const [activeModal, setActiveModal] = useState<'folders' | null>(null);
  const {
    folders,
    setFolders,
    newFolderName,
    setNewFolderName,
    editingFolderId,
    setEditingFolderId,
    editingFolderName,
    setEditingFolderName,
    folderTagPickerId,
    setFolderTagPickerId,
    deleteFolderModalOpen,
    setDeleteFolderModalOpen,
    folderToDelete,
    deleteFolderWithContents,
    setDeleteFolderWithContents,
    folderMoveFeedback,
    activeFolderId,
    setActiveFolderId,
    folderFileQuery,
    setFolderFileQuery,
    folderContextMenu,
    setFolderContextMenu,
    pickedFolderId,
    setPickedFolderId,
    loadFolders,
    handleCreateFolder,
    handleStartEditFolder,
    handleRenameFolder,
    handleCancelEditFolder,
    handleUpdateFolderTag,
    confirmDeleteFolder,
    closeDeleteFolderModal,
    handleDeleteFolder,
    handleMoveFolderIdx,
    handleFolderContextMenu,
    handleMoveToFolder,
    canEditFolder,
    clampFolderName,
    clearFolderMoveFeedback,
  } = useStorageFolders(
    {
      loadFoldersFailed: t.toasts.loadFoldersFailed.value,
      folderNameRequired: t.toasts.folderNameRequired.value,
      folderNameTooLong: t.folders.nameTooLong.value,
      folderCreated: t.toasts.folderCreated.value,
      folderCreateFailed: t.toasts.folderCreateFailed.value,
      folderRenamed: t.toasts.folderRenamed.value,
      folderRenameFailed: t.toasts.folderRenameFailed.value,
      folderTagUpdateFailed: t.toasts.folderTagUpdateFailed.value,
      folderDeleteLoading: t.toasts.folderDeleteLoading.value,
      folderDeleted: t.toasts.folderDeleted.value,
      folderDeleteFailed: t.toasts.folderDeleteFailed.value,
      folderUpdated: t.toasts.folderUpdated.value,
      folderUpdateFailed: t.toasts.folderUpdateFailed.value,
      fileMovedTo: tx(['toasts', 'fileMovedTo'], 'File moved to folder'),
    },
    setFiles,
    activeModal === 'folders',
  );
  const {
    tags,
    setTags,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    editingTagId,
    setEditingTagId,
    editingTagName,
    setEditingTagName,
    editingTagColor,
    setEditingTagColor,
    newTagPickerOpen,
    setNewTagPickerOpen,
    newTagAnchorEl,
    setNewTagAnchorEl,
    editingTagPickerId,
    setEditingTagPickerId,
    editingTagAnchorEl,
    setEditingTagAnchorEl,
    deleteTagModalOpen,
    setDeleteTagModalOpen,
    tagToDelete,
    setTagToDelete,
    loadTags,
    handleCreateTag,
    handleStartEditTag,
    handleRenameTag,
    handleCancelEditTag,
    confirmDeleteTag,
    handleDeleteTag,
    canEditTag,
  } = useStorageTags(
    {
      loadTagsFailed: t.toasts.loadTagsFailed.value,
      tagNameRequired: t.toasts.tagNameRequired.value,
      tagCreated: t.toasts.tagCreated.value,
      tagCreateFailed: t.toasts.tagCreateFailed.value,
      tagRenamed: t.toasts.tagRenamed.value,
      tagRenameFailed: t.toasts.tagRenameFailed.value,
      tagDeleteLoading: t.toasts.tagDeleteLoading.value,
      tagDeleted: t.toasts.tagDeleted.value,
      tagDeleteFailed: t.toasts.tagDeleteFailed.value,
    },
    setFiles,
    setFolders,
  );
  const {
    activeList,
    setActiveList,
    searchQuery,
    setSearchQuery,
    categories,
    setCategories,
    categoriesLoading,
    filters,
    setFilters,
    stagedFilters,
    setStagedFilters,
    sort,
    setSort,
    filterOpen,
    setFilterOpen,
    page,
    setPage,
    pageSize,
    activeViewId,
    setActiveViewId,
    loadCategories,
    handleSortChange,
    handleSearchChange,
    handleListChange,
  } = useStorageFilters({ loadCategoriesFailed: t.toasts.loadCategoriesFailed.value }, initialList);
  const {
    views,
    setViews,
    viewsLoading,
    viewName,
    setViewName,
    viewSaving,
    loadViews,
    applyView,
    handleSaveView,
    handleDeleteView,
  } = useStorageViews(
    {
      loadViewsFailed: t.toasts.loadViewsFailed.value,
      viewNameRequired: t.toasts.viewNameRequired.value,
      viewSaved: t.toasts.viewSaved.value,
      viewSaveFailed: t.toasts.viewSaveFailed.value,
      viewDeleted: t.toasts.viewDeleted.value,
      viewDeleteFailed: t.toasts.viewDeleteFailed.value,
    },
    setActiveViewId,
    setFilters,
    setStagedFilters,
    setSearchQuery,
    setSort,
  );
  const {
    draggingFile,
    setDraggingFile,
    folderDropTargetId,
    setFolderDropTargetId,
    folderModalFromDrag,
    setFolderModalFromDrag,
    sensors,
  } = useStorageDnd();
  const {
    selectedTrashIds,
    setSelectedTrashIds,
    bulkDeleteModalOpen,
    setBulkDeleteModalOpen,
    emptyTrashModalOpen,
    setEmptyTrashModalOpen,
  } = useStorageTrash(files, { activeList, searchQuery, filters, sort });

  // PDF Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [gmailStatus, setGmailStatus] = useState<{
    connected?: boolean;
  } | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setGmailLoading(true);
        const resp = await api.get('/integrations/gmail/status');
        if (!mounted) return;
        setGmailStatus(resp.data || null);
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setGmailLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);
  const [selectedStorageProvider, setSelectedStorageProvider] = useState<'google' | 'dropbox'>(
    'google',
  );

  const isTrashView = activeList === 'trash';
  const isFolderActive = activeModal === 'folders';

  useEffect(() => {
    loadCategories();
    loadTags();
    loadFolders();
    loadViews();
  }, []);

  useEffect(() => {
    loadFiles(activeList);
  }, [activeList]);

  useLockBodyScroll(activeModal !== null || filterOpen);

  const openModal = (modal: 'folders') => {
    setFilterOpen(false);
    setActiveModal(modal);
    clearFolderMoveFeedback();
    if (modal === 'folders') {
      setActiveFolderId(null);
      setFolderFileQuery('');
      setFolderDropTargetId(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setFolderModalFromDrag(false);
    setFolderFileQuery('');
    setActiveFolderId(null);
    setFolderDropTargetId(null);
    setEditingFolderId(null);
    setEditingFolderName('');
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor(null);
    setNewTagPickerOpen(false);
    setEditingTagPickerId(null);
    setFolderTagPickerId(null);
    setFolderModalFromDrag(false);
    clearFolderMoveFeedback();
  };

  const canEditFile = useCallback(
    (file: StorageFile) => !file.deletedAt && (file.isOwner || file.permissionType === 'editor'),
    [],
  );
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const file = active.data.current?.file as StorageFile;
    if (file) {
      setDraggingFile(file);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setDraggingFile(null);
      return;
    }

    const file = active.data.current?.file as StorageFile;
    const folderId = over.data.current?.folderId;
    const isNoFolder = over.data.current?.isNoFolder;

    if (file && (folderId || isNoFolder)) {
      const targetFolderId = isNoFolder ? NO_FOLDER : folderId;
      if (file.folderId !== targetFolderId) {
        if (isNoFolder) {
          handleMoveToFolder(file.id, null); // Move to "No folder" aka root
        } else {
          handleMoveToFolder(file.id, folderId);
        }
      }
    }

    setDraggingFile(null);
    if (folderModalFromDrag) {
      closeModal();
    }
  };

  const formatDate = useCallback(
    (dateString: string): string => {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(
        locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    },
    [locale],
  );

  const getTrashExpiryInfo = useCallback(
    (deletedAt?: string | null) => {
      if (!deletedAt) return null;
      const deletedDate = new Date(deletedAt);
      if (Number.isNaN(deletedDate.getTime())) return null;
      const expiresAt = new Date(deletedDate.getTime() + trashTtlDays * MS_PER_DAY);
      const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / MS_PER_DAY);
      return { expiresAt, daysLeft };
    },
    [trashTtlDays],
  );

  const renderTrashExpiryBadge = useCallback(
    (deletedAt?: string | null) => {
      const info = getTrashExpiryInfo(deletedAt);
      if (!info) return null;
      const daysLeft = info.daysLeft;
      const isExpired = daysLeft <= 0;
      const isSoon = daysLeft <= 3;
      const label = isExpired
        ? t.trash.expiresToday.value
        : t.trash.expiresIn.value.replace('{days}', String(daysLeft));
      const chipSx = isExpired
        ? { bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
        : isSoon
          ? { bgcolor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }
          : { bgcolor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
      return (
        <Chip
          label={label}
          size="small"
          title={info.expiresAt.toLocaleDateString(
            locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
          )}
          sx={{ borderRadius: 0, fontSize: 11, fontWeight: 600, height: 'auto', py: 0.25, ...chipSx }}
        />
      );
    },
    [getTrashExpiryInfo, locale, t],
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      switch (status.toLowerCase()) {
        case 'completed':
          return t.statusLabels.completed.value;
        case 'processing':
          return t.statusLabels.processing.value;
        case 'error':
          return t.statusLabels.error.value;
        case 'uploaded':
          return t.statusLabels.uploaded.value;
        case 'parsed':
          return t.statusLabels.parsed.value;
        default:
          return status;
      }
    },
    [t],
  );

  const getPermissionLabel = useCallback(
    (permission?: string | null) => {
      switch ((permission || '').toLowerCase()) {
        case 'owner':
          return t.permission.owner.value;
        case 'editor':
          return t.permission.editor.value;
        case 'viewer':
          return t.permission.viewer.value;
        case 'downloader':
          return t.permission.downloader.value;
        default:
          return t.permission.access.value;
      }
    },
    [t],
  );

  const bankOptions = useMemo(
    () => Array.from(new Set(files.map(f => f.bankName).filter(Boolean))),
    [files],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(files.map(f => f.status).filter(Boolean))),
    [files],
  );
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let noFolder = 0;
    for (const file of files) {
      if (file.folderId) {
        counts[file.folderId] = (counts[file.folderId] || 0) + 1;
      } else {
        noFolder += 1;
      }
    }
    return { counts, noFolder };
  }, [files]);
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const file of files) {
      for (const tag of file.tags || []) {
        counts[tag.id] = (counts[tag.id] || 0) + 1;
      }
    }
    return counts;
  }, [files]);

  const getAvailabilityLabel = useCallback(
    (status: FileAvailabilityStatus) => {
      switch (status) {
        case 'both':
          return t.availability.labels.both;
        case 'disk':
          return t.availability.labels.disk;
        case 'db':
          return t.availability.labels.db;
        case 'missing':
          return t.availability.labels.missing;
        default:
          return status;
      }
    },
    [t],
  );

  const getAvailabilityTooltip = useCallback(
    (status: FileAvailabilityStatus) => {
      switch (status) {
        case 'both':
          return t.availability.tooltips.both.value;
        case 'disk':
          return t.availability.tooltips.disk.value;
        case 'db':
          return t.availability.tooltips.db.value;
        case 'missing':
          return t.availability.tooltips.missing.value;
        default:
          return status;
      }
    },
    [t],
  );

  const renderAvailabilityChip = useCallback(
    (availability?: FileAvailability) => {
      if (!availability) return null;
      const status = availability.status;
      const dotColor =
        status === 'both'
          ? '#22c55e'
          : status === 'missing'
            ? '#ef4444'
            : '#3b82f6';
      const chipSx =
        status === 'missing'
          ? { bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
          : status === 'both'
            ? { bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }
            : { bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
      return (
        <Chip
          label={
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
              {getAvailabilityLabel(status)}
            </Box>
          }
          size="small"
          title={getAvailabilityTooltip(status)}
          sx={{ borderRadius: 0, fontSize: 11, fontWeight: 600, height: 'auto', py: 0.25, ...chipSx }}
        />
      );
    },
    [getAvailabilityTooltip, getAvailabilityLabel],
  );

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const isDeleted = !!file.deletedAt;
      if (isTrashView ? !isDeleted : isDeleted) {
        return false;
      }
      const normalizedBank = (file.bankName || '').toLowerCase();
      const normalizedCategoryName = (file.category?.name || '').toLowerCase();
      const normalizedAccount = (file.metadata?.accountNumber || '').toLowerCase();
      const normalizedTags = (file.tags || []).map(tag => tag.name.toLowerCase()).join(' ');

      const matchesSearch =
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizedBank.includes(searchQuery.toLowerCase()) ||
        normalizedAccount.includes(searchQuery.toLowerCase()) ||
        normalizedCategoryName.includes(searchQuery.toLowerCase()) ||
        normalizedTags.includes(searchQuery.toLowerCase());

      const matchesStatus = !filters.status || file.status === filters.status;
      const matchesBank = !filters.bank || file.bankName === filters.bank;
      const matchesCategory = !filters.categoryId || file.categoryId === filters.categoryId;
      const matchesOwnership =
        !filters.ownership || (filters.ownership === 'owned' ? file.isOwner : !file.isOwner);
      const matchesFolder = filters.folderId
        ? filters.folderId === NO_FOLDER
          ? !file.folderId
          : file.folderId === filters.folderId
        : true;
      return (
        matchesSearch &&
        matchesStatus &&
        matchesBank &&
        matchesCategory &&
        matchesOwnership &&
        matchesFolder
      );
    });
  }, [files, isTrashView, searchQuery, filters]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const multiplier = sort.direction === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'fileName':
          return a.fileName.localeCompare(b.fileName, locale) * multiplier;
        case 'bankName':
          return a.bankName.localeCompare(b.bankName, locale) * multiplier;
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
      }
    });
  }, [filteredFiles, sort, locale]);

  const totalItems = sortedFiles.length;
  const totalPagesCount = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize) || 1),
    [totalItems, pageSize],
  );
  const currentPage = Math.min(page, totalPagesCount);
  const rangeStart = useMemo(
    () => (totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1),
    [totalItems, currentPage, pageSize],
  );
  const rangeEnd = useMemo(
    () => (totalItems === 0 ? 0 : Math.min(totalItems, currentPage * pageSize)),
    [totalItems, currentPage, pageSize],
  );

  const paginatedFiles = useMemo(
    () => sortedFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedFiles, currentPage, pageSize],
  );
  const selectableTrashIds = useMemo(
    () => (isTrashView ? filteredFiles.map(file => file.id) : []),
    [filteredFiles, isTrashView],
  );
  const selectedTrashIdsInView = useMemo(
    () => selectedTrashIds.filter(id => selectableTrashIds.includes(id)),
    [selectedTrashIds, selectableTrashIds],
  );
  const allTrashSelected =
    selectableTrashIds.length > 0 && selectedTrashIdsInView.length === selectableTrashIds.length;
  const selectedTrashCount = selectedTrashIds.length;
  const folderModalFiles = useMemo(() => {
    const query = folderFileQuery.trim().toLowerCase();
    return files.filter(file => {
      const matchesFolder =
        activeFolderId === ''
          ? true
          : activeFolderId === NO_FOLDER
            ? !file.folderId
            : file.folderId === activeFolderId;
      if (!matchesFolder) return false;

      if (!query) return true;

      const fileName = file.fileName.toLowerCase();
      const bankName = file.bankName.toLowerCase();
      const folderName = (file.folder?.name || '').toLowerCase();
      const tagNames = (file.tags || []).map(tag => tag.name.toLowerCase()).join(' ');

      return (
        fileName.includes(query) ||
        bankName.includes(query) ||
        folderName.includes(query) ||
        tagNames.includes(query)
      );
    });
  }, [files, folderFileQuery, activeFolderId]);
  const activeFolderLabel = useMemo(() => {
    if (activeFolderId === '') return t.folders.all;
    if (activeFolderId === NO_FOLDER) return t.folders.none;
    return folders.find(folder => folder.id === activeFolderId)?.name ?? t.folders.all;
  }, [activeFolderId, folders, t]);

  const toggleTrashSelection = (fileId: string) => {
    setSelectedTrashIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId],
    );
  };

  const toggleSelectAllTrash = () => {
    if (allTrashSelected) {
      setSelectedTrashIds([]);
      return;
    }
    setSelectedTrashIds(selectableTrashIds);
  };

  useEffect(() => {
    if (page > totalPagesCount) {
      setPage(totalPagesCount);
    }
  }, [page, totalPagesCount]);

  useEffect(() => {
    if (filterOpen) {
      setStagedFilters(filters);
    }
  }, [filterOpen, filters]);

  const handleFilterChange = (field: keyof typeof DEFAULT_FILTERS, value: string) => {
    setStagedFilters(prev => ({ ...prev, [field]: value }));
    setActiveViewId(null);
  };

  const handleResetFilters = () => {
    setStagedFilters({ ...DEFAULT_FILTERS });
    setActiveViewId(null);
  };

  const handleApplyFilters = () => {
    setFilters(stagedFilters);
    setActiveViewId(null);
    setFilterOpen(false);
  };

  const filtersApplied =
    !!filters.status ||
    !!filters.bank ||
    !!filters.categoryId ||
    !!filters.ownership ||
    !!filters.folderId;
  const sortKey = `${sort.field}:${sort.direction}`;
  const emptyStateTitle = isTrashView ? t.trash.empty.title : t.empty.title;
  const emptyStateSubtitle = isTrashView ? t.trash.empty.subtitle : t.empty.subtitle;
  const paginationLabels = {
    shown: tx(['pagination', 'shown'], 'Showing {from}–{to} of {count}'),
    previous: tx(['pagination', 'previous'], 'Previous'),
    next: tx(['pagination', 'next'], 'Next'),
    pageOf: tx(['pagination', 'pageOf'], 'Page {page} of {count}'),
  };
  const formatPaginationLabel = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      template,
    );
  const tagChipSx = (isActive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    border: '1px solid',
    borderColor: isActive ? 'rgba(79,70,229,0.3)' : '#e5e7eb',
    borderRadius: '50px',
    px: 1,
    py: 0.25,
    fontSize: 11,
    fontWeight: 600,
    bgcolor: isActive ? 'rgba(79,70,229,0.1)' : '#f9fafb',
    color: isActive ? '#4f46e5' : '#374151',
    cursor: 'pointer',
  });
  // Keep string version for child component prop compatibility
  const tagChipClass = (isActive: boolean) =>
    `inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold ${
      isActive
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-gray-50 text-gray-700 border-gray-200'
    }`;
  const listToggleSx = (isActive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    border: '1px solid',
    px: 2,
    py: 1,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    bgcolor: isActive ? 'rgba(79,70,229,0.1)' : '#fff',
    color: isActive ? 'primary.main' : '#4b5563',
    borderColor: isActive ? 'rgba(79,70,229,0.3)' : '#e5e7eb',
    '&:hover': isActive ? {} : { bgcolor: '#f9fafb' },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  });
  const renderStatusBadge = useCallback(
    (status: string) => {
      const tone = getStatusTone(status);
      const dotColor =
        tone === 'success'
          ? '#22c55e'
          : tone === 'warning'
            ? '#eab308'
            : tone === 'error'
              ? '#ef4444'
              : '#9ca3af';
      const chipSx =
        tone === 'success'
          ? { bgcolor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }
          : tone === 'warning'
            ? { bgcolor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a' }
            : tone === 'error'
              ? { bgcolor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }
              : { bgcolor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };

      return (
        <Chip
          label={
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
              {getStatusLabel(status)}
            </Box>
          }
          size="small"
          sx={{ borderRadius: 0, fontSize: 12, fontWeight: 500, height: 'auto', py: 0.5, ...chipSx }}
        />
      );
    },
    [getStatusLabel],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box className="container-shared" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {!isTrashView && (
          <Box
            sx={{
              bgcolor: '#fff',
              border: '1px solid #e5e7eb',
              p: 3,
              mb: 3,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(79,70,229,0.1)', color: 'primary.main' }}>
                  <Folder style={{ width: 24, height: 24 }} />
                </Box>
                <Typography component="h1" style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{t.title}</Typography>
              </Box>
              <Typography style={{ fontSize: 14, color: '#6b7280' }}>{t.subtitle}</Typography>
            </Box>
            <Box sx={{ display: 'flex', width: { xs: '100%', md: 'auto' }, flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 1.5, position: 'relative' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 0.5 }}>
                    <Box sx={{ position: 'relative' }}>
                      <DroppableHeaderTrigger
                        onDragOver={() => {
                          if (activeModal !== 'folders') {
                            setFolderModalFromDrag(true);
                            openModal('folders');
                          }
                        }}
                      >
                        <Box
                          component="button"
                          type="button"
                          onClick={() => {
                            setFolderModalFromDrag(false);
                            openModal('folders');
                          }}
                          disabled={isTrashView}
                          title={t.folders.title.value}
                          sx={{
                            ...listToggleSx(isFolderActive),
                            ...(draggingFile ? { outline: '2px solid rgba(79,70,229,0.3)', outlineOffset: 2 } : {}),
                          }}
                        >
                          <Folder style={{ width: 16, height: 16 }} />
                          {t.folders.title}
                        </Box>
                      </DroppableHeaderTrigger>
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => handleListChange('active')}
                      sx={listToggleSx(!isTrashView)}
                    >
                      <FileText style={{ width: 16, height: 16 }} />
                      {t.tabs.all}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => handleListChange('trash')}
                      sx={listToggleSx(isTrashView)}
                    >
                      <Trash2 style={{ width: 16, height: 16 }} />
                      {t.tabs.trash}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ position: 'relative', width: { xs: '100%', md: 320 } }} data-tour-id="file-search">
                  <Search style={{ width: 16, height: 16, color: '#9ca3af', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <TextField
                    size="small"
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={t.searchPlaceholder.value}
                    aria-label={t.searchFiles.value}
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': { borderRadius: 0, pl: 4 },
                    }}
                  />
                </Box>
                <Box sx={{ position: 'relative', width: { xs: '100%', md: 224 } }}>
                  <select
                    value={sortKey}
                    onChange={e => handleSortChange(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e5e7eb', background: '#fff', padding: '8px 40px 8px 12px', fontSize: 14, color: '#111827', outline: 'none', appearance: 'auto' }}
                  >
                    <option value="createdAt:desc">{t.sort.newest}</option>
                    <option value="createdAt:asc">{t.sort.oldest}</option>
                    <option value="fileName:asc">{t.sort.nameAsc}</option>
                    <option value="fileName:desc">{t.sort.nameDesc}</option>
                    <option value="bankName:asc">{t.sort.bankAsc}</option>
                    <option value="bankName:desc">{t.sort.bankDesc}</option>
                  </select>
                </Box>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="button"
                    onClick={() => setFilterOpen(true)}
                    data-tour-id="filters-button"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 2,
                      py: 1,
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#fff',
                      bgcolor: 'primary.main',
                      cursor: 'pointer',
                      gap: 1,
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    <Filter style={{ width: 20, height: 20 }} />
                    {t.filters.button}
                    {filtersApplied && <Box sx={{ ml: 1, width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'inline-flex', bgcolor: '#f3f4f6', p: 0.5 }}>
              <Box
                component="button"
                type="button"
                onClick={() => setSelectedStorageProvider('google')}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  bgcolor: selectedStorageProvider === 'google' ? '#fff' : 'transparent',
                }}
              >
                <Image src="/icons/google-drive-icon.png" alt="Google Drive" width={18} height={18} />
                <Box component="span" sx={{ whiteSpace: 'nowrap' }}>Google Drive</Box>
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setSelectedStorageProvider('dropbox')}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  bgcolor: selectedStorageProvider === 'dropbox' ? '#fff' : 'transparent',
                }}
              >
                <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={18} height={18} />
                <Box component="span" sx={{ whiteSpace: 'nowrap' }}>Dropbox</Box>
              </Box>
            </Box>
          </Box>

          {selectedStorageProvider === 'google' ? (
            <GoogleDriveStorageWidget locale={locale} />
          ) : (
            <DropboxStorageWidget locale={locale} />
          )}
        </Box>
        {!isTrashView && (
          <Box sx={{ border: '1px solid #e5e7eb', bgcolor: '#fff', p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image src="/icons/gmail.png" alt="Gmail" width={20} height={20} />
                </Box>
                <Box>
                  <Typography style={{ fontSize: 14, color: '#6b7280' }}>Gmail Receipts</Typography>
                  <Typography style={{ fontWeight: 600, color: '#111827' }}>
                    Auto-imported receipts from Gmail
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Box
                  component="button"
                  onClick={() => router.push('/statements')}
                  disabled={!(gmailStatus?.connected === true) || gmailLoading}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    bgcolor: '#2563eb',
                    color: '#fff',
                    cursor: 'pointer',
                    border: 'none',
                    opacity: gmailStatus?.connected === true && !gmailLoading ? 1 : 0.5,
                    '&:disabled': { cursor: 'not-allowed' },
                    '&:hover': { bgcolor: '#1d4ed8' },
                  }}
                >
                  {tx(['gmail', 'viewReceipts'], 'View Receipts')}
                </Box>

                <Box
                  component="button"
                  onClick={() => router.push('/integrations/gmail')}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    border: '1px solid #e5e7eb',
                    px: 2,
                    py: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#374151',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f9fafb' },
                  }}
                >
                  {gmailStatus?.connected === true
                    ? tx(['gmail', 'settings'], 'Settings')
                    : tx(['gmail', 'connect'], 'Connect')}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', overflow: 'visible' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e5e7eb', bgcolor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                {isTrashView ? t.trash.title : t.subtitle}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                {isTrashView && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                    <Typography style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>
                      {t.trash.selectedLabel.value.replace('{count}', String(selectedTrashCount))}
                    </Typography>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => handleBulkRestore(selectedTrashIds)}
                      disabled={selectedTrashCount === 0}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        border: '1px solid #a7f3d0',
                        bgcolor: '#ecfdf5',
                        px: 1.5,
                        py: 0.75,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#065f46',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#d1fae5' },
                        '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                      }}
                    >
                      <RotateCcw size={14} />
                      {t.trash.restoreSelected.value}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setBulkDeleteModalOpen(true)}
                      disabled={selectedTrashCount === 0}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        border: '1px solid #fecaca',
                        bgcolor: '#fef2f2',
                        px: 1.5,
                        py: 0.75,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#b91c1c',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#fee2e2' },
                        '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                      }}
                    >
                      <Trash2 size={14} />
                      {t.trash.deleteSelected.value}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setEmptyTrashModalOpen(true)}
                      disabled={files.length === 0}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        border: '1px solid #e5e7eb',
                        bgcolor: '#fff',
                        px: 1.5,
                        py: 0.75,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f9fafb' },
                        '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                      }}
                    >
                      <Trash2 size={14} />
                      {t.trash.emptyAction.value}
                    </Box>
                  </Box>
                )}
                {filtersApplied && (
                  <Typography style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>
                    {t.filters.title} · {t.filters.button}
                  </Typography>
                )}
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
                <Spinner className="h-8 w-8 text-primary" />
              </Box>
            ) : filteredFiles.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
                <Box sx={{ mx: 'auto', width: 64, height: 64, color: '#9ca3af', mb: 2, bgcolor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isTrashView ? <Trash2 style={{ width: 32, height: 32 }} /> : <Search style={{ width: 32, height: 32 }} />}
                </Box>
                <Typography style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
                  {emptyStateTitle}
                </Typography>
                <Typography style={{ marginTop: 4, color: '#4b5563' }}>{emptyStateSubtitle}</Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto', overflowY: 'visible' }} data-tour-id="storage-table">
                <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      {isTrashView && (
                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 48 }}>
                          <Checkbox
                            checked={allTrashSelected}
                            indeterminate={
                              selectedTrashIdsInView.length > 0 &&
                              selectedTrashIdsInView.length < selectableTrashIds.length
                            }
                            onCheckedChange={toggleSelectAllTrash}
                            className="h-4 w-4"
                            aria-label={t.trash.selectAll.value}
                          />
                        </th>
                      )}
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.fileName}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.bank}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.account}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.size}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.status}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.category}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.table.access}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isTrashView ? t.table.deletedAt : t.table.createdAt}
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 96 }}>
                        {t.table.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ background: '#fff' }}>
                    {paginatedFiles.map((file, index) => (
                      <DraggableFileRow
                        key={file.id}
                        dataTourId={!isTrashView && index === 0 ? 'storage-file-row' : undefined}
                        file={file}
                        isTrashView={isTrashView}
                        selectedTrashIds={selectedTrashIds}
                        toggleTrashSelection={toggleTrashSelection}
                        setPreviewFileId={setPreviewFileId}
                        setPreviewFileName={setPreviewFileName}
                        setPreviewModalOpen={setPreviewModalOpen}
                        canEditFile={canEditFile}
                        truncateFileNameForDisplay={truncateFileNameForDisplay}
                        renderTrashExpiryBadge={renderTrashExpiryBadge}
                        renderAvailabilityChip={renderAvailabilityChip}
                        tagChipClass={tagChipClass}
                        getTagChipStyle={getTagChipStyle}
                        getBankDisplayName={getBankDisplayName}
                        formatFileSize={formatFileSize}
                        renderStatusBadge={renderStatusBadge}
                        handleCategoryChange={handleCategoryChange}
                        categories={categories}
                        categoriesLoading={categoriesLoading}
                        trashSelectRowLabel={t.trash.selectRow.value}
                        dragDropRowHintLabel={t.dragDrop.rowHint.value}
                        previewLabel={t.preview.value}
                        sharedLinksShortLabel={resolveLabel(t.sharedLinksShort, 'links')}
                        categoryNoneLabel={resolveLabel(t.categoryCell.none, 'No category')}
                        ownerLabel={t.permission.owner.value}
                        trashRestoreActionLabel={t.trash.restoreAction.value}
                        trashDeleteActionLabel={t.trash.deleteAction.value}
                        viewTooltipLabel={t.actions.tooltipView.value}
                        downloadTooltipLabel={t.actions.tooltipDownload.value}
                        deleteActionLabel={t.actions.delete.value}
                        getPermissionLabel={getPermissionLabel}
                        formatDate={formatDate}
                        handleRestoreFromTrash={handleRestoreFromTrash}
                        confirmPermanentDelete={confirmPermanentDelete}
                        handleView={handleView}
                        handleDownload={handleDownload}
                        confirmDelete={confirmDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { md: 'center' },
                justifyContent: 'space-between',
                gap: 1.5,
                px: 3,
                py: 2,
                borderTop: '1px solid #e5e7eb',
              }}
              data-tour-id="pagination"
            >
              <Typography style={{ fontSize: 14, color: '#4b5563' }}>
                {totalItems === 0
                  ? emptyStateTitle
                  : formatPaginationLabel(paginationLabels.shown, {
                      from: rangeStart,
                      to: rangeEnd,
                      count: totalItems,
                    })}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography style={{ fontSize: 14, color: '#4b5563', minWidth: 120, textAlign: 'center' }}>
                  {formatPaginationLabel(paginationLabels.pageOf, {
                    page: currentPage,
                    count: totalPagesCount,
                  })}
                </Typography>
                <AppPagination page={currentPage} total={totalPagesCount} onChange={setPage} />
              </Box>
            </Box>
          </Box>
        </Box>
        <DragOverlay style={{ pointerEvents: 'none' }}>
          {draggingFile ? (
            <Box sx={{ bgcolor: '#fff', p: 2, border: '1px solid rgba(79,70,229,0.5)', opacity: 0.9, width: 300 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: '#f9fafb' }}>
                  <DocumentTypeIcon
                    fileType={draggingFile.fileType}
                    fileName={draggingFile.fileName}
                    fileId={draggingFile.id}
                    size={24}
                  />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draggingFile.fileName}</Box>
                  <Box style={{ fontSize: 12, color: '#6b7280' }}>
                    {formatFileSize(draggingFile.fileSize)}
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : null}
        </DragOverlay>
        {activeModal === 'folders' && (
          <>
            <Box
              sx={{ position: 'fixed', inset: 0, zIndex: 70, bgcolor: 'rgba(0,0,0,0.3)' }}
              role="button"
              tabIndex={0}
              onClick={closeModal}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  closeModal();
                }
              }}
            />
            <Box sx={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
              <Box sx={{ display: 'flex', width: '100%', maxWidth: 1380, minHeight: '70vh', maxHeight: '90vh', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb', bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', px: 3, py: 2 }}>
                  <Box>
                    <Typography style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                      {t.modals.foldersTitle}
                    </Typography>
                    <Typography style={{ fontSize: 14, color: '#6b7280' }}>
                      {t.modals.foldersSubtitle}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={closeModal} sx={{ borderRadius: 0 }}>
                    <X size={18} />
                  </IconButton>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {folderMoveFeedback && (
                    <Box
                      role={folderMoveFeedback.tone === 'error' ? 'alert' : 'status'}
                      sx={{
                        border: '1px solid',
                        px: 1.5,
                        py: 1,
                        fontSize: 14,
                        ...(folderMoveFeedback.tone === 'success'
                          ? { borderColor: '#a7f3d0', bgcolor: '#ecfdf5', color: '#065f46' }
                          : { borderColor: '#fecaca', bgcolor: '#fef2f2', color: '#b91c1c' }),
                      }}
                    >
                      {folderMoveFeedback.message}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', gap: 1, minWidth: 220 }}>
                      <TextField
                        size="small"
                        value={newFolderName}
                        onChange={event =>
                          setNewFolderName(clampFolderName(event.target.value, newFolderName))
                        }
                        placeholder={t.folders.createPlaceholder.value}
                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                      />
                      <IconButton
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        title={t.folders.createTooltip.value}
                        sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: '#d1d5db', cursor: 'not-allowed' } }}
                      >
                        <Plus size={18} />
                      </IconButton>
                    </Box>
                    {draggingFile && (
                      <Typography style={{ fontSize: 12, color: 'var(--color-primary, #4f46e5)' }}>{t.dragDrop.subtitle}</Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '550px 1fr' } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ border: '1px solid #e5e7eb', p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                              {t.modals.folderListTitle}
                            </Typography>
                            {pickedFolderId && (
                              <Typography style={{ marginTop: 2, fontSize: 12, fontWeight: 700, color: 'var(--color-primary, #4f46e5)', letterSpacing: '-0.025em' }}>
                                {t.scrollHint.value}
                              </Typography>
                            )}
                          </Box>
                          <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                            {folders.length}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 1.5, px: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '45vh', overflowY: 'auto' }}>
                          <Box
                            component="button"
                            type="button"
                            onClick={() => setActiveFolderId('')}
                            sx={{
                              display: 'flex',
                              width: '100%',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid',
                              px: 2,
                              py: 1.5,
                              fontSize: 14,
                              fontWeight: 500,
                              cursor: 'pointer',
                              bgcolor: activeFolderId === '' ? 'rgba(79,70,229,0.1)' : 'transparent',
                              color: activeFolderId === '' ? 'primary.main' : '#374151',
                              borderColor: activeFolderId === '' ? 'rgba(79,70,229,0.4)' : '#f3f4f6',
                            }}
                          >
                            <Box component="span">{t.folders.all}</Box>
                            <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                              {files.length}
                            </Typography>
                          </Box>
                          <DroppableFolderButton
                            isNoFolder
                            active={activeFolderId === NO_FOLDER}
                            onClick={() => setActiveFolderId(NO_FOLDER)}
                            style={{
                              display: 'flex',
                              width: '100%',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              fontSize: 14,
                              fontWeight: 500,
                              cursor: 'pointer',
                              background: activeFolderId === NO_FOLDER ? 'rgba(79,70,229,0.05)' : 'transparent',
                              color: activeFolderId === NO_FOLDER ? '#4f46e5' : '#374151',
                              border: 'none',
                            }}
                          >
                            <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box component="span">{t.folders.none}</Box>
                              <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                                {folderCounts.noFolder}
                              </Typography>
                            </Box>
                          </DroppableFolderButton>
                          {folders.length === 0 ? (
                            <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                              {t.modals.folderListEmpty}
                            </Typography>
                          ) : (
                            folders.map((folder) => (
                              <Box key={folder.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <DroppableFolderButton
                                  folderId={folder.id}
                                  active={activeFolderId === folder.id}
                                  onClick={() => setActiveFolderId(folder.id)}
                                  onContextMenu={e => handleFolderContextMenu(e, folder)}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '12px 16px',
                                    border: '1px solid',
                                    borderColor: pickedFolderId === folder.id
                                      ? '#4f46e5'
                                      : activeFolderId === folder.id
                                        ? 'rgba(79,70,229,0.3)'
                                        : '#f3f4f6',
                                    background: (pickedFolderId === folder.id || activeFolderId === folder.id)
                                      ? 'rgba(79,70,229,0.05)'
                                      : 'transparent',
                                    cursor: pickedFolderId === folder.id ? 'ns-resize' : 'pointer',
                                    boxShadow: pickedFolderId === folder.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                    zIndex: pickedFolderId === folder.id ? 10 : undefined,
                                  }}
                                >
                                  {editingFolderId === folder.id ? (
                                    <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', gap: 1 }}>
                                      <TextField
                                        size="small"
                                        value={editingFolderName}
                                        onChange={event =>
                                          setEditingFolderName(
                                            clampFolderName(event.target.value, editingFolderName),
                                          )
                                        }
                                        onClick={event => event.stopPropagation()}
                                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={event => {
                                          event.stopPropagation();
                                          handleRenameFolder(folder.id);
                                        }}
                                        sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', '&:hover': { bgcolor: 'primary.dark' } }}
                                      >
                                        <Check size={16} />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={event => {
                                          event.stopPropagation();
                                          handleCancelEditFolder();
                                        }}
                                        sx={{ border: '1px solid #e5e7eb', borderRadius: '50%', color: '#6b7280', '&:hover': { bgcolor: '#f9fafb' } }}
                                      >
                                        <X size={16} />
                                      </IconButton>
                                    </Box>
                                  ) : (
                                    <>
                                      <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1, textAlign: 'left' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                          <Folder
                                            style={{
                                              width: 16,
                                              height: 16,
                                              color: folder.tag?.color ?? '#9ca3af',
                                            }}
                                          />
                                          <Typography
                                            style={{
                                              fontSize: 14,
                                              fontWeight: 500,
                                              color: '#111827',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {folder.name}
                                          </Typography>
                                        </Box>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {pickedFolderId === null ? (
                                          <Box
                                            component="button"
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPickedFolderId(folder.id);
                                            }}
                                            sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, fontSize: 12, fontWeight: 500, color: '#9ca3af', border: 'none', bgcolor: 'transparent', cursor: 'pointer', opacity: 0, '.group:hover &': { opacity: 1 }, '&:hover': { color: 'primary.main', bgcolor: 'rgba(79,70,229,0.05)' } }}
                                          >
                                            {t.dragAndDrop.value}
                                          </Box>
                                        ) : pickedFolderId === folder.id ? (
                                          <Box
                                            component="button"
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPickedFolderId(null);
                                              toast.success(
                                                `${tx(['toasts', 'fileMovedTo'], 'File moved to folder')} "${folder.name}"`,
                                              );
                                            }}
                                            sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: 'primary.main', color: '#fff', px: 1.5, py: 0.5, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' } }}
                                          >
                                            {t.done.value}
                                          </Box>
                                        ) : null}
                                        {canEditFolder(folder) && (
                                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <IconButton
                                              size="small"
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleFolderContextMenu(e, folder);
                                              }}
                                              sx={{ color: '#9ca3af', borderRadius: '50%', '&:hover': { bgcolor: '#f3f4f6' } }}
                                            >
                                              <MoreVertical size={16} />
                                            </IconButton>
                                          </Box>
                                        )}
                                      </Box>
                                    </>
                                  )}
                                </DroppableFolderButton>
                                {folderTagPickerId === folder.id && canEditFolder(folder) && (
                                  <Box
                                    sx={{ border: '1px solid #f3f4f6', p: 1 }}
                                    onClick={event => event.stopPropagation()}
                                    onKeyDown={event => event.stopPropagation()}
                                  >
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                      <Box
                                        component="button"
                                        type="button"
                                        onClick={() => handleUpdateFolderTag(folder.id, null)}
                                        sx={{ fontSize: 12, fontWeight: 500, color: '#6b7280', border: 'none', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { color: '#111827' } }}
                                      >
                                        {t.tags.clear}
                                      </Box>
                                      {tags.map(tag => {
                                        const isActive = folder.tag?.id === tag.id;
                                        return (
                                          <Box
                                            key={tag.id}
                                            component="button"
                                            type="button"
                                            onClick={() => handleUpdateFolderTag(folder.id, tag.id)}
                                            sx={tagChipSx(isActive)}
                                            style={getTagChipStyle(tag)}
                                          >
                                            {tag.name}
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            ))
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ border: '1px solid #e5e7eb', p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {t.tags.title}
                          </Typography>
                          <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                            {tags.length}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            value={newTagName}
                            onChange={event => setNewTagName(event.target.value)}
                            placeholder={t.tags.createPlaceholder.value}
                            sx={{ flex: 1, minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                          />
                          <Box sx={{ position: 'relative' }}>
                            <IconButton
                              size="small"
                              onClick={event => {
                                setNewTagAnchorEl(event.currentTarget);
                                setNewTagPickerOpen(prev => !prev);
                              }}
                              aria-label={t.tagColor.value}
                              sx={{ border: '1px solid #e5e7eb', borderRadius: '50%', p: 0.5 }}
                            >
                              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: newTagColor }} />
                            </IconButton>
                            <Popover
                              open={newTagPickerOpen}
                              anchorEl={newTagAnchorEl}
                              onClose={() => {
                                setNewTagPickerOpen(false);
                                setNewTagAnchorEl(null);
                              }}
                              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                              slotProps={colorPickerPopoverSlotProps}
                            >
                              <HexColorPicker color={newTagColor} onChange={setNewTagColor} />
                            </Popover>
                          </Box>
                          <IconButton
                            onClick={handleCreateTag}
                            title={t.tags.createTooltip.value}
                            sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', '&:hover': { bgcolor: 'primary.dark' } }}
                          >
                            <Plus size={18} />
                          </IconButton>
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '30vh', overflowY: 'auto', minHeight: 200, pb: 13 }}>
                          {tags.length === 0 ? (
                            <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                              {t.tags.empty}
                            </Typography>
                          ) : (
                            tags.map(tag => (
                              <Box
                                key={tag.id}
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, border: '1px solid #f3f4f6', px: 1.5, py: 1 }}
                              >
                                {editingTagId === tag.id ? (
                                  <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <TextField
                                        size="small"
                                        value={editingTagName}
                                        onChange={event => setEditingTagName(event.target.value)}
                                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                                      />
                                      <Box sx={{ position: 'relative' }}>
                                        <IconButton
                                          size="small"
                                          onClick={event => {
                                            setEditingTagAnchorEl(event.currentTarget);
                                            setEditingTagPickerId(prev =>
                                              prev === tag.id ? null : tag.id,
                                            );
                                          }}
                                          aria-label={t.tagColor.value}
                                          sx={{ border: '1px solid #e5e7eb', borderRadius: '50%', p: 0.5 }}
                                        >
                                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: editingTagColor || '#4f46e5' }} />
                                        </IconButton>
                                        <Popover
                                          open={editingTagPickerId === tag.id}
                                          anchorEl={editingTagAnchorEl}
                                          onClose={() => {
                                            setEditingTagPickerId(null);
                                            setEditingTagAnchorEl(null);
                                          }}
                                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                          slotProps={colorPickerPopoverSlotProps}
                                        >
                                          <HexColorPicker
                                            color={editingTagColor || '#4f46e5'}
                                            onChange={setEditingTagColor}
                                          />
                                        </Popover>
                                      </Box>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRenameTag(tag.id)}
                                        sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', '&:hover': { bgcolor: 'primary.dark' } }}
                                      >
                                        <Check size={16} />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={handleCancelEditTag}
                                        sx={{ border: '1px solid #e5e7eb', borderRadius: '50%', color: '#6b7280', '&:hover': { bgcolor: '#f9fafb' } }}
                                      >
                                        <X size={16} />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                ) : (
                                  <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tag.color || '#cbd5f5', flexShrink: 0 }} />
                                      <Typography
                                        style={{ fontSize: 14, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {tag.name}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                                        {tagCounts[tag.id] ?? 0}
                                      </Typography>
                                      {canEditTag(tag) && (
                                        <>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleStartEditTag(tag)}
                                            title={t.tags.renameTooltip.value}
                                            sx={{ border: '1px solid #e5e7eb', borderRadius: '50%', color: '#6b7280', '&:hover': { bgcolor: '#f9fafb' } }}
                                          >
                                            <PencilLine size={16} />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={() => confirmDeleteTag(tag)}
                                            title={t.tags.deleteTooltip.value}
                                            sx={{ border: '1px solid #e5e7eb', borderRadius: '50%', color: '#6b7280', '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' } }}
                                          >
                                            <Trash2 size={16} />
                                          </IconButton>
                                        </>
                                      )}
                                    </Box>
                                  </>
                                )}
                              </Box>
                            ))
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ border: '1px solid #e5e7eb', p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box>
                          <Typography style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {activeFolderLabel}
                          </Typography>
                          <Typography style={{ fontSize: 12, color: '#6b7280' }}>
                            {t.modals.filesLabel} · {folderModalFiles.length}
                          </Typography>
                        </Box>
                        {draggingFile && (
                          <Typography style={{ fontSize: 12, color: 'var(--color-primary, #4f46e5)' }}>{t.dragDrop.title}</Typography>
                        )}
                      </Box>
                      <Box sx={{ position: 'relative', mt: 1.5 }}>
                        <Search style={{ width: 16, height: 16, color: '#9ca3af', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <TextField
                          size="small"
                          value={folderFileQuery}
                          onChange={event => setFolderFileQuery(event.target.value)}
                          placeholder={t.modals.fileSearchPlaceholder.value}
                          sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 0, pl: 4 } }}
                        />
                      </Box>
                      <Box sx={{ mt: 1.5, maxHeight: '50vh', overflowY: 'auto', border: '1px solid #f3f4f6' }}>
                        {folderModalFiles.length === 0 ? (
                          <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
                            <Box sx={{ mx: 'auto', mb: 2, display: 'flex', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb', color: '#d1d5db' }}>
                              <FileX size={32} />
                            </Box>
                            <Typography style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
                              {t.modals.filesEmpty}
                            </Typography>
                          </Box>
                        ) : (
                          folderModalFiles.map(file => (
                            <DraggableModalFileItem
                              key={file.id}
                              file={file}
                              canEditFile={canEditFile}
                              rowHintLabel={t.dragDrop.rowHint.value}
                              tableFromLabel={tx(['table', 'from'], 'from')}
                            />
                          ))
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </>
        )}
        {filterOpen && (
          <>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => setFilterOpen(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFilterOpen(false);
                }
              }}
              sx={{ position: 'fixed', inset: 0, zIndex: 50, bgcolor: 'rgba(0,0,0,0.4)' }}
            />
            <Box sx={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, pointerEvents: 'none' }}>
              <Box sx={{ width: '100%', maxWidth: 896, bgcolor: '#fff', boxShadow: 24, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0, bgcolor: '#fff' }}>
                  <Typography style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    {t.filters.title}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setFilterOpen(false)}
                    sx={{ color: '#9ca3af', borderRadius: '50%', '&:hover': { bgcolor: '#f3f4f6', color: '#374151' } }}
                  >
                    <X size={20} />
                  </IconButton>
                </Box>

                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* Left: Filters */}
                  <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <label
                          htmlFor="storage-filter-status"
                          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}
                        >
                          {t.filters.status}
                        </label>
                        <select
                          id="storage-filter-status"
                          value={stagedFilters.status}
                          onChange={e => handleFilterChange('status', e.target.value)}
                          style={{ width: '100%', border: '1px solid #e5e7eb', background: 'rgba(249,250,251,0.5)', padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none' }}
                        >
                          <option value="">{t.filters.all}</option>
                          {statusOptions.map(status => (
                            <option key={status} value={status}>
                              {getStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <label
                          htmlFor="storage-filter-bank"
                          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}
                        >
                          {t.filters.bank}
                        </label>
                        <select
                          id="storage-filter-bank"
                          value={stagedFilters.bank}
                          onChange={e => handleFilterChange('bank', e.target.value)}
                          style={{ width: '100%', border: '1px solid #e5e7eb', background: 'rgba(249,250,251,0.5)', padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none' }}
                        >
                          <option value="">{t.filters.all}</option>
                          {bankOptions.map(bank => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <label
                          htmlFor="storage-filter-category"
                          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}
                        >
                          {t.filters.category}
                        </label>
                        <select
                          id="storage-filter-category"
                          value={stagedFilters.categoryId}
                          onChange={e => handleFilterChange('categoryId', e.target.value)}
                          style={{ width: '100%', border: '1px solid #e5e7eb', background: 'rgba(249,250,251,0.5)', padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none' }}
                        >
                          <option value="">{t.filters.all}</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <label
                          htmlFor="storage-filter-ownership"
                          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}
                        >
                          {t.filters.accessType}
                        </label>
                        <select
                          id="storage-filter-ownership"
                          value={stagedFilters.ownership}
                          onChange={e => handleFilterChange('ownership', e.target.value)}
                          style={{ width: '100%', border: '1px solid #e5e7eb', background: 'rgba(249,250,251,0.5)', padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none' }}
                        >
                          <option value="">{t.filters.all}</option>
                          <option value="owned">{t.filters.owned}</option>
                          <option value="shared">{t.filters.shared}</option>
                        </select>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, gridColumn: { sm: 'span 2' } }}>
                        <label
                          htmlFor="storage-filter-folder"
                          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}
                        >
                          {t.filters.folder}
                        </label>
                        <select
                          id="storage-filter-folder"
                          value={stagedFilters.folderId}
                          onChange={e => handleFilterChange('folderId', e.target.value)}
                          style={{ width: '100%', border: '1px solid #e5e7eb', background: 'rgba(249,250,251,0.5)', padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none' }}
                        >
                          <option value="">{t.filters.all}</option>
                          <option value={NO_FOLDER}>{t.folders.none}</option>
                          {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </select>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 'auto', pt: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box
                        component="button"
                        onClick={handleResetFilters}
                        sx={{ fontSize: 14, fontWeight: 500, color: '#6b7280', bgcolor: 'transparent', border: 'none', cursor: 'pointer', px: 1, py: 0.5, '&:hover': { color: '#1f2937' } }}
                      >
                        {t.filters.reset}
                      </Box>
                      <Box
                        component="button"
                        onClick={handleApplyFilters}
                        sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.main', color: '#fff', px: 4, py: 1.25, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' } }}
                      >
                        {t.filters.apply}
                      </Box>
                    </Box>
                  </Box>

                  {/* Right: Views */}
                  <Box sx={{ width: { xs: '100%', md: 320 }, borderLeft: '1px solid #f3f4f6', bgcolor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Bookmark style={{ width: 16, height: 16, color: '#4f46e5' }} />
                        <Typography style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                          {t.modals.viewCreateTitle.value.replace(':', '')}
                        </Typography>
                      </Box>

                      {/* Save View Input */}
                      <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
                        <TextField
                          size="small"
                          value={viewName}
                          onChange={event => setViewName(event.target.value)}
                          placeholder={t.views.namePlaceholder.value}
                          sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                        />
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleSaveView({
                              searchQuery,
                              filterOpen,
                              filters,
                              stagedFilters,
                              sort,
                            })
                          }
                          disabled={viewSaving || !viewName.trim()}
                          title={t.views.saveTooltip.value}
                          sx={{ border: '1px solid #e5e7eb', borderRadius: 0, color: 'primary.main', bgcolor: '#fff', '&:hover': { bgcolor: 'primary.main', color: '#fff' }, '&:disabled': { opacity: 0.5 } }}
                        >
                          <Save size={18} />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                            {t.views.title}
                          </Typography>
                          <Typography style={{ fontSize: 12, color: '#6b7280' }}>{views.length}</Typography>
                        </Box>

                        {viewsLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <Spinner className="h-5 w-5 text-gray-400" />
                          </Box>
                        ) : views.length === 0 ? (
                          <Typography style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                            {t.views.empty}
                          </Typography>
                        ) : (
                          views.map(view => (
                            <Box
                              key={view.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                border: '1px solid',
                                borderColor: activeViewId === view.id ? 'rgba(79,70,229,0.3)' : '#e5e7eb',
                                bgcolor: activeViewId === view.id ? 'rgba(79,70,229,0.05)' : '#fff',
                                px: 1.5,
                                py: 1.25,
                                '&:hover .view-delete-btn': { opacity: 1 },
                              }}
                            >
                              <Box
                                component="button"
                                type="button"
                                onClick={() => {
                                  applyView(view);
                                  setFilterOpen(false);
                                }}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1, fontSize: 14, fontWeight: 500, color: '#374151', bgcolor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                              >
                                {activeViewId === view.id && (
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                                )}
                                <Typography style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {view.name}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                className="view-delete-btn"
                                onClick={() => handleDeleteView(view.id)}
                                title={t.views.delete.value}
                                sx={{ color: '#d1d5db', opacity: 0, borderRadius: 0, '&:hover': { color: '#ef4444', bgcolor: 'transparent' } }}
                              >
                                <X size={14} />
                              </IconButton>
                            </Box>
                          ))
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </>
        )}
        <ConfirmModal
          isOpen={deleteFolderModalOpen}
          onClose={closeDeleteFolderModal}
          onConfirm={handleDeleteFolder}
          title={t.folders.deleteTitle.value}
          message={
            folderToDelete ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
                  {t.folders.deleteMessagePrefix.value}
                  {folderToDelete.name}
                  {t.folders.deleteMessageSuffix.value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, color: '#4b5563' }}>
                  <Checkbox
                    checked={deleteFolderWithContents}
                    onCheckedChange={setDeleteFolderWithContents}
                    className="h-4 w-4"
                  />
                  {t.folders.deleteWithContents}
                </Box>
              </Box>
            ) : (
              <Typography style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>{t.folders.deleteMessageFallback}</Typography>
            )
          }
          confirmText={t.folders.deleteConfirm.value}
          cancelText={t.folders.deleteCancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setFileToDelete(null);
          }}
          onConfirm={handleDelete}
          title={t.delete.title.value}
          message={
            fileToDelete
              ? `${t.delete.messagePrefix.value}${fileToDelete.fileName}${t.delete.messageSuffix.value}`
              : t.delete.messageFallback.value
          }
          confirmText={t.delete.confirm.value}
          cancelText={t.delete.cancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={permanentDeleteModalOpen}
          onClose={() => {
            setPermanentDeleteModalOpen(false);
            setFileToDeletePermanently(null);
          }}
          onConfirm={handlePermanentDelete}
          title={t.permanentDelete.title.value}
          message={
            fileToDeletePermanently
              ? `${t.permanentDelete.messagePrefix.value}${fileToDeletePermanently.fileName}${t.permanentDelete.messageSuffix.value}`
              : t.permanentDelete.messageFallback.value
          }
          confirmText={t.permanentDelete.confirm.value}
          cancelText={t.permanentDelete.cancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={bulkDeleteModalOpen}
          onClose={() => setBulkDeleteModalOpen(false)}
          onConfirm={() => handleBulkDeleteFromTrash(selectedTrashIds)}
          title={t.trash.bulkDeleteTitle.value}
          message={t.trash.bulkDeleteMessage.value.replace('{count}', String(selectedTrashCount))}
          confirmText={t.trash.bulkDeleteConfirm.value}
          cancelText={t.trash.bulkDeleteCancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={emptyTrashModalOpen}
          onClose={() => setEmptyTrashModalOpen(false)}
          onConfirm={handleEmptyTrash}
          title={t.trash.emptyTitle.value}
          message={t.trash.emptyMessage.value}
          confirmText={t.trash.emptyConfirm.value}
          cancelText={t.trash.emptyCancel.value}
          isDestructive
        />
        <ConfirmModal
          isOpen={deleteTagModalOpen}
          onClose={() => {
            setDeleteTagModalOpen(false);
            setTagToDelete(null);
          }}
          onConfirm={handleDeleteTag}
          title={t.tags.deleteTitle.value}
          message={
            tagToDelete
              ? `${t.tags.deleteMessagePrefix.value}${tagToDelete.name}${t.tags.deleteMessageSuffix.value}`
              : t.tags.deleteMessageFallback.value
          }
          confirmText={t.tags.deleteConfirm.value}
          cancelText={t.tags.deleteCancel.value}
          isDestructive
        />
        {/* PDF Preview Modal */}
        {previewModalOpen && previewFileId && (
          <PDFPreviewModal
            isOpen={previewModalOpen}
            onClose={() => {
              setPreviewModalOpen(false);
              setPreviewFileId(null);
              setPreviewFileName('');
            }}
            fileId={previewFileId}
            fileName={previewFileName}
          />
        )}
        {/* Folder Context Menu */}
        {folderContextMenu && (
          <Box
            sx={{
              position: 'fixed',
              zIndex: 100,
              minWidth: 200,
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              bgcolor: '#fff',
              boxShadow: 24,
            }}
            style={{
              top:
                typeof window !== 'undefined' && folderContextMenu.y + 160 > window.innerHeight
                  ? folderContextMenu.y - 160
                  : folderContextMenu.y,
              left:
                typeof window !== 'undefined' && folderContextMenu.x + 200 > window.innerWidth
                  ? folderContextMenu.x - 200
                  : folderContextMenu.x,
            }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="presentation"
          >
            <Box sx={{ p: 0.75, display: 'flex', flexDirection: 'column' }}>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setFolderTagPickerId(folderContextMenu.folder.id);
                  setFolderContextMenu(null);
                }}
                sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1, px: 1.5, py: 1, fontSize: 14, color: '#374151', bgcolor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', '&:hover': { bgcolor: '#f9fafb' } }}
              >
                <Tag size={16} style={{ color: '#9ca3af' }} />
                <span>{t.tags.title.value}</span>
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  handleStartEditFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1, px: 1.5, py: 1, fontSize: 14, color: '#374151', bgcolor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', '&:hover': { bgcolor: '#f9fafb' } }}
              >
                <PencilLine size={16} style={{ color: '#9ca3af' }} />
                <span>{t.folders.renameTooltip.value}</span>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box
                component="button"
                type="button"
                onClick={() => {
                  confirmDeleteFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1, px: 1.5, py: 1, fontSize: 14, color: '#dc2626', bgcolor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', '&:hover': { bgcolor: '#fef2f2' } }}
              >
                <Trash2 size={16} />
                <span>{t.folders.deleteTooltip.value}</span>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </DndContext>
  );
}

export default StoragePageContent;
