'use client';

import type { NavigationItem } from '../../types';
import React, { isValidElement } from 'react';

/** Render icon - handles both LucideIcon and ReactNode */
export function RenderIcon({
  icon,
  className,
  size = 16,
}: {
  icon: NavigationItem['icon'];
  className?: string;
  size?: number;
}): React.JSX.Element | null {
  if (!icon) return null;

  // If it's a React element, render it directly
  if (isValidElement(icon)) {
    return <span className={className}>{icon}</span>;
  }

  // If it's a Lucide icon component
  const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComponent size={size} className={className} />;
}
