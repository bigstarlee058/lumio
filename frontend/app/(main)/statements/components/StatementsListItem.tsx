'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { PDFThumbnail } from '@/app/components/PDFThumbnail';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import MuiTooltip from '@mui/material/Tooltip';
import { CreditCard, Receipt } from 'lucide-react';
import { AlertCircle, CheckCircle2, ChevronRight, CircleHelp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type StatementListItem = {
  id: string;
  source?: 'statement' | 'gmail' | 'scan';
  receiptSource?: string;
  fileName: string;
  subject?: string;
  sender?: string;
  status: string;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  createdAt: string;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  bankName: string;
  fileType: string;
  currency?: string | null;
  receivedAt?: string;
  parsedData?: {
    amount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  errorMessage?: string | null;
  parsingDetails?: {
    detectedBy?: string;
    importPreview?: {
      source?: string;
    };
  };
};

type DuplicateRole = 'primary' | 'suspected';
type DuplicateGroupTone = 'sky' | 'blue' | 'indigo' | 'slate' | 'zinc' | 'stone';

type DuplicateGroupStyle = {
  rowBorderColor: string;
  rowBg: string;
  lineColor: string;
  badgeBg: string;
  badgeColor: string;
  buttonBorder: string;
  buttonBg: string;
  buttonColor: string;
  buttonHoverBorder: string;
  buttonHoverBg: string;
  buttonHoverColor: string;
};

const DUPLICATE_GROUP_STYLES: Record<DuplicateGroupTone, DuplicateGroupStyle> = {
  blue: {
    rowBorderColor: '#dbeafe',
    rowBg: 'rgba(239,246,255,0.1)',
    lineColor: 'rgba(147,197,253,0.9)',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    buttonBorder: '#bfdbfe',
    buttonBg: '#eff6ff',
    buttonColor: '#1d4ed8',
    buttonHoverBorder: '#93c5fd',
    buttonHoverBg: '#dbeafe',
    buttonHoverColor: '#1e40af',
  },
  sky: {
    rowBorderColor: '#e0f2fe',
    rowBg: 'rgba(240,249,255,0.1)',
    lineColor: 'rgba(125,211,252,0.9)',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    buttonBorder: '#bae6fd',
    buttonBg: '#f0f9ff',
    buttonColor: '#0369a1',
    buttonHoverBorder: '#7dd3fc',
    buttonHoverBg: '#e0f2fe',
    buttonHoverColor: '#075985',
  },
  indigo: {
    rowBorderColor: '#e0e7ff',
    rowBg: 'rgba(238,242,255,0.1)',
    lineColor: 'rgba(165,180,252,0.9)',
    badgeBg: '#e0e7ff',
    badgeColor: '#4338ca',
    buttonBorder: '#c7d2fe',
    buttonBg: '#eef2ff',
    buttonColor: '#4338ca',
    buttonHoverBorder: '#a5b4fc',
    buttonHoverBg: '#e0e7ff',
    buttonHoverColor: '#3730a3',
  },
  slate: {
    rowBorderColor: '#e2e8f0',
    rowBg: 'rgba(248,250,252,0.3)',
    lineColor: 'rgba(148,163,184,0.85)',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
    buttonBorder: '#e2e8f0',
    buttonBg: '#f8fafc',
    buttonColor: '#475569',
    buttonHoverBorder: '#cbd5e1',
    buttonHoverBg: '#f1f5f9',
    buttonHoverColor: '#334155',
  },
  zinc: {
    rowBorderColor: '#e4e4e7',
    rowBg: 'rgba(250,250,250,0.3)',
    lineColor: 'rgba(161,161,170,0.85)',
    badgeBg: '#f4f4f5',
    badgeColor: '#52525b',
    buttonBorder: '#e4e4e7',
    buttonBg: '#fafafa',
    buttonColor: '#52525b',
    buttonHoverBorder: '#d4d4d8',
    buttonHoverBg: '#f4f4f5',
    buttonHoverColor: '#3f3f46',
  },
  stone: {
    rowBorderColor: '#e7e5e4',
    rowBg: 'rgba(250,250,249,0.3)',
    lineColor: 'rgba(168,162,158,0.85)',
    badgeBg: '#f5f5f4',
    badgeColor: '#57534e',
    buttonBorder: '#e7e5e4',
    buttonBg: '#fafaf9',
    buttonColor: '#57534e',
    buttonHoverBorder: '#d6d3d1',
    buttonHoverBg: '#f5f5f4',
    buttonHoverColor: '#44403c',
  },
};

type Props = {
  dataTourId?: string;
  statement: StatementListItem;
  viewLabel: string;
  duplicateActionLabel?: string;
  isReceipt: boolean;
  isProcessing: boolean;
  merchantLabel: string;
  amountLabel: string;
  dateLabel: string;
  onView: () => void;
  onIconClick: () => void;
  onToggleSelect?: () => void;
  selected?: boolean;
  selectionDisabled?: boolean;
  typeLabel?: string;
  isManualExpense?: boolean;
  isPossibleDuplicate?: boolean;
  duplicatePosition?: number;
  duplicateGroupSize?: number;
  duplicateRole?: DuplicateRole;
  duplicateGroupLabel?: string;
  duplicateGroupTone?: DuplicateGroupTone;
  duplicateReason?: string;
  viewDisabled?: boolean;
};

function StatusBadge({
  status,
  isProcessing,
  errorMessage,
}: { status: string; isProcessing: boolean; errorMessage?: string | null }) {
  if (errorMessage || status === 'error') {
    return <span className="lumio-stmt-badge lumio-stmt-badge--error">Error</span>;
  }
  if (isProcessing || status === 'processing' || status === 'uploaded') {
    return <span className="lumio-stmt-badge lumio-stmt-badge--pending">Pending</span>;
  }
  if (status === 'completed' || status === 'parsed' || status === 'validated') {
    return <span className="lumio-stmt-badge lumio-stmt-badge--completed">Completed</span>;
  }
  return null;
}

export function StatementsListItem({
  dataTourId,
  statement,
  viewLabel,
  duplicateActionLabel,
  isReceipt,
  isProcessing,
  merchantLabel,
  amountLabel,
  dateLabel,
  onView,
  onIconClick,
  onToggleSelect,
  selected = false,
  selectionDisabled = false,
  typeLabel,
  isManualExpense = false,
  isPossibleDuplicate = false,
  duplicatePosition,
  duplicateGroupSize,
  duplicateRole,
  duplicateGroupLabel,
  duplicateGroupTone,
  duplicateReason,
  viewDisabled = false,
}: Props) {
  const PREVIEW_WIDTH = 430;
  const PREVIEW_HEIGHT = 620;
  const thumbnailButtonRef = useRef<HTMLButtonElement | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const resolvedTypeLabel = typeLabel || statement.fileType;
  const isGmailReceipt = statement.source === 'gmail';
  const isLocalReceipt = statement.source === 'scan';
  const previewSource = isGmailReceipt ? 'gmail' : isLocalReceipt ? 'receipt' : 'statement';
  const normalizedPreviewType = (isReceipt ? 'pdf' : statement.fileType || statement.fileName || '')
    .trim()
    .toLowerCase();
  const hasHoverPreview =
    normalizedPreviewType === 'pdf' ||
    normalizedPreviewType.includes('pdf') ||
    normalizedPreviewType.endsWith('/pdf') ||
    normalizedPreviewType === 'application/pdf';

  const updatePreviewPosition = useCallback(() => {
    const trigger = thumbnailButtonRef.current;
    if (!trigger || typeof window === 'undefined') return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 12;

    const maxTop = Math.max(16, viewportHeight - PREVIEW_HEIGHT - 16);
    const centeredTop = triggerRect.top + triggerRect.height / 2 - PREVIEW_HEIGHT / 2;
    const top = Math.min(Math.max(16, centeredTop), maxTop);

    const rightSideLeft = triggerRect.right + gap;
    const fitsOnRight = rightSideLeft + PREVIEW_WIDTH <= viewportWidth - 12;
    const left = fitsOnRight ? rightSideLeft : Math.max(12, triggerRect.left - PREVIEW_WIDTH - gap);

    setPreviewPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!previewVisible) return;

    updatePreviewPosition();

    const handleReposition = () => {
      updatePreviewPosition();
    };

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [previewVisible, updatePreviewPosition]);

  const hasError = !!statement.errorMessage || statement.status === 'error';
  const isPendingStatement = statement.status === 'uploaded' || statement.status === 'processing';
  const compactAmountLabel = amountLabel.replace(/\s+/g, '');
  const isZeroAmountLabel = /^0(?:[.,]0+)?\D*$/.test(compactAmountLabel);
  const isNegativeAmount = amountLabel.startsWith('-') && amountLabel !== '-';
  const isMissingAmount = amountLabel === '-';
  const showAmountLoader = !isReceipt && isPendingStatement && (isZeroAmountLabel || isMissingAmount);
  const resolvedDuplicateRole: DuplicateRole = duplicateRole || 'suspected';
  const resolvedDuplicateGroupLabel = duplicateGroupLabel || 'Group';
  const resolvedDuplicateGroupTone: DuplicateGroupTone = duplicateGroupTone || 'stone';
  const duplicateStyle = DUPLICATE_GROUP_STYLES[resolvedDuplicateGroupTone];
  const duplicateGroupShort = resolvedDuplicateGroupLabel.replace(/^Group\s+/, '');
  const duplicateRoleLabel = resolvedDuplicateRole === 'primary' ? 'PRIMARY' : 'SUSPECTED';
  const duplicateBadgeLabel = isPossibleDuplicate
    ? `${resolvedDuplicateGroupLabel} · ${duplicateRoleLabel} #${duplicatePosition || 1}${duplicateGroupSize ? `/${duplicateGroupSize}` : ''}`
    : null;
  const duplicateTooltipText = duplicateReason || 'Same merchant · same date · same amount';
  const actionLabel = isPossibleDuplicate ? duplicateActionLabel || 'Review' : viewLabel;
  const duplicateRoleBadgeStyle: React.CSSProperties =
    resolvedDuplicateRole === 'primary'
      ? { fontWeight: 700, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' }
      : { fontWeight: 500, border: '1px dashed rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.7)', opacity: 0.8 };
  const duplicateRoleButtonStyle: React.CSSProperties =
    resolvedDuplicateRole === 'primary'
      ? { fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
      : { fontWeight: 500, borderStyle: 'dashed', opacity: 0.9 };
  const handleView = () => {
    if (viewDisabled) {
      return;
    }
    onView();
  };

  // Row styles based on duplicate/error/selected state
  const rowStyle: React.CSSProperties = isPossibleDuplicate
    ? { borderColor: duplicateStyle.rowBorderColor, backgroundColor: duplicateStyle.rowBg }
    : hasError
      ? { borderColor: '#fecaca', backgroundColor: 'rgba(255,241,242,0.4)' }
      : selected
        ? {}
        : {};

  return (
    <div
      data-tour-id={dataTourId}
      className={`lumio-stmt-list-item${selected ? ' lumio-stmt-list-item--selected' : ''}${hasError && !isPossibleDuplicate ? ' lumio-stmt-list-item--error' : ''}`}
      style={rowStyle}
    >
      {isPossibleDuplicate ? (
        <span
          aria-hidden
          className="lumio-stmt-list-item__accent"
          style={{ backgroundColor: duplicateStyle.lineColor }}
        />
      ) : null}

      {/* Mobile Layout */}
      <div data-testid={`statement-item-mobile-${statement.id}`} className="lumio-stmt-list-item__mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            {selectionDisabled ? (
              <span style={{ display: 'inline-flex', height: 16, width: 16 }} />
            ) : (
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                style={{ height: 16, width: 16, borderRadius: 4 }}
              />
            )}
          </div>

          <button
            type="button"
            data-testid={`statement-item-mobile-card-${statement.id}`}
            onClick={handleView}
            className="lumio-stmt-list-item__mobile-btn"
            aria-label={actionLabel}
            aria-disabled={viewDisabled}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, flexShrink: 0, color: '#ef4444' }}>
                <DocumentTypeIcon
                  fileType={isReceipt ? 'pdf' : statement.fileType}
                  fileName={statement.fileName}
                  fileId={statement.id}
                  source={previewSource}
                  size={34}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isProcessing ? 'Processing...' : merchantLabel}
                    {isPossibleDuplicate && (
                      <MuiTooltip title={duplicateTooltipText} placement="top" enterDelay={150}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 10,
                            letterSpacing: '0.05em',
                            backgroundColor: duplicateStyle.badgeBg,
                            color: duplicateStyle.badgeColor,
                            ...duplicateRoleBadgeStyle,
                          }}
                        >
                          {resolvedDuplicateRole === 'primary' ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <CircleHelp size={12} />
                          )}
                          {duplicateGroupShort}
                          {resolvedDuplicateRole === 'primary' ? 'P' : 'S'}
                          {duplicatePosition ? `#${duplicatePosition}` : ''}
                        </span>
                      </MuiTooltip>
                    )}
                  </p>
                  <p
                    style={{
                      flexShrink: 0,
                      textAlign: 'right',
                      fontSize: 15,
                      fontWeight: 900,
                      letterSpacing: '-0.025em',
                      fontVariantNumeric: 'tabular-nums',
                      color: isNegativeAmount || hasError || isMissingAmount ? '#dc2626' : '#030712',
                    }}
                  >
                    {showAmountLoader ? <Spinner style={{ width: 16, height: 16, color: '#9ca3af' }} /> : amountLabel}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>{dateLabel}</p>
                  <StatusBadge
                    status={statement.status}
                    isProcessing={isProcessing}
                    errorMessage={statement.errorMessage}
                  />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleView}
        className="lumio-stmt-list-item__desktop-overlay"
        aria-label={viewLabel}
        aria-disabled={viewDisabled}
      />

      {/* Desktop Layout */}
      <div
        data-testid={`statement-item-desktop-${statement.id}`}
        className="lumio-stmt-list-item__desktop"
        style={{ pointerEvents: 'none' }}
      >
        {/* Left Side: Secondary actions, Context (Merchant) */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {/* Secondary Controls: Checkbox and Thumbnail */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginRight: 16 }}>
            <div style={{ width: 16, display: 'flex', justifyContent: 'center', opacity: 0.7, transition: 'opacity 0.15s' }}>
              {selectionDisabled ? (
                <span style={{ display: 'inline-flex', height: 16, width: 16 }} />
              ) : (
                <Checkbox
                  checked={selected}
                  onCheckedChange={onToggleSelect}
                  onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
                  style={{ pointerEvents: 'auto', height: 16, width: 16, borderRadius: 4 }}
                />
              )}
            </div>

            <div style={{ position: 'relative', pointerEvents: 'auto' }}>
              <button
                type="button"
                ref={thumbnailButtonRef}
                data-testid={`statement-thumbnail-trigger-${statement.id}`}
                style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={event => {
                  event.stopPropagation();
                  onIconClick();
                }}
                onMouseEnter={() => setPreviewVisible(true)}
                onMouseLeave={() => setPreviewVisible(false)}
                aria-label={statement.fileName}
              >
                <span style={{ color: '#9ca3af', opacity: 0.6, transition: 'opacity 0.15s', display: 'contents' }}>
                  <DocumentTypeIcon
                    fileType={isReceipt ? 'pdf' : statement.fileType}
                    fileName={statement.fileName}
                    fileId={statement.id}
                    source={previewSource}
                    size={28}
                  />
                </span>
              </button>

              {hasHoverPreview && previewVisible && previewPosition
                ? createPortal(
                    <div
                      data-testid="statement-hover-preview"
                      style={{
                        pointerEvents: 'none',
                        position: 'fixed',
                        zIndex: 140,
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        padding: 8,
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                        top: previewPosition.top,
                        left: previewPosition.left,
                        width: PREVIEW_WIDTH,
                        maxWidth: 'min(430px, calc(100vw - 24px))',
                      }}
                    >
                      <PDFThumbnail
                        fileId={statement.id}
                        fileName={statement.fileName}
                        source={previewSource}
                        width={PREVIEW_WIDTH - 16}
                        height={PREVIEW_HEIGHT}
                        preservePageAspect
                        errorMessage="Unable to load document"
                      />
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          </div>

          {/* Main Context: Merchant Name & Date */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Weakened Merchant Icon */}
              <div style={{ flexShrink: 0, opacity: 0.6 }}>
                {isGmailReceipt ? (
                  <img
                    src="/icons/gmail.png"
                    alt="Gmail"
                    width={16}
                    height={16}
                    style={{ borderRadius: '50%', objectFit: 'contain' }}
                  />
                ) : isLocalReceipt ? (
                  <Receipt
                    data-testid="receipt-statement-type-icon"
                    size={16}
                    style={{ color: '#6b7280' }}
                  />
                ) : (
                  <BankLogoAvatar bankName={statement.bankName} size={16} />
                )}
              </div>

              {/* Main Merchant Name */}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#111827', fontSize: 15 }}>
                {isProcessing ? 'Processing...' : merchantLabel}
              </span>

              {/* Weakened Type / Error micro-signal */}
              {hasError ? (
                <AlertCircle size={16} style={{ color: '#ef4444', marginLeft: 4 }} />
              ) : isPossibleDuplicate ? (
                <MuiTooltip title={duplicateTooltipText} placement="top" enterDelay={150}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      letterSpacing: '0.05em',
                      marginLeft: 4,
                      backgroundColor: duplicateStyle.badgeBg,
                      color: duplicateStyle.badgeColor,
                      ...duplicateRoleBadgeStyle,
                    }}
                  >
                    {resolvedDuplicateRole === 'primary' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <CircleHelp size={12} />
                    )}
                    {duplicateBadgeLabel}
                  </div>
                </MuiTooltip>
              ) : isManualExpense ? (
                <CreditCard
                  data-testid="manual-expense-type-icon"
                  size={14}
                  style={{ color: '#6b7280', opacity: 0.5, marginLeft: 4 }}
                />
              ) : (
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px', marginLeft: 4, opacity: 0.7 }}>
                  {resolvedTypeLabel === 'PDF' ? 'PDF' : resolvedTypeLabel}
                </span>
              )}
            </div>
            {/* Weakened Date */}
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginTop: 2, marginLeft: 24 }}>{dateLabel}</div>
          </div>
        </div>

        {/* Right Side: Primary Info & Actions (Strictly right-aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24, flexShrink: 0, width: 420, pointerEvents: 'auto', paddingLeft: 16 }}>
          {/* Amount as the main visual anchor, strict right alignment */}
          <div style={{ width: 144, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 19,
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: '-0.025em',
                fontVariantNumeric: 'tabular-nums',
                color: isNegativeAmount || hasError || isMissingAmount ? '#dc2626' : '#030712',
              }}
            >
              {showAmountLoader ? <Spinner style={{ width: 16, height: 16, color: '#9ca3af' }} /> : amountLabel}
            </span>
            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <StatusBadge
                status={statement.status}
                isProcessing={isProcessing}
                errorMessage={statement.errorMessage}
              />
            </div>
          </div>

          <div style={{ width: 144, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button
              data-testid="statement-view-icon"
              type="button"
              onClick={event => {
                event.stopPropagation();
                handleView();
              }}
              className="lumio-stmt-list-item__view-btn"
              style={
                isPossibleDuplicate
                  ? {
                      borderColor: duplicateStyle.buttonBorder,
                      backgroundColor: duplicateStyle.buttonBg,
                      color: duplicateStyle.buttonColor,
                      ...duplicateRoleButtonStyle,
                    }
                  : {}
              }
              aria-label={actionLabel}
              disabled={viewDisabled}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
