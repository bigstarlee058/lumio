import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createReportsTour } from './reports-tour';

type TourTextPayload = Parameters<typeof createReportsTour>[0];

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createReportsTour', () => {
  const texts = {
    name: 'Reports Tour',
    description: 'Generate and export financial reports',
    steps: {
      welcome: { title: 'Welcome', description: 'Welcome description' },
      tabs: { title: 'Tabs', description: 'Tabs description' },
      templates: { title: 'Templates', description: 'Templates description' },
      selectTemplate: { title: 'Select template', description: 'Select template description' },
      generator: { title: 'Generator', description: 'Generator description' },
      format: { title: 'Format', description: 'Format description' },
      completed: { title: 'Done', description: 'Done description' },
    },
  };

  it('uses the current reports selector set', () => {
    const tour = createReportsTour(texts as TourTextPayload);

    expect(tour.page).toBe('/reports');
    expect(tour.steps.map(step => step.selector)).toEqual([
      'body',
      '[data-tour-id="reports-tabs"]',
      '[data-tour-id="reports-templates-grid"]',
      '[data-tour-id="reports-template-pnl"]',
      '[data-tour-id="reports-generator"]',
      '[data-tour-id="reports-format"]',
      'body',
    ]);
  });

  it('supports legacy intlayer step keys from stale generated dictionaries', () => {
    const legacyTexts = {
      name: 'Reports Tour',
      description: 'Generate and export financial reports',
      steps: {
        welcome: { title: 'Welcome', description: 'Welcome description' },
        templates: { title: 'Templates', description: 'Templates description' },
        selectTemplate: { title: 'Select template', description: 'Select template description' },
        generator: { title: 'Generator', description: 'Generator description' },
        formatSelector: { title: 'Format', description: 'Format description' },
        completed: { title: 'Done', description: 'Done description' },
      },
    };

    const tour = createReportsTour(legacyTexts as TourTextPayload);

    expect(tour.steps[1]?.title).toBe('Report Tabs');
    expect(tour.steps[5]?.title).toBe('Format');
  });

  it('keeps only the current reports content keys', () => {
    const source = readSource('app', 'tours', 'reports-tour.content.ts');

    expect(source).toContain('welcome: {');
    expect(source).toContain('tabs: {');
    expect(source).toContain('templates: {');
    expect(source).toContain('selectTemplate: {');
    expect(source).toContain('generator: {');
    expect(source).toContain('format: {');
    expect(source).toContain('completed: {');

    expect(source).not.toContain('formatSelector: {');
    expect(source).not.toContain('tabHistory: {');
    expect(source).toContain('ru:');
    expect(source).toContain('en:');
    expect(source).toContain('kk:');
  });

  it('keeps reports page anchors aligned with the current source', () => {
    const pageSource = readSource('app', '(main)', 'reports', 'page.tsx');
    const generatorSource = readSource(
      'app',
      '(main)',
      'reports',
      'components',
      'ReportGenerator.tsx',
    );
    const templateCardSource = readSource(
      'app',
      '(main)',
      'reports',
      'components',
      'ReportTemplateCard.tsx',
    );

    expect(pageSource).toContain('data-tour-id="reports-tabs"');
    expect(pageSource).toContain('data-tour-id="reports-templates-grid"');
    expect(generatorSource).toContain('data-tour-id="reports-generator"');
    expect(generatorSource).toContain('data-tour-id="reports-format"');
    expect(templateCardSource).toContain(
      "data-tour-id={template.id === 'pnl' ? 'reports-template-pnl' : undefined}",
    );
  });
});
