'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { FolderOption } from '../storageHelpers';

interface FolderMoveFeedback {
  tone: 'success' | 'error';
  message: string;
}

export interface StorageFolderState {
  folders: FolderOption[];
  setFolders: React.Dispatch<React.SetStateAction<FolderOption[]>>;
  newFolderName: string;
  setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
  editingFolderId: string | null;
  setEditingFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  editingFolderName: string;
  setEditingFolderName: React.Dispatch<React.SetStateAction<string>>;
  folderTagPickerId: string | null;
  setFolderTagPickerId: React.Dispatch<React.SetStateAction<string | null>>;
  deleteFolderModalOpen: boolean;
  setDeleteFolderModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  folderToDelete: FolderOption | null;
  setFolderToDelete: React.Dispatch<React.SetStateAction<FolderOption | null>>;
  deleteFolderWithContents: boolean;
  setDeleteFolderWithContents: React.Dispatch<React.SetStateAction<boolean>>;
  folderMoveFeedback: FolderMoveFeedback | null;
  activeFolderId: string | null;
  setActiveFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  folderFileQuery: string;
  setFolderFileQuery: React.Dispatch<React.SetStateAction<string>>;
  folderContextMenu: { x: number; y: number; folder: FolderOption } | null;
  setFolderContextMenu: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; folder: FolderOption } | null>
  >;
  pickedFolderId: string | null;
  setPickedFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  setFolderMoveMessage: (tone: 'success' | 'error', message: string) => void;
  clearFolderMoveFeedback: () => void;
}

export function useStorageFolderState(): StorageFolderState {
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [folderTagPickerId, setFolderTagPickerId] = useState<string | null>(null);
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderOption | null>(null);
  const [deleteFolderWithContents, setDeleteFolderWithContents] = useState(false);
  const [folderMoveFeedback, setFolderMoveFeedback] = useState<FolderMoveFeedback | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderFileQuery, setFolderFileQuery] = useState('');
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number;
    y: number;
    folder: FolderOption;
  } | null>(null);
  const [pickedFolderId, setPickedFolderId] = useState<string | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFolderMoveFeedback = useCallback((): void => {
    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = null;
    }
    setFolderMoveFeedback(null);
  }, []);

  const setFolderMoveMessage = useCallback(
    (tone: 'success' | 'error', message: string): void => {
      clearFolderMoveFeedback();
      setFolderMoveFeedback({ tone, message });
      feedbackTimeout.current = setTimeout(() => {
        setFolderMoveFeedback(null);
        feedbackTimeout.current = null;
      }, 3500);
    },
    [clearFolderMoveFeedback],
  );

  return {
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
    setFolderToDelete,
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
    setFolderMoveMessage,
    clearFolderMoveFeedback,
  };
}

export function useFolderWheelReorder({
  pickedFolderId,
  isFolderModalOpen,
  setFolders,
}: {
  pickedFolderId: string | null;
  isFolderModalOpen: boolean;
  setFolders: React.Dispatch<React.SetStateAction<FolderOption[]>>;
}): void {
  const lastWheelTime = useRef<number>(0);
  useEffect(() => {
    if (!(pickedFolderId && isFolderModalOpen)) {
      return undefined;
    }
    const handleWheel = (e: WheelEvent): void => {
      const now = Date.now();
      if (now - lastWheelTime.current < 80 || Math.abs(e.deltaY) < 10) {
        return;
      }
      setFolders(prev => {
        const idx = prev.findIndex(f => f.id === pickedFolderId);
        if (idx === -1) {
          return prev;
        }
        const nextIdx = e.deltaY > 0 ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= prev.length) {
          return prev;
        }
        lastWheelTime.current = now;
        const next = [...prev];
        const [moved] = next.splice(idx, 1);
        next.splice(nextIdx, 0, moved);
        return next;
      });
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [pickedFolderId, isFolderModalOpen, setFolders]);
}

export function useFolderContextMenuDismiss({
  folderContextMenu,
  setFolderContextMenu,
}: {
  folderContextMenu: { x: number; y: number; folder: FolderOption } | null;
  setFolderContextMenu: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; folder: FolderOption } | null>
  >;
}): void {
  useEffect(() => {
    const hide = (): void => setFolderContextMenu(null);
    if (!folderContextMenu) {
      return undefined;
    }
    window.addEventListener('click', hide);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.removeEventListener('click', hide);
      window.removeEventListener('scroll', hide, true);
    };
  }, [folderContextMenu, setFolderContextMenu]);
}

export function buildMoveFolderIdx(
  setFolders: React.Dispatch<React.SetStateAction<FolderOption[]>>,
  setPickedFolderId: React.Dispatch<React.SetStateAction<string | null>>,
  folderUpdatedMsg: string,
): (fromId: string, toIdx: number, finalize?: boolean) => void {
  return (fromId: string, toIdx: number, finalize = true): void => {
    setFolders(prev => {
      const fromIdx = prev.findIndex(f => f.id === fromId);
      if (fromIdx === -1) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    if (finalize) {
      setPickedFolderId(null);
      toast.success(folderUpdatedMsg);
    }
  };
}
