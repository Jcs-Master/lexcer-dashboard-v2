from io import BytesIO
from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, AciGeneration
from app.utils.aci_xml import prettify_xml, normalize_cols, get_column_name, read_excel_file
import pandas as pd

aci_interfaces_bp = Blueprint('aci_interfaces', __name__, url_prefix='/api/aci-interfaces')
ALLOWED = {'xls', 'xlsx'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

def parse_leaf(value):
    leaf = str(value).strip()
    if leaf.lower().startswith('node-'): leaf = leaf[5:]
    elif leaf.lower().startswith('leaf'): leaf = leaf[4:]
    return leaf

def parse_interface(value):
    interface = str(value).strip().lower()
    if interface.startswith('ethernet'): interface = 'eth' + interface[8:].strip()
    elif '/' in interface and not interface.startswith('eth'): interface = 'eth' + interface
    return interface

def build_dn(pod, leaf, interface):
    return f'topology/pod-{pod}/paths-{leaf}/pathep-[{interface}]'

def build_xml(df, rollback=False):
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)
    pod_c = get_column_name(cols_orig, cols, ['POD'])
    leaf_c = get_column_name(cols_orig, cols, ['LEAF'])
    intf_c = get_column_name(cols_orig, cols, ['INTERFACE', 'PORT'])
    desc_c = get_column_name(cols_orig, cols, ['DESCRIPTION', 'DESCRIPCION', 'DESC'])

    missing = [c for c, v in [('POD', pod_c), ('LEAF', leaf_c), ('INTERFACE', intf_c)] if v is None]
    if missing:
        raise ValueError(f'Faltan columnas: {missing}')

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0, 'pods': set(), 'leafs': set(), 'interfaces': set(), 'descriptions': set(), 'entries': [], 'warnings': []}
    pol_uni = ET.Element('polUni', status='created,modified')
    fabric_inst = ET.SubElement(pol_uni, 'fabricInst', status='created,modified')
    fabric_oos = ET.SubElement(fabric_inst, 'fabricOOServicePol', status='created,modified')

    status_val = 'deleted' if rollback else 'created,modified'

    for idx, row in df.iterrows():
        if pd.isna(row[pod_c]) or pd.isna(row[leaf_c]) or pd.isna(row[intf_c]):
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: falta POD/LEAF/INTERFACE')
            continue

        pod = str(row[pod_c]).strip()
        leaf = parse_leaf(row[leaf_c])
        interface = parse_interface(row[intf_c])

        if not pod or not leaf or not interface:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: valores invalidos')
            continue

        dn = build_dn(pod, leaf, interface)
        attrs = {'tDn': dn}
        if not rollback:
            attrs['lc'] = 'blacklist'
        attrs['status'] = status_val
        ET.SubElement(fabric_oos, 'fabricRsOosPath', **attrs)

        desc = ''
        if desc_c and pd.notna(row[desc_c]):
            desc = str(row[desc_c]).strip()
            summary['descriptions'].add(desc)

        summary['processed'] += 1
        summary['pods'].add(pod)
        summary['leafs'].add(leaf)
        summary['interfaces'].add(interface)
        summary['entries'].append({'pod': pod, 'leaf': leaf, 'interface': interface, 'description': desc})

    for key in ['pods', 'leafs', 'interfaces', 'descriptions']:
        summary[key] = sorted(summary[key])
    return prettify_xml(pol_uni), summary

@aci_interfaces_bp.route('/generate', methods=['POST'])
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
        down_xml, down_sum = build_xml(df, rollback=False)
        df2 = read_excel_file(BytesIO(excel_bytes))
        up_xml, up_sum = build_xml(df2, rollback=True)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error: {e}'}), 500

    user_id = get_jwt_identity()
    gen = AciGeneration(
        user_id=user_id, generation_type='interfaces', filename=secure_filename(f.filename),
        excel_data=excel_bytes,
        main_xml=down_xml, rollback_xml=up_xml, summary=down_sum
    )
    db.session.add(gen)
    db.session.commit()

    return jsonify({
        'main_xml': down_xml, 'rollback_xml': up_xml,
        'filename': f.filename,
        'summary': {
            'rows': down_sum['rows'], 'processed': down_sum['processed'],
            'skipped': down_sum['skipped'], 'pods': down_sum['pods'],
            'leafs': down_sum['leafs'], 'interfaces': down_sum['interfaces'],
            'descriptions': down_sum['descriptions'], 'entries': down_sum['entries'],
            'warnings': down_sum['warnings'],
        }
    }), 200


@aci_interfaces_bp.route('/template', methods=['GET'])
def download_template():
    """Descargar plantilla Excel (.xlsx) con datos de ejemplo para Interface Status"""
    df = pd.DataFrame([
        [1, 101, 'eth1/1', 'Interfaz de ejemplo 1'],
        [1, 102, 'eth1/2', 'Interfaz de ejemplo 2'],
        [1, 103, 'eth1/3', 'Interfaz de ejemplo 3'],
    ], columns=['POD', 'LEAF', 'INTERFACE', 'DESCRIPTION'])
    
    buffer = BytesIO()
    df.to_excel(buffer, index=False, engine='openpyxl')
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name='plantilla_interfaces.xlsx',
        as_attachment=True
    )
