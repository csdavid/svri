import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.db.database import engine, Base, SessionLocal
from app.models.models import PrecioCatalogo
from app.routers import auth, importacion, validacion

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SVRI - Sistema de Validación de Reportes de Impresión",
    description="API REST para importación de reportes de impresión de la ANAM y validación automática y manual por equipo.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type", "Accept-Ranges"]
)

app.include_router(auth.router)
app.include_router(importacion.router)
app.include_router(validacion.router)


@app.on_event("startup")
def startup_db_seed():
    db = SessionLocal()
    try:
        # Registrar extensión pgcrypto y procedimientos almacenados en PostgreSQL
        db.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        
        db.execute(text("""
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
        """))

        db.execute(text("""
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
        """))
        db.commit()

        # Sembrado de usuario administrador por defecto mediante sp_crear_usuario
        db.execute(text("SELECT sp_crear_usuario('admin', 'admin123', 'Administrador de Impresión ANAM', 'ADMINISTRADOR');"))
        db.commit()

        # Sembrado de precios por defecto
        precio_inic = db.query(PrecioCatalogo).filter(PrecioCatalogo.periodo_anoi == "2026", PrecioCatalogo.periodo_mes == "ABR").first()
        if not precio_inic:
            db.add(PrecioCatalogo(
                periodo_anoi="2026",
                periodo_mes="ABR",
                precio_carta_bn=0.7900,
                precio_oficio_bn=0.8100,
                precio_doblecarta=1.3000,
                precio_carta_cl=2.0000,
                precio_oficio_cl=2.1000,
                precio_digitalizar=0.3300
            ))
            db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "sistema": "SVRI - Sistema de Validación de Reportes de Impresión",
        "estado": "En línea",
        "documentacion_api": "/docs"
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8008, reload=True)
