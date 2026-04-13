'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import {
  type ActorType,
  type AuditAction,
  type AuditEvent,
  type AuditEventFilter,
  type EntityType,
  type Severity,
  fetchAuditEvents,
  rollbackEvent,
} from '@/lib/api/audit';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuditEventDrawer } from './components/AuditEventDrawer';
import { AuditEventTable } from './components/AuditEventTable';
import { assertRollbackSucceeded } from './utils/rollback-result';

const ENTITY_TYPES = [
  'transaction',
  'statement',
  'receipt',
  'category',
  'rule',
  'workspace',
  'integration',
  'table_row',
  'table_cell',
  'branch',
  'wallet',
  'custom_table',
  'custom_table_column',
] as const;

const ACTOR_TYPES = ['user', 'system', 'integration'] as const;
const ACTIONS = [
  'create',
  'update',
  'delete',
  'import',
  'link',
  'unlink',
  'match',
  'unmatch',
  'apply_rule',
  'rollback',
  'export',
] as const;
const SEVERITIES = ['info', 'warn', 'critical'] as const;

const isEntityType = (value: string): value is EntityType =>
  (ENTITY_TYPES as readonly string[]).includes(value);

const isActorType = (value: string): value is ActorType =>
  (ACTOR_TYPES as readonly string[]).includes(value);

const isAuditAction = (value: string): value is AuditAction =>
  (ACTIONS as readonly string[]).includes(value);

const isSeverity = (value: string): value is Severity =>
  (SEVERITIES as readonly string[]).includes(value);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    return err.response?.data?.message || err.message || fallback;
  }

  return fallback;
};

const selectStyle: React.CSSProperties = {
  marginTop: 4,
  width: '100%',
  border: '1px solid #e5e7eb',
  padding: '8px 12px',
  fontSize: 14,
  borderRadius: 0,
  outline: 'none',
  background: '#fff',
};

