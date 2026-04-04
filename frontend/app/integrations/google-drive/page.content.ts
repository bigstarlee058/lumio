import { makeCloudStorageContent } from '../shared/make-cloud-storage-content';

const content = makeCloudStorageContent({
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

export default content;
