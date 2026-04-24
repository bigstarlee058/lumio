'use client';

import { Pencil, Trash2 } from '@/app/components/icons';
import type { DeleteRowFn, OpenColorPickerFn } from '../../utils/columnDefinitions.types';

const BTN_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 'var(--lumio-radius-sm)', padding: 4, color: '#9ca3af',
  background: 'none', border: 'none', cursor: 'pointer',
  transition: 'background-color 0.2s, color 0.2s',
};

interface ActionsCellProps {
  rowId: string;
  colorTooltipLabel: string;
  deleteLabel: string;
  onOpenColorPicker: OpenColorPickerFn;
  onDeleteRow: DeleteRowFn;
}

export function ActionsCell({ rowId, colorTooltipLabel, deleteLabel, onOpenColorPicker, onDeleteRow }: ActionsCellProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <button type="button" onClick={event => onOpenColorPicker(rowId, event)} style={BTN_STYLE} title={colorTooltipLabel}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => onDeleteRow(rowId)} style={BTN_STYLE} title={deleteLabel}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}
