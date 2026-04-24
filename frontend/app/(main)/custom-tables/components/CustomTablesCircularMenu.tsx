'use client';

import { FileSpreadsheet, Plus, Table as TableIcon } from '@/app/components/icons';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  onCreateEmpty: () => void;
  onImportFromStatement: () => void;
  onImportGoogleSheets: () => void;
  placement?: 'panel' | 'floating';
  labels?: {
    importGoogleSheets: string;
    fromStatement: string;
    createTable: string;
    openMenu: string;
  };
};

const ACTION_OFFSETS = [
  { x: 28, y: -164 },
  { x: 98, y: -94 },
  { x: 170, y: -14 },
] as const;

const ARC_SIZES = {
  panel: {
    height: 232,
    width: 272,
    radius: '232px',
    buttonLeft: 16,
    bottom: 20,
    closedOffset: 'translate(16px, -6px)',
    containerHeight: 208,
    containerWidth: undefined as number | undefined,
  },
  floating: {
    height: 240,
    width: 320,
    radius: '240px',
    buttonLeft: 24,
    bottom: 24,
    closedOffset: 'translate(8px, -6px)',
    containerHeight: 240,
    containerWidth: 320,
  },
} as const;

export default function CustomTablesCircularMenu({
  onCreateEmpty,
  onImportFromStatement,
  onImportGoogleSheets,
  placement = 'panel',
  labels,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-custom-tables-fab-interactive="true"]')) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const sizes = ARC_SIZES[placement];
  const text = {
    importGoogleSheets: labels?.importGoogleSheets ?? 'Google Sheets',
    fromStatement: labels?.fromStatement ?? 'From statement',
    createTable: labels?.createTable ?? 'Create table',
    openMenu: labels?.openMenu ?? 'Open table actions',
  };

  const actionButtonStyle: React.CSSProperties = {
    display: 'flex',
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--lumio-radius-full)',
    border: '1px solid rgba(255,255,255,0.8)',
    backgroundColor: 'var(--card-bg)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease-out',
  };

  const actionLabelStyle: React.CSSProperties = {
    position: 'absolute',
    left: 48,
    top: '50%',
    zIndex: 40,
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
    borderRadius: 'var(--lumio-radius-sm)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-primary)',
  };

  const menu = (
    <div
      style={{
        position: 'relative',
        overflow: 'visible',
        height: sizes.containerHeight,
        width: sizes.containerWidth,
        ...(placement === 'panel' ? { marginLeft: -16, marginRight: -16, marginBottom: -12 } : {}),
        ...(placement === 'floating'
          ? {
              position: 'fixed',
              bottom: 0,
              left: 0,
              zIndex: 140,
              pointerEvents: 'auto',
            }
          : {}),
      }}
    >
      {/* Arc background */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          bottom: 0,
          left: 0,
          backgroundColor: 'var(--color-primary)',
          transition: 'all 0.3s ease-out',
          height: isOpen ? sizes.height : 0,
          width: isOpen ? sizes.width : 0,
          borderTopRightRadius: isOpen ? sizes.radius : 0,
          opacity: isOpen ? 1 : 0,
        }}
      />

      {/* Action: Google Sheets */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: sizes.bottom,
          zIndex: 20,
          transition: 'all 0.3s ease-out',
          transform: isOpen
            ? `translate(${ACTION_OFFSETS[0].x}px, ${ACTION_OFFSETS[0].y}px)`
            : sizes.closedOffset,
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <button
          data-custom-tables-fab-interactive="true"
          type="button"
          onClick={() => {
            onImportGoogleSheets();
            setIsOpen(false);
          }}
          title={text.importGoogleSheets}
          style={actionButtonStyle}
        >
          <Image
            src="/icons/icons8-google-sheets-48.png"
            alt="Google Sheets"
            width={18}
            height={18}
          />
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            {text.importGoogleSheets}
          </span>
        </button>
        <span style={actionLabelStyle}>{text.importGoogleSheets}</span>
      </div>

      {/* Action: From Statement */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: sizes.bottom,
          zIndex: 20,
          transition: 'all 0.3s ease-out',
          transform: isOpen
            ? `translate(${ACTION_OFFSETS[1].x}px, ${ACTION_OFFSETS[1].y}px)`
            : sizes.closedOffset,
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <button
          data-custom-tables-fab-interactive="true"
          type="button"
          onClick={() => {
            onImportFromStatement();
            setIsOpen(false);
          }}
          title={text.fromStatement}
          style={actionButtonStyle}
        >
          <FileSpreadsheet size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            {text.fromStatement}
          </span>
        </button>
        <span style={actionLabelStyle}>{text.fromStatement}</span>
      </div>

      {/* Action: Create Table */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: sizes.bottom,
          zIndex: 20,
          transition: 'all 0.3s ease-out',
          transform: isOpen
            ? `translate(${ACTION_OFFSETS[2].x}px, ${ACTION_OFFSETS[2].y}px)`
            : sizes.closedOffset,
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <button
          data-custom-tables-fab-interactive="true"
          type="button"
          onClick={() => {
            onCreateEmpty();
            setIsOpen(false);
          }}
          title={text.createTable}
          style={actionButtonStyle}
        >
          <TableIcon size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            {text.createTable}
          </span>
        </button>
        <span style={actionLabelStyle}>{text.createTable}</span>
      </div>

      {/* FAB toggle button */}
      <button
        data-custom-tables-fab-interactive="true"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'absolute',
          zIndex: 30,
          display: 'flex',
          height: 56,
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--lumio-radius-full)',
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          left: sizes.buttonLeft,
          bottom: sizes.bottom,
        }}
        aria-label={text.openMenu}
      >
        <Plus
          size={24}
          style={{
            transition: 'transform 0.3s',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  );

  if (placement === 'floating' && portalReady) {
    const portalTarget = document.getElementById('fab-portal') ?? document.body;
    return createPortal(menu, portalTarget);
  }

  return menu;
}
