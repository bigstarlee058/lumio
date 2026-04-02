import type { TourConfig } from './types';

/**
 * Advanced Workspace Settings Tour
 */
export function createSettingsTour(texts: {
  name?: string;
  description?: string;
  steps: {
    welcome: { title: string; description: string };
    sidePanel?: { title: string; description: string };
    workspaceName?: { title: string; description: string };
    workspaceCurrency?: { title: string; description: string };
    workspaceBackground?: { title: string; description: string };
    completed: { title: string; description: string };
  };
}): TourConfig {
  return {
    id: 'settings-tour',
    name: texts.name ?? 'Workspace Tour',
    description: texts.description ?? 'Manage workspace profile and defaults',
    page: '/workspaces/overview',
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
        title: texts.steps.sidePanel?.title ?? 'Workspace Navigation',
        description:
          texts.steps.sidePanel?.description ??
          'Use the workspace side navigation to move between overview, members, and other settings sections.',
        selector: '[data-tour-id="workspace-side-panel"]',
        side: 'right',
        align: 'start',
      },
      {
        title: texts.steps.workspaceName?.title ?? 'Workspace Name',
        description:
          texts.steps.workspaceName?.description ??
          'Edit the workspace name here to keep it clear for everyone on the team.',
        selector: '[data-tour-id="workspace-name"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.workspaceCurrency?.title ?? 'Workspace Currency',
        description:
          texts.steps.workspaceCurrency?.description ??
          'Set the default workspace currency used across reports and financial views.',
        selector: '[data-tour-id="workspace-currency"]',
        side: 'bottom',
        align: 'start',
      },
      {
        title: texts.steps.workspaceBackground?.title ?? 'Workspace Background',
        description:
          texts.steps.workspaceBackground?.description ??
          'Choose a workspace background to personalize the overview page appearance.',
        selector: '[data-tour-id="workspace-background"]',
        side: 'bottom',
        align: 'start',
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
