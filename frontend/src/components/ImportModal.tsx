import React, { useState } from 'react';
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
  Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { ImportResult } from '../types';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, onSuccess }) => {
  const { usuario } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [periodoAnoi, setPeriodoAnoi] = useState('2026');
  const [periodoMes, setPeriodoMes] = useState('ABR');
  const [tipoRegistro, setTipoRegistro] = useState('FACTURACION_MENSUAL');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);

      if (selected.name.toLowerCase().includes('inicial')) {
        setPeriodoMes('INI');
        setTipoRegistro('LINEA_BASE_INICIAL');
      } else if (selected.name.toLowerCase().includes('abril')) {
        setPeriodoMes('ABR');
        setTipoRegistro('FACTURACION_MENSUAL');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo de Excel (.xlsx)');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('periodo_anoi', periodoAnoi);
    formData.append('periodo_mes', periodoMes);
    formData.append('tipo_registro', tipoRegistro);
    formData.append('usuario', usuario?.username || 'admin');

    try {
      const resp = await axios.post('/api/importar-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(resp.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al importar el archivo Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setResult(null);
    setError(null);
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCloseModal} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: '#691C32', color: '#FFF' }}>
        Importar Reporte de Impresión (Excel)
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {result ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#00875A', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#691C32' }}>
              ¡Importación Exitosa!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {result.mensaje}
            </Typography>

            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', mb: 2 }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1, color: '#691C32' }}>
                Resumen del Trabajo Realizado:
              </Typography>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mb: 1.5 }}>
                <Chip label={`Año Periodo: ${result.periodo_anoi}`} color="primary" size="small" variant="outlined" />
                <Chip label={`Mes Periodo: ${result.periodo_mes}`} color="primary" size="small" variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
                <Chip label={`Total Importados: ${result.total_registros}`} color="primary" size="small" />
                <Chip label={`Auto Válidos: ${result.registros_validos_auto}`} color="success" size="small" icon={<CheckCircleIcon />} />
                <Chip label={`Auto Observados: ${result.registros_observados_auto}`} color="warning" size="small" icon={<ErrorIcon />} />
              </Stack>
            </Box>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <Box
              sx={{
                border: '2px dashed #CBD5E1',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: '#F8FAFC',
                cursor: 'pointer',
                '&:hover': { borderColor: '#691C32', bgcolor: '#F9F1F3' }
              }}
              component="label"
            >
              <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileChange} />
              <CloudUploadIcon sx={{ fontSize: 48, color: '#691C32', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#691C32' }}>
                {file ? file.name : 'Haz clic para seleccionar o arrastrar el archivo Excel (.xlsx)'}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Formatos soportados: 00-iniciales.xlsx, 01-abril-2026.xlsx
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                fullWidth
                label="Año Periodo"
                value={periodoAnoi}
                onChange={(e) => setPeriodoAnoi(e.target.value)}
              >
                <MenuItem value="2026">2026</MenuItem>
                <MenuItem value="2025">2025</MenuItem>
              </TextField>

              <TextField
                select
                fullWidth
                label="Mes Periodo"
                value={periodoMes}
                onChange={(e) => setPeriodoMes(e.target.value)}
              >
                <MenuItem value="INI">INI (Lectura Inicial)</MenuItem>
                <MenuItem value="ENE">ENE</MenuItem>
                <MenuItem value="FEB">FEB</MenuItem>
                <MenuItem value="MAR">MAR</MenuItem>
                <MenuItem value="ABR">ABR (Abril)</MenuItem>
                <MenuItem value="MAY">MAY</MenuItem>
                <MenuItem value="JUN">JUN</MenuItem>
                <MenuItem value="JUL">JUL</MenuItem>
                <MenuItem value="AGO">AGO</MenuItem>
                <MenuItem value="SEP">SEP</MenuItem>
                <MenuItem value="OCT">OCT</MenuItem>
                <MenuItem value="NOV">NOV</MenuItem>
                <MenuItem value="DIC">DIC</MenuItem>
              </TextField>
            </Stack>

            <TextField
              select
              fullWidth
              label="Tipo de Registro"
              value={tipoRegistro}
              onChange={(e) => setTipoRegistro(e.target.value)}
            >
              <MenuItem value="FACTURACION_MENSUAL">Facturación Mensual</MenuItem>
              <MenuItem value="LINEA_BASE_INICIAL">Línea Base Inicial (Lecturas Iniciales)</MenuItem>
            </TextField>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {result ? (
          <Button variant="contained" onClick={handleCloseModal} color="primary">
            Cerrar y Ver Datos
          </Button>
        ) : (
          <>
            <Button onClick={handleCloseModal} color="inherit" disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              color="primary"
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            >
              {loading ? 'Procesando y Validando...' : 'Importar y Validar'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
