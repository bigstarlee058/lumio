'use client';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { cn } from '@/app/lib/utils';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, GripVertical } from 'lucide-react';
import type { StatementColumn, StatementColumnId } from './statement-columns';

type ColumnsDrawerLabels = {
  title: string;
  save: string;
};

type ColumnsDrawerProps = {
  open: boolean;
  onClose: () => void;
  columns: StatementColumn[];
  onToggle: (id: StatementColumn['id'], value: boolean) => void;
  onReorder: (activeId: StatementColumnId, overId: StatementColumnId) => void;
  onSave: () => void;
  labels: ColumnsDrawerLabels;
};

type SortableColumnItemProps = {
  column: StatementColumn;
  onToggle: (id: StatementColumn['id'], value: boolean) => void;
};

function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border px-4 py-4 transition-colors hover:bg-muted/60 last:border-b-0',
        isDragging && 'z-10 bg-card shadow-sm',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="-ml-1 cursor-grab touch-none rounded p-1 text-muted-foreground/70 transition-colors hover:text-foreground active:cursor-grabbing"
          aria-label={`Reorder ${column.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span
          className={cn(
            'text-base font-semibold',
            column.visible ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {column.label}
        </span>
      </div>
      <Checkbox
        checked={column.visible}
        onCheckedChange={(value: boolean) => onToggle(column.id, value)}
      />
    </div>
  );
}

export function ColumnsDrawer({
  open,
  onClose,
  columns,
  onToggle,
  onReorder,
  onSave,
  labels,
}: ColumnsDrawerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(active.id as StatementColumnId, over.id as StatementColumnId);
  };

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      className="border-l-0 bg-card"
      title={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={labels.title}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-foreground">{labels.title}</span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map(column => column.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {columns.map(column => (
                  <SortableColumnItem key={column.id} column={column} onToggle={onToggle} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className="sticky bottom-0 bg-card pb-2 pt-4">
          <Button className="w-full rounded-full" size="lg" onClick={onSave}>
            {labels.save}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}