const inputStyle: React.CSSProperties = {
  marginTop: 4,
  width: '100%',
  border: '1px solid #e5e7eb',
  padding: '8px 12px',
  fontSize: 14,
  borderRadius: 0,
  outline: 'none',
  background: '#fff',
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditEventFilter>({});
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<AuditEvent | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      ...filters,
      page,
      limit,
    }),
    [filters, page, limit],
  );

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuditEvents(params);
      setEvents(response.data || []);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load audit events'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [params]);

  const onSelectEvent = (event: AuditEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const handleRollback = (event: AuditEvent) => {
    setRollbackTarget(event);
    setRollbackError(null);
  };

  const confirmRollback = async () => {
    if (!rollbackTarget) return;
    setRollbackLoading(true);
    setRollbackError(null);
    try {
      const result = await rollbackEvent(rollbackTarget.id);
      assertRollbackSucceeded(result);
      toast.success('Rollback successful');
      setRollbackTarget(null);
      setDrawerOpen(false);
      loadEvents();
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Rollback failed');
      setRollbackError(message);
    } finally {
      setRollbackLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', px: 3, py: 4 }}>
      <Box sx={{ mx: 'auto', maxWidth: 1280 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" fontWeight={700} style={{ color: '#111827' }}>
                Audit Log
              </Typography>
              <Typography variant="body2" style={{ color: '#4b5563' }}>
                Track workspace activity and rollbacks.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' },
              gap: 3,
            }}
          >
            <Box sx={{ border: '1px solid #e5e7eb', bgcolor: '#fff', p: 2 }}>
              <Typography variant="body2" fontWeight={600} style={{ color: '#374151' }}>
                Filters
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2, fontSize: 14 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Entity Type</span>
                  <select
                    style={selectStyle}
                    value={filters.entityType || ''}
                    onChange={e => {
                      const rawValue = e.target.value;
                      const entityType = rawValue && isEntityType(rawValue) ? rawValue : undefined;
                      setFilters(prev => ({ ...prev, entityType }));
                      setPage(1);
                    }}
                  >
                    <option value="">All</option>
                    {ENTITY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Actor Type</span>
                  <select
                    style={selectStyle}
                    value={filters.actorType || ''}
                    onChange={e => {
                      const rawValue = e.target.value;
                      const actorType = rawValue && isActorType(rawValue) ? rawValue : undefined;
                      setFilters(prev => ({ ...prev, actorType }));
                      setPage(1);
                    }}
                  >
                    <option value="">All</option>
                    {ACTOR_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>User</span>
                  <input
                    style={inputStyle}
                    value={filters.actorLabel || ''}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, actorLabel: e.target.value || undefined }));
                      setPage(1);
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Action</span>
                  <select
                    style={selectStyle}
                    value={filters.action || ''}
                    onChange={e => {
                      const rawValue = e.target.value;
                      const action = rawValue && isAuditAction(rawValue) ? rawValue : undefined;
                      setFilters(prev => ({ ...prev, action }));
                      setPage(1);
                    }}
                  >
                    <option value="">All</option>
                    {ACTIONS.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Severity</span>
                  <select
                    style={selectStyle}
                    value={filters.severity || ''}
                    onChange={e => {
                      const rawValue = e.target.value;
                      const severity = rawValue && isSeverity(rawValue) ? rawValue : undefined;
                      setFilters(prev => ({ ...prev, severity }));
                      setPage(1);
                    }}
                  >
                    <option value="">All</option>
                    {SEVERITIES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Entity ID</span>
                  <input
                    style={inputStyle}
                    value={filters.entityId || ''}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, entityId: e.target.value || undefined }));
                      setPage(1);
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Date From</span>
                  <input
                    type="date"
                    style={inputStyle}
                    value={filters.dateFrom || ''}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }));
                      setPage(1);
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Date To</span>
                  <input
                    type="date"
                    style={inputStyle}
                    value={filters.dateTo || ''}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }));
                      setPage(1);
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Batch ID</span>
                  <input
                    style={inputStyle}
                    value={filters.batchId || ''}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, batchId: e.target.value || undefined }));
                      setPage(1);
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Limit</span>
                  <select
                    style={selectStyle}
                    value={limit}
                    onChange={e => setLimit(Number(e.target.value))}
                  >
                    {[25, 50, 100, 200].map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </Stack>
            </Box>

            <Stack spacing={2}>
              {error && <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>}
              {loading ? (
                <Box sx={{ border: '1px solid #e5e7eb', bgcolor: '#fff', p: 3 }}>
                  <Typography variant="body2" style={{ color: '#6b7280' }}>
                    Loading audit events...
                  </Typography>
                </Box>
              ) : (
                <AuditEventTable
                  events={events}
                  onSelect={onSelectEvent}
                  page={page}
                  limit={limit}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>

      <AuditEventDrawer
        event={selectedEvent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRollback={handleRollback}
      />

      <ConfirmModal
        isOpen={Boolean(rollbackTarget)}
        onClose={() => setRollbackTarget(null)}
        onConfirm={confirmRollback}
        title="Confirm rollback"
        message={
          rollbackTarget && (
            <Stack spacing={1.5}>
              <Typography variant="body2" style={{ color: '#4b5563' }}>
                This will attempt to rollback:{' '}
                {rollbackTarget.description ||
                  `${rollbackTarget.entityType} ${rollbackTarget.entityId}`}
                .
              </Typography>
              {rollbackTarget.diff && (
                <Alert severity="warning" sx={{ borderRadius: 0, fontSize: 12 }}>
                  Rollback is based on stored diff data. Review changes before continuing.
                </Alert>
              )}
              {rollbackError && (
                <Typography variant="body2" style={{ color: '#dc2626' }}>
                  {rollbackError}
                </Typography>
              )}
            </Stack>
          )
        }
        confirmText={rollbackLoading ? 'Rolling back...' : 'Rollback'}
        cancelText="Cancel"
        isDestructive
        isLoading={rollbackLoading}
        manualClose
      />
    </Box>
  );
}
