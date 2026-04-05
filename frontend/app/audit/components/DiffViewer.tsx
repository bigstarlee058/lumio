'use client';

import type { AuditEventDiff } from '@/lib/api/audit';
import React from 'react';

const TECHNICAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'workspaceId', 'userId']);

const FIELD_LABELS: Record<string, string> = {
  backgroundImage: 'Background image',
  color: 'Color',
  name: 'Name',
  description: 'Description',
  title: 'Title',
  position: 'Position',
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const getRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

export function DiffViewer({ diff }: { diff: AuditEventDiff | null }) {
  if (!diff) {
    return <div className="text-sm text-gray-500">No diff available.</div>;
  }

  if (Array.isArray(diff)) {
    return (
      <div className="space-y-2">
        {diff.map((op, idx) => {
          const key = `${op.op}-${op.path}-${idx}`;

          return (
            <div key={key} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="font-semibold text-gray-800">
                {op.op.toUpperCase()} {op.path}
              </div>
              {op.value !== undefined && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                  {formatValue(op.value)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const before = diff.before || {};
  const after = diff.after || {};
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})])).filter(
    key => !TECHNICAL_FIELDS.has(key),
  );

  if (keys.length === 0) {
    return <div className="text-sm text-gray-500">No user-facing changes available.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="grid grid-cols-3 gap-0 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
        <div className="px-3 py-2">Field</div>
        <div className="px-3 py-2">Before</div>
        <div className="px-3 py-2">After</div>
      </div>
      <div className="divide-y divide-gray-200">
        {keys.map(key => {
          const beforeValue = getRecord(before)?.[key];
          const afterValue = getRecord(after)?.[key];
          const hadBefore = Object.prototype.hasOwnProperty.call(before, key);
          const hadAfter = Object.prototype.hasOwnProperty.call(after, key);
          const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
          const rowClass =
            hadBefore && !hadAfter
              ? 'bg-red-50'
              : !hadBefore && hadAfter
                ? 'bg-green-50'
                : changed
                  ? 'bg-yellow-50'
                  : '';
          return (
            <div key={key} className={`grid grid-cols-3 gap-0 text-sm ${rowClass}`}>
              <div className="px-3 py-2 font-medium text-gray-700">{FIELD_LABELS[key] ?? key}</div>
              <div className="px-3 py-2 text-gray-600">
                <pre className="whitespace-pre-wrap text-xs">{formatValue(beforeValue)}</pre>
              </div>
              <div className="px-3 py-2 text-gray-600">
                <pre className="whitespace-pre-wrap text-xs">{formatValue(afterValue)}</pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
