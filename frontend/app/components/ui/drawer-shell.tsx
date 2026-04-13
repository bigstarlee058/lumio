'use client';

import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { X } from 'lucide-react';
import * as React from 'react';

export type DrawerPosition = 'left' | 'right';
export type DrawerWidth = 'sm' | 'md' | 'lg' | 'xl';

export interface DrawerShellProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when the drawer should close */
  onClose: () => void;
  /** Drawer title shown in header */
  title?: React.ReactNode;
  /** Drawer position */
  position?: DrawerPosition;
  /** Drawer width preset */
  width?: DrawerWidth;
  /** Drawer content */
  children: React.ReactNode;
  /** Whether to show the close button in header */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes the drawer */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC closes the drawer */
  closeOnEscape?: boolean;
  /** Additional className for the drawer container */
  className?: string;
  /** Whether to lock body scroll when open */
  lockScroll?: boolean;
  /** Additional sx styles forwarded to the Drawer Paper */
  sx?: SxProps<Theme>;
}

const widthMap: Record<DrawerWidth, number | string> = {
  sm: 320,
  md: 448,
  lg: 512,
  xl: 576,
};

/**
 * DrawerShell - Unified drawer/slide-out panel component
 *
 * Provides consistent styling and behavior for all drawers:
 * - Slide-in animation from left or right
 * - Backdrop overlay
 * - Body scroll lock
 * - Keyboard (ESC) support
 */
export function DrawerShell({
  isOpen,
  onClose,
  title,
  position = 'right',
  width = 'md',
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  lockScroll: _lockScroll = true,
  sx,
}: DrawerShellProps) {
  const handleClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' && !closeOnBackdropClick) return;
    if (reason === 'escapeKeyDown' && !closeOnEscape) return;
    onClose();
  };

  const drawerWidth = widthMap[width];

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      anchor={position}
      className={className}
      PaperProps={{
        sx: [
          {
            width: drawerWidth,
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ],
      }}
    >
      {(title || showCloseButton) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid',
            borderColor: 'rgba(0,0,0,0.12)',
          }}
          aria-labelledby={title ? 'drawer-title' : undefined}
        >
          {title && (
            <Typography id="drawer-title" variant="h6" fontWeight={700}>
              {title}
            </Typography>
          )}
          {showCloseButton && (
            <IconButton
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              size="small"
              sx={{ ml: 'auto' }}
            >
              <X size={20} />
            </IconButton>
          )}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, minHeight: 0 }}>
        {children}
      </div>
    </Drawer>
  );
}
