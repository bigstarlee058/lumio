import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createUploadTour } from './upload-tour';

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createUploadTour', () => {
  const texts = {
    name: { value: 'Upload Tour' },
    description: { value: 'Learn how to upload bank statements' },
    steps: {
      welcome: {
        title: { value: 'Welcome' },
        description: { value: 'Welcome description' },
      },
      dragDrop: {
        title: { value: 'Drag and drop' },
        description: { value: 'Drag and drop description' },
      },
      allowDuplicates: {
        title: { value: 'Allow duplicates' },
        description: { value: 'Allow duplicates description' },
      },
      fileList: {
        title: { value: 'File list' },
        description: { value: 'File list description' },
      },
      uploadButton: {
        title: { value: 'Upload button' },
        description: { value: 'Upload button description' },
      },
      googleSheets: {
        title: { value: 'Google Sheets' },
        description: { value: 'Google Sheets description' },
      },
      completed: {
        title: { value: 'Done' },
        description: { value: 'Done description' },
      },
    },
  };

  it('uses the standalone upload page and stable data-tour-id selectors', () => {
    const tour = createUploadTour(texts);

    expect(tour.page).toBe('/upload');
    expect(tour.steps.map(step => step.selector)).toEqual([
      'body',
      '[data-tour-id="drag-drop-zone"]',
      '[data-tour-id="allow-duplicates"]',
      '[data-tour-id="file-list"]',
      '[data-tour-id="upload-button"]',
      '[data-tour-id="google-sheets-section"]',
      'body',
    ]);
    expect(tour.steps[3]?.optional).toBe(true);
  });

  it('supports intlayer payloads with content-wrapped steps', () => {
    const tour = createUploadTour({ content: texts } as any);

    expect(tour.name).toBe('Upload Tour');
    expect(tour.steps[5]?.title).toBe('Google Sheets');
    expect(tour.steps[5]?.description).toBe('Google Sheets description');
  });

  it('supports legacy intlayer step keys from stale generated dictionaries', () => {
    const legacyTexts = {
      content: {
        name: { value: 'Upload Tour' },
        description: { value: 'Learn how to upload bank statements' },
        steps: {
          welcome: {
            title: { value: 'Welcome' },
            description: { value: 'Welcome description' },
          },
          dragDrop: {
            title: { value: 'Drag and drop' },
            description: { value: 'Drag and drop description' },
          },
          allowDuplicates: {
            title: { value: 'Allow duplicates' },
            description: { value: 'Allow duplicates description' },
          },
          fileList: {
            title: { value: 'File list' },
            description: { value: 'File list description' },
          },
          uploadButton: {
            title: { value: 'Upload button' },
            description: { value: 'Upload button description' },
          },
          uploadFiles: {
            title: { value: 'Google Sheets' },
            description: { value: 'Google Sheets description' },
          },
          completed: {
            title: { value: 'Done' },
            description: { value: 'Done description' },
          },
        },
      },
    };

    const tour = createUploadTour(legacyTexts as any);

    expect(tour.steps[4]?.title).toBe('Upload button');
    expect(tour.steps[5]?.title).toBe('Google Sheets');
    expect(tour.steps[5]?.description).toBe('Google Sheets description');
  });

  it('keeps the updated content keys and removes modal-specific legacy keys', () => {
    const source = readSource('app', 'tours', 'upload-tour.content.ts');

    expect(source).toContain('welcome: {');
    expect(source).toContain('dragDrop: {');
    expect(source).toContain('allowDuplicates: {');
    expect(source).toContain('fileList: {');
    expect(source).toContain('uploadButton: {');
    expect(source).toContain('googleSheets: {');
    expect(source).toContain('completed: {');

    expect(source).not.toContain('uploadFiles: {');
    expect(source).toContain('ru:');
    expect(source).toContain('en:');
    expect(source).toContain('kk:');
  });

  it('keeps upload page anchors based on data-tour-id instead of brittle modal classes', () => {
    const tourSource = readSource('app', 'tours', 'upload-tour.ts');
    const pageSource = readSource('app', 'upload', 'page.tsx');

    expect(tourSource).not.toContain('.fixed.inset-0');
    expect(tourSource).not.toContain('#allow-duplicates');
    expect(pageSource).toContain('data-tour-id="drag-drop-zone"');
    expect(pageSource).toContain('data-tour-id="allow-duplicates"');
    expect(pageSource).toContain('data-tour-id="file-list"');
    expect(pageSource).toContain('data-tour-id="upload-button"');
    expect(pageSource).toContain('data-tour-id="google-sheets-section"');
  });
});
