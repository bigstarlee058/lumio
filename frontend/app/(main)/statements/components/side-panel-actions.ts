/**
 * Action handlers for StatementsSidePanel.
 */
import apiClient from '@/app/lib/api';
import {
  type GmailSyncSkeletonMeta,
  STATEMENTS_GMAIL_SYNC_EVENT,
  STATEMENTS_GMAIL_SYNC_STORAGE_KEY,
  type CloudImportProvider,
} from '@/app/lib/statement-upload-actions';
import toast from 'react-hot-toast';

const CLOUD_IMPORT_ENDPOINTS: Record<string, string> = {
  dropbox: '/integrations/dropbox/sync',
  'google-drive': '/integrations/google-drive/sync',
};

const CLOUD_IMPORT_LABELS: Record<string, { success: string; error: string }> = {
  dropbox: { success: 'Dropbox import started', error: 'Failed to import from Dropbox' },
  'google-drive': { success: 'Google Drive import started', error: 'Failed to import from Google Drive' },
};

export const executeCloudImport = async (
  provider: CloudImportProvider,
  navigateToSubmit: () => void,
): Promise<void> => {
  const endpoint = CLOUD_IMPORT_ENDPOINTS[provider] ?? '';
  const labels = CLOUD_IMPORT_LABELS[provider] ?? { success: 'Import started', error: 'Import failed' };
  try {
    await apiClient.post(endpoint);
    toast.success(labels.success);
    navigateToSubmit();
  } catch {
    toast.error(labels.error);
  }
};

export type GmailSyncResponse = { data?: { messagesFound?: unknown; jobsCreated?: unknown; skipped?: unknown } };

type GmailSyncCounts = { messagesFound: number; jobsCreated: number; skipped: number };

type GmailSyncData = NonNullable<GmailSyncResponse['data']>;

const extractGmailCounts = (data: GmailSyncResponse['data']): GmailSyncCounts => {
  const d: GmailSyncData = data ?? {};
  return {
    messagesFound: Number(d.messagesFound ?? 0),
    jobsCreated: Number(d.jobsCreated ?? 0),
    skipped: Number(d.skipped ?? 0),
  };
};

const handleGmailJobsCreated = (jobsCreated: number, navigateToSubmit: () => void): void => {
  if (typeof window === 'undefined') return;
  const payload: GmailSyncSkeletonMeta = { count: jobsCreated, timestamp: Date.now() };
  sessionStorage.setItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(STATEMENTS_GMAIL_SYNC_EVENT, { detail: payload }));
  toast.success(`Gmail sync started (${jobsCreated} receipts)`);
  navigateToSubmit();
};

export const handleGmailSyncResponse = (response: GmailSyncResponse, navigateToSubmit: () => void): void => {
  const { messagesFound, jobsCreated, skipped } = extractGmailCounts(response.data);
  if (jobsCreated > 0) { handleGmailJobsCreated(jobsCreated, navigateToSubmit); return; }
  if (messagesFound === 0) { toast.error('No matching emails found in Gmail'); return; }
  if (skipped >= messagesFound) { toast.error('All receipts available in Gmail are already synced'); return; }
  toast.error('Gmail sync finished with no new receipts');
  navigateToSubmit();
};
