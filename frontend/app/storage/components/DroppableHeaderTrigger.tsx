'use client';

import { useDroppable } from '@dnd-kit/core';
import React, { useEffect } from 'react';

interface DroppableHeaderTriggerProps {
  children: React.ReactNode;
  onDragOver: () => void;
}

export const DroppableHeaderTrigger = ({ children, onDragOver }: DroppableHeaderTriggerProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'header-folders-trigger',
  });

  useEffect(() => {
    if (isOver) {
      const timer = setTimeout(() => {
        onDragOver();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOver, onDragOver]);

  return (
    <div
      ref={setNodeRef}
      className={`relative z-10 transition-all ${
        isOver ? 'ring-2 ring-primary bg-primary/20 scale-105 rounded-full' : ''
      }`}
    >
      {children}
    </div>
  );
};
