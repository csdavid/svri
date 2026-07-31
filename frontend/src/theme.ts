import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#691C32', // ANAM Guinda Institucional
      light: '#9D2449', // Guinda Vino
      dark: '#471221',  // Guinda Oscuro
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00875A', // ANAM Success Emerald
      light: '#36B37E',
      dark: '#006644',
    },
    error: {
      main: '#DE350B',
    },
    warning: {
      main: '#FFAB00',
    },
    background: {
      default: '#F4F6F9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#172B4D',
      secondary: '#5E6C84',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 20px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
        },
      },
    },
  },
});
