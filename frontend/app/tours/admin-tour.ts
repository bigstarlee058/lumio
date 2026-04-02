import type { TourConfig } from './types';

/**
 * Admin Panel Tour
 */
export function createAdminTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    tabs?: { title: string; description: string };
    statementsLog?: { title: string; description: string };
    usersLink?: { title: string; description: string };
    usersManagement?: { title: string; description: string };
    auditFilters?: { title: string; description: string };
    auditLog?: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  const usersLinkStep = texts.steps.usersLink ?? texts.steps.usersManagement;
  const auditFiltersStep = texts.steps.auditFilters ?? texts.steps.auditLog;

  return {
    id: 'admin-tour',
    name: texts.name ?? 'Admin Panel Tour',
    description: texts.description ?? 'System management and monitoring',
    page: '/admin',
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
        title: texts.steps.tabs?.title ?? 'Admin Tabs',
        description:
          texts.steps.tabs?.description ??
          'Use the admin tabs to switch between users, statements logs, and audit tools.',
        selector: '[data-tour-id="admin-tabs"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.statementsLog?.title ?? 'Statements Log',
        description:
          texts.steps.statementsLog?.description ??
          'Review statement processing activity and search through recent admin log entries.',
        selector: '[data-tour-id="admin-statements-search"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: usersLinkStep?.title ?? 'Users',
        description:
          usersLinkStep?.description ??
          'Open the users section to manage accounts, access, and related admin controls.',
        selector: '[data-tour-id="admin-users-link"]',
        side: 'right',
        align: 'center',
      },
      {
        title: auditFiltersStep?.title ?? 'Audit Filters',
        description:
          auditFiltersStep?.description ??
          'Use the audit filters to narrow activity history to the events you need to inspect.',
        selector: '[data-tour-id="admin-audit-filters"]',
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
