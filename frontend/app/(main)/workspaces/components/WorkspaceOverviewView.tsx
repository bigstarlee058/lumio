'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import apiClient from '@/app/lib/api';
import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ImageIcon,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AVAILABLE_BACKGROUNDS } from '../constants';
import { BackgroundSelector } from './BackgroundSelector';

const DEFAULT_RECENT_CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'] as const;

const resolveBackgroundSrc = (backgroundImage: string | null) => {
  if (!backgroundImage) {
    return null;
  }

  if (
    backgroundImage.startsWith('http://') ||
    backgroundImage.startsWith('https://') ||
    backgroundImage.startsWith('/')
  ) {
    return backgroundImage;
  }

  return `/workspace-backgrounds/${backgroundImage}`;
};

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

export default function WorkspaceOverviewView() {
  const router = useRouter();
  const { currentWorkspace, refreshWorkspaces, clearWorkspace, updateWorkspaceBackground } =
    useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [currencyDrawerOpen, setCurrencyDrawerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);

  useEffect(() => {
    if (!currentWorkspace) return;
    setName(currentWorkspace.name ?? '');
    setDescription(currentWorkspace.description ?? '');
    setCurrency(currentWorkspace.currency ?? '');
  }, [currentWorkspace]);

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);

  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item])),
    [currencyItems],
  );

  const selectedCurrencyItem = currency ? currencyByCode.get(currency) : null;
  const currencyQuery = currencySearch.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) return false;
    if (!currencyQuery) return true;
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== currency),
    [recentCurrencies, currencyByCode, currency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== currency);
  }, [currencyItems, currencyQuery, currency]);

  const notSelectedLabel = 'Not selected';
  const notSelectedMatchesSearch =
    currencyQuery.length === 0 || notSelectedLabel.toLowerCase().includes(currencyQuery);

  const isDirty =
    Boolean(currentWorkspace) &&
    (name !== (currentWorkspace?.name ?? '') ||
      description !== (currentWorkspace?.description ?? '') ||
      currency !== (currentWorkspace?.currency ?? ''));

  const isDeleteConfirmationMatched =
    deleteConfirmationName.trim() === (currentWorkspace?.name ?? '');

  const handleSave = async () => {
    if (!currentWorkspace || !name.trim()) return;

    setSaving(true);
    try {
      await apiClient.patch(`/workspaces/${currentWorkspace.id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        currency: currency || undefined,
      });
      await refreshWorkspaces();
      toast.success('Workspace updated');
    } catch (error) {
      console.error('Failed to update workspace:', error);
      toast.error('Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;
    if (!isDeleteConfirmationMatched) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/workspaces/${currentWorkspace.id}`);
      clearWorkspace();
      await refreshWorkspaces();
      toast.success('Workspace deleted');
      setDeleteModalOpen(false);
      setDeleteConfirmationName('');
      router.replace('/workspaces/list');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error('Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmationName('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteConfirmationName('');
  };

  const pushRecentCurrency = (currencyCode: string) => {
    setRecentCurrencies(prev => [currencyCode, ...prev.filter(item => item !== currencyCode)]);
  };

  const handleSelectCurrency = (currencyCode: string) => {
    setCurrency(currencyCode);
    if (currencyCode) {
      pushRecentCurrency(currencyCode);
    }
    setCurrencySearch('');
    setCurrencyDrawerOpen(false);
  };

  const handleBackgroundChange = async (background: string) => {
    if (!currentWorkspace) return;
    setSavingBackground(true);
    try {
      await updateWorkspaceBackground(currentWorkspace.id, background);
      toast.success('Background updated');
      setShowBackgroundPicker(false);
    } catch {
      toast.error('Failed to update background');
    } finally {
      setSavingBackground(false);
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="h-[calc(100vh-var(--global-nav-height,0px))] overflow-y-auto bg-background">
      <div className="container max-w-5xl px-5 py-4 space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(currentWorkspace.name) || <Building2 size={24} />}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Overview</h1>
              <p className="text-xs text-muted-foreground">
                Manage workspace profile, defaults, and billing details.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon size={15} className="text-muted-foreground" />
                Workspace background
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose a background image for your workspace card
              </p>
            </div>
            <button
              type="button"
              data-testid="workspace-background-trigger"
              onClick={() => setShowBackgroundPicker(true)}
              disabled={savingBackground}
              className="inline-flex items-center justify-center gap-1 self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Change
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="relative aspect-[2.8/1] w-full overflow-hidden rounded-lg border border-border sm:max-w-[320px]">
            {resolveBackgroundSrc(currentWorkspace.backgroundImage) ? (
              <img
                src={resolveBackgroundSrc(currentWorkspace.backgroundImage) || ''}
                alt="Current workspace background"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted px-4 text-center">
                <p className="text-xs text-muted-foreground">No background selected</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="workspace-name" className="text-sm font-medium text-foreground">
                Workspace name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="workspace-description"
                className="text-sm font-medium text-foreground"
              >
                Description
              </label>
              <textarea
                id="workspace-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={2}
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="workspace-currency-trigger"
                className="text-sm font-medium text-foreground"
              >
                Default currency
              </label>
              <button
                id="workspace-currency-trigger"
                data-testid="workspace-currency-trigger"
                type="button"
                onClick={() => setCurrencyDrawerOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <span className="truncate">{selectedCurrencyItem?.label || notSelectedLabel}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              {isDirty && (
                <span className="text-sm font-medium text-amber-600 transition-opacity dark:text-amber-500">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          {currentWorkspace.memberRole === 'owner' && (
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-3 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-sm font-medium text-red-900 dark:text-red-200">
                  Danger Zone
                </h2>
                <p className="text-xs text-red-700 dark:text-red-300/80">
                  This will permanently delete the workspace and all related data. This action
                  cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete workspace'}
              </button>
            </div>
          )}
        </div>
      </div>

      <DrawerShell
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBackgroundPicker(false)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close background drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-foreground">
              Select workspace background
            </span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            <p className="text-sm text-muted-foreground">
              Choose the image shown on your workspace card.
            </p>
            {savingBackground && <p className="text-xs text-muted-foreground">Saving...</p>}
            <BackgroundSelector
              selectedBackground={currentWorkspace.backgroundImage}
              onSelect={handleBackgroundChange}
              backgrounds={AVAILABLE_BACKGROUNDS}
            />
          </div>
        </div>
      </DrawerShell>

      <DrawerShell
        isOpen={currencyDrawerOpen}
        onClose={() => {
          setCurrencyDrawerOpen(false);
          setCurrencySearch('');
        }}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrencyDrawerOpen(false);
                setCurrencySearch('');
              }}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close currency drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-foreground">Select a currency</span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={currencySearch}
                onChange={event => setCurrencySearch(event.target.value)}
                placeholder="Search"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {!currency && notSelectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency('')}
                className="flex w-full items-center justify-between rounded-2xl bg-muted px-4 py-4 text-left"
              >
                <span className="text-base font-semibold text-foreground">{notSelectedLabel}</span>
                <Check className="h-5 w-5 text-primary" />
              </button>
            ) : null}

            {selectedCurrencyItem && selectedMatchesSearch ? (
              <button
                type="button"
                onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
                className="flex w-full items-center justify-between rounded-2xl bg-muted px-4 py-4 text-left"
              >
                <span className="text-base font-semibold text-foreground">
                  {selectedCurrencyItem.label}
                </span>
                <Check className="h-5 w-5 text-primary" />
              </button>
            ) : null}

            {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
              <div>
                <p className="px-1 text-sm text-muted-foreground">Recents</p>
                <div className="mt-2 space-y-2">
                  {recentCurrencyItems.map(item => (
                    <button
                      key={`recent-${item.code}`}
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-base font-semibold text-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="px-1 text-sm text-muted-foreground">All</p>
              <div className="mt-2 space-y-1">
                {notSelectedMatchesSearch && currency ? (
                  <button
                    type="button"
                    onClick={() => handleSelectCurrency('')}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="text-base font-semibold text-foreground">
                      {notSelectedLabel}
                    </span>
                  </button>
                ) : null}

                {allCurrencyItems.length > 0 ? (
                  allCurrencyItems.map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectCurrency(item.code)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-base font-semibold text-foreground">{item.label}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
                    No currencies found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerShell>

      <ModalShell
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        size="sm"
        closeOnBackdropClick={!deleting}
        closeOnEscape={!deleting}
        title="Delete workspace?"
        className="rounded-3xl border border-border bg-card shadow-2xl"
        contentClassName="space-y-4"
        footer={
          <ModalFooter
            onCancel={closeDeleteModal}
            onConfirm={handleDelete}
            cancelText="Cancel"
            confirmText={deleting ? 'Deleting...' : 'Delete'}
            confirmVariant="destructive"
            isConfirmLoading={deleting}
            isConfirmDisabled={!isDeleteConfirmationMatched || deleting}
          />
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            This will permanently delete the workspace and all related data. Type the
            workspace name to confirm deletion.
          </p>
          <div className="space-y-2">
            <label
              htmlFor="delete-workspace-name"
              className="text-sm font-medium text-foreground"
            >
              Workspace name
            </label>
            <input
              id="delete-workspace-name"
              type="text"
              value={deleteConfirmationName}
              onChange={event => setDeleteConfirmationName(event.target.value)}
              placeholder={currentWorkspace.name}
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
