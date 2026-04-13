import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 600px at -5% -10%, rgba(2,132,199,0.12), transparent 55%), radial-gradient(1000px 500px at 110% -20%, rgba(56,189,248,0.12), transparent 58%), var(--background)',
      }}
    >
      {children}
    </Box>
  );
}
