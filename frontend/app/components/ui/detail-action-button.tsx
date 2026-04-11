'use client';

import { Button, type ButtonProps } from './button';

export function DetailActionButton({ ...props }: ButtonProps) {
  return <Button variant="outline" size="sm" {...props} />;
}
