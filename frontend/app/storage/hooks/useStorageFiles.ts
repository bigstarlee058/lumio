'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import type { StorageFile } from '../storageHelpers';

interface UseStorageFilesMessages {
  loadFilesFailed: string;
  downloaded: string;
  downloadFailed: string;
  categoryUpdated: string;
  categoryUpdateFailed: string;
  deleteLoading: string;
  deleteSuccess: string;
  deleteError: string;
  trashRestoreLoading: string;
  trashRestoreSuccess: string;
  trashRestoreFailed: string;
  trashDeleteLoading: string;
  trashDeleteSuccess: string;
  trashDeleteFailed: string;
}

export interface UseStorageFilesReturn {
  files: StorageFile[];
  setFiles: React.Dispatch<React.SetStateAction<StorageFile[]>>;
  loading: boolean;
  deleteModalOpen: boolean;
  setDeleteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fileToDelete: StorageFile | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<StorageFile | null>>;
  permanentDeleteModalOpen: boolean;
  setPermanentDeleteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fileToDeletePermanently: StorageFile | null;
  setFileToDeletePermanently: React.Dispatch<React.SetStateAction<StorageFile | null>>;
  loadFiles: (listMode: 'active' | 'trash') => Promise<void>;
  handleView: (fileId: string) => void;
  handleDownload: (fileId: string, fileName: string) => Promise<void>;
  handleCategoryChange: (fileId: string, categoryId: string) => Promise<void>;
  confirmDelete: (file: StorageFile) => void;
  handleDelete: () => Promise<void>;
  confirmPermanentDelete: (file: StorageFile) => void;
  handlePermanentDelete: () => Promise<void>;
  handleRestoreFromTrash: (file: StorageFile) => Promise<void>;
  handleBulkRestore: (ids: string[]) => Promise<void>;
  handleBulkDeleteFromTrash: (ids: string[]) => Promise<void>;
  handleEmptyTrash: () => Promise<void>;
}

export function useStorageFiles(messages: UseStorageFilesMessages): UseStorageFilesReturn {
  const router = useRouter();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StorageFile | null>(null);
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [fileToDeletePermanently, setFileToDeletePermanently] = useState<StorageFile | null>(null);

  const loadFiles = async (listMode: 'active' | 'trash') => {
    try {
      setLoading(true);
      const response = await api.get('/storage/files', {
        params: listMode === 'trash' ? { deleted: 'only' } : undefined,
      });
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error(messages.loadFilesFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (
      file &&
      (file.status === 'completed' || file.status === 'parsed' || file.status === 'validated')
    ) {
      router.push(`/statements/${fileId}/edit`);
    } else {
      router.push(`/storage/${fileId}`);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await api.get(`/storage/files/${fileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(messages.downloaded);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error(messages.downloadFailed);
    }
  };

  const handleCategoryChange = async (fileId: string, categoryId: string) => {
    try {
      const response = await api.patch(`/storage/files/${fileId}/category`, {
        categoryId: categoryId || null,
      });
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                categoryId: response.data?.categoryId ?? null,
                category: response.data?.category ?? null,
              }
            : file,
        ),
      );
      toast.success(messages.categoryUpdated);
    } catch (error) {
      console.error('Failed to update file category:', error);
      toast.error(messages.categoryUpdateFailed);
    }
  };

  const confirmDelete = (file: StorageFile) => {
    setFileToDelete(file);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    const toastId = toast.loading(messages.deleteLoading);
    try {
      await api.post(`/storage/files/${fileToDelete.id}/trash`);
      setFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
      toast.success(messages.deleteSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to move file to trash:', error);
      toast.error(messages.deleteError, { id: toastId });
    }
    setFileToDelete(null);
  };

  const confirmPermanentDelete = (file: StorageFile) => {
    setFileToDeletePermanently(file);
    setPermanentDeleteModalOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!fileToDeletePermanently) return;
    const toastId = toast.loading(messages.trashDeleteLoading);
    try {
      await api.delete(`/storage/files/${fileToDeletePermanently.id}/trash`);
      setFiles(prev => prev.filter(file => file.id !== fileToDeletePermanently.id));
      toast.success(messages.trashDeleteSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to permanently delete file:', error);
      toast.error(messages.trashDeleteFailed, { id: toastId });
    }
    setFileToDeletePermanently(null);
  };

  const handleRestoreFromTrash = async (file: StorageFile) => {
    const toastId = toast.loading(messages.trashRestoreLoading);
    try {
      await api.post(`/storage/files/${file.id}/trash/restore`);
      setFiles(prev => prev.filter(item => item.id !== file.id));
      toast.success(messages.trashRestoreSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to restore file from trash:', error);
      toast.error(messages.trashRestoreFailed, { id: toastId });
    }
  };

  const handleBulkRestore = async (ids: string[]) => {
    if (!ids.length) return;
    const toastId = toast.loading(messages.trashRestoreLoading);
    try {
      await api.post('/storage/files/trash/bulk/restore', { statementIds: ids });
      setFiles(prev => prev.filter(file => !ids.includes(file.id)));
      toast.success(messages.trashRestoreSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to restore files from trash:', error);
      toast.error(messages.trashRestoreFailed, { id: toastId });
    }
  };

  const handleBulkDeleteFromTrash = async (ids: string[]) => {
    if (!ids.length) return;
    const toastId = toast.loading(messages.trashDeleteLoading);
    try {
      await api.post('/storage/files/bulk/trash/delete', { statementIds: ids });
      setFiles(prev => prev.filter(file => !ids.includes(file.id)));
      toast.success(messages.trashDeleteSuccess, { id: toastId });
    } catch (error) {
      console.error('Failed to delete files from trash:', error);
      toast.error(messages.trashDeleteFailed, { id: toastId });
    }
  };

  const handleEmptyTrash = async () => {
    const ids = files.map(file => file.id);
    await handleBulkDeleteFromTrash(ids);
  };

  return {
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
  };
}
