import { describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import HomePage from './page';

describe('HomePage', () => {
  it('redirects the root route to dashboard', () => {
    HomePage();

    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
