import { DEFAULT_BACKGROUND } from '@/app/(main)/workspaces/constants';
import apiClient from '@/app/lib/api';
import { syncLocaleFromUser } from '@/app/lib/locale';
import { resolveOnboardingBootstrapLocale } from '../lib/locale-bootstrap';
import type { OnboardingData } from '../useOnboardingWizard';

const DEFAULT_CURRENCY = 'USD';

export type OnboardingIntegrationKey =
  | 'dropbox'
  | 'googleDrive'
  | 'gmail'
  | 'googleSheets'
  | 'telegram';

export type OnboardingIntegration = {
  key: OnboardingIntegrationKey;
  apiKey: 'dropbox' | 'google-drive' | 'gmail' | 'google-sheets' | 'telegram';
  iconSrc: string;
  connectMode: 'oauth' | 'page';
  path: string;
};

export const ONBOARDING_INTEGRATIONS: OnboardingIntegration[] = [
  { key: 'dropbox', apiKey: 'dropbox', iconSrc: '/icons/dropbox-icon.png', connectMode: 'oauth', path: '/integrations/dropbox' },
  { key: 'googleDrive', apiKey: 'google-drive', iconSrc: '/icons/google-drive-icon.png', connectMode: 'oauth', path: '/integrations/google-drive' },
  { key: 'gmail', apiKey: 'gmail', iconSrc: '/icons/gmail.png', connectMode: 'oauth', path: '/integrations/gmail' },
  { key: 'googleSheets', apiKey: 'google-sheets', iconSrc: '/icons/icons8-google-sheets-48.png', connectMode: 'page', path: '/integrations/google-sheets' },
  { key: 'telegram', apiKey: 'telegram', iconSrc: '/icons/icons8-telegram-48.png', connectMode: 'page', path: '/settings/telegram' },
];

export const INTEGRATION_TITLE_FALLBACK: Record<OnboardingIntegrationKey, string> = {
  dropbox: 'Dropbox',
  googleDrive: 'Google Drive',
  gmail: 'Gmail',
  googleSheets: 'Google Sheets',
  telegram: 'Telegram',
};

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function extractSheets(data: unknown): unknown[] {
  if (Array.isArray(data)) return data as unknown[];
  const d = data as { data?: unknown };
  if (Array.isArray(d?.data)) return d.data as unknown[];
  return [];
}

async function checkGoogleSheetsConnected(): Promise<boolean> {
  const response = await apiClient.get('/google-sheets');
  return extractSheets(response.data).length > 0;
}

function parseConnectedStatus(data: unknown): boolean {
  const d = data as { connected?: unknown; status?: unknown };
  return Boolean(d?.connected) || String(d?.status || '').toLowerCase() === 'connected';
}

export async function checkIntegrationConnected(
  integration: OnboardingIntegration,
): Promise<boolean> {
  if (integration.apiKey === 'google-sheets') {
    return checkGoogleSheetsConnected();
  }
  const response = await apiClient.get(`/integrations/${integration.apiKey}/status`);
  return parseConnectedStatus(response.data);
}

async function checkOneIntegration(
  integration: OnboardingIntegration,
  nextStatuses: Record<OnboardingIntegrationKey, boolean>,
): Promise<void> {
  try {
    nextStatuses[integration.key] = await checkIntegrationConnected(integration);
  } catch {
    nextStatuses[integration.key] = false;
  }
}

export async function refreshAllIntegrationStatuses(): Promise<
  Record<OnboardingIntegrationKey, boolean>
> {
  const nextStatuses: Record<OnboardingIntegrationKey, boolean> = {
    dropbox: false,
    googleDrive: false,
    gmail: false,
    googleSheets: false,
    telegram: false,
  };
  await Promise.all(
    ONBOARDING_INTEGRATIONS.map(integration => checkOneIntegration(integration, nextStatuses)),
  );
  return nextStatuses;
}

type WorkspaceItem = {
  id?: string;
  name?: string;
  currency?: string;
  backgroundImage?: string;
};

function extractWorkspaces(data: unknown): WorkspaceItem[] {
  if (Array.isArray(data)) return data as WorkspaceItem[];
  const d = data as { data?: unknown };
  if (Array.isArray(d?.data)) return d.data as WorkspaceItem[];
  return [];
}

type FetchWorkspaceParams = {
  userWorkspaceId: string | undefined;
  userLocale: string;
};

function applyWorkspaceToInitialData({
  workspace,
  initialData,
}: {
  workspace: WorkspaceItem | null;
  initialData: Partial<OnboardingData>;
}): void {
  if (workspace?.name) initialData.workspaceName = workspace.name;
  if (workspace?.currency) initialData.workspaceCurrency = String(workspace.currency).toUpperCase();
  if (workspace?.backgroundImage) initialData.workspaceBackgroundImage = String(workspace.backgroundImage);
}

export async function fetchWorkspaceInitialData({
  userWorkspaceId,
  userLocale,
}: FetchWorkspaceParams): Promise<Partial<OnboardingData>> {
  const resolvedLocale = resolveOnboardingBootstrapLocale(userLocale);

  const initialData: Partial<OnboardingData> = {
    locale: resolvedLocale,
    timeZone: detectTimeZone(),
    workspaceName: '',
    workspaceCurrency: DEFAULT_CURRENCY,
    workspaceBackgroundImage: DEFAULT_BACKGROUND,
  };

  const response = await apiClient.get('/workspaces');
  const workspaces = extractWorkspaces(response.data);
  const workspace = workspaces.find(item => item?.id === userWorkspaceId) ?? workspaces[0] ?? null;
  applyWorkspaceToInitialData({ workspace, initialData });

  return initialData;
}

