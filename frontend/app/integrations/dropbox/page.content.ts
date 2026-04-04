import { makeCloudStorageContent } from '../shared/make-cloud-storage-content';

const content = makeCloudStorageContent({
  key: 'dropboxIntegrationPage',
  name: { ru: 'Dropbox', en: 'Dropbox', kk: 'Dropbox' },
  folderLabel: { ru: 'Папка в Dropbox', en: 'Dropbox folder', kk: 'Dropbox қалтасы' },
  connectingLabel: {
    ru: 'Открываем авторизацию Dropbox…',
    en: 'Opening Dropbox authorization…',
    kk: 'Dropbox авторизациясы ашылуда…',
  },
  connectedLabel: { ru: 'Dropbox подключен', en: 'Dropbox connected', kk: 'Dropbox қосылды' },
  pickerUnavailableLabel: {
    ru: 'Dropbox Chooser недоступен',
    en: 'Dropbox Chooser is unavailable',
    kk: 'Dropbox Chooser қолжетімсіз',
  },
});

export default content;
