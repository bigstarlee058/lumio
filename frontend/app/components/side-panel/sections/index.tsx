'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Minus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import React, { isValidElement, useMemo } from 'react';
import { Spinner } from '../../ui/spinner';
import { useSidePanel } from '../SidePanelContext';
import {
  type ActionItem,
  type ActionsSection,
  type ChartItem,
  type ChartSection,
  type CustomSection,
  type ErrorItem,
  type ErrorSection,
  type MetricsSection,
  type NavigationItem,
  type NavigationSection,
  type SettingsSection,
  type SettingsSelectItem,
  type SettingsToggleItem,
  type SidePanelSection,
  type StatusItem,
  type StatusSection,
  type SummaryItem,
  type SummarySection,
} from '../types';

// ============================================================================
// Helper Components
// ============================================================================

/** Render icon - handles both LucideIcon and ReactNode */
function RenderIcon({
  icon,
  className,
  size = 16,
}: {
  icon: NavigationItem['icon'];
  className?: string;
  size?: number;
}) {
  if (!icon) return null;

  // If it's a React element, render it directly
  if (isValidElement(icon)) {
    return <span className={className}>{icon}</span>;
  }

  // If it's a Lucide icon component
  const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} className={className} />;
}

/** Section wrapper with optional collapse */
function SectionWrapper({
  section,
  children,
}: {
  section: SidePanelSection;
  children: React.ReactNode;
}) {
  const { collapsedSections, toggleSection } = useSidePanel();
  const isCollapsed = section.collapsible
    ? collapsedSections.has(section.id) || (section.defaultCollapsed ?? false)
    : false;

  if (section.hidden) return null;

  return (
    <div style={{ marginBottom: 4 }} className={section.className}>
      {section.title && (
        <button
          type="button"
          onClick={() => section.collapsible && toggleSection(section.id)}
          disabled={!section.collapsible}
          className={section.titleClassName}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            marginTop: section.collapsible ? 12 : 4,
            fontSize: 14,
            fontWeight: 400,
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: section.collapsible ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {section.icon && <RenderIcon icon={section.icon} size={14} />}
            <span>{section.title}</span>
          </div>
          {section.collapsible && (
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 200ms',
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </button>
      )}
      <div
        style={{
          transition: 'all 200ms',
          overflow: 'hidden',
          maxHeight: isCollapsed ? 0 : 2000,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        <div
          style={{ padding: section.title ? '0 16px 12px' : '12px 16px' }}
          className={section.contentClassName}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Navigation Section
// ============================================================================

function NavigationItemComponent({ item, depth = 0 }: { item: NavigationItem; depth?: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const emphasis = item.emphasis || 'default';
  const isHighEmphasis = emphasis === 'high';

  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {item.icon && (
          <span
            style={{
              display: 'flex',
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              color: item.active ? 'var(--primary)' : '#6b7280',
            }}
          >
            <RenderIcon icon={item.icon} size={20} />
          </span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {item.badge !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 20,
              height: 20,
              padding: '0 6px',
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 0,
              backgroundColor: 'var(--primary)',
              color: 'white',
            }}
          >
            {item.badgeLoading ? <Spinner size={12} /> : item.badge}
          </span>
        )}
        {hasChildren && (
          <ChevronRight
            size={14}
            style={{
              color: '#9ca3af',
              transition: 'transform 200ms',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </div>
    </>
  );

  const itemStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 16px',
    margin: '2px 0',
    fontSize: 14,
    textDecoration: 'none',
    transition: 'background-color 200ms',
    outline: 'none',
    border: 'none',
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    opacity: item.disabled ? 0.5 : 1,
    borderRadius: 0,
    backgroundColor: item.active
      ? isHighEmphasis
        ? 'rgba(var(--primary-rgb),0.1)'
        : 'rgba(0,0,0,0.06)'
      : 'transparent',
    color: item.active ? '#111827' : '#4b5563',
    fontWeight: item.active ? 500 : 400,
    ...(depth > 0 ? { marginLeft: 24 } : {}),
  };

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (item.onClick && !item.disabled) {
      item.onClick();
    }
  };

  return (
    <div>
      {item.href && !hasChildren ? (
        <Link href={item.href} style={itemStyle}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={item.disabled}
          style={itemStyle}
        >
          {content}
        </button>
      )}
      {hasChildren && isExpanded && (
        <div style={{ marginTop: 4 }}>
          {(item.children ?? []).map(child => (
            <NavigationItemComponent key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NavigationSectionRenderer({ section }: { section: NavigationSection }) {
  return (
    <SectionWrapper section={section}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {section.items.map(item => (
          <NavigationItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Status Section
// ============================================================================

const STATUS_COLOR_MAP: Record<string, string> = {
  online: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  offline: '#9ca3af',
};

function StatusItemComponent({ item }: { item: StatusItem }) {
  const formattedTime = useMemo(() => {
    if (!item.timestamp) return null;
    const date = typeof item.timestamp === 'string' ? new Date(item.timestamp) : item.timestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [item.timestamp]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: STATUS_COLOR_MAP[item.status] ?? '#9ca3af',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.icon && <RenderIcon icon={item.icon} size={14} />}
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
        </div>
        {item.description && (
          <p
            style={{
              fontSize: 12,
              color: '#6b7280',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
              marginBottom: 0,
            }}
          >
            {item.description}
          </p>
        )}
      </div>
      {formattedTime && (
        <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{formattedTime}</span>
      )}
    </div>
  );
}

export function StatusSectionRenderer({ section }: { section: StatusSection }) {
  return (
    <SectionWrapper section={section}>
      <div>
        {section.items.map(item => (
          <StatusItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Summary/Metrics Section
// ============================================================================

function SummaryItemComponent({ item }: { item: SummaryItem }) {
  const formattedValue = useMemo(() => {
    if (typeof item.value === 'string') return item.value;

    let formatted: string;
    switch (item.format) {
      case 'currency':
        formatted = new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'KZT',
          minimumFractionDigits: 0,
        }).format(item.value);
        break;
      case 'percentage':
        formatted = `${item.value}%`;
        break;
      case 'number':
        formatted = new Intl.NumberFormat('ru-RU').format(item.value);
        break;
      default:
        formatted = String(item.value);
    }

    return `${item.prefix || ''}${formatted}${item.suffix || ''}`;
  }, [item]);

  return (
    <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 12,
              color: '#6b7280',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {item.label}
          </p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginTop: 4, marginBottom: 0 }}>
            {formattedValue}
          </p>
          {item.change && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              {item.change.type === 'increase' && <ArrowUp size={12} style={{ color: '#10b981' }} />}
              {item.change.type === 'decrease' && <ArrowDown size={12} style={{ color: '#ef4444' }} />}
              {item.change.type === 'neutral' && <Minus size={12} style={{ color: '#9ca3af' }} />}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color:
                    item.change.type === 'increase'
                      ? '#059669'
                      : item.change.type === 'decrease'
                        ? '#dc2626'
                        : '#6b7280',
                }}
              >
                {item.change.value > 0 ? '+' : ''}
                {item.change.value}%
              </span>
              {item.change.period && (
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{item.change.period}</span>
              )}
            </div>
          )}
        </div>
        {item.icon && (
          <div style={{ padding: 8, borderRadius: 0, backgroundColor: 'rgba(var(--primary-rgb),0.1)' }}>
            <RenderIcon icon={item.icon} size={16} />
          </div>
        )}
      </div>
    </div>
  );
}

export function SummarySectionRenderer({ section }: { section: SummarySection }) {
  const gridStyle = useMemo((): React.CSSProperties => {
    if (section.layout === 'list') {
      return { display: 'flex', flexDirection: 'column', gap: 8 };
    }
    return {
      display: 'grid',
      gap: 8,
      gridTemplateColumns: `repeat(${section.columns || 2}, 1fr)`,
    };
  }, [section.layout, section.columns]);

  return (
    <SectionWrapper section={section}>
      <div style={gridStyle}>
        {section.items.map(item => (
          <SummaryItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Metrics Section (with Charts)
// ============================================================================

function ChartItemComponent({ item }: { item: ChartItem }) {
  // Simple progress bar renderer
  if (item.type === 'progress') {
    const value = Array.isArray(item.data) && typeof item.data[0] === 'number' ? item.data[0] : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.title}</span>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{value}%</span>
        </div>
        <div style={{ height: 8, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, value))}%`,
              height: '100%',
              transition: 'width 300ms',
              backgroundColor: item.color || 'var(--primary)',
            }}
          />
        </div>
      </div>
    );
  }

  // Simple sparkline renderer
  if (item.type === 'sparkline' && Array.isArray(item.data)) {
    const numericData = item.data.filter((d): d is number => typeof d === 'number');
    const max = Math.max(...numericData, 1);
    const min = Math.min(...numericData, 0);
    const range = max - min || 1;
    const height = item.height || 40;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.title}</span>
        <svg
          width="100%"
          height={height}
          aria-label={item.title}
          role="img"
        >
          <polyline
            fill="none"
            stroke={item.color || 'var(--primary)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={numericData
              .map((d, i) => {
                const x = (i / (numericData.length - 1)) * 100;
                const y = height - ((d - min) / range) * height;
                return `${x}%,${y}`;
              })
              .join(' ')}
          />
        </svg>
      </div>
    );
  }

  // Custom renderer
  if (item.type === 'custom' && item.customRenderer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.title}</span>
        {item.customRenderer(item.data)}
      </div>
    );
  }

  return null;
}

function isChartItem(item: SummaryItem | ChartItem): item is ChartItem {
  return 'type' in item && typeof (item as ChartItem).data !== 'undefined';
}

export function MetricsSectionRenderer({ section }: { section: MetricsSection }) {
  return (
    <SectionWrapper section={section}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {section.items.map(item =>
          isChartItem(item) ? (
            <ChartItemComponent key={item.id} item={item} />
          ) : (
            <SummaryItemComponent key={item.id} item={item} />
          ),
        )}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Actions Section
// ============================================================================

const ACTION_VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: { backgroundColor: 'var(--primary)', color: 'white', border: 'none' },
  secondary: { backgroundColor: '#f3f4f6', color: '#374151', border: 'none' },
  destructive: { backgroundColor: '#fee2e2', color: '#dc2626', border: 'none' },
  outline: { backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb' },
  ghost: { backgroundColor: 'transparent', color: '#374151', border: 'none' },
};

const ACTION_SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 10px', fontSize: 12 },
  md: { padding: '8px 12px', fontSize: 14 },
  lg: { padding: '10px 16px', fontSize: 16 },
};

function ActionItemComponent({ item }: { item: ActionItem }) {
  const sizeStyle = ACTION_SIZE_STYLES[item.size || 'md'];
  const variantStyle = ACTION_VARIANT_STYLES[item.variant || 'secondary'];

  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={item.disabled || item.loading}
      title={item.tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 0,
        fontWeight: 500,
        cursor: item.disabled || item.loading ? 'not-allowed' : 'pointer',
        opacity: item.disabled || item.loading ? 0.5 : 1,
        ...sizeStyle,
        ...variantStyle,
      }}
    >
      {item.loading ? (
        <Spinner size={16} />
      ) : (
        item.icon && <RenderIcon icon={item.icon} size={16} />
      )}
      <span>{item.label}</span>
    </button>
  );
}

export function ActionsSectionRenderer({ section }: { section: ActionsSection }) {
  const layoutStyle = useMemo((): React.CSSProperties => {
    switch (section.layout) {
      case 'horizontal':
        return { display: 'flex', flexWrap: 'wrap', gap: 8 };
      case 'grid':
        return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 };
      default:
        return { display: 'flex', flexDirection: 'column', gap: 8 };
    }
  }, [section.layout]);

  return (
    <SectionWrapper section={section}>
      <div style={layoutStyle}>
        {section.items.map(item => (
          <ActionItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Settings Section
// ============================================================================

function isToggleItem(item: SettingsToggleItem | SettingsSelectItem): item is SettingsToggleItem {
  return 'checked' in item;
}

function SettingsToggleComponent({ item }: { item: SettingsToggleItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        {item.icon && <RenderIcon icon={item.icon} size={16} />}
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#111827',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
          {item.description && (
            <span
              style={{
                fontSize: 12,
                color: '#6b7280',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.description}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={item.checked}
        onClick={() => !item.disabled && item.onChange(!item.checked)}
        disabled={item.disabled}
        style={{
          position: 'relative',
          display: 'inline-flex',
          width: 36,
          height: 20,
          borderRadius: 0,
          flexShrink: 0,
          cursor: item.disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 200ms',
          border: 'none',
          backgroundColor: item.checked ? 'var(--primary)' : '#d1d5db',
          opacity: item.disabled ? 0.5 : 1,
          padding: 0,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'var(--card-bg)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'transform 200ms',
            transform: `translate(${item.checked ? '18px' : '2px'}, 2px)`,
          }}
        />
      </button>
    </div>
  );
}

function SettingsSelectComponent({ item }: { item: SettingsSelectItem }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {item.icon && <RenderIcon icon={item.icon} size={16} />}
        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.label}</span>
      </div>
      {item.description && (
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, marginTop: 0 }}>
          {item.description}
        </p>
      )}
      <select
        value={item.value}
        onChange={e => item.onChange(e.target.value)}
        disabled={item.disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 14,
          border: '1px solid #e5e7eb',
          backgroundColor: 'var(--card-bg)',
          color: '#111827',
          outline: 'none',
          opacity: item.disabled ? 0.5 : 1,
        }}
      >
        {item.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsSectionRenderer({ section }: { section: SettingsSection }) {
  return (
    <SectionWrapper section={section}>
      <div>
        {section.items.map(item =>
          isToggleItem(item) ? (
            <SettingsToggleComponent key={item.id} item={item} />
          ) : (
            <SettingsSelectComponent key={item.id} item={item} />
          ),
        )}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Error Section
// ============================================================================

const ERROR_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: AlertCircle,
};

const ERROR_BG: Record<string, string> = {
  info: '#eff6ff',
  warning: '#fffbeb',
  error: '#fef2f2',
  critical: '#fee2e2',
};

const ERROR_BORDER: Record<string, string> = {
  info: '#bfdbfe',
  warning: '#fde68a',
  error: '#fecaca',
  critical: '#fca5a5',
};

const ERROR_ICON_COLOR: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
};

function ErrorItemComponent({ item }: { item: ErrorItem }) {
  const IconComponent = ERROR_ICONS[item.severity];

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid',
        borderColor: ERROR_BORDER[item.severity],
        backgroundColor: ERROR_BG[item.severity],
        borderRadius: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <IconComponent
          size={18}
          style={{ flexShrink: 0, marginTop: 2, color: ERROR_ICON_COLOR[item.severity] }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{item.title}</p>
            {item.dismissible && item.onDismiss && (
              <button
                type="button"
                onClick={item.onDismiss}
                style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#4b5563', marginTop: 4, marginBottom: 0 }}>{item.message}</p>
          {item.action && (
            <button
              type="button"
              onClick={item.action.onClick}
              style={{
                marginTop: 8,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ErrorSectionRenderer({ section }: { section: ErrorSection }) {
  const displayItems = section.maxItems ? section.items.slice(0, section.maxItems) : section.items;

  return (
    <SectionWrapper section={section}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayItems.map(item => (
          <ErrorItemComponent key={item.id} item={item} />
        ))}
        {section.maxItems && section.items.length > section.maxItems && (
          <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '4px 0', margin: 0 }}>
            +{section.items.length - section.maxItems} more
          </p>
        )}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Chart Section
// ============================================================================

export function ChartSectionRenderer({ section }: { section: ChartSection }) {
  return (
    <SectionWrapper section={section}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {section.items.map(item => (
          <ChartItemComponent key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Custom Section
// ============================================================================

export function CustomSectionRenderer({ section }: { section: CustomSection }) {
  return <SectionWrapper section={section}>{section.render()}</SectionWrapper>;
}

// ============================================================================
// Main Section Renderer
// ============================================================================

export function SectionRenderer({ section }: { section: SidePanelSection }) {
  switch (section.type) {
    case 'navigation':
      return <NavigationSectionRenderer section={section} />;
    case 'status':
      return <StatusSectionRenderer section={section} />;
    case 'summary':
      return <SummarySectionRenderer section={section} />;
    case 'metrics':
      return <MetricsSectionRenderer section={section} />;
    case 'actions':
      return <ActionsSectionRenderer section={section} />;
    case 'settings':
      return <SettingsSectionRenderer section={section} />;
    case 'error':
      return <ErrorSectionRenderer section={section} />;
    case 'chart':
      return <ChartSectionRenderer section={section} />;
    case 'custom':
      return <CustomSectionRenderer section={section} />;
    default:
      return null;
  }
}
