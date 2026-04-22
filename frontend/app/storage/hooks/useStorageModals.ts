'use client';

import { useState } from 'react';

export interface StorageModalsState {
  previewModalOpen: boolean;
  setPreviewModalOpen: (open: boolean) => void;
  previewFileId: string | null;
  setPreviewFileId: (id: string | null) => void;
  previewFileName: string;
  setPreviewFileName: (name: string) => void;
}

export function useStorageModals(): StorageModalsState {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');

  return {
    previewModalOpen,
    setPreviewModalOpen,
    previewFileId,
    setPreviewFileId,
    previewFileName,
    setPreviewFileName,
  };
}
