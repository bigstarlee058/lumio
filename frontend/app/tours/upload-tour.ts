/**
 * Standalone upload page tour
 */

import type { TourConfig } from './types';

type TextNode = { value: string };

type UploadSteps = {
  welcome: { title: TextNode; description: TextNode };
  dragDrop: { title: TextNode; description: TextNode };
  allowDuplicates: { title: TextNode; description: TextNode };
  fileList: { title: TextNode; description: TextNode };
  uploadButton?: { title: TextNode; description: TextNode };
  googleSheets?: { title: TextNode; description: TextNode };
  uploadFiles?: { title: TextNode; description: TextNode };
  completed: { title: TextNode; description: TextNode };
};

/**
 * Creates tour configuration for the upload page
 * @param texts - Object with translations from useIntlayer
 */
export function createUploadTour(texts: {
  name: TextNode;
  description: TextNode;
  steps: UploadSteps;
  content?: {
    name: TextNode;
    description: TextNode;
    steps: UploadSteps;
  };
}): TourConfig {
  const resolvedTexts = texts.content ?? texts;
  const { steps } = resolvedTexts;
  const uploadButtonStep = steps.uploadButton;
  const googleSheetsStep = steps.googleSheets ?? steps.uploadFiles;

  return {
    id: 'upload-tour',
    name: resolvedTexts.name?.value ?? 'Upload Tour',
    description: resolvedTexts.description?.value ?? 'Learn how to upload bank statements',
    page: '/upload',
    steps: [
      {
        selector: 'body',
        title: steps.welcome.title.value,
        description: steps.welcome.description.value,
        side: 'center' as any,
      },
      {
        selector: '[data-tour-id="drag-drop-zone"]',
        title: steps.dragDrop.title.value,
        description: steps.dragDrop.description.value,
        side: 'bottom',
      },
      {
        selector: '[data-tour-id="allow-duplicates"]',
        title: steps.allowDuplicates.title.value,
        description: steps.allowDuplicates.description.value,
        side: 'right',
      },
      {
        selector: '[data-tour-id="file-list"]',
        optional: true,
        title: steps.fileList.title.value,
        description: steps.fileList.description.value,
        side: 'top',
      },
      {
        selector: '[data-tour-id="upload-button"]',
        title: uploadButtonStep?.title.value ?? 'Start Upload',
        description:
          uploadButtonStep?.description.value ??
          'Send the selected files for processing once the upload list is ready.',
        side: 'top',
        align: 'end',
      },
      {
        selector: '[data-tour-id="google-sheets-section"]',
        title: googleSheetsStep?.title.value ?? 'Google Sheets Link',
        description:
          googleSheetsStep?.description.value ??
          'Optionally connect this upload to a Google Sheet when you need sync.',
        side: 'top',
      },
      {
        selector: 'body',
        title: steps.completed.title.value,
        description: steps.completed.description.value,
        side: 'center' as any,
      },
    ],
  };
}
