import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createGoogleSheetsIntegrationTour } from './google-sheets-integration-tour';

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createGoogleSheetsIntegrationTour', () => {
  const texts = {
    name: 'Google Sheets Integration Tour',
    description: 'Connect a sheet and configure sync',
    steps: {
      welcome: { title: 'Welcome', description: 'Welcome description' },
      step1Card: { title: 'Step 1', description: 'Step 1 description' },
      sheetUrl: { title: 'Picker', description: 'Picker description' },
      sheetName: { title: 'Name', description: 'Name description' },
      worksheet: { title: 'Worksheet', description: 'Worksheet description' },
      connectButton: { title: 'Connect', description: 'Connect description' },
      step2Card: { title: 'Step 2', description: 'Step 2 description' },
      appsScript: { title: 'Apps Script', description: 'Apps Script description' },
      listCard: { title: 'List', description: 'List description' },
      connectionCard: { title: 'Connection', description: 'Connection description' },
      authorize: { title: 'Authorize', description: 'Authorize description' },
      sync: { title: 'Sync', description: 'Sync description' },
      disconnect: { title: 'Disconnect', description: 'Disconnect description' },
      completed: { title: 'Done', description: 'Done description' },
    },
  };

  it('uses the spreadsheet picker selector for step 3', () => {
    const tour = createGoogleSheetsIntegrationTour(texts as any);

    expect(tour.steps[2]?.selector).toBe('[data-tour-id="gs-integration-picker"]');
  });

  it('describes step 3 as the spreadsheet picker, not a URL field', () => {
    const source = readSource('app', 'tours', 'google-sheets-integration-tour.content.ts');

    expect(source).toContain('sheetUrl: {');
    expect(source).toContain('picker');
    expect(source).not.toContain('URL or ID');
  });
});
