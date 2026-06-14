from collections import defaultdict
from io import BytesIO
from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, AciGeneration
from app.utils.aci_xml import prettify_xml, normalize_cols, get_column_name, parse_vlan, read_excel_file
import pandas as pd

aci_paths_bp = Blueprint('aci_paths', __name__, url_prefix='/api/aci-paths')
ALLOWED = {'xls', 'xlsx'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

def build_tdn(type_val, pod, leaf, ipg_port):
    """Construye el tDn segun el tipo de path"""
    type_norm = str(type_val).strip().upper()
    pod_str = str(int(pod)) if pd.notna(pod) else None
    ipg_str = str(ipg_port).strip()

    if not pod_str or not leaf or not ipg_str:
        return None

    if type_norm == 'VPC':
        # VPC: topology/pod-{pod}/protpaths-{leaf1}-{leaf2}/pathep-[{ipg}]
        leaf_str = str(leaf).strip()
        return f'topology/pod-{pod_str}/protpaths-{leaf_str}/pathep-[{ipg_str}]'
    elif type_norm in ('STATIC', 'PC'):
        # STATIC y PC: topology/pod-{pod}/paths-{leaf}/pathep-[{port/ipg}]
        leaf_str = str(int(leaf)) if pd.notna(leaf) else None
        if not leaf_str:
            return None
        return f'topology/pod-{pod_str}/paths-{leaf_str}/pathep-[{ipg_str}]'
    else:
        return None

def build_xml(df, delete_mode=False):
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)

    tenant_c = get_column_name(cols_orig, cols, ['TENANT'])
    app_c = get_column_name(cols_orig, cols, ['APPLICATION', 'AP'])
    epg_c = get_column_name(cols_orig, cols, ['EPG'])
    vlan_c = get_column_name(cols_orig, cols, ['VLAN'])
    type_c = get_column_name(cols_orig, cols, ['TYPE'])
    mode_c = get_column_name(cols_orig, cols, ['MODE'])
    pod_c = get_column_name(cols_orig, cols, ['POD'])
    leaf_c = get_column_name(cols_orig, cols, ['LEAF'])
    ipg_c = get_column_name(cols_orig, cols, ['IPG/PORT', 'IPG_PORT', 'IPG PORT'])

    missing = [c for c, v in [('TENANT', tenant_c), ('EPG', epg_c), ('VLAN', vlan_c),
                               ('TYPE', type_c), ('POD', pod_c), ('LEAF', leaf_c),
                               ('IPG/PORT', ipg_c)] if v is None]
    if missing:
        raise ValueError(f'Faltan columnas: {missing}')

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0,
               'tenants': set(), 'applications': set(), 'epgs': set(), 'warnings': []}
    pol_uni = ET.Element('polUni', status='created,modified')
    grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for idx, row in df.iterrows():
        tenant = str(row[tenant_c]).strip()
        app = str(row[app_c]).strip() if app_c and pd.notna(row[app_c]) else 'default'
        epg = str(row[epg_c]).strip()
        vlan = parse_vlan(row[vlan_c])
        encap = f'vlan-{vlan}'

        type_val = str(row[type_c]).strip().upper()
        mode_val = str(row[mode_c]).strip() if mode_c and pd.notna(row[mode_c]) else 'regular'
        pod = row[pod_c]
        leaf = row[leaf_c]
        ipg_port = row[ipg_c]

        # Debug: validar campos individualmente
        pod_ok = pd.notna(pod)
        leaf_ok = pd.notna(leaf) and str(leaf).strip() != ''
        ipg_ok = pd.notna(ipg_port) and str(ipg_port).strip() != ''
        type_ok = type_val in ('STATIC', 'PC', 'VPC')

        if not pod_ok:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: POD vacio o invalido')
            continue
        if not leaf_ok:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: LEAF vacio o invalido')
            continue
        if not ipg_ok:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: IPG/PORT vacio o invalido')
            continue
        if not type_ok:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: TYPE invalido ({type_val}), debe ser STATIC, PC o VPC')
            continue

        # Limpiar valores
        pod_clean = int(pod)
        leaf_clean = str(leaf).strip()
        ipg_clean = str(ipg_port).strip()

        tDn = build_tdn(type_val, pod_clean, leaf_clean, ipg_clean)

        if not tDn:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: error construyendo tDn (type={type_val}, pod={pod_clean}, leaf={leaf_clean}, ipg={ipg_clean})')
            continue

        summary['processed'] += 1
        summary['tenants'].add(tenant)
        summary['applications'].add(app)
        summary['epgs'].add(epg)
        grouped[tenant][app][epg].append({'tDn': tDn, 'encap': encap, 'mode': mode_val})

    # delete_mode=True => status="deleted" (XML de borrado)
    # delete_mode=False => status="created,modified" (XML de creacion)
    status_val = 'deleted' if delete_mode else 'created,modified'
    for tenant, apps in grouped.items():
        fv_t = ET.SubElement(pol_uni, 'fvTenant', name=tenant, status='created,modified')
        for app, epgs in apps.items():
            fv_ap = ET.SubElement(fv_t, 'fvAp', name=app, status='created,modified')
            for epg, paths in epgs.items():
                fv_epg = ET.SubElement(fv_ap, 'fvAEPg', name=epg, status='created,modified')
                for p in paths:
                    ET.SubElement(fv_epg, 'fvRsPathAtt', tDn=p['tDn'], encap=p['encap'],
                                  mode=p['mode'], status=status_val)

    xml = prettify_xml(pol_uni)
    summary['tenants'] = sorted(summary['tenants'])
    summary['applications'] = sorted(summary['applications'])
    summary['epgs'] = sorted(summary['epgs'])
    return xml, summary