async function attemptPollCheck({
  integration,
  popup,
  onConnected,
}: {
  integration: OnboardingIntegration;
  popup: Window;
  onConnected: () => Promise<void>;
}): Promise<boolean> {
  const connected = await checkIntegrationConnected(integration);
  if (!connected) return false;
  if (!popup.closed) {
    popup.close();
    window.focus();
  }
  await onConnected();
  return true;
}

type PollParams = {
  popup: Window;
  integration: OnboardingIntegration;
  onConnected: () => Promise<void>;
};

export async function pollForIntegrationConnection({
  popup,
  integration,
  onConnected,
}: PollParams): Promise<void> {
  const maxAttempts = 40;
  let attempt = 0;

  const doPoll = async (): Promise<void> => {
    if (attempt >= maxAttempts) return;
    attempt += 1;
    await sleep(2000);
    try {
      const done = await attemptPollCheck({ integration, popup, onConnected });
      if (!done) await doPoll();
    } catch {
      await doPoll();
    }
  };

  await doPoll();
}

type CompleteOnboardingParams = {
  data: OnboardingData;
  isCreateWorkspaceFlow: boolean;
  refreshWorkspaces: () => Promise<void>;
  setUser: (user: unknown) => void;
  onCreateWorkspaceDone: () => void;
  onOnboardingDone: () => void;
};

export async function completeOnboarding({
  data,
  isCreateWorkspaceFlow,
  refreshWorkspaces,
  setUser,
  onCreateWorkspaceDone,
  onOnboardingDone,
}: CompleteOnboardingParams): Promise<void> {
  const workspaceName = data.workspaceName.trim();
  const workspaceCurrency = data.workspaceCurrency.trim().toUpperCase();
  const workspaceBackgroundImage = (data.workspaceBackgroundImage || '').trim();

  if (isCreateWorkspaceFlow) {
    await runCreateWorkspaceFlow({ data, workspaceName, workspaceCurrency, workspaceBackgroundImage, setUser, refreshWorkspaces });
    onCreateWorkspaceDone();
    return;
  }

  await runMainOnboardingFlow({ data, workspaceName, workspaceCurrency, workspaceBackgroundImage, setUser, refreshWorkspaces });
  onOnboardingDone();
}

type FlowParams = {
  data: OnboardingData;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string;
  setUser: (user: unknown) => void;
  refreshWorkspaces: () => Promise<void>;
};

async function applyUserFromResponse({
  responseData,
  setUser,
}: {
  responseData: unknown;
  setUser: (user: unknown) => void;
}): Promise<void> {
  const d = responseData as { user?: unknown };
  const updatedUser = d?.user;
  if (updatedUser) {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    syncLocaleFromUser(updatedUser, { overwrite: true });
    setUser(updatedUser);
  }
}

async function runCreateWorkspaceFlow({
  data,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  setUser,
  refreshWorkspaces,
}: FlowParams): Promise<void> {
  const prefsResp = await apiClient.patch('/users/me/preferences', {
    locale: data.locale,
    timeZone: data.timeZone || null,
  });
  await applyUserFromResponse({ responseData: prefsResp.data, setUser });

  const createResp = await apiClient.post('/workspaces', {
    name: workspaceName || 'New Workspace',
    currency: workspaceCurrency || undefined,
    backgroundImage: workspaceBackgroundImage || undefined,
  });
  const createdId = (createResp.data as { id?: string })?.id;
  if (createdId) {
    await apiClient.post(`/workspaces/${createdId}/switch`);
    localStorage.setItem('currentWorkspaceId', createdId);
  }

  try { await refreshWorkspaces(); } catch { /* noop */ }
}

async function runMainOnboardingFlow({
  data,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  setUser,
  refreshWorkspaces,
}: FlowParams): Promise<void> {
  const response = await apiClient.patch('/users/me/onboarding', {
    locale: data.locale,
    timeZone: data.timeZone || null,
    workspaceName: workspaceName || undefined,
    workspaceCurrency: workspaceCurrency || undefined,
    workspaceBackgroundImage: workspaceBackgroundImage || undefined,
  });
  await applyUserFromResponse({ responseData: response.data, setUser });
  try { await refreshWorkspaces(); } catch { /* noop */ }
}

type IntegrationCard = {
  key: string;
  title: string;
  description: string;
  iconSrc: string;
  connected: boolean;
  loading: boolean;
  actionLabel: string;
};

type BuildCardsParams = {
  tx: (path: string[]) => string;
  integrationStatuses: Record<OnboardingIntegrationKey, boolean>;
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
};

function buildOneIntegrationCard({
  integration,
  tx,
  integrationStatuses,
  integrationLoading,
}: {
  integration: OnboardingIntegration;
  tx: (path: string[]) => string;
  integrationStatuses: Record<OnboardingIntegrationKey, boolean>;
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
}): IntegrationCard {
  const connected = integrationStatuses[integration.key];
  const title =
    tx(['integrations', 'cards', integration.key, 'title']) || INTEGRATION_TITLE_FALLBACK[integration.key];
  const actionLabel = connected
    ? tx(['integrations', 'connectedBadge']) || 'Connected'
    : tx(['integrations', 'cards', integration.key, 'action']) || 'Connect';
  return {
    key: integration.key,
    title,
    description: tx(['integrations', 'cards', integration.key, 'description']),
    iconSrc: integration.iconSrc,
    connected,
    loading: integrationLoading[integration.key],
    actionLabel,
  };
}

export function buildIntegrationCards({
  tx,
  integrationStatuses,
  integrationLoading,
}: BuildCardsParams): IntegrationCard[] {
  return ONBOARDING_INTEGRATIONS.map(integration =>
    buildOneIntegrationCard({ integration, tx, integrationStatuses, integrationLoading }),
  );
}
