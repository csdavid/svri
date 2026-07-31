from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    rol = Column(String(30), default="OPERADOR")
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class PrecioCatalogo(Base):
    __tablename__ = "precios_catalogo"

    id_precio = Column(Integer, primary_key=True, index=True)
    periodo_anoi = Column(String(4), nullable=False)
    periodo_mes = Column(String(3), nullable=False)
    precio_carta_bn = Column(Numeric(10, 4), default=0.7900)
    precio_oficio_bn = Column(Numeric(10, 4), default=0.8100)
    precio_doblecarta = Column(Numeric(10, 4), default=1.3000)
    precio_carta_cl = Column(Numeric(10, 4), default=2.0000)
    precio_oficio_cl = Column(Numeric(10, 4), default=2.1000)
    precio_digitalizar = Column(Numeric(10, 4), default=0.3300)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class LecturaFacturacionImpresion(Base):
    __tablename__ = "lecturas_facturacion_impresion"

    id_registro = Column(Integer, primary_key=True, index=True)
    periodo_anoi = Column(String(4), nullable=False, index=True)
    periodo_mes = Column(String(3), nullable=False, index=True)
    tipo_registro = Column(String(30), default="FACTURACION_MENSUAL")

    # Metadatos del Equipo (Sección 1)
    id_anam = Column(Integer, nullable=True)
    vpn = Column(String(50), nullable=True)
    estado = Column(String(100), nullable=True)
    unidad_administrativa = Column(String(150), nullable=True)
    unidad_administrativa_ii = Column(String(150), nullable=True)
    serie = Column(String(50), nullable=False, index=True)
    modelo = Column(String(100), nullable=True)

    # Secciones Fijas (9 a 14)
    lectura_inicial_carta_bn = Column(Integer, default=0)
    lectura_inicial_oficio_bn = Column(Integer, default=0)
    lectura_inicial_doblecarta = Column(Integer, default=0)
    lectura_inicial_carta_cl = Column(Integer, default=0)
    lectura_inicial_oficio_cl = Column(Integer, default=0)
    lectura_inicial_digitalizar = Column(Integer, default=0)

    lectura_final_carta_bn = Column(Integer, default=0)
    lectura_final_oficio_bn = Column(Integer, default=0)
    lectura_final_doblecarta = Column(Integer, default=0)
    lectura_final_carta_cl = Column(Integer, default=0)
    lectura_final_oficio_cl = Column(Integer, default=0)
    lectura_final_digitalizar = Column(Integer, default=0)

    volumen_carta_bn = Column(Integer, default=0)
    volumen_oficio_bn = Column(Integer, default=0)
    volumen_doblecarta = Column(Integer, default=0)
    volumen_carta_cl = Column(Integer, default=0)
    volumen_oficio_cl = Column(Integer, default=0)
    volumen_digitalizar = Column(Integer, default=0)

    precio_carta_bn = Column(Numeric(10, 4), default=0.0000)
    precio_oficio_bn = Column(Numeric(10, 4), default=0.0000)
    precio_doblecarta = Column(Numeric(10, 4), default=1.3000)
    precio_carta_cl = Column(Numeric(10, 4), default=0.0000)
    precio_oficio_cl = Column(Numeric(10, 4), default=0.0000)
    precio_digitalizar = Column(Numeric(10, 4), default=0.0000)

    importe_carta_bn = Column(Numeric(12, 2), default=0.00)
    importe_oficio_bn = Column(Numeric(12, 2), default=0.00)
    importe_doblecarta = Column(Numeric(12, 2), default=0.00)
    importe_carta_cl = Column(Numeric(12, 2), default=0.00)
    importe_oficio_cl = Column(Numeric(12, 2), default=0.00)
    importe_digitalizar = Column(Numeric(12, 2), default=0.00)

    subtotal = Column(Numeric(14, 2), default=0.00)
    iva = Column(Numeric(14, 2), default=0.00)
    total = Column(Numeric(14, 2), default=0.00)

    # Estatus de Validación (Campos booleanos con default NULL)
    validacion_automatica = Column(Boolean, nullable=True, default=None)  # NULL=Pendiente, True=OK, False=Obs
    validacion_manual = Column(Boolean, nullable=True, default=None)      # NULL=Pendiente, True=Correcto, False=Rechazado
    fecha_validacion_manual = Column(DateTime(timezone=True), nullable=True, default=None)
    observaciones_auto = Column(Text, nullable=True)
    fecha_valida = Column(Boolean, nullable=True, default=None)

    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    usuario_creacion = Column(String(50), default="SISTEMA")

    columnas_variables = relationship("LecturaFacturacionImpresionColumna", back_populates="registro_maestro", cascade="all, delete-orphan")


class LecturaFacturacionImpresionColumna(Base):
    __tablename__ = "lecturas_facturacion_impresion_columnas"

    id_columna = Column(Integer, primary_key=True, index=True)
    id_registro = Column(Integer, ForeignKey("lecturas_facturacion_impresion.id_registro", ondelete="CASCADE"), nullable=False, index=True)
    serie = Column(String(50), nullable=False)
    categoria = Column(String(50), nullable=False)
    nombre_columna = Column(String(150), nullable=False)
    valor_columna = Column(String(255), nullable=True)
    valor_num = Column(Integer, default=0)
    es_valido = Column(Boolean, nullable=True, default=None)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    registro_maestro = relationship("LecturaFacturacionImpresion", back_populates="columnas_variables")
