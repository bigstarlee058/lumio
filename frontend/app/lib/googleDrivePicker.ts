'use client';

type PickerDoc = {
  id: string;
  name?: string;
  title?: string;
  mimeType?: string;
};

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      console.info('[google-picker] script already present');
      existing.addEventListener('load', () => {
        console.info('[google-picker] script loaded');
        resolve();
      });
      return resolve();
    }
    console.info('[google-picker] loading script', src);
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      console.info('[google-picker] script loaded');
      resolve();
    };
    script.onerror = () => {
      console.error('[google-picker] script failed to load', src);
      reject(new Error('Failed to load Google API'));
    };
    document.body.appendChild(script);
  });

let pickerReady = false;

const ensurePickerLoaded = async () => {
  if (pickerReady) return;
  console.info('[google-picker] ensurePickerLoaded start');
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve, reject) => {
    if (!window.gapi?.load) {
      console.error('[google-picker] window.gapi.load missing');
      reject(new Error('Google API not available'));
      return;
    }
    window.gapi.load('picker', {
      callback: () => {
        console.info('[google-picker] gapi picker loaded');
        resolve();
      },
    });
  });
  pickerReady = true;
};

export const pickDriveFiles = async (params: {
  accessToken: string;
  apiKey: string;
  mimeTypes: string[];
}): Promise<PickerDoc[]> => {
  console.info('[google-picker] pickDriveFiles start', {
    hasAccessToken: Boolean(params.accessToken),
    hasApiKey: Boolean(params.apiKey),
    mimeTypes: params.mimeTypes,
  });
  await ensurePickerLoaded();
  const picker = window.google?.picker;
  if (!picker) {
    console.error('[google-picker] window.google.picker missing');
    throw new Error('Google Picker is not available');
  }

  return new Promise<PickerDoc[]>(resolve => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes(params.mimeTypes.join(','));

    const pickerInstance = new picker.PickerBuilder<PickerDoc>()
      .setDeveloperKey(params.apiKey)
      .setOAuthToken(params.accessToken)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .addView(view)
      .setCallback((data: { action: string; docs?: PickerDoc[] }) => {
        console.info('[google-picker] picker callback', data?.action);
        if (data.action === picker.Action.PICKED) {
          console.info('[google-picker] picker picked', data.docs?.length ?? 0);
          resolve(data.docs || []);
          return;
        }
        if (data.action === picker.Action.CANCEL) {
          console.info('[google-picker] picker cancelled');
          resolve([]);
        }
      })
      .build();

    pickerInstance.setVisible(true);
  });
};

export const pickDriveFolder = async (params: {
  accessToken: string;
  apiKey: string;
}): Promise<PickerDoc | null> => {
  console.info('[google-picker] pickDriveFolder start', {
    hasAccessToken: Boolean(params.accessToken),
    hasApiKey: Boolean(params.apiKey),
  });
  await ensurePickerLoaded();
  const picker = window.google?.picker;
  if (!picker) {
    console.error('[google-picker] window.google.picker missing');
    throw new Error('Google Picker is not available');
  }

  return new Promise<PickerDoc | null>(resolve => {
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);

    const pickerInstance = new picker.PickerBuilder<PickerDoc>()
      .setDeveloperKey(params.apiKey)
      .setOAuthToken(params.accessToken)
      .addView(view)
      .setCallback((data: { action: string; docs?: PickerDoc[] }) => {
        console.info('[google-picker] picker callback', data?.action);
        if (data.action === picker.Action.PICKED) {
          console.info('[google-picker] picker picked', data.docs?.length ?? 0);
          resolve(data.docs?.[0] || null);
          return;
        }
        if (data.action === picker.Action.CANCEL) {
          console.info('[google-picker] picker cancelled');
          resolve(null);
        }
      })
      .build();

    pickerInstance.setVisible(true);
  });
};

export const getPickerDocName = (doc: PickerDoc) => doc.name || doc.title || '';
