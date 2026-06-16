from io import BytesIO
from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, AciGeneration
from app.utils.aci_xml import prettify_xml, normalize_cols, get_column_name, read_excel_file
from collections import defaultdict
import pandas as pd

aci_interface_selector_bp = Blueprint('aci_interface_selector', __name__, url_prefix='/api/aci-interface-selector')
ALLOWED = {'xls', 'xlsx'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED


def build_blk_name(leaf_profile, from_card, from_port, to_card, to_port):
    """Genera el nombre del bloque de puertos según regla estricta:
    Blk_{LEAF_PROFILE}_{FROM_CARD}{FROM_PORT}{TO_CARD}{TO_PORT}
    """
    return f"Blk_{leaf_profile}_{from_card}{from_port}{to_card}{to_port}"


def build_interface_selector_xml(df):
    """Genera XML de creación para Interface Selectors"""
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)

    leaf_c = get_column_name(cols_orig, cols, ['LEAF_PROFILE', 'LEAF PROFILE', 'LEAF'])
    type_c = get_column_name(cols_orig, cols, ['TYPE'])
    selector_c = get_column_name(cols_orig, cols, ['SELECTOR_NAME', 'SELECTOR NAME', 'SELECTOR'])
    desc_c = get_column_name(cols_orig, cols, ['DESCRIPTION', 'DESCR', 'DESC'])
    from_card_c = get_column_name(cols_orig, cols, ['FROM_CARD', 'FROM CARD'])
    from_port_c = get_column_name(cols_orig, cols, ['FROM_PORT', 'FROM PORT'])
    to_card_c = get_column_name(cols_orig, cols, ['TO_CARD', 'TO CARD'])
    to_port_c = get_column_name(cols_orig, cols, ['TO_PORT', 'TO PORT'])
    policy_c = get_column_name(cols_orig, cols, ['POLICY_GROUP_DN', 'POLICY GROUP DN', 'POLICY'])

    missing = [c for c, v in [('LEAF_PROFILE', leaf_c), ('SELECTOR_NAME', selector_c),
                               ('FROM_CARD', from_card_c), ('FROM_PORT', from_port_c),
                               ('TO_CARD', to_card_c), ('TO_PORT', to_port_c),
                               ('POLICY_GROUP_DN', policy_c)] if v is None]
    if missing:
        raise ValueError(f'Faltan columnas: {missing}')

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0,
               'profiles': set(), 'selectors': set(), 'warnings': []}

    # Agrupar por LEAF_PROFILE
    grouped = defaultdict(list)

    for idx, row in df.iterrows():
        leaf_profile = str(row[leaf_c]).strip() if leaf_c and pd.notna(row[leaf_c]) else None
        type_val = str(row[type_c]).strip() if type_c and pd.notna(row[type_c]) else 'ACCESS'
        selector_name = str(row[selector_c]).strip() if selector_c and pd.notna(row[selector_c]) else None
        description = str(row[desc_c]).strip() if desc_c and pd.notna(row[desc_c]) else ''
        
        try:
            from_card = int(float(row[from_card_c])) if pd.notna(row[from_card_c]) else None
            from_port = int(float(row[from_port_c])) if pd.notna(row[from_port_c]) else None
            to_card = int(float(row[to_card_c])) if pd.notna(row[to_card_c]) else None
            to_port = int(float(row[to_port_c])) if pd.notna(row[to_port_c]) else None
        except (ValueError, TypeError):
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: valores de puerto inválidos')
            continue

        policy_dn = str(row[policy_c]).strip() if policy_c and pd.notna(row[policy_c]) else None

        if not leaf_profile or not selector_name or not policy_dn:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: campos vacíos')
            continue

        if not all([from_card, from_port, to_card, to_port]):
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: rangos de puerto inválidos')
            continue

        # Generar nombre del bloque según regla estricta
        blk_name = build_blk_name(leaf_profile, from_card, from_port, to_card, to_port)

        summary['processed'] += 1
        summary['profiles'].add(leaf_profile)
        summary['selectors'].add(selector_name)

        grouped[leaf_profile].append({
            'selector_name': selector_name,
            'description': description,
            'from_card': from_card,
            'from_port': from_port,
            'to_card': to_card,
            'to_port': to_port,
            'blk_name': blk_name,
            'policy_dn': policy_dn,
            'type': type_val
        })

    # Construir XML
    pol_uni = ET.Element('polUni', status='created,modified')
    infra_infra = ET.SubElement(pol_uni, 'infraInfra', status='created,modified')

    for leaf_profile, entries in grouped.items():
        acc_port_p = ET.SubElement(infra_infra, 'infraAccPortP',
                                   name=leaf_profile, status='created,modified')
        for e in entries:
            hport_s = ET.SubElement(acc_port_p, 'infraHPortS',
                                    name=e['selector_name'],
                                    descr=e['description'],
                                    type='range',
                                    status='created,modified')
            
            ET.SubElement(hport_s, 'infraPortBlk',
                          name=e['blk_name'],
                          fromCard=str(e['from_card']),
                          fromPort=str(e['from_port']),
                          toCard=str(e['to_card']),
                          toPort=str(e['to_port']),
                          descr=e['description'],
                          status='created,modified')
            
            ET.SubElement(hport_s, 'infraRsAccBaseGrp',
                          tDn=e['policy_dn'],
                          status='created,modified')

    xml = prettify_xml(pol_uni)
    summary['profiles'] = sorted(summary['profiles'])
    summary['selectors'] = sorted(summary['selectors'])
    return xml, summary


