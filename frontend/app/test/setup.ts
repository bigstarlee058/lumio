import { TextDecoder } from 'node:util';
import React from 'react';
import { vi } from 'vitest';

class TestTextEncoder {
  encode(input = ''): Uint8Array {
    return new Uint8Array(Buffer.from(input));
  }
}

Object.defineProperty(globalThis, 'TextEncoder', {
  configurable: true,
  writable: true,
  value: TestTextEncoder,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  configurable: true,
  writable: true,
  value: TextDecoder,
});

vi.mock('next/image', () => ({
  default: (props: { alt?: string; unoptimized?: boolean } & Record<string, unknown>) => {
    const { alt = '', unoptimized: Unoptimized, ...rest } = props;
    return React.createElement('img', { alt, ...rest });
  },
}));
