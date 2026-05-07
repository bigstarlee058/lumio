// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('intlayer', () => ({
  t: (value: unknown) => value,
}));

import { makeCloudStorageContent } from './make-cloud-storage-content';

describe('makeCloudStorageContent', () => {
  it('builds common integration content with provider-specific labels', () => {
    const dropbox = makeCloudStorageContent({
      key: 'dropboxIntegrationPage',
      name: { ru: 'Dropbox', en: 'Dropbox', kk: 'Dropbox' },
      folderLabel: { ru: 'Папка в Dropbox', en: 'Dropbox folder', kk: 'Dropbox қалтасы' },
      connectingLabel: {
        ru: 'Открываем авторизацию Dropbox…',
        en: 'Opening Dropbox authorization…',
        kk: 'Dropbox авторизациясы ашылуда…',
      },
      connectedLabel: {
        ru: 'Dropbox подключен',
        en: 'Dropbox connected',
        kk: 'Dropbox қосылды',
      },
      pickerUnavailableLabel: {
        ru: 'Dropbox Chooser недоступен',
        en: 'Dropbox Chooser is unavailable',
        kk: 'Dropbox Chooser қолжетімсіз',
      },
    });

    const drive = makeCloudStorageContent({
      key: 'googleDriveIntegrationPage',
      name: { ru: 'Google Drive', en: 'Google Drive', kk: 'Google Drive' },
      folderLabel: { ru: 'Папка в Drive', en: 'Drive folder', kk: 'Drive қалтасы' },
      connectingLabel: {
        ru: 'Открываем авторизацию Google…',
        en: 'Opening Google authorization…',
        kk: 'Google авторизациясы ашылуда…',
      },
      connectedLabel: {
        ru: 'Google Drive подключен',
        en: 'Google Drive connected',
        kk: 'Google Drive қосылды',
      },
      pickerUnavailableLabel: {
        ru: 'Google Picker недоступен',
        en: 'Google Picker is unavailable',
        kk: 'Google Picker қолжетімсіз',
      },
    });

    expect(dropbox.key).toBe('dropboxIntegrationPage');
    expect(drive.key).toBe('googleDriveIntegrationPage');
    expect(dropbox.content.header.subtitle).toEqual({
      ru: 'Подключите Dropbox, чтобы синхронизировать выписки и импортировать файлы.',
      en: 'Connect Dropbox to sync statements and import files.',
      kk: 'Үзінділерді синхрондау және файлдарды импорттау үшін Dropbox қосыңыз.',
    });
    expect(drive.content.header.subtitle).toEqual({
      ru: 'Подключите Google Drive, чтобы синхронизировать выписки и импортировать файлы.',
      en: 'Connect Google Drive to sync statements and import files.',
      kk: 'Үзінділерді синхрондау және файлдарды импорттау үшін Google Drive қосыңыз.',
    });

    expect(dropbox.content.loading).toEqual(drive.content.loading);
    expect(dropbox.content.status.connected).toEqual(drive.content.status.connected);
    expect(dropbox.content.actions.syncNow).toEqual(drive.content.actions.syncNow);
    expect(dropbox.content.settings.folder).toEqual({
      ru: 'Папка в Dropbox',
      en: 'Dropbox folder',
      kk: 'Dropbox қалтасы',
    });
    expect(drive.content.settings.folder).toEqual({
      ru: 'Папка в Drive',
      en: 'Drive folder',
      kk: 'Drive қалтасы',
    });
    expect(dropbox.content.toasts.connecting).toEqual({
      ru: 'Открываем авторизацию Dropbox…',
      en: 'Opening Dropbox authorization…',
      kk: 'Dropbox авторизациясы ашылуда…',
    });
    expect(drive.content.errors.pickerUnavailable).toEqual({
      ru: 'Google Picker недоступен',
      en: 'Google Picker is unavailable',
      kk: 'Google Picker қолжетімсіз',
    });
  });
});
