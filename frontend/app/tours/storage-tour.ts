import type { TourConfig } from './types';

/**
 * Files Storage page tour
 */
export function createStorageTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    search: { title: string; description: string };
    filters: { title: string; description: string };
    storageTable?: { title: string; description: string };
    fileList?: { title: string; description: string };
    fileRow?: { title: string; description: string };
    actions?: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  const storageTableStep = texts.steps.storageTable ?? texts.steps.fileList;
  const fileRowStep = texts.steps.fileRow ?? texts.steps.actions;

  return {
    id: 'storage-tour',
    name: texts.name ?? 'Storage Tour',
    description: texts.description ?? 'Managing files and access rights',
    page: '/storage',
    autoStart: false,
    steps: [
      {
        title: texts.steps.welcome.title,
        description: texts.steps.welcome.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.search.title,
        description: texts.steps.search.description,
        selector: '[data-tour-id="file-search"]',
        optional: true,
        side: 'bottom',
        align: 'end',
      },
      {
        title: texts.steps.filters.title,
        description: texts.steps.filters.description,
        selector: '[data-tour-id="filters-button"]',
        optional: true,
        side: 'bottom',
        align: 'end',
      },
      {
        title: storageTableStep?.title ?? 'Files Table',
        description:
          storageTableStep?.description ??
          'Review the full list of matching files and their key metadata in one place.',
        selector: '[data-tour-id="storage-table"]',
        optional: true,
        side: 'top',
        align: 'center',
      },
      {
        title: fileRowStep?.title ?? 'File Row',
        description:
          fileRowStep?.description ??
          'Each row surfaces the main file details and the quick actions you can take.',
        selector: '[data-tour-id="storage-file-row"]',
        optional: true,
        side: 'left',
        align: 'center',
      },
      {
        title: texts.steps.completed.title,
        description: texts.steps.completed.description,
        selector: 'body',
        side: 'bottom',
        align: 'center',
      },
    ],
  };
}
