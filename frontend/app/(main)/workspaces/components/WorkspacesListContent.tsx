'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useIntlayer } from '@/app/i18n';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import {
  Building2,
  ChevronRight,
  Grid,
  List,
  MoreVertical,
  Plus,
  Search,
  SortAsc,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { WorkspaceCard } from './WorkspaceCard';

type ViewMode = 'grid' | 'list';
type SortOption = 'alphabetical' | 'recent' | 'favorites';

type Props = {
  embedded?: boolean;
  redirectPathOnSelect?: string | null;
  onWorkspaceActivated?: () => void;
  onCloseEmbedded?: () => void;
};

export default function WorkspacesListContent({
  embedded,
  redirectPathOnSelect = '/workspaces/overview',
  onWorkspaceActivated,
}: Props) {
  const content = useIntlayer('workspaces-selector');
  const { currentWorkspace, workspaces, loading, switchWorkspace, refreshWorkspaces } =
    useWorkspace();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('favorites');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const searchPlaceholder = content.searchPlaceholder?.value || 'Search workspaces...';

  const handleCreateWorkspace = () => {
    router.push('/onboarding?mode=create-workspace');
  };

  const handleWorkspaceClick = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId);
      onWorkspaceActivated?.();

      if (redirectPathOnSelect) {
        router.push(redirectPathOnSelect);
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const filteredAndSortedWorkspaces = useMemo(() => {
    let filtered = workspaces;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = workspaces.filter(workspace => {
        const nameMatch = workspace.name.toLowerCase().includes(query);
        const descriptionMatch = workspace.description?.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortOption === 'favorites') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      }

      if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }

      if (sortOption === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return 0;
    });
  }, [workspaces, searchQuery, sortOption]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={100} />
          <Typography variant="body2" sx={{ mt: 2, color: '#4b5563' }}>{content.loading}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - var(--global-nav-height, 0px))',
        overflow: 'hidden',
        pt: embedded ? 2 : 0,
      }}
    >
      <Box sx={{ maxWidth: '100%', px: 3, py: 4 }}>
        {workspaces.length > 0 ? (
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ position: 'relative', flex: 1 }} data-tour-id="search-bar">
              <Search
                size={16}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                style={{
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  padding: '12px 16px 12px 44px',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                  borderRadius: 0,
                  boxSizing: 'border-box',
                }}
              />
            </Box>

            {!embedded ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Box sx={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    style={{
                      padding: 8,
                      border: '1px solid #d1d5db',
                      background: showSortMenu ? 'rgba(var(--primary-rgb,99,102,241),0.1)' : '#fff',
                      color: showSortMenu ? 'var(--primary)' : '#4b5563',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                    title="Sort options"
                  >
                    <SortAsc size={20} />
                  </button>
                  {showSortMenu && (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        mt: 0.5,
                        width: 192,
                        bgcolor: '#fff',
                        border: '1px solid #e5e7eb',
                        boxShadow: 3,
                        zIndex: 10,
                      }}
                    >
                      {[
                        { key: 'favorites' as SortOption, label: 'Favorites First' },
                        { key: 'alphabetical' as SortOption, label: 'Alphabetical' },
                        { key: 'recent' as SortOption, label: 'Recently Created' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { setSortOption(opt.key); setShowSortMenu(false); }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px 16px',
                            textAlign: 'left',
                            fontSize: 14,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: sortOption === opt.key ? 600 : 400,
                            color: sortOption === opt.key ? 'var(--primary)' : '#374151',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </Box>
                  )}
                </Box>

                {[
                  { mode: 'grid' as ViewMode, Icon: Grid, title: 'Grid view' },
                  { mode: 'list' as ViewMode, Icon: List, title: 'List view' },
                ].map(({ mode, Icon, title }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: 8,
                      border: '1px solid #d1d5db',
                      background: viewMode === mode ? 'rgba(var(--primary-rgb,99,102,241),0.1)' : '#fff',
                      color: viewMode === mode ? 'var(--primary)' : '#4b5563',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                    title={title}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </Box>
            ) : null}
          </Box>
        ) : null}

        {workspaces.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box sx={{ fontSize: 48, mb: 2 }}>
              <Building2 size={48} />
            </Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: '#111827' }}>
              {content.noWorkspaces}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#4b5563' }}>
              Create your first workspace to get started
            </Typography>
            <button
              type="button"
              onClick={handleCreateWorkspace}
              style={{ padding: '12px 24px', background: 'var(--primary)', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', borderRadius: 0 }}
            >
              {content.createWorkspace}
            </button>
          </Box>
        ) : filteredAndSortedWorkspaces.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box sx={{ mb: 2 }}>
              <Search size={48} />
            </Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: '#111827' }}>
              No workspaces found
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#4b5563' }}>
              Try adjusting your search query
            </Typography>
          </Box>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                    xl: 'repeat(4, 1fr)',
                  },
                  gap: 3,
                  mb: 4,
                }}
              >
                {filteredAndSortedWorkspaces.map(workspace => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onClick={() => handleWorkspaceClick(workspace.id)}
                    onFavoriteToggle={refreshWorkspaces}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleCreateWorkspace}
                  style={{
                    display: 'flex',
                    height: '100%',
                    width: '100%',
                    aspectRatio: '16/9',
                    cursor: 'pointer',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    padding: 24,
                    borderRadius: 0,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Plus size={30} strokeWidth={2.25} style={{ marginBottom: 12, color: 'var(--primary)' }} />
                  <Typography variant="h6" fontWeight={600} style={{ textAlign: 'center', color: '#111827' }}>
                    {content.createWorkspace}
                  </Typography>
                </button>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    mb: 4,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    bgcolor: 'var(--card)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(240px, 1.4fr) minmax(180px, 1fr) minmax(160px, 0.8fr) auto',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border)',
                      bgcolor: 'var(--muted)',
                      px: 3,
                      py: 1.5,
                      fontSize: 14,
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <span>Workspace name</span>
                    <span>Owner</span>
                    <span>Workspace type</span>
                    <span className="sr-only">Actions</span>
                  </Box>

                  <Box>
                    {filteredAndSortedWorkspaces.map(workspace => (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => handleWorkspaceClick(workspace.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(240px, 1.4fr) minmax(180px, 1fr) minmax(160px, 0.8fr) auto',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '16px 24px',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          borderRadius: 0,
                        }}
                      >
                        <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                            {workspace.name}
                          </span>
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>You</p>
                          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--muted-foreground)' }}>Current member</p>
                        </Box>

                        <Box>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
                            {workspace.memberRole || 'Workspace'}
                          </p>
                          {currentWorkspace?.id === workspace.id && (
                            <span style={{ display: 'inline-flex', marginTop: 4, border: '1px solid rgba(16,185,129,0.7)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', fontSize: 12, fontWeight: 600, color: '#047857', borderRadius: 0 }}>
                              Default
                            </span>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, color: 'var(--muted-foreground)' }}>
                          <MoreVertical size={18} />
                          <ChevronRight size={18} />
                        </Box>
                      </button>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 24px',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontWeight: 500,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                  >
                    <Plus size={14} />
                    {content.createWorkspace}
                  </button>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
