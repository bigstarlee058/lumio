import { type ThemeOptions, alpha, createTheme } from '@mui/material/styles';
import { getAppSurfaceTokens } from './mantine-theme';

export type ThemeMode = 'light' | 'dark';

const sharedOptions: Pick<ThemeOptions, 'shape' | 'typography' | 'components'> = {
  shape: { borderRadius: 0 },
  typography: {
    fontFamily:
      'var(--font-manrope), "Manrope", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 650, fontSize: '2.5rem' },
    h2: { fontWeight: 650, fontSize: '2rem' },
    h3: { fontWeight: 620, fontSize: '1.75rem' },
    h4: { fontWeight: 620, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 0, padding: '8px 18px' },
        contained: { boxShadow: 'none' },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 0, boxShadow: 'none', backgroundImage: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiFilledInput: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 0 } },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    // Avatar, Switch, CircularProgress intentionally NOT overridden (stay round)
  },
};

const paletteByMode: Record<ThemeMode, ThemeOptions['palette']> = {
  light: {
    mode: 'light',
    primary: {
      main: '#0284c7',
      light: '#38bdf8',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      light: '#64748b',
      dark: '#334155',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#4b5563',
    },
    divider: '#d7e2ef',
  },
  dark: {
    mode: 'dark',
    primary: {
      main: '#5B9BD5',
      light: '#7AAFE0',
      dark: '#4A8BC5',
      contrastText: '#0F1419',
    },
    secondary: {
      main: '#1A2332',
      light: '#243247',
      dark: '#121A26',
      contrastText: '#E2E8F0',
    },
    background: {
      default: '#0F1419',
      paper: '#151C24',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#8899AA',
    },
    divider: '#1E2A3A',
  },
};

export const createAppTheme = (mode: ThemeMode) => {
  const surfaces = getAppSurfaceTokens(mode);

  return createTheme({
    ...sharedOptions,
    palette: {
      ...paletteByMode[mode],
      action: {
        hover: alpha(surfaces.primary, mode === 'dark' ? 0.12 : 0.08),
      },
    },
  });
};

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
