// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatementsCircularUploadMenu from '@/app/(main)/statements/components/StatementsCircularUploadMenu';
import { createStatementsTour } from './statements-tour';

type StatementsTourPayload = Parameters<typeof createStatementsTour>[0];

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={alt ?? ''} />
  ),
}));

function setDesktopMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(min-width: 1024px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createStatementsTour', () => {
  const texts = {
    name: { value: 'Statements Tour' },
    description: { value: 'Learn how to upload and manage bank statements' },
    steps: {
      welcome: {
        title: { value: 'Welcome' },
        description: { value: 'Welcome description' },
      },
      uploadTrigger: {
        title: { value: 'Upload actions' },
        description: { value: 'Open upload actions' },
      },
      searchBar: {
        title: { value: 'Search' },
        description: { value: 'Search the list' },
      },
      filters: {
        title: { value: 'Filters' },
        description: { value: 'Filter the list' },
      },
      statementsList: {
        title: { value: 'List' },
        description: { value: 'List description' },
      },
      statementRow: {
        title: { value: 'Row' },
        description: { value: 'Row description' },
      },
      completed: {
        title: { value: 'Done' },
        description: { value: 'Done description' },
      },
    },
  };

  it('uses the current statements submit route and updated step selectors', () => {
    const tour = createStatementsTour(texts);

    expect(tour.page).toBe('/statements/submit');
    expect(tour.steps.map(step => step.selector)).toEqual([
      'body',
      '[data-tour-id="statements-upload-trigger"]',
      '[data-tour-id="search-bar"]',
      '[data-tour-id="statements-filters"]',
      '[data-tour-id="statements-table"]',
      '[data-tour-id="statement-row-primary"]',
      'body',
    ]);
    expect(tour.steps[3]?.optional).toBe(true);
    expect(tour.steps[5]?.optional).toBe(true);
  });

  it('supports intlayer payloads with content-wrapped steps', () => {
    const tour = createStatementsTour({ content: texts } as StatementsTourPayload);

    expect(tour.name).toBe('Statements Tour');
    expect(tour.steps[1]?.title).toBe('Upload actions');
    expect(tour.steps[1]?.description).toBe('Open upload actions');
  });

  it('supports legacy intlayer step keys from stale generated dictionaries', () => {
    const legacyTexts = {
      content: {
        name: { value: 'Statements Tour' },
        description: { value: 'Learn how to upload and manage bank statements' },
        steps: {
          welcome: {
            title: { value: 'Welcome' },
            description: { value: 'Welcome description' },
          },
          uploadButton: {
            title: { value: 'Upload actions' },
            description: { value: 'Open upload actions' },
          },
          searchBar: {
            title: { value: 'Search' },
            description: { value: 'Search the list' },
          },
          statusFilter: {
            title: { value: 'Filters' },
            description: { value: 'Filter the list' },
          },
          statementsTable: {
            title: { value: 'List' },
            description: { value: 'List description' },
          },
          viewDetails: {
            title: { value: 'Row' },
            description: { value: 'Row description' },
          },
          completed: {
            title: { value: 'Done' },
            description: { value: 'Done description' },
          },
        },
      },
    };

    const tour = createStatementsTour(legacyTexts as StatementsTourPayload);

    expect(tour.steps[1]?.title).toBe('Upload actions');
    expect(tour.steps[3]?.title).toBe('Filters');
    expect(tour.steps[4]?.title).toBe('List');
    expect(tour.steps[5]?.title).toBe('Row');
  });

  it('ships the updated content keys for all locales', () => {
    const source = readSource('app', 'tours', 'statements-tour.content.ts');

    const stepKeys = [
      'welcome',
      'uploadTrigger',
      'searchBar',
      'filters',
      'statementsList',
      'statementRow',
      'completed',
    ];

    stepKeys.forEach(stepKey => {
      expect(source).toContain(`${stepKey}: {`);
      expect(source).toContain(`${stepKey}: {\n        title: t({`);
      expect(source).toContain(`${stepKey}: {\n        title: t({\n          ru:`);
      expect(source).toContain(`${stepKey}: {\n        title: t({\n          ru:`);
      expect(source).toContain(`description: t({`);
    });

    expect(source).not.toContain('uploadButton: {');
    expect(source).not.toContain('statusFilter: {');
    expect(source).not.toContain('statementsTable: {');
    expect(source).not.toContain('statusBadges: {');
    expect(source).not.toContain('actions: {');
    expect(source).not.toContain('pagination: {');
    expect(source).not.toContain('viewDetails: {');

    const localeOccurrences = {
      ru: (source.match(/\bru:/g) ?? []).length,
      en: (source.match(/\ben:/g) ?? []).length,
      kk: (source.match(/\bkk:/g) ?? []).length,
    };

    expect(localeOccurrences.ru).toBeGreaterThanOrEqual(stepKeys.length * 2);
    expect(localeOccurrences.en).toBeGreaterThanOrEqual(stepKeys.length * 2);
    expect(localeOccurrences.kk).toBeGreaterThanOrEqual(stepKeys.length * 2);
  });

  it('keeps the expected statements page anchors in the current source', () => {
    const listViewSource = readSource(
      'app',
      '(main)',
      'statements',
      'components',
      'StatementsListView.tsx',
    );
    const listItemSource = readSource(
      'app',
      '(main)',
      'statements',
      'components',
      'StatementsListItem.tsx',
    );

    expect(listViewSource).toContain('data-tour-id="search-bar"');
    expect(listViewSource).toContain('data-tour-id="statements-filters"');
    expect(listViewSource).toContain('data-tour-id="statements-table"');
    expect(listViewSource).toContain("dataTourId={index === 0 ? 'statement-row-primary' : undefined}");
    expect(listItemSource).toContain('data-tour-id={dataTourId}');
  });
});

