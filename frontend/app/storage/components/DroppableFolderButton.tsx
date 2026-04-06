'use client';

import { useDroppable } from '@dnd-kit/core';
import React from 'react';

interface DroppableFolderButtonProps {
  folderId?: string;
  isNoFolder?: boolean;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const DroppableFolderButton = React.memo(
  ({
    folderId,
    isNoFolder,
    active: _active,
    children,
    className,
    onClick,
    onContextMenu,
  }: DroppableFolderButtonProps) => {
    const { isOver, setNodeRef } = useDroppable({
      id: isNoFolder ? 'folder-none' : `folder-${folderId}`,
      data: { folderId, isNoFolder },
    });

    const highlightClass = isOver ? 'ring-2 ring-inset ring-primary bg-primary/10' : '';

    return (
      <div ref={setNodeRef} className={`relative rounded-lg ${highlightClass}`} role="presentation">
        <div
          onClick={onClick}
          onContextMenu={onContextMenu}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClick?.(e);
            }
          }}
          tabIndex={onClick ? 0 : -1}
          role={onClick ? 'button' : 'presentation'}
          className={className}
        >
          {children}
        </div>
      </div>
    );
  },
);

DroppableFolderButton.displayName = 'DroppableFolderButton';
