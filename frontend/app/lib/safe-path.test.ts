import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safe-path';

describe('safeInternalPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/invite/token?next=/dashboard#section', '/invite/token?next=/dashboard#section'],
  ])('allows internal path %s', (input, expected) => {
    expect(safeInternalPath(input)).toBe(expected);
  });

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\\\evil.example/path',
    '/%5C%5Cevil.example/path',
    ' /dashboard',
  ])('rejects unsafe path %s', input => {
    expect(safeInternalPath(input)).toBeNull();
  });
});
