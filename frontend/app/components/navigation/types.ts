import type React from 'react';
import type { UserMenuTriggerAndDropdown } from './UserMenu';

export type NavItem = {
  path: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  permission: string;
};

export type UserMenuTriggerProps = React.ComponentProps<typeof UserMenuTriggerAndDropdown>;
