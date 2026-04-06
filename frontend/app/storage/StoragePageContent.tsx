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
import { Popover } from '@mui/material';
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
      const toneClass = isExpired
        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/30'
        : isSoon
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30'
          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60';
      return (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}
          title={info.expiresAt.toLocaleDateString(
            locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
          )}
        >
          {label}
        </span>
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
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getAvailabilityColor(status)}`}
          title={getAvailabilityTooltip(status)}
        >
          <span className={`h-2 w-2 rounded-full ${getAvailabilityDot(status)}`} />
          {getAvailabilityLabel(status)}
        </span>
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
  const tagChipClass = (isActive: boolean) =>
    `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
      isActive
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800/60 dark:text-gray-200 dark:border-slate-700/60'
    }`;
  const listToggleClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-800'
    }`;
  const renderStatusBadge = useCallback(
    (status: string) => {
      const tone = getStatusTone(status);
      const toneClass =
        tone === 'success'
          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-100 dark:border-green-500/30'
          : tone === 'warning'
            ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30'
            : tone === 'error'
              ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/30'
              : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800/70 dark:text-gray-100 dark:border-slate-700/60';

      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              tone === 'success'
                ? 'bg-green-500'
                : tone === 'warning'
                  ? 'bg-yellow-500'
                  : tone === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
            }`}
          />
          {getStatusLabel(status)}
        </span>
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
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-8">
        {!isTrashView && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700/60 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Folder className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
              </div>
              <p className="text-gray-500 dark:text-gray-300">{t.subtitle}</p>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto relative">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-900 p-1">
                    <div className="relative">
                      <DroppableHeaderTrigger
                        onDragOver={() => {
                          if (activeModal !== 'folders') {
                            setFolderModalFromDrag(true);
                            openModal('folders');
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFolderModalFromDrag(false);
                            openModal('folders');
                          }}
                          disabled={isTrashView}
                          className={`${listToggleClass(isFolderActive)} ${
                            draggingFile
                              ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                              : ''
                          }`}
                          title={t.folders.title.value}
                        >
                          <Folder className="h-4 w-4" />
                          {t.folders.title}
                        </button>
                      </DroppableHeaderTrigger>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleListChange('active')}
                      className={listToggleClass(!isTrashView)}
                    >
                      <FileText className="h-4 w-4" />
                      {t.tabs.all}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleListChange('trash')}
                      className={listToggleClass(isTrashView)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t.tabs.trash}
                    </button>
                  </div>
                </div>
                <div className="relative w-full md:w-80" data-tour-id="file-search">
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={t.searchPlaceholder.value}
                    aria-label={t.searchFiles.value}
                    className="w-full rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="relative w-full md:w-56">
                  <select
                    value={sortKey}
                    onChange={e => handleSortChange(e.target.value)}
                    className="w-full rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 py-2.5 pl-4 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="createdAt:desc">{t.sort.newest}</option>
                    <option value="createdAt:asc">{t.sort.oldest}</option>
                    <option value="fileName:asc">{t.sort.nameAsc}</option>
                    <option value="fileName:desc">{t.sort.nameDesc}</option>
                    <option value="bankName:asc">{t.sort.bankAsc}</option>
                    <option value="bankName:desc">{t.sort.bankDesc}</option>
                  </select>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(true)}
                    data-tour-id="filters-button"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  >
                    <Filter className="-ml-1 mr-2 h-5 w-5" />
                    {t.filters.button}
                    {filtersApplied && <span className="ml-2 h-2 w-2 rounded-full bg-white" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex rounded-full bg-gray-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setSelectedStorageProvider('google')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStorageProvider === 'google'
                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <Image
                  src="/icons/google-drive-icon.png"
                  alt="Google Drive"
                  width={18}
                  height={18}
                />
                <span className="whitespace-nowrap">Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStorageProvider('dropbox')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStorageProvider === 'dropbox'
                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={18} height={18} />
                <span className="whitespace-nowrap">Dropbox</span>
              </button>
            </div>
          </div>

          {selectedStorageProvider === 'google' ? (
            <GoogleDriveStorageWidget locale={locale} />
          ) : (
            <DropboxStorageWidget locale={locale} />
          )}
        </div>
        )
        {!isTrashView && (
          <div className="rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center">
                  <Image src="/icons/gmail.png" alt="Gmail" width={20} height={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Gmail Receipts</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Auto-imported receipts from Gmail
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/** View button disabled when Gmail not connected */}
                <button
                  onClick={() => router.push('/statements')}
                  disabled={!(gmailStatus?.connected === true) || gmailLoading}
                  aria-disabled={!(gmailStatus?.connected === true) || gmailLoading}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    gmailStatus?.connected === true && !gmailLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-600 text-white opacity-50 cursor-not-allowed'
                  }`}
                >
                  {tx(['gmail', 'viewReceipts'], 'View Receipts')}
                </button>

                <button
                  onClick={() => router.push('/integrations/gmail')}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {gmailStatus?.connected === true
                    ? tx(['gmail', 'settings'], 'Settings')
                    : tx(['gmail', 'connect'], 'Connect')}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700/60 overflow-visible">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isTrashView ? t.trash.title : t.subtitle}
              </h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isTrashView && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t.trash.selectedLabel.value.replace('{count}', String(selectedTrashCount))}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkRestore(selectedTrashIds)}
                      disabled={selectedTrashCount === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={14} />
                      {t.trash.restoreSelected.value}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkDeleteModalOpen(true)}
                      disabled={selectedTrashCount === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      {t.trash.deleteSelected.value}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmptyTrashModalOpen(true)}
                      disabled={files.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      {t.trash.emptyAction.value}
                    </button>
                  </div>
                )}
                {filtersApplied && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.filters.title} · {t.filters.button}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  {isTrashView ? <Trash2 className="h-8 w-8" /> : <Search className="h-8 w-8" />}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {emptyStateTitle}
                </h3>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{emptyStateSubtitle}</p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible" data-tour-id="storage-table">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700/60">
                  <thead className="bg-gray-50 dark:bg-slate-800/40">
                    <tr>
                      {isTrashView && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                          <Checkbox
                            checked={allTrashSelected}
                            indeterminate={
                              selectedTrashIdsInView.length > 0 &&
                              selectedTrashIdsInView.length < selectableTrashIds.length
                            }
                            onCheckedChange={toggleSelectAllTrash}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            aria-label={t.trash.selectAll.value}
                          />
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.fileName}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.bank}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.account}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.size}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.status}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.category}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.table.access}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {isTrashView ? t.table.deletedAt : t.table.createdAt}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                        {t.table.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700/60">
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
              </div>
            )}

            <div
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-t border-gray-200"
              data-tour-id="pagination"
            >
              <div className="text-sm text-gray-600">
                {totalItems === 0
                  ? emptyStateTitle
                  : formatPaginationLabel(paginationLabels.shown, {
                      from: rangeStart,
                      to: rangeEnd,
                      count: totalItems,
                    })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-[120px] text-center">
                  {formatPaginationLabel(paginationLabels.pageOf, {
                    page: currentPage,
                    count: totalPagesCount,
                  })}
                </span>
                <AppPagination page={currentPage} total={totalPagesCount} onChange={setPage} />
              </div>
            </div>
          </div>
        </div>
        <DragOverlay className="pointer-events-none">
          {draggingFile ? (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl border border-primary/50 opacity-90 w-[300px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-md">
                  <DocumentTypeIcon
                    fileType={draggingFile.fileType}
                    fileName={draggingFile.fileName}
                    fileId={draggingFile.id}
                    size={24}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{draggingFile.fileName}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(draggingFile.fileSize)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
        {activeModal === 'folders' && (
          <>
            <div
              className="fixed inset-0 z-70 bg-black/30"
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
            <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
              <div className="flex w-full max-w-[1380px] min-h-[70vh] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {t.modals.foldersTitle}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.modals.foldersSubtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {folderMoveFeedback && (
                    <div
                      role={folderMoveFeedback.tone === 'error' ? 'alert' : 'status'}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        folderMoveFeedback.tone === 'success'
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100'
                      }`}
                    >
                      {folderMoveFeedback.message}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-1 items-center gap-2 min-w-[220px]">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={event =>
                          setNewFolderName(clampFolderName(event.target.value, newFolderName))
                        }
                        placeholder={t.folders.createPlaceholder.value}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 dark:disabled:bg-gray-600"
                        title={t.folders.createTooltip.value}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {draggingFile && (
                      <div className="text-xs text-primary">{t.dragDrop.subtitle}</div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[550px_1fr]">
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 p-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex flex-col">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {t.modals.folderListTitle}
                            </h4>
                            {pickedFolderId && (
                              <span className="mt-0.5 text-xs font-bold text-primary animate-pulse tracking-tight">
                                {t.scrollHint.value}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {folders.length}
                          </span>
                        </div>
                        <div className="mt-3 px-1 space-y-3 max-h-[45vh] overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => setActiveFolderId('')}
                            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
                              activeFolderId === ''
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-gray-100 dark:border-slate-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <span>{t.folders.all}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {files.length}
                            </span>
                          </button>
                          <DroppableFolderButton
                            isNoFolder
                            active={activeFolderId === NO_FOLDER}
                            onClick={() => setActiveFolderId(NO_FOLDER)}
                            className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium ${
                              activeFolderId === NO_FOLDER
                                ? 'bg-primary/5 text-primary' // Highlight handled by wrapper
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span>{t.folders.none}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {folderCounts.noFolder}
                              </span>
                            </div>
                          </DroppableFolderButton>
                          {folders.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t.modals.folderListEmpty}
                            </p>
                          ) : (
                            folders.map((folder, index) => (
                              <div key={folder.id} className="space-y-2">
                                {/* Droppable wrapper around the folder item */}
                                <DroppableFolderButton
                                  folderId={folder.id}
                                  active={activeFolderId === folder.id}
                                  onClick={() => setActiveFolderId(folder.id)}
                                  onContextMenu={e => handleFolderContextMenu(e, folder)}
                                  className={`group relative flex items-center gap-2 rounded-lg border px-4 py-3 ${
                                    pickedFolderId === folder.id
                                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 cursor-ns-resize shadow-md z-10'
                                      : activeFolderId === folder.id
                                        ? 'border-primary/30 bg-primary/5'
                                        : 'border-gray-100 dark:border-slate-800'
                                  }`}
                                >
                                  {editingFolderId === folder.id ? (
                                    <div className="flex flex-1 items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingFolderName}
                                        onChange={event =>
                                          setEditingFolderName(
                                            clampFolderName(event.target.value, editingFolderName),
                                          )
                                        }
                                        onClick={event => event.stopPropagation()}
                                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={event => {
                                          event.stopPropagation();
                                          handleRenameFolder(folder.id);
                                        }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={event => {
                                          event.stopPropagation();
                                          handleCancelEditFolder();
                                        }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-1 items-center justify-between gap-2 text-left">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Folder
                                            className="h-4 w-4 text-gray-400"
                                            style={{
                                              color: folder.tag?.color ?? undefined,
                                            }}
                                          />
                                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {folder.name}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {pickedFolderId === null ? (
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPickedFolderId(folder.id);
                                            }}
                                            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                                          >
                                            {t.dragAndDrop.value}
                                          </button>
                                        ) : pickedFolderId === folder.id ? (
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPickedFolderId(null);
                                              toast.success(
                                                `${tx(['toasts', 'fileMovedTo'], 'File moved to folder')} "${folder.name}"`,
                                              );
                                            }}
                                            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary text-white px-3 py-1 text-xs font-semibold shadow-sm hover:bg-primary/90 transition-all scale-105"
                                          >
                                            {t.done.value}
                                          </button>
                                        ) : null}
                                        {canEditFolder(folder) && (
                                          <div className="flex items-center">
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleFolderContextMenu(e, folder);
                                              }}
                                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                                            >
                                              <MoreVertical size={16} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </DroppableFolderButton>
                                {folderTagPickerId === folder.id && canEditFolder(folder) && (
                                  <div
                                    className="rounded-lg border border-gray-100 dark:border-slate-800 p-2"
                                    onClick={event => event.stopPropagation()}
                                    onKeyDown={event => event.stopPropagation()}
                                  >
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateFolderTag(folder.id, null)}
                                        className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                      >
                                        {t.tags.clear}
                                      </button>
                                      {tags.map(tag => {
                                        const isActive = folder.tag?.id === tag.id;
                                        return (
                                          <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleUpdateFolderTag(folder.id, tag.id)}
                                            className={tagChipClass(isActive)}
                                            style={getTagChipStyle(tag)}
                                          >
                                            {tag.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {t.tags.title}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {tags.length}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={newTagName}
                            onChange={event => setNewTagName(event.target.value)}
                            placeholder={t.tags.createPlaceholder.value}
                            className="flex-1 min-w-40 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <div className="relative">
                            <button
                              type="button"
                              onClick={event => {
                                setNewTagAnchorEl(event.currentTarget);
                                setNewTagPickerOpen(prev => !prev);
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-1"
                              aria-label={t.tagColor.value}
                            >
                              <span
                                className="h-6 w-6 rounded-full"
                                style={{ backgroundColor: newTagColor }}
                              />
                            </button>
                            <Popover
                              open={newTagPickerOpen}
                              anchorEl={newTagAnchorEl}
                              onClose={() => {
                                setNewTagPickerOpen(false);
                                setNewTagAnchorEl(null);
                              }}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                              }}
                              transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                              }}
                              slotProps={colorPickerPopoverSlotProps}
                            >
                              <HexColorPicker color={newTagColor} onChange={setNewTagColor} />
                            </Popover>
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateTag}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary-hover"
                            title={t.tags.createTooltip.value}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="mt-4 space-y-2 max-h-[30vh] overflow-y-auto min-h-[200px] pb-52">
                          {tags.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t.tags.empty}
                            </p>
                          ) : (
                            tags.map(tag => (
                              <div
                                key={tag.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-slate-800 px-3 py-2"
                              >
                                {editingTagId === tag.id ? (
                                  <div className="flex flex-1 flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingTagName}
                                        onChange={event => setEditingTagName(event.target.value)}
                                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={event => {
                                            setEditingTagAnchorEl(event.currentTarget);
                                            setEditingTagPickerId(prev =>
                                              prev === tag.id ? null : tag.id,
                                            );
                                          }}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-1"
                                          aria-label={t.tagColor.value}
                                        >
                                          <span
                                            className="h-4 w-4 rounded-full"
                                            style={{
                                              backgroundColor: editingTagColor || '#4f46e5',
                                            }}
                                          />
                                        </button>
                                        <Popover
                                          open={editingTagPickerId === tag.id}
                                          anchorEl={editingTagAnchorEl}
                                          onClose={() => {
                                            setEditingTagPickerId(null);
                                            setEditingTagAnchorEl(null);
                                          }}
                                          anchorOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'right',
                                          }}
                                          transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                          }}
                                          slotProps={colorPickerPopoverSlotProps}
                                        >
                                          <HexColorPicker
                                            color={editingTagColor || '#4f46e5'}
                                            onChange={setEditingTagColor}
                                          />
                                        </Popover>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRenameTag(tag.id)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditTag}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                          backgroundColor: tag.color || '#cbd5f5',
                                        }}
                                      />
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {tag.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {tagCounts[tag.id] ?? 0}
                                      </span>
                                      {canEditTag(tag) && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditTag(tag)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                            title={t.tags.renameTooltip.value}
                                          >
                                            <PencilLine size={16} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => confirmDeleteTag(tag)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700/60 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                            title={t.tags.deleteTooltip.value}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {activeFolderLabel}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t.modals.filesLabel} · {folderModalFiles.length}
                          </p>
                        </div>
                        {draggingFile && (
                          <span className="text-xs text-primary">{t.dragDrop.title}</span>
                        )}
                      </div>
                      <div className="relative mt-3">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={folderFileQuery}
                          onChange={event => setFolderFileQuery(event.target.value)}
                          placeholder={t.modals.fileSearchPlaceholder.value}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="mt-3 max-h-[50vh] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 rounded-lg border border-gray-100 dark:border-slate-800">
                        {folderModalFiles.length === 0 ? (
                          <div className="px-6 py-12 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600">
                              <FileX size={32} />
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {t.modals.filesEmpty}
                            </p>
                          </div>
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {filterOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300"
              role="button"
              tabIndex={0}
              onClick={() => setFilterOpen(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFilterOpen(false);
                }
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t.filters.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row text-left">
                  {/* Left: Filters */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-status"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.status}
                        </label>
                        <select
                          id="storage-filter-status"
                          value={stagedFilters.status}
                          onChange={e => handleFilterChange('status', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          {statusOptions.map(status => (
                            <option key={status} value={status}>
                              {getStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-bank"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.bank}
                        </label>
                        <select
                          id="storage-filter-bank"
                          value={stagedFilters.bank}
                          onChange={e => handleFilterChange('bank', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          {bankOptions.map(bank => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-category"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.category}
                        </label>
                        <select
                          id="storage-filter-category"
                          value={stagedFilters.categoryId}
                          onChange={e => handleFilterChange('categoryId', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="storage-filter-ownership"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.accessType}
                        </label>
                        <select
                          id="storage-filter-ownership"
                          value={stagedFilters.ownership}
                          onChange={e => handleFilterChange('ownership', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          <option value="owned">{t.filters.owned}</option>
                          <option value="shared">{t.filters.shared}</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label
                          htmlFor="storage-filter-folder"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {t.filters.folder}
                        </label>
                        <select
                          id="storage-filter-folder"
                          value={stagedFilters.folderId}
                          onChange={e => handleFilterChange('folderId', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <option value="">{t.filters.all}</option>
                          <option value={NO_FOLDER}>{t.folders.none}</option>
                          {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-auto pt-8 flex items-center justify-between">
                      <button
                        onClick={handleResetFilters}
                        className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-2 py-1"
                      >
                        {t.filters.reset}
                      </button>
                      <button
                        onClick={handleApplyFilters}
                        className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all active:scale-95"
                      >
                        {t.filters.apply}
                      </button>
                    </div>
                  </div>

                  {/* Right: Views */}
                  <div className="w-full md:w-80 border-l border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col">
                    <div className="p-6 flex-1 overflow-y-auto">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-primary" />
                        {t.modals.viewCreateTitle.value.replace(':', '')}
                      </h4>

                      {/* Save View Input */}
                      <div className="mb-6 group relative">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={viewName}
                            onChange={event => setViewName(event.target.value)}
                            placeholder={t.views.namePlaceholder.value}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                          <button
                            type="button"
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
                            className="inline-flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-primary"
                            title={t.views.saveTooltip.value}
                          >
                            <Save size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          <span>{t.views.title}</span>
                          <span>{views.length}</span>
                        </div>

                        {viewsLoading ? (
                          <div className="flex justify-center py-4">
                            <Spinner className="h-5 w-5 text-gray-400" />
                          </div>
                        ) : views.length === 0 ? (
                          <p className="text-sm text-gray-400 italic text-center py-4">
                            {t.views.empty}
                          </p>
                        ) : (
                          views.map(view => (
                            <div
                              key={view.id}
                              className={`group flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-all ${
                                activeViewId === view.id
                                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/30 hover:shadow-sm'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  applyView(view);
                                  setFilterOpen(false);
                                }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-200"
                              >
                                {activeViewId === view.id && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                )}
                                <span className="truncate group-hover:text-primary transition-colors">
                                  {view.name}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteView(view.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title={t.views.delete.value}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        <ConfirmModal
          isOpen={deleteFolderModalOpen}
          onClose={closeDeleteFolderModal}
          onConfirm={handleDeleteFolder}
          title={t.folders.deleteTitle.value}
          message={
            folderToDelete ? (
              <div className="space-y-3">
                <p className="text-gray-600 leading-relaxed">
                  {t.folders.deleteMessagePrefix.value}
                  {folderToDelete.name}
                  {t.folders.deleteMessageSuffix.value}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Checkbox
                    checked={deleteFolderWithContents}
                    onCheckedChange={setDeleteFolderWithContents}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  {t.folders.deleteWithContents}
                </div>
              </div>
            ) : (
              <p className="text-gray-600 leading-relaxed">{t.folders.deleteMessageFallback}</p>
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
          <div
            className="fixed z-100 min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900"
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
            <div className="p-1.5 flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setFolderTagPickerId(folderContextMenu.folder.id);
                  setFolderContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Tag size={16} className="text-gray-400" />
                <span>{t.tags.title.value}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartEditFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800 transition-colors"
              >
                <PencilLine size={16} className="text-gray-400" />
                <span>{t.folders.renameTooltip.value}</span>
              </button>
              <div className="my-1 h-px bg-gray-100 dark:bg-slate-800" />
              <button
                type="button"
                onClick={() => {
                  confirmDeleteFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={16} />
                <span>{t.folders.deleteTooltip.value}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default StoragePageContent;
