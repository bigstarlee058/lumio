'use client';

import { pickDropboxFiles } from '@/app/lib/dropboxChooser';
import type { StorageWidgetProvider } from '@/app/lib/storage-widget-types';
import { BaseStorageWidget } from './BaseStorageWidget';

const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';

const dropboxProvider: StorageWidgetProvider = {
  apiPath: 'dropbox',
  logoSrc: '/icons/dropbox-icon.png',
  logoAlt: 'Dropbox',
  settingsHref: '/integrations/dropbox',
  providerName: 'Dropbox',
  getTranslations: t => t.dropboxSync,
  isPickerAvailable: () => Boolean(appKey),
  openPicker: mimeTypes => pickDropboxFiles({ appKey, mimeTypes }),
  getDocName: doc => doc.name || '',
};

export function DropboxStorageWidget({ locale }: { locale?: string }) {
  return <BaseStorageWidget provider={dropboxProvider} locale={locale} />;
}
