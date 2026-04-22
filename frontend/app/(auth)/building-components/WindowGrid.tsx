'use client';

import { stableWindowNoise } from './shared';

interface WindowGridProps {
  cols?: number;
  rows?: number;
  density?: number;
}

const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 5;
const DEFAULT_DENSITY = 0.4;

export const WindowGrid = ({ cols = DEFAULT_COLS, rows = DEFAULT_ROWS, density = DEFAULT_DENSITY }: WindowGridProps): JSX.Element => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: '8px',
      padding: '12px',
      opacity: 0.3,
    }}
  >
    {[...Array(cols * rows).keys()].map(i => (
      <div
        // biome-ignore lint/suspicious/noArrayIndexKey: pure visual decoration
        key={i}
        style={{
          background:
            stableWindowNoise((cols + 11) * (rows + 7) * (i + 1)) < density
              ? 'white'
              : 'transparent',
        }}
      />
    ))}
  </div>
);
