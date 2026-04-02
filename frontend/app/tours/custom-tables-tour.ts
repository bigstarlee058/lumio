import type { TourConfig } from './types';

/**
 * Custom Tables Tour - advanced guide
 */
export function createCustomTablesTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    createExport?: { title: string; description: string };
    fromStatement?: { title: string; description: string };
    createOptionFromStatement?: { title: string; description: string };
    createDropdown?: { title: string; description: string };
    importButtons?: { title: string; description: string };
    createButton?: { title: string; description: string };
    search: { title: string; description: string };
    sourceFilter?: { title: string; description: string };
    tablesList: { title: string; description: string };
    pagination?: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  const createExportStep =
    texts.steps.createExport ?? texts.steps.fromStatement ?? texts.steps.createOptionFromStatement;
  const createDropdownStep =
    texts.steps.createDropdown ?? texts.steps.importButtons ?? texts.steps.createButton;

  return {
    id: 'custom-tables-tour',
    name: texts.name ?? 'Custom Tables Tour',
    description: texts.description ?? 'Creating flexible data structures',
    page: '/custom-tables',
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
        title: createExportStep?.title ?? 'Create Export',
        description:
          createExportStep?.description ??
          'Start a new export-style custom table from the available creation options.',
        selector: '[data-tour-id="custom-tables-create-export"]',
        side: 'bottom',
        align: 'end',
      },
      {
        title: createDropdownStep?.title ?? 'Create Dropdown',
        description:
          createDropdownStep?.description ??
          'Open the create menu to choose how you want to add a new custom table.',
        selector: '[data-tour-id="custom-tables-create-dropdown"]',
        side: 'bottom',
        align: 'end',
      },
      {
        title: texts.steps.search.title,
        description: texts.steps.search.description,
        selector: '[data-tour-id="search-bar"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.sourceFilter?.title ?? 'Source Filter',
        description:
          texts.steps.sourceFilter?.description ??
          'Filter custom tables by their source to narrow the current list.',
        selector: '[data-tour-id="custom-tables-source-filter"]',
        side: 'bottom',
        align: 'center',
      },
      {
        title: texts.steps.tablesList.title,
        description: texts.steps.tablesList.description,
        selector: '[data-tour-id="tables-list"]',
        side: 'top',
        align: 'center',
      },
      {
        title: texts.steps.pagination?.title ?? 'Pagination',
        description:
          texts.steps.pagination?.description ??
          'Move through result pages when the custom tables list grows.',
        selector: '[data-tour-id="pagination"]',
        side: 'top',
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
