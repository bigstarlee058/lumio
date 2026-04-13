'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import type { WorkspaceTabId } from '@/app/lib/workspace-tabs';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useState } from 'react';
import WorkspaceSidePanel from './WorkspaceSidePanel';
import WorkspacesListContent from './WorkspacesListContent';

type Props = {
  activeItem: WorkspaceTabId;
  children: ReactNode;
};

export default function WorkspaceTabShell({ activeItem, children }: Props) {
  const router = useRouter();
  const { loading, currentWorkspace } = useWorkspace();
  const [isAllWorkspacesOpen, setIsAllWorkspacesOpen] = useState(false);

  useEffect(() => {
    if (!loading && !currentWorkspace) {
      router.replace('/workspaces/list');
    }
  }, [currentWorkspace, loading, router]);

  if (loading || !currentWorkspace) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - var(--global-nav-height, 0px))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={80} />
      </Box>
    );
  }

  return (
    <>
      <WorkspaceSidePanel
        activeItem={activeItem}
        isAllWorkspacesOpen={isAllWorkspacesOpen}
        onOpenAllWorkspaces={() => setIsAllWorkspacesOpen(true)}
      />
      {isAllWorkspacesOpen ? (
        <WorkspacesListContent
          embedded
          redirectPathOnSelect={null}
          onWorkspaceActivated={() => setIsAllWorkspacesOpen(false)}
          onCloseEmbedded={() => setIsAllWorkspacesOpen(false)}
        />
      ) : (
        children
      )}
    </>
  );
}
