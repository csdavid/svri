import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  CircularProgress
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resp = await axios.post('http://localhost:8008/api/auth/login', {
        username,
        password
      });

      login(resp.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F4F6F9',
        py: 4
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={4}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 3
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: '#691C32', width: 56, height: 56 }}>
            <PrintIcon sx={{ fontSize: 32, color: '#BC955C' }} />
          </Avatar>

          <Typography component="h1" variant="h5" sx={{ fontWeight: 700, color: '#691C32', mt: 1 }}>
            ANAM SVRI
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Sistema de Validación de Reportes de Impresión
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Usuario"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 700, bgcolor: '#691C32', '&:hover': { bgcolor: '#471221' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
