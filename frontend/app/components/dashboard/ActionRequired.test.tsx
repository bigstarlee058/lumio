import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import './test-setup';
import { ActionRequired } from './ActionRequired';

const baseAction = {
  href: '/test',
  count: 3,
  label: 'Transactions uncategorized',
  type: 'transactions_uncategorized',
  priority: 'info' as const,
  ctaLabel: 'Categorize',
  periodLabel: 'Last 30d',
};

describe('ActionRequired', () => {
  it('shows empty state when no actions', () => {
    render(
      <ActionRequired
        actions={[]}
        title="Action required"
        emptyLabel="All clear"
        isLoading={false}
      />,
    );
    expect(screen.getByText('All clear')).toBeInTheDocument();
  });

  it('renders actions with priority badge', () => {
    render(
      <ActionRequired actions={[baseAction]} title="Action required" emptyLabel="All clear" />,
    );

    expect(screen.getByText('Transactions uncategorized')).toBeInTheDocument();
    const marker = Array.from(document.querySelectorAll('span')).find(node =>
      typeof node.className === 'string' && node.className.includes('bg-[#0584C7]'),
    );

    expect(marker).toBeTruthy();
  });

  it('uses readable foreground colors in dark mode action rows', () => {
    render(
      <ActionRequired
        actions={[{ ...baseAction, label: 'Parsing issues found', priority: 'warning' }]}
        title="Action required"
        emptyLabel="All clear"
      />,
    );

    const actionText = Array.from(document.querySelectorAll('span')).find(
      node => typeof node.className === 'string' && node.className.includes('text-foreground'),
    );
    const icon = Array.from(document.querySelectorAll('svg')).find(node =>
      typeof node.className.baseVal === 'string'
        ? node.className.baseVal.includes('text-muted-foreground')
        : String(node.getAttribute('class') || '').includes('text-muted-foreground'),
    );

    expect(actionText?.className).toContain('text-foreground');
    expect(actionText?.className).not.toContain('text-[#2A364E]');
    expect(icon).toBeTruthy();
  });
});
