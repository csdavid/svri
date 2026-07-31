import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  Checkbox,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Autocomplete,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import axios from 'axios';
import type { Periodo, RegistroDetalle, PeriodoEstatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { ImportModal } from '../components/ImportModal';
import { UserManagementModal } from '../components/UserManagementModal';

// Helper function to format numbers with thousand separators (,) and 2 decimal places (.00)
const formatNumber = (val: number | null | undefined, decimals = 0): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val);
};

export const ManualValidationView: React.FC = () => {
  const { usuario } = useAuth();

  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);

  const [selectedAnio, setSelectedAnio] = useState<string>('2026');
  const [selectedMes, setSelectedMes] = useState<string>('ABR');

  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [periodoEstatus, setPeriodoEstatus] = useState<PeriodoEstatus | null>(null);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [detalle, setDetalle] = useState<RegistroDetalle | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [columnStates, setColumnStates] = useState<Record<number, boolean>>({});
  const [fechaValida, setFechaValida] = useState<boolean>(false);

  useEffect(() => {
    fetchPeriodos();
  }, []);

  useEffect(() => {
    if (selectedAnio && selectedMes) {
      fetchSeries(selectedAnio, selectedMes);
      fetchPeriodoEstatus(selectedAnio, selectedMes);
    }
  }, [selectedAnio, selectedMes]);

  const fetchPeriodos = async () => {
    try {
      const resp = await axios.get('http://localhost:8008/api/periodos');
      const data: Periodo[] = resp.data;
      if (data.length > 0) {
        setSelectedAnio(data[0].periodo_anoi);
        setSelectedMes(data[0].periodo_mes);
      }
    } catch (err) {
      console.error('Error cargando periodos:', err);
    }
  };

  const fetchSeries = async (anio: string, mes: string) => {
    try {
      const resp = await axios.get(`http://localhost:8008/api/series?periodo_anoi=${anio}&periodo_mes=${mes}`);
      setSeriesList(resp.data);
      if (resp.data.length > 0) {
        setSelectedSerie(resp.data[0]);
      } else {
        setSelectedSerie('');
        setDetalle(null);
      }
    } catch (err) {
      console.error('Error cargando series:', err);
    }
  };

  const fetchPeriodoEstatus = async (anio: string, mes: string) => {
    try {
      const resp = await axios.get(`http://localhost:8008/api/periodo-estatus?periodo_anoi=${anio}&periodo_mes=${mes}`);
      setPeriodoEstatus(resp.data);
    } catch (err) {
      console.error('Error cargando estatus del periodo:', err);
    }
  };

  const handleBuscar = async () => {
    if (!selectedAnio || !selectedMes || !selectedSerie) {
      setErrorMsg('Por favor selecciona un periodo y número de serie válido.');
      return;
    }

    setLoadingData(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await axios.get(
        `http://localhost:8008/api/registro-detalle?periodo_anoi=${selectedAnio}&periodo_mes=${selectedMes}&serie=${encodeURIComponent(selectedSerie)}`
      );
      const data: RegistroDetalle = resp.data;
      setDetalle(data);

      const initialColsState: Record<number, boolean> = {};
      Object.values(data.categorias_variables).forEach((cols) => {
        cols.forEach((col) => {
          initialColsState[col.id_columna] = col.es_valido ?? true;
        });
      });
      setColumnStates(initialColsState);

      setFechaValida(data.fecha_valida ?? false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error consultando el detalle del registro.');
      setDetalle(null);
    } finally {
      setLoadingData(false);
    }
  };

  const handleColumnToggle = (idColumna: number) => {
    setColumnStates((prev) => ({
      ...prev,
      [idColumna]: !prev[idColumna]
    }));
  };

  const allColumnsValid = Object.values(columnStates).every((val) => val === true);
  const isAceptarEnabled = allColumnsValid && fechaValida;
  const isRechazarEnabled = allColumnsValid || !fechaValida;

  const handleDecision = async (decision: 'ACEPTAR' | 'RECHAZAR') => {
    if (!detalle) return;

    try {
      const payload = {
        id_registro: detalle.id_registro,
        fecha_valida: fechaValida,
        decision: decision,
        usuario: usuario?.username || 'admin',
        columnas_estados: Object.entries(columnStates).map(([idColStr, esVal]) => ({
          id_columna: parseInt(idColStr, 10),
          es_valido: esVal
        }))
      };

      await axios.post('http://localhost:8008/api/validar-manual', payload);
      setSuccessMsg(`Registro ${selectedSerie} ${decision === 'ACEPTAR' ? 'ACEPTADO' : 'RECHAZADO'} correctamente.`);
      
      fetchPeriodoEstatus(selectedAnio, selectedMes);
      handleBuscar();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar la decisión de validación.');
    }
  };

  const handleExportarExcel = async () => {
    if (!selectedAnio || !selectedMes) return;
    try {
      const response = await axios.get(
        `http://localhost:8008/api/exportar-excel?periodo_anoi=${selectedAnio}&periodo_mes=${selectedMes}`,
        { responseType: 'blob' }
      );

      let filename = '';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^'";]+)['"]?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      if (!filename) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const fechaDdmmyyyy = `${day}${month}${year}`;
        filename = `${selectedAnio}-${selectedMes}-validacion-${fechaDdmmyyyy}.xlsx`;
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 200);
    } catch (err) {
      console.error('Error al exportar archivo Excel:', err);
      setErrorMsg('Error al descargar el archivo Excel de exportación.');
    }
  };

  const getEstatusManualLabel = (val: boolean | null | undefined) => {
    if (val === true) return { label: 'Correcto', color: 'success' as const };
    if (val === false) return { label: 'Rechazado', color: 'error' as const };
    return { label: 'Pendiente', color: 'default' as const };
  };

  const seccionesConValores = detalle
    ? Object.entries(detalle.categorias_variables).filter(([_, cols]) => cols.length > 0)
    : [];

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Filtro Compacto con Indicadores de Estatus del Periodo */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#FFFFFF', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#691C32' }}>
            Validación Manual de Reportes de Impresión
          </Typography>

          {periodoEstatus && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={`Total: ${formatNumber(periodoEstatus.total_registros, 0)}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.75rem', borderColor: '#691C32', color: '#691C32' }}
              />
              <Chip
                icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
                label={`Validados: ${formatNumber(periodoEstatus.registros_validados, 0)}`}
                size="small"
                color="success"
                sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#00875A' }}
              />
              <Chip
                icon={<HourglassEmptyIcon style={{ fontSize: 16 }} />}
                label={`Pendientes: ${formatNumber(periodoEstatus.registros_pendientes, 0)}`}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#D97706', color: '#FFF' }}
              />
            </Stack>
          )}
        </Stack>

        {errorMsg && <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{errorMsg}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>{successMsg}</Alert>}

        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Año del Periodo"
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(e.target.value)}
            >
              <MenuItem value="2026">2026</MenuItem>
              <MenuItem value="2025">2025</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Mes del Periodo"
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
            >
              <MenuItem value="INI">INI (Línea Base Inicial)</MenuItem>
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
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              freeSolo
              size="small"
              options={seriesList}
              value={selectedSerie}
              onInputChange={(_, newValue) => setSelectedSerie(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Número de Serie" placeholder="Ej: JPCCR1H101" />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 2 }}>
            <Button
              fullWidth
              variant="contained"
              size="medium"
              onClick={handleBuscar}
              startIcon={loadingData ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              sx={{ height: 40, fontWeight: 700, fontSize: '0.85rem', bgcolor: '#691C32', '&:hover': { bgcolor: '#471221' } }}
            >
              Buscar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Detalle del Registro */}
      {detalle && (
        <Stack spacing={2}>
          {/* Tarjeta de Impresora Colapsable */}
          <Accordion
            defaultExpanded={false}
            sx={{
              borderRadius: '8px !important',
              overflow: 'hidden',
              boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #CBD5E1'
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#691C32' }} />}
              sx={{
                bgcolor: detalle.validacion_automatica ? '#E6F4EA' : '#FFEBEE',
                borderLeft: `6px solid ${detalle.validacion_automatica ? '#00875A' : '#DE350B'}`,
                py: 0.5,
                minHeight: 48
              }}
            >
              <Stack direction="row" spacing={3} sx={{ alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#691C32', fontSize: '0.9rem' }}>
                    Serie: <strong>{detalle.serie}</strong> &nbsp;|&nbsp; Modelo: <strong>{detalle.modelo || 'N/A'}</strong>
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                    Estatus Validación Manual:
                  </Typography>
                  <Chip
                    size="small"
                    label={getEstatusManualLabel(detalle.validacion_manual).label}
                    color={getEstatusManualLabel(detalle.validacion_manual).color}
                    sx={{ fontWeight: 700, fontSize: '0.75rem', px: 1 }}
                  />
                  <Chip
                    size="small"
                    label={detalle.validacion_automatica ? "AUTO-OK" : "AUTO-OBSERVADO"}
                    color={detalle.validacion_automatica ? "success" : "warning"}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  />
                </Stack>
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ bgcolor: '#F8FAFC', p: 2 }}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Unidad Administrativa:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{detalle.unidad_administrativa || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Unidad Adm II:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{detalle.unidad_administrativa_ii || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>VPN:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{detalle.vpn || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>ID ANAM:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{detalle.id_anam || 'N/A'}</Typography>
                </Grid>
              </Grid>

              {detalle.observaciones_auto && (
                <Box sx={{ mt: 1.5, p: 1, bgcolor: '#FFF3E0', borderRadius: 1, border: '1px solid #FFE0B2' }}>
                  <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                    <InfoOutlinedIcon fontSize="small" sx={{ mr: 0.5, fontSize: 14 }} /> Observación Automática: {detalle.observaciones_auto}
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Tabla de Validación */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.9rem', color: '#691C32' }}>
              Validación de Contadores (Secciones Variables)
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', borderRadius: 1.5, borderColor: '#E2E8F0' }}>
              <Table size="small" sx={{ minWidth: 500 }}>
                <TableHead sx={{ bgcolor: '#691C32' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem', width: '50%' }}>
                      Nombre de Columna
                    </TableCell>
                    <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem', width: '35%' }}>
                      Valor
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#FFF', fontWeight: 700, py: 0.75, fontSize: '0.75rem', width: '15%' }}>
                      Válido
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seccionesConValores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 2, color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        No hay contadores con valores reportados en las secciones variables para este equipo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    seccionesConValores.map(([categoria, columnas]) => {
                      const totalSeccion = columnas.reduce((acc, col) => {
                        const num = parseFloat(col.valor_columna);
                        return acc + (!isNaN(num) ? num : 0);
                      }, 0);

                      return (
                        <React.Fragment key={categoria}>
                          <TableRow sx={{ bgcolor: '#F9F1F3' }}>
                            <TableCell colSpan={3} sx={{ py: 0.5, fontSize: '0.8rem', borderBottom: '1px solid #E5C1CD' }}>
                              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#691C32', fontSize: '0.8rem' }}>
                                  {categoria} ({columnas.length} contadores)
                                </Typography>
                                <Chip
                                  label={`Sumatoria Sección: ${formatNumber(totalSeccion, 0)}`}
                                  size="small"
                                  sx={{ bgcolor: '#691C32', color: '#FFF', fontWeight: 700, fontSize: '0.75rem', height: 22 }}
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {columnas.map((col) => {
                            const numVal = parseFloat(col.valor_columna);
                            const formattedDisplay = !isNaN(numVal) ? formatNumber(numVal, 0) : col.valor_columna;

                            return (
                              <TableRow key={col.id_columna} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ py: 0.35, fontSize: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                                  {col.nombre_columna}
                                </TableCell>
                                <TableCell sx={{ py: 0.35, fontSize: '0.75rem', fontWeight: 600, color: '#691C32', borderBottom: '1px solid #F1F5F9' }}>
                                  {formattedDisplay}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 0.1, borderBottom: '1px solid #F1F5F9' }}>
                                  <Checkbox
                                    size="small"
                                    checked={columnStates[col.id_columna] ?? true}
                                    onChange={() => handleColumnToggle(col.id_columna)}
                                    color="success"
                                    sx={{ py: 0 }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}

                  <TableRow sx={{ bgcolor: '#F8FAFC', borderTop: '2px solid #CBD5E1' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700, color: '#691C32', py: 0.75, fontSize: '0.8rem' }}>
                      Fecha del formato es correcta
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.25 }}>
                      <Checkbox
                        size="small"
                        checked={fechaValida}
                        onChange={(e) => setFechaValida(e.target.checked)}
                        color="primary"
                        sx={{ py: 0 }}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                size="small"
                disabled={!isRechazarEnabled}
                onClick={() => handleDecision('RECHAZAR')}
                startIcon={<CancelOutlinedIcon />}
                sx={{ px: 3, py: 0.75, fontWeight: 700, fontSize: '0.8rem' }}
              >
                Rechazar
              </Button>

              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={!isAceptarEnabled}
                onClick={() => handleDecision('ACEPTAR')}
                startIcon={<CheckCircleIcon />}
                sx={{ px: 3, py: 0.75, fontWeight: 700, fontSize: '0.8rem', bgcolor: '#00875A', '&:hover': { bgcolor: '#006644' } }}
              >
                Aceptar
              </Button>
            </Stack>
          </Paper>

          {/* Tabla Resumen de Secciones Fijas */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.9rem', color: '#691C32' }}>
              Resumen de Secciones Fijas (Secciones 9 a 14)
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', borderRadius: 1.5, borderColor: '#E2E8F0' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#691C32' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Concepto</TableCell>
                    <TableCell align="right" sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Carta BN</TableCell>
                    <TableCell align="right" sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Oficio BN</TableCell>
                    <TableCell align="right" sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Doble Carta</TableCell>
                    <TableCell align="right" sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Carta Color</TableCell>
                    <TableCell align="right" sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Oficio Color</TableCell>
                    <TableCell align="right" sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>Digitalización</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 0.35, fontSize: '0.75rem' }}>9. Lecturas Iniciales</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_iniciales.carta_bn)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_iniciales.oficio_bn)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_iniciales.doblecarta)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_iniciales.carta_cl)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_iniciales.oficio_cl)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_iniciales.digitalizar)}</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 0.35, fontSize: '0.75rem' }}>10. Lecturas Finales</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_finales.carta_bn)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_finales.oficio_bn)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_finales.doblecarta)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_finales.carta_cl)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_finales.oficio_cl)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.lecturas_finales.digitalizar)}</TableCell>
                  </TableRow>

                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#691C32', py: 0.35, fontSize: '0.75rem' }}>11. Volumen Consumido</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.volumen.carta_bn)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.volumen.oficio_bn)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.volumen.doblecarta)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.volumen.carta_cl)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.volumen.oficio_cl)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 0.35, fontSize: '0.75rem' }}>{formatNumber(detalle.secciones_fijas.volumen.digitalizar)}</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 0.35, fontSize: '0.75rem' }}>12. Precios Unitarios ($)</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.precios.carta_bn, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.precios.oficio_bn, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.precios.doblecarta, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.precios.carta_cl, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.precios.oficio_cl, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.precios.digitalizar, 2)}</TableCell>
                  </TableRow>

                  <TableRow sx={{ bgcolor: '#F9F1F3' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#691C32', py: 0.35, fontSize: '0.75rem' }}>13. Importes Facturación ($)</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.importes.carta_bn, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.importes.oficio_bn, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.importes.doblecarta, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.importes.carta_cl, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.importes.oficio_cl, 2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.35, fontSize: '0.75rem' }}>${formatNumber(detalle.secciones_fijas.importes.digitalizar, 2)}</TableCell>
                  </TableRow>

                  <TableRow sx={{ bgcolor: '#691C32', color: '#FFF' }}>
                    <TableCell sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>14. Totales Financieros</TableCell>
                    <TableCell align="right" colSpan={2} sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>
                      Subtotal: ${formatNumber(detalle.secciones_fijas.totales.subtotal, 2)}
                    </TableCell>
                    <TableCell align="right" colSpan={2} sx={{ color: '#FFF', fontWeight: 700, py: 0.5, fontSize: '0.75rem' }}>
                      IVA (16%): ${formatNumber(detalle.secciones_fijas.totales.iva, 2)}
                    </TableCell>
                    <TableCell align="right" colSpan={2} sx={{ color: '#BC955C', fontWeight: 800, py: 0.5, fontSize: '0.85rem' }}>
                      TOTAL: ${formatNumber(detalle.secciones_fijas.totales.total, 2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}

      {/* Botones de acción al final de la página (Importar Excel, Crear Usuario, Exportar a Excel) */}
      <Box sx={{ mt: 4, mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.username === 'admin') && (
            <>
              <Button
                variant="contained"
                size="large"
                onClick={() => setImportOpen(true)}
                startIcon={<CloudUploadIcon />}
                sx={{
                  bgcolor: '#9D2449',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.2,
                  borderRadius: 2,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(157,36,73,0.25)',
                  '&:hover': { bgcolor: '#B32854' }
                }}
              >
                Importar Excel
              </Button>

              <Button
                variant="contained"
                size="large"
                onClick={() => setUserModalOpen(true)}
                startIcon={<PersonAddIcon />}
                sx={{
                  bgcolor: '#691C32',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.2,
                  borderRadius: 2,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(105,28,50,0.25)',
                  '&:hover': { bgcolor: '#471221' }
                }}
              >
                Crear Usuario
              </Button>
            </>
          )}

          <Button
            variant="contained"
            size="large"
            disabled={!selectedAnio || !selectedMes}
            onClick={handleExportarExcel}
            startIcon={<FileDownloadIcon />}
            sx={{
              bgcolor: '#00875A',
              fontWeight: 700,
              px: 3.5,
              py: 1.2,
              borderRadius: 2,
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(0,135,90,0.25)',
              '&:hover': { bgcolor: '#006644' }
            }}
          >
            {`Exportar ${selectedAnio}-${selectedMes} a Excel`}
          </Button>
        </Stack>
      </Box>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          fetchPeriodos();
          if (selectedAnio && selectedMes) {
            fetchSeries(selectedAnio, selectedMes);
            fetchPeriodoEstatus(selectedAnio, selectedMes);
          }
        }}
      />

      <UserManagementModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
      />
    </Container>
  );
};
