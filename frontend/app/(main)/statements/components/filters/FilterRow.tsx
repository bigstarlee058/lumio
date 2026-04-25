'use client';

import { ChevronRight } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

type FilterRowProps = {
  label: string;
  value?: string | null;
  onClick: () => void;
  style?: React.CSSProperties;
};

export function FilterRow({ label, value, onClick, style }: FilterRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        borderRadius: tokens.radius.md,
        padding: '16px',
        textAlign: 'left',
        transition: 'background-color 0.15s',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        ...style,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>{label}</div>
        {value ? <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{value}</div> : null}
      </div>
      <ChevronRight size={20} color="#9ca3af" />
    </button>
  );
}