def build_interface_selector_delete_xml(df):
    """Genera XML de rollback para Interface Selectors - solo status='deleted' en el selector"""
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)

    leaf_c = get_column_name(cols_orig, cols, ['LEAF_PROFILE', 'LEAF PROFILE', 'LEAF'])
    selector_c = get_column_name(cols_orig, cols, ['SELECTOR_NAME', 'SELECTOR NAME', 'SELECTOR'])

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0,
               'profiles': set(), 'selectors': set(), 'warnings': []}

    grouped = defaultdict(set)

    for idx, row in df.iterrows():
        leaf_profile = str(row[leaf_c]).strip() if leaf_c and pd.notna(row[leaf_c]) else None
        selector_name = str(row[selector_c]).strip() if selector_c and pd.notna(row[selector_c]) else None

        if not leaf_profile or not selector_name:
            summary['skipped'] += 1
            continue

        summary['processed'] += 1
        summary['profiles'].add(leaf_profile)
        summary['selectors'].add(selector_name)
        grouped[leaf_profile].add(selector_name)

    # Construir XML de borrado
    pol_uni = ET.Element('polUni', status='created,modified')
    infra_infra = ET.SubElement(pol_uni, 'infraInfra', status='created,modified')

    for leaf_profile, selectors in grouped.items():
        acc_port_p = ET.SubElement(infra_infra, 'infraAccPortP',
                                   name=leaf_profile, status='created,modified')
        for selector_name in sorted(selectors):
            ET.SubElement(acc_port_p, 'infraHPortS',
                          name=selector_name,
                          status='deleted')

    xml = prettify_xml(pol_uni)
    summary['profiles'] = sorted(summary['profiles'])
    summary['selectors'] = sorted(summary['selectors'])
    return xml, summary


@aci_interface_selector_bp.route('/template', methods=['GET'])
def download_template():
    """Descargar plantilla Excel para Interface Selectors"""
    df = pd.DataFrame([
        ['L2309', 'PC', 'ISEL-1.1', 'SRV: PCTXSDXP01 - Port: 10/1', 1, 1, 1, 1, 'uni/infra/funcprof/accbundle-PCTXSDXP01-PC-A-IPG'],
        ['L2309', 'PC', 'ISEL-1.2', 'SRV: PCTXSDXP01 - Port: 10/2', 1, 2, 1, 2, 'uni/infra/funcprof/accbundle-PCTXSDXP01-PC-A-IPG'],
        ['L2309', 'VPC', 'ISEL-1.3', 'SRV: PTSMSRVCHP01 - Port: P1_C5_P1', 1, 7, 1, 7, 'uni/infra/funcprof/accbundle-PTSMSRVCHP01-VPC-A-IPG'],
        ['L2310', 'VPC', 'ISEL-1.7', 'SRV: PTSMSRVCHP01 - Port: P1_C6_P1', 1, 7, 1, 7, 'uni/infra/funcprof/accbundle-PTSMSRVCHP01-VPC-A-IPG'],
        ['L2309', 'ACCESS', 'ISEL-1.9', 'SRV: PTSMSRVCHP01 - Port: P1_C3_C1_P1', 1, 9, 1, 9, 'uni/infra/funcprof/accportgrp-PTSMSRVCHP01-E-9-IPG'],
    ], columns=['LEAF_PROFILE', 'TYPE', 'SELECTOR_NAME', 'DESCRIPTION', 'FROM_CARD', 'FROM_PORT', 'TO_CARD', 'TO_PORT', 'POLICY_GROUP_DN'])

    buffer = BytesIO()
    df.to_excel(buffer, index=False, engine='openpyxl')
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name='plantilla_interface_selector.xlsx',
        as_attachment=True
    )


@aci_interface_selector_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate():
    if 'file' not in request.files:
        return jsonify({'error': 'Archivo no encontrado'}), 400
    f = request.files['file']
    if f.filename == '' or not allowed(f.filename):
        return jsonify({'error': 'Formato inválido. Use .xls o .xlsx'}), 400

    try:
        f.stream.seek(0)
        excel_bytes = f.read()
        df = read_excel_file(BytesIO(excel_bytes))
        create_xml, create_sum = build_interface_selector_xml(df)
        df2 = read_excel_file(BytesIO(excel_bytes))
        delete_xml, delete_sum = build_interface_selector_delete_xml(df2)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

    user_id = get_jwt_identity()
    create_sum['profiles'] = list(create_sum['profiles'])
    create_sum['selectors'] = list(create_sum['selectors'])
    
    gen = AciGeneration(
        user_id=user_id, generation_type='interface-selector', filename=secure_filename(f.filename),
        excel_data=excel_bytes,
        main_xml=create_xml, rollback_xml=delete_xml, summary=create_sum
    )
    db.session.add(gen)
    db.session.commit()

    return jsonify({
        'create_xml': create_xml, 'delete_xml': delete_xml,
        'filename': f.filename,
        'summary': {
            'rows': create_sum['rows'], 'processed': create_sum['processed'],
            'skipped': create_sum['skipped'], 'profiles': create_sum['profiles'],
            'selectors': create_sum['selectors'], 'warnings': create_sum['warnings'],
        }
    }), 200