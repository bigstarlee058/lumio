'use client';

import type React from 'react';
import { glassStyle } from './shared';

interface BlockProps {
  w: number;
  h: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Block = ({ w, h, children, style = {} }: BlockProps): JSX.Element => (
  <div style={{ width: w, height: h, borderBottom: 'none', ...glassStyle, ...style }}>
    {children}
  </div>
);
