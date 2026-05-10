'use client';

import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import React from 'react';
import type { PermissionsHandlers } from '../hooks/usePermissionsHandlers';
import { UserPermissionsDialog } from './UserPermissionsDialog';
import type { UsersTableProps } from './UsersTable';
import { UsersTable } from './UsersTable';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  permissions: string[] | null;
  createdAt: string;
}

export interface UsersPageContentProps {
  title: React.ReactNode;
  searchLabel: string;
  refreshLabel: React.ReactNode;
  error: string | null;
  loading: boolean;
  searchTerm: string;
  filteredUsers: User[];
  localeCode: string;
  headerLabels: UsersTableProps['headerLabels'];
  rowLabels: UsersTableProps['labels'];
  allPermissions: { value: string; label: string }[];
  dialogLabels: {
    titlePrefix: string;
    rolePrefix: string;
    subtitleSuffix: React.ReactNode;
    resetDefaults: React.ReactNode;
    cancel: React.ReactNode;
    save: React.ReactNode;
  };
  perms: PermissionsHandlers;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onUpdateRole: ({ userId, newRole }: { userId: string; newRole: string }) => void;
  onToggleActive: (user: User) => void;
}

export function UsersPageContent({
  title,
  searchLabel,
  refreshLabel,
  error,
  loading,
  searchTerm,
  filteredUsers,
  localeCode,
  headerLabels,
  rowLabels,
  allPermissions,
  dialogLabels,
  perms,
  onSearchChange,
  onRefresh,
  onUpdateRole,
  onToggleActive,
}: UsersPageContentProps): React.JSX.Element {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <Paper sx={{ mt: 3 }}>
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              label={searchLabel}
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <Button variant="outlined" onClick={onRefresh} disabled={loading}>
              {refreshLabel}
            </Button>
          </Box>
          <UsersTable
            loading={loading}
            users={filteredUsers}
            localeCode={localeCode}
            labels={rowLabels}
            headerLabels={headerLabels}
            onEditPermissions={perms.handleEditPermissions}
            onUpdateRole={onUpdateRole}
            onToggleActive={onToggleActive}
          />
        </Box>
      </Paper>
      <UserPermissionsDialog
        open={perms.permissionsDialogOpen}
        editingUser={perms.editingUser}
        selectedPermissions={perms.selectedPermissions}
        saving={perms.saving}
        allPermissions={allPermissions}
        labels={dialogLabels}
        onClose={perms.handleCloseDialog}
        onSave={perms.handleSavePermissions}
        onReset={perms.handleResetPermissions}
        onToggle={perms.handleTogglePermission}
      />
    </Container>
  );
}
