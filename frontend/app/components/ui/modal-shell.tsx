'use client';

import { Spinner } from '@/app/components/ui/spinner';
import MuiButton from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';
import * as React from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalShellProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title shown in header */
  title?: React.ReactNode;
  /** Modal size preset */
  size?: ModalSize;
  /** Modal content */
  children: React.ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: React.ReactNode;
  /** Whether to show the close button in header */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC closes the modal */
  closeOnEscape?: boolean;
  /** Additional className for the modal container */
  className?: string;
  /** Additional className for the content wrapper */
  contentClassName?: string;
}

const sizeToMaxWidth: Record<ModalSize, 'sm' | 'md' | 'lg' | 'xl' | false> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  full: false,
};

/**
 * ModalShell - Unified modal wrapper component
 *
 * Provides consistent styling, animations, and behavior for all modals:
 * - Backdrop overlay
 * - Body scroll lock
 * - Keyboard (ESC) support
 * - Focus management
 */
export function ModalShell({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  contentClassName,
}: ModalShellProps) {
  const handleClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' && !closeOnBackdropClick) return;
    if (reason === 'escapeKeyDown' && !closeOnEscape) return;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth={sizeToMaxWidth[size]}
      fullWidth
      fullScreen={size === 'full'}
      className={className}
      aria-labelledby={title ? 'modal-title' : undefined}
      sx={{ zIndex: 400 }}
    >
      {(title || showCloseButton) && (
        <DialogTitle
          id="modal-title"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}
        >
          {title}
          {showCloseButton && (
            <IconButton
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              size="small"
              sx={{ ml: 'auto' }}
            >
              <X size={20} />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent className={contentClassName}>{children}</DialogContent>
      {footer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '16px 20px',
            borderTop: '1px solid',
            borderColor: 'rgba(0,0,0,0.12)',
            gap: 12,
          }}
        >
          {footer}
        </div>
      )}
    </Dialog>
  );
}

/**
 * ModalHeader - Optional component for custom modal headers
 */
export function ModalHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className={className}>
      {children}
    </div>
  );
}

/**
 * ModalFooter - Pre-styled footer with cancel/confirm buttons pattern
 */
export interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'destructive';
  isConfirmLoading?: boolean;
  isConfirmDisabled?: boolean;
  children?: React.ReactNode;
}

export function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  isConfirmLoading = false,
  isConfirmDisabled = false,
  children,
}: ModalFooterProps) {
  if (children) {
    return <>{children}</>;
  }

  return (
    <>
      {onCancel && (
        <MuiButton type="button" onClick={onCancel} variant="outlined" color="inherit">
          {cancelText}
        </MuiButton>
      )}
      {onConfirm && (
        <MuiButton
          type="button"
          onClick={onConfirm}
          disabled={isConfirmDisabled || isConfirmLoading}
          variant="contained"
          color={confirmVariant === 'destructive' ? 'error' : 'primary'}
          startIcon={isConfirmLoading ? <Spinner size={16} /> : undefined}
        >
          {confirmText}
        </MuiButton>
      )}
    </>
  );
}
