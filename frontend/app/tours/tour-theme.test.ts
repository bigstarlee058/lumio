import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (...segments: string[]): string =>
  readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('tour theme styles', () => {
  it('uses dark design tokens for Driver.js popovers in dark mode', () => {
    const source = readSource('app', 'styles', 'vendors', '_tour-theme.scss');

    expect(source).toContain('background-color: $color-card-bg-dk;');
    expect(source).toContain('color: $color-foreground-dk;');
    expect(source).toContain('border-color: $color-border-dk;');
    expect(source).toContain('border-color: $color-card-bg-dk;');
    expect(source).toContain('border-top-color: $color-card-bg-dk;');
    expect(source).toContain('border-bottom-color: $color-card-bg-dk;');
    expect(source).toContain('border-left-color: $color-card-bg-dk;');
    expect(source).toContain('border-right-color: $color-card-bg-dk;');
  });
});
