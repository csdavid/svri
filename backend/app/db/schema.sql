-- DDL para PostgreSQL - Sistema de Validación de Reportes de Impresión (SVRI)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS lecturas_facturacion_impresion_columnas CASCADE;
DROP TABLE IF EXISTS lecturas_facturacion_impresion CASCADE;
DROP TABLE IF EXISTS precios_catalogo CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'OPERADOR',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE precios_catalogo (
    id_precio SERIAL PRIMARY KEY,
    periodo_anoi VARCHAR(4) NOT NULL,
    periodo_mes VARCHAR(3) NOT NULL,
    precio_carta_bn NUMERIC(10, 4) NOT NULL DEFAULT 0.7900,
    precio_oficio_bn NUMERIC(10, 4) NOT NULL DEFAULT 0.8100,
    precio_doblecarta NUMERIC(10, 4) NOT NULL DEFAULT 1.3000,
    precio_carta_cl NUMERIC(10, 4) NOT NULL DEFAULT 2.0000,
    precio_oficio_cl NUMERIC(10, 4) NOT NULL DEFAULT 2.1000,
    precio_digitalizar NUMERIC(10, 4) NOT NULL DEFAULT 0.3300,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_precios_periodo UNIQUE (periodo_anoi, periodo_mes)
);

CREATE TABLE lecturas_facturacion_impresion (
    id_registro SERIAL PRIMARY KEY,
    periodo_anoi VARCHAR(4) NOT NULL,
    periodo_mes VARCHAR(3) NOT NULL,
    tipo_registro VARCHAR(30) NOT NULL DEFAULT 'FACTURACION_MENSUAL',
    
    -- Metadatos del Equipo (Sección 1)
    id_anam INT,
    vpn VARCHAR(50),
    estado VARCHAR(100),
    unidad_administrativa VARCHAR(150),
    unidad_administrativa_ii VARCHAR(150),
    serie VARCHAR(50) NOT NULL,
    modelo VARCHAR(100),

    -- Secciones Fijas (9 a 14)
    lectura_inicial_carta_bn INT DEFAULT 0,
    lectura_inicial_oficio_bn INT DEFAULT 0,
    lectura_inicial_doblecarta INT DEFAULT 0,
    lectura_inicial_carta_cl INT DEFAULT 0,
    lectura_inicial_oficio_cl INT DEFAULT 0,
    lectura_inicial_digitalizar INT DEFAULT 0,

    lectura_final_carta_bn INT DEFAULT 0,
    lectura_final_oficio_bn INT DEFAULT 0,
    lectura_final_doblecarta INT DEFAULT 0,
    lectura_final_carta_cl INT DEFAULT 0,
    lectura_final_oficio_cl INT DEFAULT 0,
    lectura_final_digitalizar INT DEFAULT 0,

    volumen_carta_bn INT DEFAULT 0,
    volumen_oficio_bn INT DEFAULT 0,
    volumen_doblecarta INT DEFAULT 0,
    volumen_carta_cl INT DEFAULT 0,
    volumen_oficio_cl INT DEFAULT 0,
    volumen_digitalizar INT DEFAULT 0,

    precio_carta_bn NUMERIC(10, 4) DEFAULT 0.0000,
    precio_oficio_bn NUMERIC(10, 4) DEFAULT 0.0000,
    precio_doblecarta NUMERIC(10, 4) DEFAULT 0.0000,
    precio_carta_cl NUMERIC(10, 4) DEFAULT 0.0000,
    precio_oficio_cl NUMERIC(10, 4) DEFAULT 0.0000,
    precio_digitalizar NUMERIC(10, 4) DEFAULT 0.0000,

    importe_carta_bn NUMERIC(12, 2) DEFAULT 0.00,
    importe_oficio_bn NUMERIC(12, 2) DEFAULT 0.00,
    importe_doblecarta NUMERIC(12, 2) DEFAULT 0.00,
    importe_carta_cl NUMERIC(12, 2) DEFAULT 0.00,
    importe_oficio_cl NUMERIC(12, 2) DEFAULT 0.00,
    importe_digitalizar NUMERIC(12, 2) DEFAULT 0.00,

    subtotal NUMERIC(14, 2) DEFAULT 0.00,
    iva NUMERIC(14, 2) DEFAULT 0.00,
    total NUMERIC(14, 2) DEFAULT 0.00,

    -- Estatus de Validación (Campos booleanos con DEFAULT NULL)
    validacion_automatica BOOLEAN DEFAULT NULL,  -- NULL = Pendiente, TRUE = OK, FALSE = Observado
    validacion_manual BOOLEAN DEFAULT NULL,      -- NULL = Pendiente, TRUE = Correcto, FALSE = Rechazado
    fecha_validacion_manual TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    observaciones_auto TEXT,
    fecha_valida BOOLEAN DEFAULT NULL,

    -- Control de Auditoría
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion VARCHAR(50) DEFAULT 'SISTEMA'
);

CREATE INDEX idx_lecturas_periodo_serie ON lecturas_facturacion_impresion (periodo_anoi, periodo_mes, serie);

CREATE TABLE lecturas_facturacion_impresion_columnas (
    id_columna SERIAL PRIMARY KEY,
    id_registro INT NOT NULL REFERENCES lecturas_facturacion_impresion(id_registro) ON DELETE CASCADE,
    serie VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    nombre_columna VARCHAR(150) NOT NULL,
    valor_columna VARCHAR(255),
    valor_num INT DEFAULT 0,
    es_valido BOOLEAN DEFAULT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_col_registro ON lecturas_facturacion_impresion_columnas (id_registro);

-- =============================================================================
-- PROCEDIMIENTOS / FUNCIONES ALMACENADAS PARA GESTIÓN DE USUARIOS Y LOGIN
-- =============================================================================

-- Procedimiento / Función para crear un usuario cifrando la contraseña con bcrypt (pgcrypto)
CREATE OR REPLACE FUNCTION sp_crear_usuario(
    p_username VARCHAR,
    p_password VARCHAR,
    p_nombre VARCHAR,
    p_rol VARCHAR DEFAULT 'OPERADOR'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
    VALUES (
        p_username,
        crypt(p_password, gen_salt('bf')),
        p_nombre,
        p_rol,
        TRUE
    )
    ON CONFLICT (username) DO UPDATE SET
        password_hash = crypt(p_password, gen_salt('bf')),
        nombre = EXCLUDED.nombre,
        rol = EXCLUDED.rol,
        activo = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Procedimiento / Función para validar inicio de sesión mediante pgcrypto (bcrypt)
CREATE OR REPLACE FUNCTION sp_validar_login(
    p_username VARCHAR,
    p_password VARCHAR
) RETURNS TABLE (
    id_usuario INT,
    username VARCHAR,
    nombre VARCHAR,
    rol VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id_usuario, u.username, u.nombre, u.rol
    FROM usuarios u
    WHERE u.username = p_username
      AND u.password_hash = crypt(p_password, u.password_hash)
      AND u.activo = TRUE;
END;
$$ LANGUAGE plpgsql;
