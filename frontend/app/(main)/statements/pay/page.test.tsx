// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import StatementsPayPage from './page';

vi.mock('../components/StatementsSidePanel', () => ({
  default: ({ activeItem }: { activeItem: string }) => <div>side-panel:{activeItem}</div>,
}));

vi.mock('../components/StatementsListView', () => ({
  default: () => <div>legacy-statements-list-view</div>,
}));

vi.mock('../components/payables/PayablesView', () => ({
  PayablesView: () => <div>payables-view</div>,
}));

describe('StatementsPayPage', () => {
  it('renders the dedicated payables view', () => {
    render(<StatementsPayPage />);

    expect(screen.getByText('side-panel:pay')).toBeInTheDocument();
    expect(screen.getByText('payables-view')).toBeInTheDocument();
    expect(screen.queryByText('legacy-statements-list-view')).not.toBeInTheDocument();
  });
});
