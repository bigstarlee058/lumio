'use client';

import { useState } from 'react';

export interface ColorPickerState {
  newTagColor: string;
  setNewTagColor: (color: string) => void;
  newTagPickerOpen: boolean;
  setNewTagPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newTagAnchorEl: HTMLElement | null;
  setNewTagAnchorEl: (el: HTMLElement | null) => void;
  editingTagPickerId: string | null;
  setEditingTagPickerId: React.Dispatch<React.SetStateAction<string | null>>;
  editingTagAnchorEl: HTMLElement | null;
  setEditingTagAnchorEl: (el: HTMLElement | null) => void;
  editingTagColor: string | null;
  setEditingTagColor: (color: string | null) => void;
}

export function useStorageColorPicker(): ColorPickerState {
  const [newTagColor, setNewTagColor] = useState('#168118');
  const [newTagPickerOpen, setNewTagPickerOpen] = useState(false);
  const [newTagAnchorEl, setNewTagAnchorEl] = useState<HTMLElement | null>(null);
  const [editingTagPickerId, setEditingTagPickerId] = useState<string | null>(null);
  const [editingTagAnchorEl, setEditingTagAnchorEl] = useState<HTMLElement | null>(null);
  const [editingTagColor, setEditingTagColor] = useState<string | null>(null);

  return {
    newTagColor,
    setNewTagColor,
    newTagPickerOpen,
    setNewTagPickerOpen,
    newTagAnchorEl,
    setNewTagAnchorEl,
    editingTagPickerId,
    setEditingTagPickerId,
    editingTagAnchorEl,
    setEditingTagAnchorEl,
    editingTagColor,
    setEditingTagColor,
  };
}
