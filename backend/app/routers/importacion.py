from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import LecturaFacturacionImpresion, LecturaFacturacionImpresionColumna
from app.services.excel_parser import parse_excel_file, extract_period_from_filename
from app.services.validator import validate_record

router = APIRouter(prefix="/api", tags=["Importación"])

@router.post("/importar-excel")
async def importar_excel(
    file: UploadFile = File(...),
    periodo_anoi: str = Form(...),
    periodo_mes: str = Form(...),
    tipo_registro: str = Form("FACTURACION_MENSUAL"),
    usuario: str = Form("admin"),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no válido. Se requiere un archivo de Excel (.xlsx)."
        )

    # 0. Restricción de Seguridad RBAC: Solo el rol ADMINISTRADOR puede importar Excel
    from app.models.models import Usuario
    user_db = db.query(Usuario).filter(Usuario.username == usuario).first()
    if not user_db or (user_db.rol != "ADMINISTRADOR" and user_db.username != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La funcionalidad de importar archivos Excel solo está disponible para usuarios con rol ADMINISTRADOR."
        )

    # 1. Protección contra periodos duplicados (No se permite cargar un periodo más de una vez)
    periodo_existente = db.query(LecturaFacturacionImpresion).filter(
        LecturaFacturacionImpresion.periodo_anoi == periodo_anoi,
        LecturaFacturacionImpresion.periodo_mes == periodo_mes
    ).first()

    if periodo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El periodo {periodo_anoi}-{periodo_mes} ya fue importado previamente. No se permite cargar el mismo periodo más de una vez."
        )

    # 2. Validación de coincidencia de la fecha del periodo (Nombre de archivo vs Periodo seleccionado)
    detected_mes, detected_anoi = extract_period_from_filename(file.filename)
    if detected_mes and detected_mes != periodo_mes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La fecha del periodo en el archivo Excel ('{detected_mes}') no coincide con el periodo seleccionado ('{periodo_mes}')."
        )

    # 3. Lectura y validación de encabezados del archivo Excel
    try:
        contents = await file.read()
        total_count, records = parse_excel_file(contents, file.filename)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la estructura del archivo Excel: {str(e)}"
        )

    if total_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo Excel no contiene registros de equipos procesables."
        )

    validos_auto_count = 0
    observados_auto_count = 0

    try:
        for rec in records:
            rec["tipo_registro"] = tipo_registro
            is_valid_auto, observaciones_text = validate_record(rec, periodo_anoi, periodo_mes, db)

            if is_valid_auto:
                validos_auto_count += 1
            else:
                observados_auto_count += 1

            eq = rec["equipo"]
            lec_ini = rec["lecturas_iniciales"]
            lec_fin = rec["lecturas_finales"]
            vol = rec["volumen"]
            pre = rec["precios"]
            imp = rec["importes"]
            tot = rec["totales"]

            maestro = LecturaFacturacionImpresion(
                periodo_anoi=periodo_anoi,
                periodo_mes=periodo_mes,
                tipo_registro=tipo_registro,

                id_anam=_safe_int(eq.get("ID-ANAM")),
                vpn=_safe_str(eq.get("VPN")),
                estado=_safe_str(eq.get("ESTADO")),
                unidad_administrativa=_safe_str(eq.get("UNIDAD ADMINISTRATIVAS")),
                unidad_administrativa_ii=_safe_str(eq.get("UNIDAD ADMINISTRATIVAS II")),
                serie=_safe_str(eq.get("SERIE")) or "SIN_SERIE",
                modelo=_safe_str(eq.get("MODELO")),

                lectura_inicial_carta_bn=lec_ini.get("CARTA BN", 0),
                lectura_inicial_oficio_bn=lec_ini.get("OFICIO BN", 0),
                lectura_inicial_doblecarta=lec_ini.get("DOBLECARTA", 0),
                lectura_inicial_carta_cl=lec_ini.get("CARTA COLOR", 0),
                lectura_inicial_oficio_cl=lec_ini.get("OFICIO COLOR", 0),
                lectura_inicial_digitalizar=lec_ini.get("DIGITALIZACION", 0),

                lectura_final_carta_bn=lec_fin.get("CARTA BN", 0),
                lectura_final_oficio_bn=lec_fin.get("OFICIO BN", 0),
                lectura_final_doblecarta=lec_fin.get("DOBLECARTA", 0),
                lectura_final_carta_cl=lec_fin.get("CARTA COLOR", 0),
                lectura_final_oficio_cl=lec_fin.get("OFICIO COLOR", 0),
                lectura_final_digitalizar=lec_fin.get("DIGITALIZACION", 0),

                volumen_carta_bn=vol.get("CARTA BN", 0),
                volumen_oficio_bn=vol.get("OFICIO BN", 0),
                volumen_doblecarta=vol.get("DOBLECARTA", 0),
                volumen_carta_cl=vol.get("CARTA COLOR", 0),
                volumen_oficio_cl=vol.get("OFICIO COLOR", 0),
                volumen_digitalizar=vol.get("DIGITALIZACION", 0),

                precio_carta_bn=pre.get("CARTA BN", 0.0),
                precio_oficio_bn=pre.get("OFICIO BN", 0.0),
                precio_doblecarta=pre.get("DOBLECARTA", 0.0),
                precio_carta_cl=pre.get("CARTA COLOR", 0.0),
                precio_oficio_cl=pre.get("OFICIO COLOR", 0.0),
                precio_digitalizar=pre.get("DIGITALIZACION", 0.0),

                importe_carta_bn=imp.get("CARTA BN", 0.0),
                importe_oficio_bn=imp.get("OFICIO BN", 0.0),
                importe_doblecarta=imp.get("DOBLECARTA", 0.0),
                importe_carta_cl=imp.get("CARTA COLOR", 0.0),
                importe_oficio_cl=imp.get("OFICIO COLOR", 0.0),
                importe_digitalizar=imp.get("DIGITALIZACION", 0.0),

                subtotal=tot.get("SUBTOTAL", 0.0),
                iva=tot.get("IVA", 0.0),
                total=tot.get("TOTAL", 0.0),

                validacion_automatica=is_valid_auto,
                validacion_manual=None,               # NULL (Pendiente) por defecto
                fecha_validacion_manual=None,         # NULL por defecto
                observaciones_auto=observaciones_text,
                fecha_valida=None,                    # NULL por defecto
                usuario_creacion=usuario
            )

            db.add(maestro)
            db.flush()

            for col in rec["columnas_variables"]:
                col_esclavo = LecturaFacturacionImpresionColumna(
                    id_registro=maestro.id_registro,
                    serie=col["serie"],
                    categoria=col["categoria"],
                    nombre_columna=col["nombre_columna"],
                    valor_columna=col["valor_columna"],
                    es_valido=None
                )
                db.add(col_esclavo)

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar los registros en la base de datos: {str(e)}"
        )

    return {
        "status": "success",
        "mensaje": f"Se procesaron e importaron correctamente {total_count} registros de equipos.",
        "periodo_anoi": periodo_anoi,
        "periodo_mes": periodo_mes,
        "total_registros": total_count,
        "registros_validos_auto": validos_auto_count,
        "registros_observados_auto": observados_auto_count
    }


def _safe_int(val):
    if val is None or val == "":
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _safe_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s != "" else None
