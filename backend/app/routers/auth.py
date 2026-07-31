from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.models.models import Usuario

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id_usuario: int
    username: str
    nombre: str
    rol: str

class CrearUsuarioRequest(BaseModel):
    username: str
    password: str
    nombre: str
    rol: str = "OPERADOR"
    solicitante_username: str = "admin"

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # Invocar procedimiento almacenado sp_validar_login
    result = db.execute(
        text("SELECT * FROM sp_validar_login(:u, :p)"),
        {"u": req.username, "p": req.password}
    ).mappings().first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )

    return UserResponse(
        id_usuario=result["id_usuario"],
        username=result["username"],
        nombre=result["nombre"],
        rol=result["rol"]
    )

@router.get("/usuarios")
def listar_usuarios(solicitante_username: str = Query("admin"), db: Session = Depends(get_db)):
    solicitante = db.query(Usuario).filter(Usuario.username == solicitante_username).first()
    if not solicitante or (solicitante.rol != "ADMINISTRADOR" and solicitante.username != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La consulta de usuarios solo está disponible para usuarios con rol ADMINISTRADOR."
        )

    usuarios = db.query(Usuario).all()
    return [
        {
            "id_usuario": u.id_usuario,
            "username": u.username,
            "nombre": u.nombre,
            "rol": u.rol,
            "activo": u.activo,
            "fecha_creacion": u.fecha_creacion.isoformat() if u.fecha_creacion else None
        }
        for u in usuarios
    ]

@router.post("/usuarios", status_code=status.HTTP_201_CREATED)
def crear_usuario(req: CrearUsuarioRequest, db: Session = Depends(get_db)):
    # Restricción: La creación de usuarios solo está disponible para el rol ADMINISTRADOR
    solicitante = db.query(Usuario).filter(Usuario.username == req.solicitante_username).first()
    if not solicitante or (solicitante.rol != "ADMINISTRADOR" and solicitante.username != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La creación de usuarios sólo está disponible para usuarios con rol ADMINISTRADOR."
        )

    try:
        db.execute(
            text("SELECT sp_crear_usuario(:u, :p, :n, :r)"),
            {"u": req.username, "p": req.password, "n": req.nombre, "r": req.rol}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear usuario: {str(e)}"
        )

    return {"status": "success", "mensaje": f"Usuario '{req.username}' creado correctamente con contraseña cifrada."}
