'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import type { AuditEvent, AuditEventFilter } from '@/lib/api/audit';
import { fetchAuditEvents } from '@/lib/api/audit';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AuditEventDrawer } from '../audit/components/AuditEventDrawer';
import { AuditEventTable } from '../audit/components/AuditEventTable';
import apiClient from '../lib/api';

interface Statement {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  bankName: string;
  totalTransactions: number;
  createdAt: string;
  processedAt: string | null;
  errorMessage: string | null;
}

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

export default function AdminPage() {
  const t = useIntlayer('adminPage');
  const { locale } = useLocale();
  const [tab, setTab] = useState(0);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(50);
  const [auditFilters, setAuditFilters] = useState<AuditEventFilter>({});
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEvent | null>(null);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [statementsError, setStatementsError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const auditParams = useMemo(
    () => ({
      ...auditFilters,
      page: auditPage,
      limit: auditLimit,
    }),
    [auditFilters, auditPage, auditLimit],
  );

  useEffect(() => {
    if (tab === 0) {
      loadStatements();
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 2) {
      loadAuditLogs();
    }
  }, [tab, auditParams]);

  const loadStatements = async () => {
    setStatementsLoading(true);
    setStatementsError(null);
    try {
      const response = await apiClient.get<{ data: Statement[] }>('/statements?limit=100');
      setStatements(response.data.data || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setStatementsError(error.response?.data?.message || t.errors.loadStatements.value);
    } finally {
      setStatementsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await fetchAuditEvents(auditParams);
      setAuditLogs(response.data || []);
      setAuditTotal(response.total || 0);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setAuditError(error.response?.data?.message || t.errors.loadAudit.value);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleReprocess = async (statementId: string) => {
    try {
      await apiClient.post(`/statements/${statementId}/reprocess`);
      loadStatements();
    } catch {
      setStatementsError(t.errors.reprocess.value);
    }
  };

  const handleDelete = async (statementId: string) => {
    if (!confirm(t.confirmDelete.value)) {
      return;
    }
    try {
      await apiClient.delete(`/statements/${statementId}`);
      loadStatements();
    } catch {
      setStatementsError(t.errors.delete.value);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t.status.completed.value;
      case 'processing':
        return t.status.processing.value;
      case 'error':
        return t.status.error.value;
      default:
        return status;
    }
  };

  const filteredStatements = statements.filter(
    s =>
      s.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bankName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t.title}
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} data-tour-id="admin-tabs">
          <Tab label={t.tabs.statementsLog.value} />
          <Tab label={t.tabs.users.value} />
          <Tab label={t.tabs.audit.value} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {statementsError && tab === 0 && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: 'error.light',
                color: 'error.contrastText',
              }}
            >
              {statementsError}
            </Box>
          )}

          {tab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <TextField
                  label={t.search.value}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  inputProps={{ 'data-tour-id': 'admin-statements-search' }}
                  sx={{ flexGrow: 1 }}
                />
                <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={loadStatements}>
                  {t.refresh}
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t.table.file}</TableCell>
                      <TableCell>{t.table.type}</TableCell>
                      <TableCell>{t.table.bank}</TableCell>
                      <TableCell>{t.table.status}</TableCell>
                      <TableCell>{t.table.transactions}</TableCell>
                      <TableCell>{t.table.uploadedAt}</TableCell>
                      <TableCell>{t.table.processedAt}</TableCell>
                      <TableCell>{t.table.actions}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStatements.map(statement => (
                      <TableRow key={statement.id}>
                        <TableCell>{statement.fileName}</TableCell>
                        <TableCell>{statement.fileType.toUpperCase()}</TableCell>
                        <TableCell>{statement.bankName}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(statement.status)}
                            color={
                              getStatusColor(statement.status) as
                                | 'success'
                                | 'info'
                                | 'error'
                                | 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{statement.totalTransactions || 0}</TableCell>
                        <TableCell>
                          {new Date(statement.createdAt).toLocaleDateString(locale)}
                        </TableCell>
                        <TableCell>
                          {statement.processedAt
                            ? new Date(statement.processedAt).toLocaleDateString(locale)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedStatement(statement);
                              setDialogOpen(true);
                            }}
                            disabled={!statement.errorMessage}
                          >
                            <AlertCircle size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleReprocess(statement.id)}
                            disabled={statement.status === 'processing' || statementsLoading}
                          >
                            <RefreshCw size={18} />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(statement.id)}>
                            <Trash2 size={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t.usersTab.hint}
              </Typography>
              <Button
                variant="contained"
                component={Link}
                href="/admin/users"
                data-tour-id="admin-users-link"
              >
                {t.usersTab.button}
              </Button>
            </Box>
          )}

          {tab === 2 && (
            <Box className="lumio-audit-panel">
              <Box className="lumio-audit-panel__header">
                <Typography variant="h6" component="h2">
                  {t.auditTab.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.auditTab.helper}
                </Typography>
              </Box>

              <Box className="lumio-audit-panel__layout">
                <Paper
                  variant="outlined"
                  className="lumio-audit-panel__filters"
                  data-tour-id="admin-audit-filters"
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {t.auditTab.filters.title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                      select
                      label={t.auditTab.filters.entityType}
                      size="small"
                      value={auditFilters.entityType || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          entityType: (event.target.value ||
                            undefined) as AuditEventFilter['entityType'],
                        }));
                        setAuditPage(1);
                      }}
                      SelectProps={{ native: true }}
                    >
                      <option value="">{t.auditTab.filters.all}</option>
                      {ENTITY_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </TextField>

                    <TextField
                      label={t.auditTab.filters.user}
                      size="small"
                      value={auditFilters.actorLabel || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          actorLabel: event.target.value || undefined,
                        }));
                        setAuditPage(1);
                      }}
                    />

                    <TextField
                      select
                      label={t.auditTab.filters.action}
                      size="small"
                      value={auditFilters.action || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          action: (event.target.value ||
                            undefined) as AuditEventFilter['action'],
                        }));
                        setAuditPage(1);
                      }}
                      SelectProps={{ native: true }}
                    >
                      <option value="">{t.auditTab.filters.all}</option>
                      {ACTIONS.map(action => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </TextField>

                    <TextField
                      label={t.auditTab.filters.entityId}
                      size="small"
                      value={auditFilters.entityId || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          entityId: event.target.value || undefined,
                        }));
                        setAuditPage(1);
                      }}
                    />

                    <TextField
                      select
                      label={t.auditTab.filters.severity}
                      size="small"
                      value={auditFilters.severity || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          severity: (event.target.value ||
                            undefined) as AuditEventFilter['severity'],
                        }));
                        setAuditPage(1);
                      }}
                      SelectProps={{ native: true }}
                    >
                      <option value="">{t.auditTab.filters.all}</option>
                      {SEVERITIES.map(severity => (
                        <option key={severity} value={severity}>
                          {severity}
                        </option>
                      ))}
                    </TextField>

                    <TextField
                      label={t.auditTab.filters.dateFrom}
                      type="date"
                      size="small"
                      value={auditFilters.dateFrom || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          dateFrom: event.target.value || undefined,
                        }));
                        setAuditPage(1);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                      label={t.auditTab.filters.dateTo}
                      type="date"
                      size="small"
                      value={auditFilters.dateTo || ''}
                      onChange={event => {
                        setAuditFilters(prev => ({
                          ...prev,
                          dateTo: event.target.value || undefined,
                        }));
                        setAuditPage(1);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Paper>

                <Box className="lumio-audit-panel__results">
                  {auditError && (
                    <Box
                      sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: 'error.light',
                        color: 'error.contrastText',
                      }}
                    >
                      {auditError}
                    </Box>
                  )}
                  {auditLoading ? (
                    <Paper variant="outlined" sx={{ p: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t.auditTab.loading}
                      </Typography>
                    </Paper>
                  ) : auditLogs.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t.auditTab.empty}
                      </Typography>
                    </Paper>
                  ) : (
                    <AuditEventTable
                      events={auditLogs}
                      onSelect={event => {
                        setSelectedAuditEvent(event);
                        setAuditDrawerOpen(true);
                      }}
                      page={auditPage}
                      limit={auditLimit}
                      total={auditTotal}
                      onPageChange={setAuditPage}
                    />
                  )}
                </Box>
              </Box>

              <AuditEventDrawer
                event={selectedAuditEvent}
                open={auditDrawerOpen}
                onClose={() => setAuditDrawerOpen(false)}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t.errorDialog.title}</DialogTitle>
        <DialogContent>
          {selectedStatement?.errorMessage && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {selectedStatement.errorMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t.errorDialog.close}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
