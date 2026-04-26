'use client';

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'var(--background)', width: '80%', maxWidth: 320, marginLeft: 'auto', height: '100%', padding: 16 }}>
        Menu drawer (placeholder)
      </div>
    </div>
  );
}
