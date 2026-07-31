import React from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './pages/LoginView';
import { ManualValidationView } from './pages/ManualValidationView';

const MainApp: React.FC = () => {
  const { usuario } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F4F6F9' }}>
      <Navbar />
      {usuario ? <ManualValidationView /> : <LoginView />}
    </Box>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
