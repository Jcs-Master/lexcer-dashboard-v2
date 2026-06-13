from collections import defaultdict
from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, AciGeneration
from app.utils.aci_xml import prettify_xml, normalize_cols, get_column_name, parse_vlan, read_excel_file
import pandas as pd

aci_paths_bp = Blueprint('aci_paths', __name__, url_prefix='/api/aci-paths')
ALLOWED = {'xls', 'xlsx'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

def build_xml(df, rollback=False, pod_def=None, leafs_def=None):
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)
    tenant_c = get_column_name(cols_orig, cols, ['TENANT'])
    app_c = get_column_name(cols_orig, cols, ['APPLICATION', 'AP'])
    epg_c = get_column_name(cols_orig, cols, ['EPG'])
    vlan_c = get_column_name(cols_orig, cols, ['VLAN'])
    pod_c = get_column_name(cols_orig, cols, ['POD'])
    leafs_c = get_column_name(cols_orig, cols, ['LEAF', 'LEAFS'])
    ipg_c = get_column_name(cols_orig, cols, ['INTERFACE POLICY GROUP', 'IPG'])
    tdn_c = get_column_name(cols_orig, cols, ['TDN', 'TDN_PATH', 'TDN_PATHS'])

    missing = [c for c, v in [('TENANT', tenant_c), ('EPG', epg_c), ('APPLICATION/AP', app_c), ('VLAN', vlan_c)] if v is None]
    if missing:
        raise ValueError(f'Faltan columnas: {missing}')

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0, 'tenants': set(), 'applications': set(), 'epgs': set(), 'warnings': []}
    pol_uni = ET.Element('polUni', status='created,modified')
    grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for idx, row in df.iterrows():
        tenant = str(row[tenant_c]).strip()
        app = str(row[app_c]).strip() if app_c else 'default'
        epg = str(row[epg_c]).strip()
        vlan = parse_vlan(row[vlan_c])
        encap = f'vlan-{vlan}'

        tDn = None
        if tdn_c and pd.notna(row[tdn_c]):
            tDn = str(row[tdn_c]).strip()
        elif ipg_c and pd.notna(row[ipg_c]):
            ipg = str(row[ipg_c]).strip()
            if '/' in ipg:
                tDn = ipg
            else:
                pod = str(int(row[pod_c])) if pod_c and pd.notna(row[pod_c]) else (str(pod_def) if pod_def else None)
                leafs = str(row[leafs_c]).strip() if leafs_c and pd.notna(row[leafs_c]) else (str(leafs_def) if leafs_def else None)
                if pod and leafs:
                    tDn = f'topology/pod-{pod}/protpaths-{leafs}/pathep-[{ipg}]'

        if not tDn:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: sin tDn para {tenant}/{epg}')
            continue

        summary['processed'] += 1
        summary['tenants'].add(tenant)
        summary['applications'].add(app)
        summary['epgs'].add(epg)
        grouped[tenant][app][epg].append({'tDn': tDn, 'encap': encap})

    status_val = 'created,modified' if rollback else 'deleted'
    for tenant, apps in grouped.items():
        fv_t = ET.SubElement(pol_uni, 'fvTenant', name=tenant, status='created,modified')
        for app, epgs in apps.items():
            fv_ap = ET.SubElement(fv_t, 'fvAp', name=app, status='created,modified')
            for epg, paths in epgs.items():
                fv_epg = ET.SubElement(fv_ap, 'fvAEPg', name=epg, status='created,modified')
                for p in paths:
                    ET.SubElement(fv_epg, 'fvRsPathAtt', tDn=p['tDn'], encap=p['encap'], mode='regular', status=status_val)

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

    sheet = request.form.get('sheet', 'Hoja1')
    pod_def = request.form.get('pod_default', type=int)
    leafs_def = request.form.get('leafs_default')

    try:
        df = read_excel_file(f, sheet)
        main_xml, main_sum = build_xml(df, rollback=False, pod_def=pod_def, leafs_def=leafs_def)
        f.stream.seek(0)
        df2 = read_excel_file(f, sheet)
        rb_xml, rb_sum = build_xml(df2, rollback=True, pod_def=pod_def, leafs_def=leafs_def)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error: {e}'}), 500

    user_id = get_jwt_identity()
    gen = AciGeneration(
        user_id=user_id, generation_type='paths', filename=secure_filename(f.filename),
        main_xml=main_xml, rollback_xml=rb_xml, summary=main_sum
    )
    db.session.add(gen)
    db.session.commit()

    return jsonify({
        'main_xml': main_xml, 'rollback_xml': rb_xml,
        'filename': f.filename,
        'summary': {
            'rows': main_sum['rows'], 'processed': main_sum['processed'],
            'skipped': main_sum['skipped'], 'tenants': main_sum['tenants'],
            'applications': main_sum['applications'], 'epgs': main_sum['epgs'],
            'warnings': main_sum['warnings'],
        }
    }), 200