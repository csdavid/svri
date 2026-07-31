export interface Usuario {
  id_usuario: number;
  username: string;
  nombre: string;
  rol: string;
}

export interface ColumnaVariable {
  id_columna: number;
  nombre_columna: string;
  valor_columna: string;
  es_valido: boolean | null;
}

export interface SeccionesFijas {
  lecturas_iniciales: {
    carta_bn: number;
    oficio_bn: number;
    doblecarta: number;
    carta_cl: number;
    oficio_cl: number;
    digitalizar: number;
  };
  lecturas_finales: {
    carta_bn: number;
    oficio_bn: number;
    doblecarta: number;
    carta_cl: number;
    oficio_cl: number;
    digitalizar: number;
  };
  volumen: {
    carta_bn: number;
    oficio_bn: number;
    doblecarta: number;
    carta_cl: number;
    oficio_cl: number;
    digitalizar: number;
  };
  precios: {
    carta_bn: number;
    oficio_bn: number;
    doblecarta: number;
    carta_cl: number;
    oficio_cl: number;
    digitalizar: number;
  };
  importes: {
    carta_bn: number;
    oficio_bn: number;
    doblecarta: number;
    carta_cl: number;
    oficio_cl: number;
    digitalizar: number;
  };
  totales: {
    subtotal: number;
    iva: number;
    total: number;
  };
}

export interface RegistroDetalle {
  id_registro: number;
  periodo_anoi: string;
  periodo_mes: string;
  tipo_registro: string;
  id_anam?: number;
  vpn?: string;
  estado?: string;
  unidad_administrativa?: string;
  unidad_administrativa_ii?: string;
  serie: string;
  modelo?: string;

  validacion_automatica: boolean | null;
  validacion_manual: boolean | null;
  fecha_validacion_manual?: string | null;
  observaciones_auto?: string;
  fecha_valida?: boolean | null;
  usuario_validacion?: string;

  categorias_variables: Record<string, ColumnaVariable[]>;
  secciones_fijas: SeccionesFijas;
}

export interface Periodo {
  periodo_anoi: string;
  periodo_mes: string;
}

export interface PeriodoEstatus {
  periodo_anoi: string;
  periodo_mes: string;
  total_registros: number;
  registros_validados: number;
  registros_pendientes: number;
  registros_aceptados: number;
  registros_rechazados: number;
}

export interface ImportResult {
  status: string;
  mensaje: string;
  periodo_anoi: string;
  periodo_mes: string;
  total_registros: number;
  registros_validos_auto: number;
  registros_observados_auto: number;
}
