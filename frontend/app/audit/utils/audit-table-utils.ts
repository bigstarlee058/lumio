import type { AuditEvent } from '@/lib/api/audit';

export type AuditTableRow =
  | { type: 'group'; id: string; batchId: string; count: number; createdAt: string }
  | { type: 'event'; id: string; event: AuditEvent; batchId: string | null; createdAt: string };

type BatchGroupResult = { group: AuditTableRow; sorted: AuditEvent[] };

export function sortByDate(a: AuditEvent, b: AuditEvent): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortRowsByDate(a: AuditTableRow, b: AuditTableRow): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function buildEventRow(event: AuditEvent, batchId: string | null): AuditTableRow {
  return { type: 'event', id: event.id, event, batchId, createdAt: event.createdAt };
}

export function buildBatchGroup(batchId: string, batchEvents: AuditEvent[]): BatchGroupResult {
  const sorted = [...batchEvents].sort(sortByDate);
  const group: AuditTableRow = { type: 'group', id: `batch-${batchId}`, batchId, count: batchEvents.length, createdAt: sorted[0]?.createdAt ?? new Date().toISOString() };
  return { group, sorted };
}

export function buildGroupedData(events: AuditEvent[], expandedBatches: Set<string>): AuditTableRow[] {
  const rows: AuditTableRow[] = [];
  const batchGroups = new Map<string, AuditEvent[]>();
  for (const event of events) {
    if (event.batchId) {
      const list = batchGroups.get(event.batchId) ?? [];
      list.push(event);
      batchGroups.set(event.batchId, list);
    } else {
      rows.push(buildEventRow(event, null));
    }
  }
  for (const [batchId, batchEvents] of batchGroups.entries()) {
    const { group, sorted } = buildBatchGroup(batchId, batchEvents);
    rows.push(group);
    if (expandedBatches.has(batchId)) {
      sorted.forEach(event => { rows.push(buildEventRow(event, batchId)); });
    }
  }
  return rows.sort(sortRowsByDate);
}
