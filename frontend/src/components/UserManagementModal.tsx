import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface UserItem {
  id_usuario: number;
  username: string;
  nombre: string;
  rol: string;
  activo: boolean;
  fecha_creacion: string | null;
}

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ open, onClose }) => {
  const { usuario } = useAuth();

  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('OPERADOR');

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchUsers();
      resetForm();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoadingList(true);
    try {
      const resp = await axios.get(
        `http://localhost:8008/api/auth/usuarios?solicitante_username=${usuario?.username || 'admin'}`
      );
      setUsersList(resp.data);
    } catch (err: any) {
      console.error('Error al cargar lista de usuarios:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setUsername('');
    setPassword('');
    setRol('OPERADOR');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos del formulario.');
      return;
    }

    setLoadingSubmit(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await axios.post('http://localhost:8008/api/auth/usuarios', {
        nombre: nombre.trim(),
        username: username.trim(),
        password: password.trim(),
        rol: rol,
        solicitante_username: usuario?.username || 'admin'
      });

      setSuccessMsg(`Usuario '${username}' creado exitosamente con contraseña cifrada en bcrypt.`);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear el usuario en el sistema.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: '#691C32', color: '#FFF', display: 'flex', alignItems: 'center' }}>
        <GroupIcon sx={{ mr: 1.5, color: '#BC955C' }} /> Gestión y Creación de Usuarios (Exclusivo Administrador)
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

        {/* Formulario de Alta de Usuario */}
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: '#F9F1F3', borderColor: '#E5C1CD' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#691C32', mb: 1.5, display: 'flex', alignItems: 'center' }}>
            <PersonAddIcon sx={{ mr: 1, fontSize: 20 }} /> Registrar Nuevo Usuario con Contraseña Cifrada
          </Typography>

          <Box component="form" onSubmit={handleCreateUser}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nombre Completo"
                  placeholder="Ej: Juan Pérez Morales"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nombre de Usuario (Username)"
                  placeholder="Ej: juan_perez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Rol de Usuario"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                >
                  <MenuItem value="OPERADOR">OPERADOR (Consulta y Validación Manual)</MenuItem>
                  <MenuItem value="ADMINISTRADOR">ADMINISTRADOR (Acceso Total + Importación)</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Stack direction="row" sx={{ mt: 2, justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loadingSubmit}
                startIcon={loadingSubmit ? <CircularProgress size={18} color="inherit" /> : <PersonAddIcon />}
                sx={{ bgcolor: '#691C32', fontWeight: 700, '&:hover': { bgcolor: '#471221' } }}
              >
                {loadingSubmit ? 'Guardando...' : 'Crear Usuario'}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Tabla de Usuarios Registrados */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#691C32', mb: 1, display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 0.75, fontSize: 18 }} /> Usuarios Registrados en la Base de Datos
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, borderColor: '#E2E8F0' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#691C32' }}>
              <TableRow>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem' }}>ID</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem' }}>Nombre Completo</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem' }}>Usuario</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem' }}>Rol</TableCell>
                <TableCell align="center" sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem' }}>Estatus</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                    <CircularProgress size={24} color="primary" />
                  </TableCell>
                </TableRow>
              ) : usersList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                usersList.map((u) => (
                  <TableRow key={u.id_usuario} hover>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>{u.id_usuario}</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 600, color: '#691C32' }}>{u.nombre}</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{u.username}</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>
                      <Chip
                        label={u.rol}
                        size="small"
                        color={u.rol === 'ADMINISTRADOR' ? 'primary' : 'default'}
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      <Chip
                        label={u.activo ? 'ACTIVO' : 'INACTIVO'}
                        size="small"
                        color={u.activo ? 'success' : 'error'}
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="inherit" sx={{ fontWeight: 700 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
