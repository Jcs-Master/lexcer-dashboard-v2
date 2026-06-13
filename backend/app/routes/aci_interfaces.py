from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify
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
        attrs = {'tDn': dn, 'status': status_val}
        if not rollback:
            attrs['lc'] = 'blacklist'
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
        df = read_excel_file(f)
        down_xml, down_sum = build_xml(df, rollback=False)
        f.stream.seek(0)
        df2 = read_excel_file(f)
        up_xml, up_sum = build_xml(df2, rollback=True)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error: {e}'}), 500

    user_id = get_jwt_identity()
    gen = AciGeneration(
        user_id=user_id, generation_type='interfaces', filename=secure_filename(f.filename),
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