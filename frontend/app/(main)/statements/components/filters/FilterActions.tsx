'use client';

import { Button } from '@/app/components/ui/button';
import { tokens } from '@/lib/theme-tokens';

type FilterActionsProps = {
  onReset: () => void;
  onApply: () => void;
  applyLabel: string;
  resetLabel: string;
  style?: React.CSSProperties;
};

export function FilterActions({
  onReset,
  onApply,
  applyLabel,
  resetLabel,
  style,
}: FilterActionsProps) {
  return (
    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <Button
        variant="secondary"
        size="lg"
        onClick={onReset}
        style={{ flex: 1, borderRadius: tokens.radius.md }}
      >
        {resetLabel}
      </Button>
      <Button size="lg" onClick={onApply} style={{ flex: 1, borderRadius: tokens.radius.md }}>
        {applyLabel}
      </Button>
    </div>
  );
}
