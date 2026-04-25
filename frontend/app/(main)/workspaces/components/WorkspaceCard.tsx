'use client';

import { api } from '@/app/lib/api';
import Box from '@mui/material/Box';
import { Star } from '@/app/components/icons';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { tokens } from '@/lib/theme-tokens';

const getApiMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || fallback;
};

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    backgroundImage: string | null;
    isFavorite?: boolean;
  };
  onClick: () => void;
  onFavoriteToggle?: () => void;
}

export function WorkspaceCard({ workspace, onClick, onFavoriteToggle }: WorkspaceCardProps) {
  const [isFavorite, setIsFavorite] = useState(workspace.isFavorite || false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.patch(`/workspaces/${workspace.id}/favorite`);
      setIsFavorite(response.data.isFavorite);
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (error: unknown) {
      toast.error(getApiMessage(error, 'Failed to update favorite status'));
    }
  };

  const isExternalBackground = Boolean(
    workspace.backgroundImage &&
      (workspace.backgroundImage.startsWith('http://') ||
        workspace.backgroundImage.startsWith('https://') ||
        workspace.backgroundImage.startsWith('/')),
  );

  const backgroundImage = workspace.backgroundImage
    ? isExternalBackground
      ? workspace.backgroundImage
      : `/workspace-backgrounds/${workspace.backgroundImage}`
    : '/workspace-backgrounds/vidar-nordli-mathisen-641pLhGEEyg-unsplash.jpg';

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        aspectRatio: '16/9',
        transition: 'box-shadow 0.3s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{ position: 'relative', height: '100%', width: '100%', cursor: 'pointer', border: 'none', padding: 0, background: 'none', display: 'block' }}
      >
        {/* Background Image */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'transform 0.5s',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          }}
        />

        {/* Darkening Overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            transition: 'background-color 0.5s',
            bgcolor: isHovered ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)',
          }}
        />

        {/* Static Content (Visible by default) */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 2,
            transition: 'opacity 0.3s',
            opacity: isHovered ? 0.4 : 1,
          }}
        >
          <Box
            component="h3"
            sx={{
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              m: 0,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {workspace.name}
          </Box>
        </Box>

        {/* Animated Description (Slides in on hover) */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            p: 3,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              maxWidth: '80%',
              transition: 'all 0.5s ease-out',
              transform: isHovered ? 'translateX(0)' : 'translateX(-32px)',
              opacity: isHovered ? 1 : 0,
            }}
          >
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, lineHeight: 1.6, fontStyle: 'italic', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
              {workspace.description || 'No description provided'}
            </p>
          </Box>
        </Box>
      </button>

      {/* Star Button (Top Right) */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: 8,
          borderRadius: tokens.radius.full,
          border: 'none',
          cursor: 'pointer',
          transition: 'opacity 0.2s',
          opacity: isHovered || isFavorite ? 1 : 0,
          background: isFavorite ? '#eab308' : 'rgba(255,255,255,0.2)',
          backdropFilter: isFavorite ? undefined : 'blur(4px)',
          color: '#fff',
        }}
      >
        <Star size={18} style={{ fill: isFavorite ? 'currentColor' : 'none' }} />
      </button>
    </Box>
  );
}
