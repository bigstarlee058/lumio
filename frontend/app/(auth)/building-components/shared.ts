import type React from 'react';

export interface BuildingProps {
  delay: number;
  duration: number;
  w?: number;
  h?: number;
  left?: string;
  right?: string;
}

export const stableWindowNoise = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
};
