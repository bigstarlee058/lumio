import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDataEntryTour } from './data-entry-tour';

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createDataEntryTour', () => {
  const texts = {
    name: 'Data Entry Tour',
    description: 'Review and edit transactions',
    steps: {
      welcome: { title: 'Welcome', description: 'Welcome description' },
      tabs: { title: 'Tabs', description: 'Tabs description' },
      tabsInfo: { title: 'Tabs info', description: 'Tabs info description' },
      editColumnsButton: { title: 'Edit columns', description: 'Edit columns description' },
      tableActionsButton: { title: 'Table actions', description: 'Table actions description' },
      tableActionsCreateForTab: { title: 'Create for tab', description: 'Create for tab description' },
      tableActionsCreateSingle: { title: 'Create single', description: 'Create single description' },
      tableActionsSyncLinked: { title: 'Sync linked', description: 'Sync linked description' },
      dateField: { title: 'Date', description: 'Date description' },
      amountField: { title: 'Amount', description: 'Amount description' },
      noteField: { title: 'Note', description: 'Note description' },
      currencyField: { title: 'Currency', description: 'Currency description' },
      saveButton: { title: 'Save', description: 'Save description' },
      entriesList: { title: 'Entries', description: 'Entries description' },
      searchEntries: { title: 'Search', description: 'Search description' },
      dateFilter: { title: 'Date filter', description: 'Date filter description' },
      customTab: { title: 'Custom tab', description: 'Custom tab description' },
      completed: { title: 'Done', description: 'Done description' },
    },
  };

  it('removes the obsolete currency quick buttons step', () => {
    const tour = createDataEntryTour(texts as any);

    expect(tour.steps.map(step => step.selector)).not.toContain('[data-tour-id="currency-buttons"]');
    expect(tour.steps).toHaveLength(18);
  });

  it('removes the obsolete currencyButtons content key', () => {
    const source = readSource('app', 'tours', 'data-entry-tour.content.ts');

    expect(source).not.toContain('currencyButtons: {');
  });
});