@aci_paths_bp.route('/generate', methods=['POST'])
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
        # XML de creacion (rollback=False => delete_mode=False)
        create_xml, create_sum = build_xml(df, delete_mode=False)
        df2 = read_excel_file(BytesIO(excel_bytes))
        # XML de borrado (delete_mode=True)
        delete_xml, delete_sum = build_xml(df2, delete_mode=True)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error: {e}'}), 500

    user_id = get_jwt_identity()
    gen = AciGeneration(
        user_id=user_id, generation_type='paths', filename=secure_filename(f.filename),
        excel_data=excel_bytes,
        main_xml=create_xml, rollback_xml=delete_xml, summary=create_sum
    )
    db.session.add(gen)
    db.session.commit()

    return jsonify({
        'create_xml': create_xml, 'delete_xml': delete_xml,
        'filename': f.filename,
        'summary': {
            'rows': summary['rows'], 'processed': summary['processed'],
            'skipped': summary['skipped'], 'tenants': list(summary['tenants']),
            'applications': list(summary['applications']), 'epgs': list(summary['epgs']),
            'warnings': summary['warnings'],
        }
    }), 200


@aci_paths_bp.route('/template', methods=['GET'])
def download_template():
    """Descargar plantilla Excel (.xlsx) con datos de ejemplo para Static Ports"""
    df = pd.DataFrame([
        [600, 'STATIC', 'untagged', 'PROD_TN', 'PROD_AP', 'DC_PROD_VL600_EPG', 2, 2309, 'eth1/9'],
        [600, 'STATIC', 'regular', 'PROD_TN', 'PROD_AP', 'DC_PROD_VL600_EPG', 2, 2309, 'eth1/17'],
        [600, 'PC', 'regular', 'PROD_TN', 'PROD_AP', 'DC_PROD_VL600_EPG', 2, 2309, 'VIOCHP903-PC-A-IPG'],
        [600, 'VPC', 'regular', 'PROD_TN', 'PROD_AP', 'DC_PROD_VL600_EPG', 2, '2309-2310', 'VIOCHP901-VPC-A-IPG'],
    ], columns=['VLAN', 'TYPE', 'MODE', 'TENANT', 'APPLICATION', 'EPG', 'POD', 'LEAF', 'IPG/PORT'])
    
    buffer = BytesIO()
    df.to_excel(buffer, index=False, engine='openpyxl')
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name='plantilla_static_ports.xlsx',
        as_attachment=True
    )
