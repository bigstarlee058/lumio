'use client';

import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import type { StorageFile } from '../storageHelpers';

export interface UseStorageDndReturn {
  draggingFile: StorageFile | null;
  setDraggingFile: React.Dispatch<React.SetStateAction<StorageFile | null>>;
  folderDropTargetId: string | null;
  setFolderDropTargetId: React.Dispatch<React.SetStateAction<string | null>>;
  folderModalFromDrag: boolean;
  setFolderModalFromDrag: React.Dispatch<React.SetStateAction<boolean>>;
  sensors: ReturnType<typeof useSensors>;
}

export function useStorageDnd(): UseStorageDndReturn {
  const [draggingFile, setDraggingFile] = useState<StorageFile | null>(null);
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null);
  const [folderModalFromDrag, setFolderModalFromDrag] = useState(false);

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      useMemo(
        () => ({
          activationConstraint: {
            distance: 8,
          },
        }),
        [],
      ),
    ),
  );

  return {
    draggingFile,
    setDraggingFile,
    folderDropTargetId,
    setFolderDropTargetId,
    folderModalFromDrag,
    setFolderModalFromDrag,
    sensors,
  };
}
