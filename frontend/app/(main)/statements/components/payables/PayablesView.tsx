'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { Button } from '@/app/components/ui/button';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import {
  type CreatePayableInput,
  type Payable,
  type PayablesExportFormat,
  type PayablesSummary,
  type UpdatePayableInput,
  payablesApi,
} from '@/app/lib/payables-api';
import { Download, Plus, RefreshCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CreatePayableDrawer } from './CreatePayableDrawer';
import PayableFiltersBar from './PayableFiltersBar';
import PayableSummaryCards from './PayableSummaryCards';
import PayablesList from './PayablesList';
import {
  DEFAULT_PAYABLES_FILTERS,
  type PayablesFiltersState,
  buildPayablesListParams,
} from './payables-utils';

const DEFAULT_SUMMARY: PayablesSummary = {
  toPay: 0,
  overdue: 0,
  dueThisWeek: 0,
  paidThisMonth: 0,
  toPayCount: 0,
  overdueCount: 0,
};

const PAGE_SIZE = 20;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;

  const candidate = error as {
    response?: { data?: { message?: string | string[]; error?: { message?: string } | string } };
    message?: string;
  };

  const message = candidate.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof candidate.response?.data?.error === 'string' && candidate.response.data.error.trim()) {
    return candidate.response.data.error;
  }
  if (
    candidate.response?.data?.error &&
    typeof candidate.response.data.error === 'object' &&
    typeof candidate.response.data.error.message === 'string'
  ) {
    return candidate.response.data.error.message;
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  return fallback;
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export function PayablesView() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { locale } = useLocale();
  const t = useIntlayer('statementsPage');
  const [summary, setSummary] = useState<PayablesSummary>(DEFAULT_SUMMARY);
  const [items, setItems] = useState<Payable[]>([]);
  const [filters, setFilters] = useState<PayablesFiltersState>(DEFAULT_PAYABLES_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [saving, setSaving] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<PayablesExportFormat | null>(null);
  const [queryPage, setQueryPage] = useState(1);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const status = searchParams?.get('status');
    const source = searchParams?.get('source');

    const nextFilters = {
      ...DEFAULT_PAYABLES_FILTERS,
      status:
        status === 'to_pay' ||
        status === 'scheduled' ||
        status === 'paid' ||
        status === 'overdue' ||
        status === 'archived'
          ? status
          : DEFAULT_PAYABLES_FILTERS.status,
      source:
        source === 'manual' || source === 'invoice' || source === 'statement'
          ? source
          : DEFAULT_PAYABLES_FILTERS.source,
    } satisfies PayablesFiltersState;

    setFilters(current => {
      if (
        current.search === nextFilters.search &&
        current.status === nextFilters.status &&
        current.source === nextFilters.source &&
        current.dueDateFrom === nextFilters.dueDateFrom &&
        current.dueDateTo === nextFilters.dueDateTo &&
        current.sort === nextFilters.sort
      ) {
        return current;
      }

      return nextFilters;
    });
    setPage(1);
    setQueryPage(1);
  }, [searchParams]);

  const payablesAny = (t as any)?.payables ?? {};

  const labels = useMemo(
    () => ({
      title: payablesAny.title?.value ?? 'Payables',
      subtitle:
        payablesAny.subtitle?.value ??
        'Track upcoming payments, overdue bills, and paid expenses in one queue.',
      add: payablesAny.add?.value ?? 'Add payable',
      refresh: payablesAny.refresh?.value ?? 'Refresh',
      export: payablesAny.export?.value ?? 'Export',
      exportCsv: payablesAny.exportCsv?.value ?? 'Export CSV',
      exportXlsx: payablesAny.exportXlsx?.value ?? 'Export XLSX',
      searchPlaceholder: payablesAny.searchPlaceholder?.value ?? 'Search vendor or comment',
      summary: {
        toPay: payablesAny.summary?.toPay?.value ?? 'To Pay',
        overdue: payablesAny.summary?.overdue?.value ?? 'Overdue',
        dueThisWeek: payablesAny.summary?.dueThisWeek?.value ?? 'Due This Week',
        paidThisMonth: payablesAny.summary?.paidThisMonth?.value ?? 'Paid This Month',
        itemsSuffix: payablesAny.summary?.itemsSuffix?.value ?? 'items',
      },
      filters: {
        status: payablesAny.filters?.status?.value ?? 'Status',
        source: payablesAny.filters?.source?.value ?? 'Source',
        dueFrom: payablesAny.filters?.dueFrom?.value ?? 'Due from',
        dueTo: payablesAny.filters?.dueTo?.value ?? 'Due to',
        sort: payablesAny.filters?.sort?.value ?? 'Sort',
        reset: payablesAny.filters?.reset?.value ?? 'Reset',
        allStatuses: payablesAny.filters?.allStatuses?.value ?? 'All statuses',
        allSources: payablesAny.filters?.allSources?.value ?? 'All sources',
        statusOptions: {
          to_pay: payablesAny.status?.toPay?.value ?? 'To pay',
          scheduled: payablesAny.status?.scheduled?.value ?? 'Scheduled',
          paid: payablesAny.status?.paid?.value ?? 'Paid',
          overdue: payablesAny.status?.overdue?.value ?? 'Overdue',
          archived: payablesAny.status?.archived?.value ?? 'Archived',
        },
        sourceOptions: {
          manual: payablesAny.sources?.manual?.value ?? 'Manual',
          invoice: payablesAny.sources?.invoice?.value ?? 'Invoice',
          statement: payablesAny.sources?.statement?.value ?? 'Statement',
        },
        sortOptions: {
          dueDateAsc: payablesAny.sort?.dueDateAsc?.value ?? 'Due date (earliest)',
          dueDateDesc: payablesAny.sort?.dueDateDesc?.value ?? 'Due date (latest)',
          amountDesc: payablesAny.sort?.amountDesc?.value ?? 'Amount (highest)',
          vendorAsc: payablesAny.sort?.vendorAsc?.value ?? 'Vendor (A-Z)',
        },
      },
      list: {
        vendor: payablesAny.list?.vendor?.value ?? 'Vendor',
        dueDate: payablesAny.list?.dueDate?.value ?? 'Due date',
        amount: payablesAny.list?.amount?.value ?? 'Amount',
        source: payablesAny.list?.source?.value ?? 'Source',
        status: payablesAny.list?.status?.value ?? 'Status',
        actions: payablesAny.list?.actions?.value ?? 'Actions',
        markPaid: payablesAny.actions?.markPaid?.value ?? 'Mark paid',
        edit: payablesAny.actions?.edit?.value ?? 'Edit',
        archive: payablesAny.actions?.archive?.value ?? 'Archive',
        delete: payablesAny.actions?.delete?.value ?? 'Delete',
        pageShown: (t as any)?.pagination?.shown?.value ?? 'Showing {from}–{to} of {count}',
        previous: (t as any)?.pagination?.previous?.value ?? 'Previous',
        next: (t as any)?.pagination?.next?.value ?? 'Next',
        pageOf: (t as any)?.pagination?.pageOf?.value ?? 'Page {page} of {count}',
        statusLabels: {
          to_pay: payablesAny.status?.toPay?.value ?? 'To pay',
          scheduled: payablesAny.status?.scheduled?.value ?? 'Scheduled',
          paid: payablesAny.status?.paid?.value ?? 'Paid',
          overdue: payablesAny.status?.overdue?.value ?? 'Overdue',
          archived: payablesAny.status?.archived?.value ?? 'Archived',
        },
        sourceLabels: {
          manual: payablesAny.sources?.manual?.value ?? 'Manual',
          invoice: payablesAny.sources?.invoice?.value ?? 'Invoice',
          statement: payablesAny.sources?.statement?.value ?? 'Statement',
        },
      },
      drawer: {
        createTitle: payablesAny.drawer?.createTitle?.value ?? 'Create payable',
        editTitle: payablesAny.drawer?.editTitle?.value ?? 'Edit payable',
        vendor: payablesAny.drawer?.vendor?.value ?? 'Vendor',
        amount: payablesAny.drawer?.amount?.value ?? 'Amount',
        currency: payablesAny.drawer?.currency?.value ?? 'Currency',
        dueDate: payablesAny.drawer?.dueDate?.value ?? 'Due date',
        source: payablesAny.drawer?.source?.value ?? 'Source',
        status: payablesAny.drawer?.status?.value ?? 'Status',
        comment: payablesAny.drawer?.comment?.value ?? 'Comment',
        save: payablesAny.drawer?.save?.value ?? 'Save',
        saving: payablesAny.drawer?.saving?.value ?? 'Saving...',
        cancel: payablesAny.drawer?.cancel?.value ?? 'Cancel',
        sourceOptions: {
          manual: payablesAny.sources?.manual?.value ?? 'Manual',
          invoice: payablesAny.sources?.invoice?.value ?? 'Invoice',
          statement: payablesAny.sources?.statement?.value ?? 'Statement',
        },
        statusOptions: {
          to_pay: payablesAny.status?.toPay?.value ?? 'To pay',
          scheduled: payablesAny.status?.scheduled?.value ?? 'Scheduled',
          paid: payablesAny.status?.paid?.value ?? 'Paid',
          overdue: payablesAny.status?.overdue?.value ?? 'Overdue',
          archived: payablesAny.status?.archived?.value ?? 'Archived',
        },
      },
      emptyTitle: payablesAny.empty?.title?.value ?? 'No payables found',
      emptyDescription:
        payablesAny.empty?.description?.value ??
        'Try changing filters or create your first payable.',
      authLoading: payablesAny.auth?.loading?.value ?? 'Loading...',
      loginRequired: payablesAny.auth?.loginRequired?.value ?? 'Please sign in to view payables.',
      noWorkspace:
        payablesAny.auth?.workspaceRequired?.value ?? 'Select a workspace to view payables.',
      toasts: {
        loadFailed: payablesAny.toasts?.loadFailed?.value ?? 'Failed to load payables',
        createSuccess: payablesAny.toasts?.createSuccess?.value ?? 'Payable created',
        createFailed: payablesAny.toasts?.createFailed?.value ?? 'Failed to create payable',
        updateSuccess: payablesAny.toasts?.updateSuccess?.value ?? 'Payable updated',
        updateFailed: payablesAny.toasts?.updateFailed?.value ?? 'Failed to update payable',
        markPaidSuccess: payablesAny.toasts?.markPaidSuccess?.value ?? 'Marked as paid',
        markPaidFailed:
          payablesAny.toasts?.markPaidFailed?.value ?? 'Failed to mark payable as paid',
        archiveSuccess: payablesAny.toasts?.archiveSuccess?.value ?? 'Payable archived',
        archiveFailed: payablesAny.toasts?.archiveFailed?.value ?? 'Failed to archive payable',
        deleteSuccess: payablesAny.toasts?.deleteSuccess?.value ?? 'Payable deleted',
        deleteFailed: payablesAny.toasts?.deleteFailed?.value ?? 'Failed to delete payable',
        deleteConfirm: payablesAny.toasts?.deleteConfirm?.value ?? 'Delete {vendor}?',
        exportSuccess: payablesAny.toasts?.exportSuccess?.value ?? 'Export started',
        exportFailed: payablesAny.toasts?.exportFailed?.value ?? 'Failed to export payables',
      },
    }),
    [payablesAny, t],
  );

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user || !currentWorkspace) {
        setLoading(false);
        return;
      }

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const requestVersion = ++requestVersionRef.current;

      try {
        const [summaryResponse, listResponse] = await Promise.all([
          payablesApi.getSummary(),
          payablesApi.list(buildPayablesListParams(filters, { page: queryPage, limit: PAGE_SIZE })),
        ]);

        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const nextTotalPages = Math.max(1, listResponse.totalPages || 1);

        if (listResponse.total > 0 && queryPage > nextTotalPages) {
          setPage(nextTotalPages);
          setQueryPage(nextTotalPages);
          return;
        }

        setSummary(summaryResponse);
        setItems(listResponse.data);
        setTotal(listResponse.total);
        setTotalPages(nextTotalPages);
        setPage(Math.min(queryPage, nextTotalPages));
      } catch (error) {
        if (requestVersion !== requestVersionRef.current) {
          return;
        }
        toast.error(getErrorMessage(error, labels.toasts.loadFailed));
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentWorkspace, filters, labels.toasts.loadFailed, queryPage, user],
  );

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    void loadData();
  }, [authLoading, workspaceLoading, loadData]);

  const handleFiltersChange = useCallback((next: PayablesFiltersState) => {
    setFilters(next);
    setPage(1);
    setQueryPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    setQueryPage(nextPage);
  }, []);

  const openCreateDrawer = () => {
    setEditingPayable(null);
    setDrawerOpen(true);
  };

  const handleEdit = async (payable: Payable) => {
    try {
      const fresh = await payablesApi.getOne(payable.id);
      setEditingPayable(fresh);
      setDrawerOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.loadFailed));
    }
  };

  const handleSave = async (payload: CreatePayableInput | UpdatePayableInput) => {
    setSaving(true);
    try {
      if (editingPayable) {
        await payablesApi.update(editingPayable.id, payload as UpdatePayableInput);
        toast.success(labels.toasts.updateSuccess);
      } else {
        await payablesApi.create(payload as CreatePayableInput);
        toast.success(labels.toasts.createSuccess);
      }

      setDrawerOpen(false);
      setEditingPayable(null);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingPayable ? labels.toasts.updateFailed : labels.toasts.createFailed,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (payable: Payable) => {
    setMarkingPaidId(payable.id);
    try {
      await payablesApi.markAsPaid(payable.id);
      toast.success(labels.toasts.markPaidSuccess);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.markPaidFailed));
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleArchive = async (payable: Payable) => {
    setArchivingId(payable.id);
    try {
      await payablesApi.archive(payable.id);
      toast.success(labels.toasts.archiveSuccess);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.archiveFailed));
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (payable: Payable) => {
    const confirmMessage = labels.toasts.deleteConfirm.replace('{vendor}', payable.vendor);
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(payable.id);
    try {
      await payablesApi.delete(payable.id);
      toast.success(labels.toasts.deleteSuccess);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.deleteFailed));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async (format: PayablesExportFormat) => {
    setExporting(format);
    try {
      const result = await payablesApi.exportList({
        ...buildPayablesListParams(filters),
        format,
      });
      triggerBlobDownload(
        result.blob,
        result.fileName || `payables.${format === 'csv' ? 'csv' : 'xlsx'}`,
      );
      toast.success(labels.toasts.exportSuccess);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.toasts.exportFailed));
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || workspaceLoading || loading) {
    return (
      <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <Spinner size={80} className="text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-shared px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {labels.loginRequired}
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="container-shared px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {labels.noWorkspace}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{labels.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void loadData({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCcw className="h-4 w-4" />
              {labels.refresh}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExport('csv')}
              disabled={exporting !== null}
            >
              <Download className="h-4 w-4" />
              {labels.exportCsv}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExport('excel')}
              disabled={exporting !== null}
            >
              <Download className="h-4 w-4" />
              {labels.exportXlsx}
            </Button>
            <Button onClick={openCreateDrawer}>
              <Plus className="h-4 w-4" />
              {labels.add}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
          <PayableSummaryCards
            summary={summary}
            locale={locale}
            currency={(currentWorkspace.currency || 'KZT').toUpperCase()}
            labels={labels.summary}
          />

          <PayableFiltersBar
            value={filters}
            onChange={handleFiltersChange}
            onReset={() => handleFiltersChange(DEFAULT_PAYABLES_FILTERS)}
            labels={{
              searchPlaceholder: labels.searchPlaceholder,
              ...labels.filters,
            }}
          />

          <PayablesList
            items={items}
            locale={locale}
            emptyTitle={labels.emptyTitle}
            emptyDescription={labels.emptyDescription}
            labels={labels.list}
            pagination={{
              page,
              totalPages,
              totalItems: total,
              pageSize: PAGE_SIZE,
              onPageChange: handlePageChange,
            }}
            actionState={{ markingPaidId, archivingId, deletingId }}
            onEdit={handleEdit}
            onMarkPaid={handleMarkPaid}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <CreatePayableDrawer
        open={drawerOpen}
        payable={editingPayable}
        saving={saving}
        onClose={() => {
          setDrawerOpen(false);
          setEditingPayable(null);
        }}
        onSubmit={handleSave}
        labels={labels.drawer}
      />
    </>
  );
}
