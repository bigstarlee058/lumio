export type StorageSettings = {
  folderId?: string | null;
  folderName?: string | null;
  syncEnabled?: boolean;
  syncTime?: string;
  timeZone?: string | null;
  lastSyncAt?: string | null;
};

export type StorageStatus = {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  settings?: StorageSettings | null;
};

export type StorageImportResult = {
  status?: 'ok' | 'error';
  fileId?: string;
};

export type PickedDoc = {
  id: string;
  name?: string;
  title?: string;
  link?: string;
  bytes?: number;
};

/**
 * Configuration object that captures all provider-specific differences between
 * storage integration widgets (Dropbox, Google Drive, etc.).
 */
export type StorageWidgetProvider = {
  /** Base API path segment, e.g. 'dropbox' or 'google-drive' */
  apiPath: string;
  /** Path to the provider logo icon */
  logoSrc: string;
  /** Alt text for the logo image */
  logoAlt: string;
  /** Route for the settings page, e.g. '/integrations/dropbox' */
  settingsHref: string;
  /**
   * Returns true if the file picker can be opened.
   * Used to show a pickerUnavailable error before attempting to open the picker.
   */
  isPickerAvailable: () => boolean;
  /**
   * Opens the provider's file picker and returns selected docs.
   * Encapsulates all provider-specific logic including any prerequisite
   * token fetches (e.g. Google Drive access token).
   * Should return an empty array if the user cancels.
   */
  openPicker: (mimeTypes: string[]) => Promise<PickedDoc[]>;
  /** Returns the display name of a picked document */
  getDocName: (doc: PickedDoc) => string;
  /**
   * i18n translation accessor — receives the storagePage intlayer object
   * and returns the provider-specific sub-object.
   */
  // biome-ignore lint/suspicious/noExplicitAny: intlayer output type is opaque
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTranslations: (t: any) => any;
  /** Human-readable provider name used as fallback string suffix */
  providerName: string;
};