describe('StatementsCircularUploadMenu', () => {
  it('keeps the upload tour anchor on the visible desktop sidebar trigger only', () => {
    setDesktopMatchMedia(true);

    const { container: panelContainer } = render(
      <StatementsCircularUploadMenu
        providers={{ googleDriveConnected: false, dropboxConnected: false, gmailConnected: false }}
        onScan={vi.fn()}
        onCloudImport={vi.fn()}
        onGmail={vi.fn()}
        onLocalUpload={vi.fn()}
        placement="panel"
      />,
    );

    render(
      <StatementsCircularUploadMenu
        providers={{ googleDriveConnected: false, dropboxConnected: false, gmailConnected: false }}
        onScan={vi.fn()}
        onCloudImport={vi.fn()}
        onGmail={vi.fn()}
        onLocalUpload={vi.fn()}
        placement="floating"
      />,
    );

    expect(
      panelContainer.querySelector('[aria-label="Open upload actions"]')?.getAttribute('data-tour-id'),
    ).toBe('statements-upload-trigger');

    const anchoredButtons = Array.from(
      document.body.querySelectorAll('[data-tour-id="statements-upload-trigger"]'),
    );

    expect(anchoredButtons).toHaveLength(1);
    expect((anchoredButtons[0] as HTMLElement | undefined)?.getAttribute('aria-label')).toBe(
      'Open upload actions',
    );
  });

  it('keeps the upload tour anchor on the active mobile footer trigger only', () => {
    setDesktopMatchMedia(false);

    const { container: panelContainer } = render(
      <StatementsCircularUploadMenu
        providers={{ googleDriveConnected: false, dropboxConnected: false, gmailConnected: false }}
        onScan={vi.fn()}
        onCloudImport={vi.fn()}
        onGmail={vi.fn()}
        onLocalUpload={vi.fn()}
        placement="panel"
      />,
    );

    render(
      <StatementsCircularUploadMenu
        providers={{ googleDriveConnected: false, dropboxConnected: false, gmailConnected: false }}
        onScan={vi.fn()}
        onCloudImport={vi.fn()}
        onGmail={vi.fn()}
        onLocalUpload={vi.fn()}
        placement="floating"
      />,
    );

    expect(
      panelContainer.querySelector('[aria-label="Open upload actions"]')?.getAttribute('data-tour-id'),
    ).toBeNull();

    const anchoredButtons = Array.from(
      document.body.querySelectorAll('[data-tour-id="statements-upload-trigger"]'),
    );

    expect(anchoredButtons).toHaveLength(1);
    expect((anchoredButtons[0] as HTMLElement | undefined)?.getAttribute('aria-label')).toBe(
      'Open upload actions',
    );
  });

  it('attaches the statements upload tour anchor to the plus menu trigger', () => {
    setDesktopMatchMedia(true);

    render(
      <StatementsCircularUploadMenu
        providers={{ googleDriveConnected: false, dropboxConnected: false, gmailConnected: false }}
        onScan={vi.fn()}
        onCloudImport={vi.fn()}
        onGmail={vi.fn()}
        onLocalUpload={vi.fn()}
      />,
    );

    const openActionsButton = screen.getByLabelText('Open upload actions');
    const scanButton = screen.getByLabelText('Scan');

    expect(openActionsButton).toHaveAttribute('data-tour-id', 'statements-upload-trigger');
    expect(scanButton).not.toHaveAttribute('data-tour-id', 'statements-upload-trigger');
  });
});
