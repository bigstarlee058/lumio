import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterAvatarRow } from './FilterAvatarRow';

describe('FilterAvatarRow', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders ReceiptIcon for receipt filter rows instead of the generic bank fallback icon', () => {
    act(() => {
      root.render(
        <FilterAvatarRow label="Receipt" bankName="receipt" selected={false} onClick={() => undefined} />,
      );
    });

    expect(container.querySelector('[data-testid="receipt-filter-icon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="bank-logo-fallback-icon"]')).toBeNull();
  });
});
