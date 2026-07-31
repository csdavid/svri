import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { usuario, logout } = useAuth();

  return (
    <AppBar position="sticky" sx={{ bgcolor: '#691C32', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
      <Toolbar>
        <PrintIcon sx={{ mr: 1.5, fontSize: 32, color: '#BC955C' }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.5 }}>
          ANAM SVRI <Typography component="span" variant="caption" sx={{ color: '#E5D5C5', ml: 1 }}>Sistema de Validación de Reportes de Impresión</Typography>
        </Typography>

        {usuario && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              icon={<AccountCircleIcon style={{ color: '#FFF' }} />}
              label={`${usuario.nombre} (${usuario.username})`}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#FFF', fontWeight: 600 }}
            />

            <IconButton color="inherit" onClick={logout} title="Cerrar Sesión">
              <LogoutIcon />
            </IconButton>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
};

