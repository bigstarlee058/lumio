'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { X } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { ModalShell } from './ui/modal-shell';

export interface ChangelogEntry {
  id: string;
  title: string;
  summary: string;
  markdown: string;
  date: string;
  version?: string;
  branch?: string;
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ChangelogEntry | null;
  releaseLabel: string;
  closeLabel: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <Typography
      variant="h4"
      component="h1"
      sx={{ mb: 2, fontWeight: 600, lineHeight: 1.25, color: '#0f3428' }}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      variant="h5"
      component="h2"
      sx={{ mb: 1.5, mt: 4, fontWeight: 600, lineHeight: 1.25, color: '#0f3428' }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography
      variant="h6"
      component="h3"
      sx={{ mb: 1, mt: 3, fontWeight: 600, lineHeight: 1.25, color: '#0f3428' }}
    >
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography component="p" sx={{ mb: 2, color: '#2f4a3f' }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box
      component="ul"
      sx={{ mb: 2.5, pl: 3, color: '#2f4a3f', listStyleType: 'disc', '& li': { mb: 0.5 } }}
    >
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box
      component="ol"
      sx={{ mb: 2.5, pl: 3, color: '#2f4a3f', listStyleType: 'decimal', '& li': { mb: 0.5 } }}
    >
      {children}
    </Box>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 600, color: '#17352b' }}>
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box
      component="code"
      sx={{ bgcolor: '#edf3ed', px: 0.75, py: 0.25, fontSize: 13, color: '#1a4638', borderRadius: 0 }}
    >
      {children}
    </Box>
  ),
};

export function ChangelogModal({
  isOpen,
  onClose,
  entry,
  releaseLabel,
  closeLabel,
}: ChangelogModalProps) {
  if (!entry) {
    return null;
  }

  const formattedDate = new Date(entry.date).toLocaleString();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-none overflow-hidden rounded-[22px] border border-[#d4e3d6] shadow-[0_24px_80px_rgba(16,24,40,0.16)]"
      contentClassName="!h-full !p-0"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: 'background.paper' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: '1px solid #e4e6e3',
            px: 2.5,
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#6f7a73' }}
            >
              {releaseLabel}
            </Typography>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, lineHeight: 1.25, color: '#0f3428' }}>
              {entry.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#607168' }}>
              {formattedDate}
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            aria-label={closeLabel}
            sx={{ color: '#9aa39e', '&:hover': { bgcolor: '#eef2ee', color: '#6f7773' } }}
          >
            <X size={30} strokeWidth={2.4} />
          </IconButton>
        </Box>

        <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', bgcolor: '#f5f7f4', px: 2.5, py: 3.5 }}>
          <Box
            component="article"
            sx={{
              mx: 'auto',
              width: '100%',
              maxWidth: '56rem',
              border: '1px solid #dde5dd',
              bgcolor: 'background.paper',
              px: { xs: 3, sm: 4 },
              py: { xs: 3, sm: 4 },
              fontSize: 15,
              lineHeight: 1.75,
              color: '#17352b',
            }}
          >
            <div className="changelog-markdown">
              <ReactMarkdown components={markdownComponents}>{entry.markdown}</ReactMarkdown>
            </div>
          </Box>
        </Box>
      </Box>
    </ModalShell>
  );
}
