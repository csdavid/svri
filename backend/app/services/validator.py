from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import LecturaFacturacionImpresion, PrecioCatalogo

def validate_record(
    record: Dict[str, Any],
    periodo_anoi: str,
    periodo_mes: str,
    db: Session
) -> Tuple[bool, str]:
    """
    Validate automatic sections (9 to 14) for a parsed record.
    Returns (valido: bool, observaciones: str)
    """
    observaciones = []
    es_valido = True

    serie = record["equipo"].get("SERIE", "")
    tipo_registro = record.get("tipo_registro", "FACTURACION_MENSUAL")

    # Obtenemos catálogo de precios esperados para este periodo
    precio_cat = db.query(PrecioCatalogo).filter(
        PrecioCatalogo.periodo_anoi == periodo_anoi,
        PrecioCatalogo.periodo_mes == periodo_mes
    ).first()

    expected_prices = {
        "CARTA BN": float(precio_cat.precio_carta_bn) if precio_cat else 0.7900,
        "OFICIO BN": float(precio_cat.precio_oficio_bn) if precio_cat else 0.8100,
        "DOBLECARTA": float(precio_cat.precio_doblecarta) if precio_cat else 1.3000,
        "CARTA COLOR": float(precio_cat.precio_carta_cl) if precio_cat else 2.0000,
        "OFICIO COLOR": float(precio_cat.precio_oficio_cl) if precio_cat else 2.1000,
        "DIGITALIZACION": float(precio_cat.precio_digitalizar) if precio_cat else 0.3300,
    }

    # Extract sections
    lec_ini = record["lecturas_iniciales"]
    lec_fin = record["lecturas_finales"]
    vol = record["volumen"]
    pre = record["precios"]
    imp = record["importes"]
    tot = record["totales"]
    cols_var = record["columnas_variables"]

    # -------------------------------------------------------------------------
    # SEC 9: LECTURAS INICIALES (Validar contra lecturas finales del periodo anterior)
    # -------------------------------------------------------------------------
    prev_record = db.query(LecturaFacturacionImpresion).filter(
        LecturaFacturacionImpresion.serie == serie,
        LecturaFacturacionImpresion.periodo_anoi <= periodo_anoi
    ).order_by(
        LecturaFacturacionImpresion.id_registro.desc()
    ).first()

    if prev_record and prev_record.periodo_anoi != periodo_anoi:
        diffs = []
        if lec_ini.get("CARTA BN", 0) != prev_record.lectura_final_carta_bn:
            diffs.append("Carta BN")
        if lec_ini.get("OFICIO BN", 0) != prev_record.lectura_final_oficio_bn:
            diffs.append("Oficio BN")
        if lec_ini.get("DOBLECARTA", 0) != prev_record.lectura_final_doblecarta:
            diffs.append("Doble Carta")
        if lec_ini.get("CARTA COLOR", 0) != prev_record.lectura_final_carta_cl:
            diffs.append("Carta Color")
        if lec_ini.get("OFICIO COLOR", 0) != prev_record.lectura_final_oficio_cl:
            diffs.append("Oficio Color")
        if lec_ini.get("DIGITALIZACION", 0) != prev_record.lectura_final_digitalizar:
            diffs.append("Digitalización")

        if diffs:
            es_valido = False
            observaciones.append(f"Sec 9 (Lecturas Iniciales) no coincide con periodo anterior en: {', '.join(diffs)}")

    # Sum of variable column sections 2 to 8
    sum_vars = {
        "CARTA BN": 0,
        "OFICIO BN": 0,
        "DOBLECARTA": 0,
        "CARTA COLOR": 0,
        "OFICIO COLOR": 0,
        "DIGITALIZACION": 0
    }

    for col in cols_var:
        cat_upper = col["categoria"].upper()
        v_num = col["valor_num"]

        if "DOBLECARTA" in cat_upper or "DOBLE CARTA" in cat_upper:
            sum_vars["DOBLECARTA"] += v_num
        elif "DIGITALIZ" in cat_upper or "ENVIAR" in cat_upper:
            sum_vars["DIGITALIZACION"] += v_num
        elif "CARTA BN" in cat_upper or "CARTA BLACK" in cat_upper or "CARTA MONO" in cat_upper:
            sum_vars["CARTA BN"] += v_num
        elif "OFICIO BN" in cat_upper or "OFICIO BLACK" in cat_upper or "OFICIO MONO" in cat_upper:
            sum_vars["OFICIO BN"] += v_num
        elif "CARTA CL" in cat_upper or "CARTA COLOR" in cat_upper:
            sum_vars["CARTA COLOR"] += v_num
        elif "OFICIO CL" in cat_upper or "OFICIO COLOR" in cat_upper:
            sum_vars["OFICIO COLOR"] += v_num

    # -------------------------------------------------------------------------
    # SEC 10: LECTURAS FINALES = Suma de Secciones Variables
    # -------------------------------------------------------------------------
    if tipo_registro != "LINEA_BASE_INICIAL":
        # -------------------------------------------------------------------------
        # SEC 10: LECTURAS FINALES = Sumatoria de las columnas de las secciones variables (2 a 8)
        # -------------------------------------------------------------------------
        for k in ["CARTA BN", "OFICIO BN", "DOBLECARTA", "CARTA COLOR", "OFICIO COLOR", "DIGITALIZACION"]:
            expected_final = sum_vars[k]
            actual_final = lec_fin.get(k, 0)
            if actual_final != expected_final:
                es_valido = False
                observaciones.append(f"Sec 10 ({k}): Lectura final ({actual_final}) != Suma de contadores ({expected_final})")

        # -------------------------------------------------------------------------
        # SEC 11: VOLUMEN = Lectura Final - Lectura Inicial
        # -------------------------------------------------------------------------
        for k in ["CARTA BN", "OFICIO BN", "DOBLECARTA", "CARTA COLOR", "OFICIO COLOR", "DIGITALIZACION"]:
            expected_vol = lec_fin.get(k, 0) - lec_ini.get(k, 0)
            actual_vol = vol.get(k, 0)
            if actual_vol != expected_vol:
                es_valido = False
                observaciones.append(f"Sec 11 ({k}): Volumen ({actual_vol}) != Lectura final ({lec_fin.get(k,0)}) - Lectura inicial ({lec_ini.get(k,0)})")

        # -------------------------------------------------------------------------
        # SEC 12: PRECIOS UNITARIOS
        # -------------------------------------------------------------------------
        for k in ["CARTA BN", "OFICIO BN", "DOBLECARTA", "CARTA COLOR", "OFICIO COLOR", "DIGITALIZACION"]:
            act_p = pre.get(k, 0.0)
            exp_p = expected_prices[k]
            if abs(act_p - exp_p) > 0.001 and vol.get(k, 0) > 0:
                es_valido = False
                observaciones.append(f"Sec 12 ({k}): Precio ({act_p}) != Precio catálogo ({exp_p})")

        # -------------------------------------------------------------------------
        # SEC 13: IMPORTES FACTURACION = Volumen * Precio
        # -------------------------------------------------------------------------
        calculated_subtotal = 0.0
        for k in ["CARTA BN", "OFICIO BN", "DOBLECARTA", "CARTA COLOR", "OFICIO COLOR", "DIGITALIZACION"]:
            exp_imp = round(vol.get(k, 0) * pre.get(k, 0.0), 2)
            act_imp = round(imp.get(k, 0.0), 2)
            if abs(act_imp - exp_imp) > 0.05:
                es_valido = False
                observaciones.append(f"Sec 13 ({k}): Importe ({act_imp}) != Volumen * Precio ({exp_imp})")
            calculated_subtotal += act_imp

        # -------------------------------------------------------------------------
        # SEC 14: TOTALES (Subtotal, IVA 16%, Total)
        # -------------------------------------------------------------------------
        act_sub = round(tot.get("SUBTOTAL", 0.0), 2)
        act_iva = round(tot.get("IVA", 0.0), 2)
        act_tot = round(tot.get("TOTAL", 0.0), 2)

        exp_sub = round(calculated_subtotal, 2)
        exp_iva = round(exp_sub * 0.16, 2)
        exp_tot = round(exp_sub + exp_iva, 2)

        if abs(act_sub - exp_sub) > 0.10:
            es_valido = False
            observaciones.append(f"Sec 14: Subtotal ({act_sub}) != Suma de importes ({exp_sub})")

        if abs(act_iva - exp_iva) > 0.10:
            es_valido = False
            observaciones.append(f"Sec 14: IVA ({act_iva}) != 16% de Subtotal ({exp_iva})")

        if abs(act_tot - exp_tot) > 0.10:
            es_valido = False
            observaciones.append(f"Sec 14: Total ({act_tot}) != Subtotal + IVA ({exp_tot})")

    obs_str = "; ".join(observaciones) if observaciones else ""
    return es_valido, obs_str
