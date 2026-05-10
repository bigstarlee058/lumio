'use client';

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';
import type { UserTableRowProps } from './UserTableRow';
import { UserTableRow } from './UserTableRow';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  permissions: string[] | null;
  createdAt: string;
}

export interface UsersTableProps {
  loading: boolean;
  users: User[];
  localeCode: string;
  labels: UserTableRowProps['labels'];
  headerLabels: { key: string; label: React.ReactNode }[];
  onEditPermissions: (user: User) => void;
  onUpdateRole: ({ userId, newRole }: { userId: string; newRole: string }) => void;
  onToggleActive: (user: User) => void;
}

export function UsersTable({
  loading,
  users,
  localeCode,
  labels,
  headerLabels,
  onEditPermissions,
  onUpdateRole,
  onToggleActive,
}: UsersTableProps): React.JSX.Element {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {headerLabels.map(({ key, label }) => (
              <TableCell key={key}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <UserTableRow
              key={user.id}
              user={user}
              localeCode={localeCode}
              labels={labels}
              onEditPermissions={onEditPermissions}
              onUpdateRole={onUpdateRole}
              onToggleActive={onToggleActive}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
