import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAdminTour } from './admin-tour';

const readSource = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('createAdminTour', () => {
  const texts = {
    name: 'Admin Panel Tour',
    description: 'System management and monitoring',
    steps: {
      welcome: { title: 'Welcome', description: 'Welcome description' },
      tabs: { title: 'Tabs', description: 'Tabs description' },
      statementsLog: { title: 'Statements', description: 'Statements description' },
      usersLink: { title: 'Users', description: 'Users description' },
      auditFilters: { title: 'Audit', description: 'Audit description' },
      completed: { title: 'Done', description: 'Done description' },
    },
  };

  it('uses the current admin selector set', () => {
    const tour = createAdminTour(texts as any);

    expect(tour.page).toBe('/admin');
    expect(tour.steps.map(step => step.selector)).toEqual([
      'body',
      '[data-tour-id="admin-tabs"]',
      '[data-tour-id="admin-statements-search"]',
      '[data-tour-id="admin-users-link"]',
      '[data-tour-id="admin-audit-filters"]',
      'body',
    ]);
  });

  it('supports legacy intlayer step keys from stale generated dictionaries', () => {
    const legacyTexts = {
      name: 'Admin Panel Tour',
      description: 'System management and monitoring',
      steps: {
        welcome: { title: 'Welcome', description: 'Welcome description' },
        usersManagement: { title: 'Users', description: 'Users description' },
        auditLog: { title: 'Audit', description: 'Audit description' },
        completed: { title: 'Done', description: 'Done description' },
      },
    };

    const tour = createAdminTour(legacyTexts as any);

    expect(tour.steps[1]?.title).toBe('Admin Tabs');
    expect(tour.steps[2]?.title).toBe('Statements Log');
    expect(tour.steps[3]?.title).toBe('Users');
    expect(tour.steps[4]?.title).toBe('Audit');
  });

  it('keeps only the current admin content keys', () => {
    const source = readSource('app', 'tours', 'admin-tour.content.ts');

    expect(source).toContain('welcome: {');
    expect(source).toContain('tabs: {');
    expect(source).toContain('statementsLog: {');
    expect(source).toContain('usersLink: {');
    expect(source).toContain('auditFilters: {');
    expect(source).toContain('completed: {');

    expect(source).not.toContain('usersManagement: {');
    expect(source).not.toContain('workspacesOverview: {');
    expect(source).not.toContain('systemSettings: {');
    expect(source).not.toContain('monitoring: {');
    expect(source).not.toContain('auditLog: {');
  });

  it('keeps admin page anchors aligned with the current source', () => {
    const source = readSource('app', 'admin', 'page.tsx');

    expect(source).toContain('data-tour-id="admin-tabs"');
    expect(source).toContain("'data-tour-id': 'admin-statements-search'");
    expect(source).toContain('data-tour-id="admin-users-link"');
    expect(source).toContain('data-tour-id="admin-audit-filters"');
  });
});
