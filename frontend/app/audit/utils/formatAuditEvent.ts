import type { AuditAction, AuditEvent, EntityType, Severity } from '@/lib/api/audit';

type ActionTone = 'info' | 'warn' | 'critical' | 'primary' | 'success';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Create',
  update: 'Change',
  delete: 'Delete',
  import: 'Import',
  link: 'Link',
  unlink: 'Unlink',
  match: 'Match',
  unmatch: 'Unmatch',
  apply_rule: 'Apply Rule',
  rollback: 'Rollback',
  export: 'Export',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  transaction: 'Transaction',
  statement: 'Statement',
  receipt: 'Receipt',
  category: 'Category',
  rule: 'Rule',
  workspace: 'Workspace',
  integration: 'Integration',
  table_row: 'Table Row',
  table_cell: 'Table Cell',
  branch: 'Branch',
  wallet: 'Wallet',
  custom_table: 'Custom Table',
  custom_table_column: 'Custom Table Column',
};

const ACTION_VERBS: Record<AuditAction, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  import: 'imported',
  link: 'linked',
  unlink: 'unlinked',
  match: 'merged',
  unmatch: 'unmatched',
  apply_rule: 'categorized',
  rollback: 'rolled back',
  export: 'exported',
};

const ACTION_TONES: Record<AuditAction, ActionTone> = {
  create: 'success',
  update: 'primary',
  delete: 'critical',
  import: 'primary',
  link: 'info',
  unlink: 'warn',
  match: 'info',
  unmatch: 'warn',
  apply_rule: 'success',
  rollback: 'warn',
  export: 'info',
};

const SEVERITY_TONES: Record<Severity, ActionTone> = {
  info: 'info',
  warn: 'warn',
  critical: 'critical',
};

const _formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const buildFallbackDescription = (
  actionLabel: string,
  objectLabel: string,
  entityId?: string | null,
): string => {
  const baseLabel = `${actionLabel} ${objectLabel}`;
  const trimmedId = typeof entityId === 'string' ? entityId.trim() : '';
  if (!trimmedId) return baseLabel;
  return `${baseLabel} ${trimmedId}`;
};

const formatDiffKeys = (keys: string[]): string => {
  if (keys.length === 1) return `Field: ${keys[0]}`;
  const displayedKeys = keys.slice(0, 3);
  const remainingCount = keys.length - displayedKeys.length;
  return remainingCount
    ? `Fields: ${displayedKeys.join(', ')} +${remainingCount} more`
    : `Fields: ${displayedKeys.join(', ')}`;
};

const extractDescription = (
  event: AuditEvent,
  actionLabel: string,
  objectLabel: string,
): string => {
  if (event.description?.trim()) {
    return event.description.trim();
  }

  const diff = event.diff;
  if (!diff || Array.isArray(diff)) {
    return buildFallbackDescription(actionLabel, objectLabel, event.entityId);
  }

  const before = diff.before ?? {};
  const after = diff.after ?? {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  if (keys.length === 0) {
    return buildFallbackDescription(actionLabel, objectLabel, event.entityId);
  }

  return formatDiffKeys(keys);
};

export const formatAuditEvent = (
  event: AuditEvent,
): { actionLabel: string; actionVerb: string; objectLabel: string; description: string; severity: string; actionTone: ActionTone } => {
  const actionLabel = ACTION_LABELS[event.action] ?? event.action;
  const actionVerb = ACTION_VERBS[event.action] ?? event.action;
  const objectLabel = ENTITY_LABELS[event.entityType] ?? event.entityType;
  const description = extractDescription(event, actionLabel, objectLabel);
  const actionTone =
    event.severity === 'warn' || event.severity === 'critical'
      ? SEVERITY_TONES[event.severity]
      : (ACTION_TONES[event.action] ?? 'info');

  return {
    actionLabel,
    actionVerb,
    objectLabel,
    description,
    severity: event.severity,
    actionTone,
  };
};
