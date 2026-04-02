// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createStorageTour } from './storage-tour';
import { TourManager } from './TourManager';

const driverMock = vi.hoisted(() => {
  let steps: any[] = [];
  const instance = {
    isActive: vi.fn(() => false),
    destroy: vi.fn(),
    setSteps: vi.fn((nextSteps: any[]) => {
      steps = nextSteps;
    }),
    drive: vi.fn(),
    moveNext: vi.fn(),
    movePrevious: vi.fn(),
    getActiveIndex: vi.fn(() => 0),
  };

  return {
    instance,
    getSteps: () => steps,
  };
});

vi.mock('driver.js', () => ({
  driver: () => driverMock.instance,
}));

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createStorageTour', () => {
  const texts = {
    name: 'Storage Tour',
    description: 'Manage files and access rights',
    steps: {
      welcome: { title: 'Welcome', description: 'Welcome description' },
      search: { title: 'Search', description: 'Search description' },
      filters: { title: 'Filters', description: 'Filters description' },
      storageTable: { title: 'Table', description: 'Table description' },
      fileRow: { title: 'Row', description: 'Row description' },
      completed: { title: 'Done', description: 'Done description' },
    },
  };

  it('uses the current storage selector set', () => {
    const tour = createStorageTour(texts as any);

    expect(tour.page).toBe('/storage');
    expect(tour.steps.map(step => step.selector)).toEqual([
      'body',
      '[data-tour-id="file-search"]',
      '[data-tour-id="filters-button"]',
      '[data-tour-id="storage-table"]',
      '[data-tour-id="storage-file-row"]',
      'body',
    ]);
    expect(tour.steps[1]?.optional).toBe(true);
    expect(tour.steps[2]?.optional).toBe(true);
    expect(tour.steps[3]?.optional).toBe(true);
    expect(tour.steps[4]?.optional).toBe(true);
  });

  it('supports legacy intlayer step keys from stale generated dictionaries', () => {
    const legacyTexts = {
      name: 'Storage Tour',
      description: 'Manage files and access rights',
      steps: {
        welcome: { title: 'Welcome', description: 'Welcome description' },
        search: { title: 'Search', description: 'Search description' },
        filters: { title: 'Filters', description: 'Filters description' },
        fileList: { title: 'Table', description: 'Table description' },
        actions: { title: 'Row', description: 'Row description' },
        completed: { title: 'Done', description: 'Done description' },
      },
    };

    const tour = createStorageTour(legacyTexts as any);

    expect(tour.steps[3]?.title).toBe('Table');
    expect(tour.steps[3]?.description).toBe('Table description');
    expect(tour.steps[4]?.title).toBe('Row');
    expect(tour.steps[4]?.description).toBe('Row description');
  });

  it('keeps only the current content keys and removes obsolete row-detail keys', () => {
    const source = readSource('app', 'tours', 'storage-tour.content.ts');

    expect(source).toContain('welcome: {');
    expect(source).toContain('search: {');
    expect(source).toContain('filters: {');
    expect(source).toContain('storageTable: {');
    expect(source).toContain('fileRow: {');
    expect(source).toContain('completed: {');

    expect(source).not.toContain('fileList: {');
    expect(source).not.toContain('actions: {');
    expect(source).not.toContain('categories: {');
    expect(source).not.toContain('permissions: {');
    expect(source).toContain('ru:');
    expect(source).toContain('en:');
    expect(source).toContain('kk:');
  });

  it('keeps storage page anchors aligned with the current page source', () => {
    const pageSource = readSource('app', 'storage', 'StoragePageContent.tsx');

    expect(pageSource).toContain('data-tour-id="file-search"');
    expect(pageSource).toContain('data-tour-id="filters-button"');
    expect(pageSource).toContain('data-tour-id="storage-table"');
    expect(pageSource).toContain('storage-file-row');
    expect(pageSource).toContain("dataTourId={!isTrashView && index === 0 ? 'storage-file-row' : undefined}");
    expect(pageSource).toContain('data-tour-id={dataTourId}');
    expect(pageSource).not.toContain('data-tour-id="file-actions"');
    expect(pageSource).not.toContain('data-tour-id="category-select"');
    expect(pageSource).not.toContain('data-tour-id="permission-badge"');
  });

  it('relies on TourManager optional-step skipping when storage anchors are absent', async () => {
    vi.useFakeTimers();

    try {
      driverMock.instance.moveNext.mockClear();
      driverMock.instance.setSteps.mockClear();

      const manager = new TourManager();
      manager.registerTour(createStorageTour(texts as any));

      await manager.startTour('storage-tour');

      const steps = driverMock.getSteps();
      expect(steps).toHaveLength(6);

      for (const index of [1, 2, 3, 4]) {
        steps[index]?.onHighlighted?.();
      }

      vi.runAllTimers();

      expect(driverMock.instance.moveNext).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });
});
