// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());
const token = vi.hoisted(() => (value: string) => ({ value }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiGet,
  },
}));

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt ?? 'image'} />,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const integrationsTexts = vi.hoisted(() => ({
  title: 'Integrations',
  subtitle: 'Connect external services',
  sections: {
    connected: 'Connected',
    available: 'Available',
  },
  empty: {
    connected: 'No connected integrations',
    available: 'No available integrations',
  },
  categories: {
    ai: 'AI',
    application: 'Application',
    storage: 'Storage',
    email: 'Email',
    spreadsheets: 'Spreadsheets',
    messaging: 'Messaging',
  },
  searchPlaceholder: token('Search integrations...'),
  noResults: token('Nothing found'),
  noResultsDescription: token('No matching integrations found for "{{query}}".'),
  resetSearch: token('Reset search'),
  banner: 'Use open protocols and self-hostable providers where possible.',
  recommendedBadge: 'Recommended',
  cards: {
    telegram: {
      description: 'Telegram integration',
      badge: 'Available',
      actions: { setup: 'Setup', guide: 'Guide' },
    },
  },
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => integrationsTexts,
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('IntegrationsPage', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    push.mockClear();
    apiGet.mockReset();
  });

  it('opens integration when card is clicked', async () => {
    apiGet.mockResolvedValue({ data: { connected: false } });

    const { default: IntegrationsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<IntegrationsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const s3Card = container.querySelector(
      '[data-integration-card="s3-compatible"]',
    ) as HTMLElement;
    expect(s3Card).toBeTruthy();

    await act(async () => {
      s3Card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(push).toHaveBeenCalledWith('/integrations/s3-compatible');
  });

  it('disables configure action when integration is already connected', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/integrations/s3-compatible/status')) {
        return Promise.resolve({ data: { connected: true } });
      }
      return Promise.resolve({ data: { connected: false } });
    });

    const { default: IntegrationsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<IntegrationsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const configureButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Configure'),
    ) as HTMLButtonElement | undefined;

    expect(configureButton).toBeTruthy();
    expect(configureButton?.disabled).toBe(true);
  });

  it('renders OSS protocol cards instead of legacy SaaS cards', async () => {
    apiGet.mockResolvedValue({ data: { connected: false } });

    const { default: IntegrationsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<IntegrationsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(container.textContent).toContain('S3-compatible storage');
    expect(container.textContent).toContain('WebDAV storage');
    expect(container.textContent).toContain('IMAP inbox');
    expect(container.textContent).toContain('AI-compatible endpoint');
    expect(container.textContent).toContain('SMTP email');

    expect(container.textContent).not.toContain('Dropbox integration');
    expect(container.textContent).not.toContain('Google Drive integration');
    expect(container.textContent).not.toContain('Google Sheets integration');
  });
});
