import type { SxProps, Theme } from '@mui/material/styles';

export const sharedMuiTabsSx: SxProps<Theme> = {
  mb: { xs: 2, sm: 2 },
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  '& .MuiTabs-scroller': { overflowX: 'auto !important' },
  '& .MuiTabs-flexContainer': { width: 'max-content' },
  '& .MuiTab-root': {
    minWidth: { xs: 104, md: 90 },
    px: { xs: 1.5, md: 2 },
    fontSize: { xs: 16, md: 14 },
  },
};
