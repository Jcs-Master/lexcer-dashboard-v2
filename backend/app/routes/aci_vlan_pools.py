from io import BytesIO
from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, AciGeneration
from app.utils.aci_xml import prettify_xml, normalize_cols, get_column_name, read_excel_file
from collections import defaultdict
import pandas as pd

aci_vlan_pools_bp = Blueprint('aci_vlan_pools', __name__, url_prefix='/api/aci-vlan-pools')
ALLOWED = {'xls', 'xlsx'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

def build_vlan_pool_xml(df):
    """Genera XML de creacion para VLAN Pools"""
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)

    from_c = get_column_name(cols_orig, cols, ['VLAN_FROM', 'VLAN FROM', 'FROM'])
    to_c = get_column_name(cols_orig, cols, ['VLAN_TO', 'VLAN TO', 'TO'])
    pool_c = get_column_name(cols_orig, cols, ['POOL_NAME', 'POOL NAME', 'POOL'])
    alloc_c = get_column_name(cols_orig, cols, ['ALLOC_MODE', 'ALLOC MODE', 'ALLOC'])

    missing = [c for c, v in [('VLAN_FROM', from_c), ('VLAN_TO', to_c), ('POOL_NAME', pool_c), ('ALLOC_MODE', alloc_c)] if v is None]
    if missing:
        raise ValueError(f'Faltan columnas: {missing}')

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0,
               'pools': set(), 'warnings': []}

    pol_uni = ET.Element('polUni', status='created,modified')
    infra_infra = ET.SubElement(pol_uni, 'infraInfra', status='created,modified')

    grouped = defaultdict(list)

    for idx, row in df.iterrows():
        vlan_from = str(row[from_c]).strip() if from_c and pd.notna(row[from_c]) else None
        vlan_to = str(row[to_c]).strip() if to_c and pd.notna(row[to_c]) else None
        pool = str(row[pool_c]).strip() if pool_c and pd.notna(row[pool_c]) else None
        alloc = str(row[alloc_c]).strip() if alloc_c and pd.notna(row[alloc_c]) else 'static'

        if not vlan_from or not vlan_to or not pool:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: campos vacios')
            continue

        summary['processed'] += 1
        summary['pools'].add(pool)
        grouped[pool].append({'from': vlan_from, 'to': vlan_to, 'alloc': alloc})

    for pool, entries in grouped.items():
        alloc_mode = entries[0]['alloc']
        fvns = ET.SubElement(infra_infra, 'fvnsVlanInstP',
                            name=pool, allocMode=alloc_mode, status='created,modified')
        for e in entries:
            attrs = {'from': e['from'], 'to': e['to'], 'status': 'created,modified'}
            ET.SubElement(fvns, 'fvnsEncapBlk', **attrs)

    xml = prettify_xml(pol_uni)
    return xml, summary


def build_vlan_pool_delete_xml(df):
    """Genera XML de rollback para VLAN Pools - solo status='deleted' en los bloques"""
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)

    from_c = get_column_name(cols_orig, cols, ['VLAN_FROM', 'VLAN FROM', 'FROM'])
    to_c = get_column_name(cols_orig, cols, ['VLAN_TO', 'VLAN TO', 'TO'])
    pool_c = get_column_name(cols_orig, cols, ['POOL_NAME', 'POOL NAME', 'POOL'])
    alloc_c = get_column_name(cols_orig, cols, ['ALLOC_MODE', 'ALLOC MODE', 'ALLOC'])

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0,
               'pools': set(), 'warnings': []}

    pol_uni = ET.Element('polUni')
    infra_infra = ET.SubElement(pol_uni, 'infraInfra')

    grouped = defaultdict(list)

    for idx, row in df.iterrows():
        vlan_from = str(row[from_c]).strip() if from_c and pd.notna(row[from_c]) else None
        vlan_to = str(row[to_c]).strip() if to_c and pd.notna(row[to_c]) else None
        pool = str(row[pool_c]).strip() if pool_c and pd.notna(row[pool_c]) else None
        alloc = str(row[alloc_c]).strip() if alloc_c and pd.notna(row[alloc_c]) else 'static'

        if not vlan_from or not vlan_to or not pool:
            summary['skipped'] += 1
            continue

        summary['processed'] += 1
        summary['pools'].add(pool)
        grouped[pool].append({'from': vlan_from, 'to': vlan_to, 'alloc': alloc})

    for pool, entries in grouped.items():
        alloc_mode = entries[0]['alloc']
        fvns = ET.SubElement(infra_infra, 'fvnsVlanInstP',
                            name=pool, allocMode=alloc_mode)
        for e in entries:
            attrs = {'from': e['from'], 'to': e['to'], 'status': 'deleted'}
            ET.SubElement(fvns, 'fvnsEncapBlk', **attrs)

    xml = prettify_xml(pol_uni)
    return xml, summary


@aci_vlan_pools_bp.route('/template', methods=['GET'])
def download_template():
    """Descargar plantilla Excel para VLAN Pools"""
    df = pd.DataFrame([
        [5, 5, 'DC_Phys_Static_VLPool', 'static'],
        [7, 7, 'DC_Phys_Static_VLPool', 'static'],
        [600, 601, 'DC_Phys_Static_VLPool', 'static'],
        [55, 55, 'EDGE_Phys_Static_VLPool', 'static'],
        [6, 6, 'EDGE_Phys_Static_VLPool', 'static'],
    ], columns=['VLAN_FROM', 'VLAN_TO', 'POOL_NAME', 'ALLOC_MODE'])

    buffer = BytesIO()
    df.to_excel(buffer, index=False, engine='openpyxl')
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name='plantilla_vlan_pools.xlsx',
        as_attachment=True
    )


@aci_vlan_pools_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate():
    if 'file' not in request.files:
        return jsonify({'error': 'Archivo no encontrado'}), 400
    f = request.files['file']
    if f.filename == '' or not allowed(f.filename):
        return jsonify({'error': 'Formato invalido. Use .xls o .xlsx'}), 400

    try:
        f.stream.seek(0)
        excel_bytes = f.read()
        df = read_excel_file(BytesIO(excel_bytes))
        create_xml, create_sum = build_vlan_pool_xml(df)
        df2 = read_excel_file(BytesIO(excel_bytes))
        delete_xml, delete_sum = build_vlan_pool_delete_xml(df2)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

    user_id = get_jwt_identity()
    gen = AciGeneration(
        user_id=user_id, generation_type='vlan-pools', filename=secure_filename(f.filename),
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
            'skipped': create_sum['skipped'], 'pools': list(create_sum['pools']),
            'warnings': create_sum['warnings'],
        }
    }), 200