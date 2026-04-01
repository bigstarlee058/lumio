import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_ROUTE, getDefaultAppRoute } from './default-app-route';

describe('default app route', () => {
  it('uses dashboard as the default landing page', () => {
    expect(DEFAULT_APP_ROUTE).toBe('/dashboard');
    expect(getDefaultAppRoute()).toBe('/dashboard');
  });
});
